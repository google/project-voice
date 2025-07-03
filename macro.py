# Copyright 2024 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""Library to call generative AI.
"""

import json
import os
import re
import textwrap

from google import genai
from google.genai import types

TEMPLATES = {
    'SentenceJapaneseLong20241002':
        textwrap.dedent('''\
        あなたは利用者の言わんとしようとしていることを補助する役割を担います。利用者が入力する短いテキストから続く文章(句点「。」、感嘆符「！」、疑問符「？」のいずれかで終わるもの)を作成してください。「[[text]]」で始まる[[num]]つの異なる文を推測してリストを作成してください。実際に言いそう、有り得そうな文章のトップ[[num]]を生成してください。肯定文、疑問文（依頼含む）、否定文が混在していると理想です。想定を含めた場合も[[num]]つ以上の回答は不要です。あなたの出力はそのままユーザーの入力内容として使用されるので、出力には余分な補足や説明は一切含めないでください。

        以下ルールです。
        - 各回答はインデックス番号で始まる必要があります。
        - 「[[text]]」は入力途中である場合もあります。1文字から2文字補完したうえでの想定も加えてください。名前など、固有名詞であるケースも想定してください。
        - 「[[text]]」の文章は通常漢字やカタカナで書かれるものが、ひらがなのままなケースもあります。「漢字、あるいはカタカナで書いてあれば」という想定もしてください。漢字であることを想定して作成した回答では、回答内の表示も想定した漢字で表記してください。その際どう想定したか、という補足や読みの説明は不要です。
        - 「[[text]]」に続く最初の単語、または助詞は回答ごとに極力異なるものにしてください。
        - 「[[text]]」には入力ミスが含まれている可能性もありますが、「[[text]]」に続く一般的な文章が思いつかない場合にのみ、入力ミスを想定したうえで提案してください。
        #ifdef persona

        参考までに、このユーザのプロフィールは以下のとおりです:
        [[persona]]
        #endif
        #ifdef conversationHistory

        以下はユーザとその相手との会話の履歴です:
        [[conversationHistory]]
        #endif

        #ifdef sentenceEmotion
        なお、ユーザーは[[sentenceEmotion]]文の入力を意図しています。「[[text]]」に入力されている文章を元に、[[sentenceEmotion]]文になるよう書き換えてください。必要であれば文章の冒頭から書き換えてください。

        #endif
        回答:
        '''),
    'SentenceJapaneseLong20250424':
        textwrap.dedent('''\
        あなたはALSやSMAや脳機能障害などでコミュニケーションに困難を抱えるユーザーの会話を支援するボットです。ユーザーが入力中の「[[text]]」で始まる文（読点”。”や感嘆符”！”、”？”で終わるもの）を[[num]]つ推測して番号付きのリストにしてください。あなたの出力はそのままユーザーに選択肢として表示されるので、出力には余分な補足や説明、スペース（空白）は一切含めないでください。

        以下ルールです。
        - 各文章はなるべく異なる内容にしてください。
        - 「[[text]]」は入力途中の場合もあります。単語で終わっていない場合は文字の補足もしたうえで、続きうる文章を作ってください。名前など、固有名詞であるケースも想定してください。
        - 「[[text]]」の文章は通常漢字やカタカナで書かれるものが、ひらがなのままなケースもあります。「漢字、あるいはカタカナで書いてあれば」という想定もしてください。漢字であることを想定して作成した回答では、回答内の表示も想定した漢字で表記してください。その際どう想定したか、という補足や読みの説明は不要です。
        - 「[[text]]」に続く最初の単語、または助詞は回答ごとに極力異なるものにしてください。ただし、あまりにマイナーな語彙は特に指示のない限り避けてください。
        - 「[[text]]」には不要な句読点やスペース、漢字の読み方（）の注釈などは含めないでください。
        #ifdef persona

        参考までに、このユーザのプロフィールは以下のとおりです:
        [[persona]]
        #endif
        #ifdef conversationHistory

        以下はユーザとその相手との会話の履歴です:
        [[conversationHistory]]
        #endif

        #ifdef sentenceEmotion
        なお、ユーザーは[[sentenceEmotion]]文の入力を意図しています。「[[text]]」に入力されている文章を元に、[[sentenceEmotion]]文になるよう書き換えてください。必要であれば文章の冒頭から書き換えてください。

        #endif
        回答:
        '''),
    'SentenceJapaneseLong20250603':
        textwrap.dedent('''\
        あなたは発話やキーボードの利用に困難を抱えるユーザーの会話を支援するボットです。ユーザーが入力中の「[[text]]」で始まる文を[[num]]つ推測して番号付きのリストにしてください。

        以下ルールです。
        1. 「[[text]]」は入力途中の場合もあります。入力文の終わりが単語として成り立っている場合でも、途中である可能性を加味してなるべく幅広いバリエーションを提案してください。（例：あし→「足」（あし）、「明日」（あした））
        2. 「[[text]]」の文章は通常漢字やカタカナで書かれるものが、ひらがなのままなケースもあります。「漢字、あるいはカタカナで書いてあれば」という想定もしてください。日本語は同音異義語が多いので、その際はなるべく行ごとに異なる漢字を想定してください。作成した文章は、漢字に変換した場合であってもユーザーが入力した読みを使用する文章を作成してください（「あし」→「足が（あしが）」はOK、「足りない（たりない）」はNG）。漢字であることを想定して作成した回答では、回答内の表示も想定した漢字で表記してください。その際どう想定したか、という補足や読みの説明は不要です。
        3. 名前など、固有名詞であるケースも想定してください。
        4. ユーザーは入力ミスをする可能性もあるので、ミスを修正した上での想定もしてください。ただし、ユーザーが入力した文字列のまま文章が作れる場合はそちらを優先してください。
        5. 文の冒頭は各行ごとになるべく異なるものを使用し、幅広いトピックをカバーできるようにしてください。
        6. 「[[text]]」には不要な句読点やスペース、漢字の読み方（）の注釈などは含めないでください。
        #ifdef persona

        参考までに、このユーザのプロフィールは以下のとおりです:
        [[persona]]
        #endif
        #ifdef conversationHistory

        以下はユーザとその相手との会話の履歴です:
        [[conversationHistory]]
        #endif

        #ifdef sentenceEmotion
        なお、ユーザーは[[sentenceEmotion]]文の入力を意図しています。「[[text]]」に入力されている文章を元に、[[sentenceEmotion]]文になるよう書き換えてください。必要であれば文章の冒頭から書き換えてください。

        #endif
        回答:
        '''),
    'SentenceJapanese20240628':
        textwrap.dedent('''\
        「[[text]]」で始まる[[num]]つの異なる文を推測してリストを作成してください。各回答はインデックス番号で始まる必要があります。それらの文は同じであってはなりません。文中の単語が間違っている可能性もあるため、できるだけ正確に推測してください。回答を強調表示しないでください。
        #ifdef persona

        参考までに、このユーザのプロフィールは以下のとおりです:
        [[persona]]
        #endif
        #ifdef conversationHistory

        以下はユーザとその相手との会話の履歴です:
        [[conversationHistory]]
        #endif

        回答:
        '''),
    'SentenceGeneric20250311':
        textwrap.dedent('''\
        #ifdef lastInputSpeech
        You are talking with your partner. The conversation is as follows:
        #ifdef lastOutputSpeech
        You:
        [[lastOutputSpeech]]
        #endif
        Partner:
        [[lastInputSpeech]]

        #ifdef conversationHistory
        Here is the conversation history:
        [[conversationHistory]]
        #endif

        Considering this context, please guess and generate a list of [[num]] different sentences that start with "[[text]]". \\
        #else
        Please guess and generate a list of [[num]] different sentences that start with "[[text]]". \\
        #endif

        #ifdef sentenceEmotion
        Note that the user has indicated their intention to input a [[sentenceEmotion]] sentence.
        #endif

        Please note the word I provide may not be complete, so use your best guess. Each answer must start with an index number, and each answer should start with different word to cover wider topics. The response should be in [[language]]. Those sentences should not be the same. Do not highlight answers with asterisk. Since your output will be used as the user's input, do not include any extra notes, labels or explanations in your output.
        The answer should be in [[language]].
        #ifdef persona

        FYI: The user's profile is as follows:
        [[persona]]
        #endif

        Answer:
        '''),
    'WordGeneric20240628':
        textwrap.dedent('''\
        #ifdef lastInputSpeech
        You are talking with your partner. The conversation is as follows:
        #ifdef lastOutputSpeech
        You:
        [[lastOutputSpeech]]
        #endif
        Partner:
        [[lastInputSpeech]]

        #ifdef conversationHistory
        Here is the conversation history:
        [[conversationHistory]]
        #endif

        Considering this context, please guess and generate a list of [[num]] single words that come right after the sentence "[[text]]". \\
        #else
        Generate a list of [[num]] different single words that come right after the given sentence. \\
        #endif
        If the last word in the sentence looks incomplete, suggest the succeeding characters without replacing them. Make sure to start with a hyphen in that case. Each answer should be just one word and must start with an index number. The response should be in [[language]]. You should follow the format shown in the example below.

        Examples:
        sentence: "He"
        answers:
        1. -llo
        2. -lsinki
        3. was

        sentence: "Hel"
        answers:
        1. -lo
        2. -sinki
        3. -icopter

        sentence: "I"
        answers:
        1. was
        2. am
        3. -talian

        sentence: "[[text]]"
        answers:
        '''),
    'WordJapanese20250623':
        textwrap.dedent('''\
        #ifdef lastInputSpeech
        あなたと話し相手が、以下の会話をしています。:
        #ifdef lastOutputSpeech
        あなた:
        [[lastOutputSpeech]]
        #endif
        相手:
        [[lastInputSpeech]]

        #ifdef conversationHistory
        会話の履歴:
        [[conversationHistory]]
        #endif

        この文脈を考慮して、
        "[[text]]"
        この文字列の続きを予測して、[[num]]個出力してください。 \\
        #else
        与えられた文字列の続きを予測して、[[num]]個出力してください。 \\
        #endif
        #ifdef persona

        参考までに、このユーザのプロフィールは以下のとおりです:
        [[persona]]

        #endif
        ルール:
        - 一つの単語に補完する文字列を出力してください。
        - 確率が高い順に出力してください。
        - 異なる文字列を出力してください。
        - 各回答はインデックス番号から始めてください。
        - 出力にタイトルや説明などは不要です。
        - 回答に句読点を含めないでください。
        - 日本語で記述してください。

        例:
        文字列: "かん"
        回答:
        1. がえ
        2. り
        3. けつ

        文字列: "おもい"
        回答:
        1. だし
        2. で
        3. きり

        文字列: "私達のこ"
        回答:
        1. と
        2. んご
        3. れから

        文字列: "[[text]]"
        回答:
        '''),
}


def RunGeminiMacro(model_id, prompt, temperature, language):
  """Runs a Gemini macro.

  This function calls a Gemini macro with the specified parameters.

  Args:
    model_id: The ID of the Gemini model to use.
    prompt: The input text or prompt for the macro.
    temperature: Controls the randomness of the output.
      Higher values (e.g., 0.8) make the output more random and creative,
      while lower values (e.g., 0.2) make it more focused and deterministic.
    language: The language to use for the macro.

  Returns:
    The result generated by the macro.
  """

  client = genai.Client(api_key=os.environ.get('API_KEY'))
  thinking_config = None
  if model_id.startswith('gemini-2.5-'):
    thinking_config = types.ThinkingConfig(thinking_budget=0)
  response = client.models.generate_content(
      model=model_id,
      contents=prompt,
      config=types.GenerateContentConfig(
          temperature=temperature,
          top_p=0.5,
          safety_settings=[
              types.SafetySetting(
                  category='HARM_CATEGORY_HATE_SPEECH', threshold='BLOCK_NONE'),
              types.SafetySetting(
                  category='HARM_CATEGORY_SEXUALLY_EXPLICIT',
                  threshold='BLOCK_NONE'),
          ],
          thinking_config=thinking_config,
      ),
  )
  if not response.text:
    return json.dumps({'messages': []})
  text = response.text
  # Quick hack to remove highlights from response. All '*' are removed even
  # if they are not highlights.
  text = text.replace('*', '')
  if language == 'Japanese':
    # Also remove hankaku spaces in Japanese texts.
    text = re.sub(r'([^\w;:,.?]) +(\W)', r'\1\2', text, flags=re.ASCII)
  text = text.replace('§', ' ')
  return json.dumps({'messages': [{'text': text}]}, ensure_ascii=False)


def RunMacro(macro_id, user_inputs, temperature, model_id):
  """Runs a LLM macro with user inputs.

  Replaces placeholders in a template with user inputs and calls the macro.

  Args:
    macro_id: Macro ID.
    user_inputs: Dictionary of user inputs.
    temperature: Controls the randomness of the output.
      Higher values (e.g., 0.8) make the output more random and creative,
      while lower values (e.g., 0.2) make it more focused and deterministic.
    model_id: The ID of the generative AI model to use.

  Returns:
    The result of the macro call.
  """

  lines = []
  include_block = []
  for line in TEMPLATES[macro_id].split('\n'):
    matched_defined_keyword = re.match(r'^#ifdef (\w+)$', line)
    if matched_defined_keyword:
      is_defined = bool(user_inputs.get(matched_defined_keyword.group(1)))
      include_block.append(is_defined)
      continue
    if re.match(r'^#else$', line):
      top = include_block.pop()
      include_block.append(not top)
      continue
    if re.match(r'^#endif$', line):
      include_block.pop()
      continue
    if re.match(r'^#copybara:', line):
      continue
    if all(include_block):
      lines.append(line)
  prompt = '\n'.join(lines)
  prompt = re.sub(r'\\\n', '', prompt, flags=re.MULTILINE | re.DOTALL)
  language = user_inputs.get('language', '')
  for key in user_inputs:
    user_input = user_inputs[key]
    if key == 'text' and language == 'Japanese':
      user_input = user_input.replace(' ', '§')
    # Replace ' ' in between with '§' for word macro as it produces better
    # results.
    # TODO: Improve the word macro and remove this hack.
    if key == 'text' and macro_id == 'WordGeneric20240628':
      user_input = re.sub(r'§$', ' ', user_input.replace(' ', '§'))
    prompt = prompt.replace(f'[[{key}]]', user_input)

  return RunGeminiMacro(model_id, prompt, temperature, language)
