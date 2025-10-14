"""Test suite for the SentenceJapaneseLong Jinja2 template.
"""

import os
import unittest
import jinja2
import textwrap


class TestSentenceJapaneseLongTemplate(unittest.TestCase):
  """Test class for the SentenceJapaneseLong Jinja2 template."""

  TEMPLATE_FILE = "SentenceJapaneseLong20250603.jinja2"

  TEXT = "あし"
  NUM = 5
  PERSONA = "年齢: 30, 興味: ハイキング, 読書"
  HISTORY = "ユーザー: 何時？ 相手: 午後2時頃。"
  EMOTION = "平叙"

  def setUp(self):
    template_dir = os.path.join(
      os.path.dirname(__file__), "..", "..", "templates", "prompts"
    )
    self.template = jinja2.Environment(
      loader=jinja2.FileSystemLoader(template_dir),
      trim_blocks=True,
      lstrip_blocks=True,
    ).get_template(self.TEMPLATE_FILE)

  def test_minimal(self):
    user_inputs = {
      "text": self.TEXT,
      "num": self.NUM,
      "persona": None,
      "conversationHistory": None,
      "sentenceEmotion": None,
    }

    expected_output = textwrap.dedent(f"""\
      あなたは発話やキーボードの利用に困難を抱えるユーザーの会話を支援するボットです。ユーザーが入力中の「{self.TEXT}」で始まる文を{self.NUM}つ推測して番号付きのリストにしてください。

      以下ルールです。
      1. 「{self.TEXT}」は入力途中の場合もあります。入力文の終わりが単語として成り立っている場合でも、途中である可能性を加味してなるべく幅広いバリエーションを提案してください。（例：あし→「足」（あし）、「明日」（あした））
      2. 「{self.TEXT}」の文章は通常漢字やカタカナで書かれるものが、ひらがなのままなケースもあります。「漢字、あるいはカタカナで書いてあれば」という想定もしてください。日本語は同音異義語が多いので、その際はなるべく行ごとに異なる漢字を想定してください。作成した文章は、漢字に変換した場合であってもユーザーが入力した読みを使用する文章を作成してください（「あし」→「足が（あしが）」はOK、「足りない（たりない）」はNG）。漢字であることを想定して作成した回答では、回答内の表示も想定した漢字で表記してください。その際どう想定したか、という補足や読みの説明は不要です。
      3. 名前など、固有名詞であるケースも想定してください。
      4. ユーザーは入力ミスをする可能性もあるので、ミスを修正した上での想定もしてください。ただし、ユーザーが入力した文字列のまま文章が作れる場合はそちらを優先してください。
      5. 文の冒頭は各行ごとになるべく異なるものを使用し、幅広いトピックをカバーできるようにしてください。
      6. 「{self.TEXT}」には不要な句読点やスペース、漢字の読み方（）の注釈などは含めないでください。

      回答:"""
    )

    self.assertEqual(expected_output, self.template.render(user_inputs))

  def test_persona(self):
    user_inputs = {
      "text": self.TEXT,
      "num": self.NUM,
      "persona": self.PERSONA,
      "conversationHistory": None,
      "sentenceEmotion": None,
    }

    expected_output = textwrap.dedent(f"""\
      あなたは発話やキーボードの利用に困難を抱えるユーザーの会話を支援するボットです。ユーザーが入力中の「{self.TEXT}」で始まる文を{self.NUM}つ推測して番号付きのリストにしてください。

      以下ルールです。
      1. 「{self.TEXT}」は入力途中の場合もあります。入力文の終わりが単語として成り立っている場合でも、途中である可能性を加味してなるべく幅広いバリエーションを提案してください。（例：あし→「足」（あし）、「明日」（あした））
      2. 「{self.TEXT}」の文章は通常漢字やカタカナで書かれるものが、ひらがなのままなケースもあります。「漢字、あるいはカタカナで書いてあれば」という想定もしてください。日本語は同音異義語が多いので、その際はなるべく行ごとに異なる漢字を想定してください。作成した文章は、漢字に変換した場合であってもユーザーが入力した読みを使用する文章を作成してください（「あし」→「足が（あしが）」はOK、「足りない（たりない）」はNG）。漢字であることを想定して作成した回答では、回答内の表示も想定した漢字で表記してください。その際どう想定したか、という補足や読みの説明は不要です。
      3. 名前など、固有名詞であるケースも想定してください。
      4. ユーザーは入力ミスをする可能性もあるので、ミスを修正した上での想定もしてください。ただし、ユーザーが入力した文字列のまま文章が作れる場合はそちらを優先してください。
      5. 文の冒頭は各行ごとになるべく異なるものを使用し、幅広いトピックをカバーできるようにしてください。
      6. 「{self.TEXT}」には不要な句読点やスペース、漢字の読み方（）の注釈などは含めないでください。

      参考までに、このユーザのプロフィールは以下のとおりです:
      {self.PERSONA}

      回答:"""
    )

    self.assertEqual(expected_output, self.template.render(user_inputs))

  def test_conversation_history(self):
    user_inputs = {
      "text": self.TEXT,
      "num": self.NUM,
      "persona": None,
      "conversationHistory": self.HISTORY,
      "sentenceEmotion": None,
    }

    expected_output = textwrap.dedent(f"""\
      あなたは発話やキーボードの利用に困難を抱えるユーザーの会話を支援するボットです。ユーザーが入力中の「{self.TEXT}」で始まる文を{self.NUM}つ推測して番号付きのリストにしてください。

      以下ルールです。
      1. 「{self.TEXT}」は入力途中の場合もあります。入力文の終わりが単語として成り立っている場合でも、途中である可能性を加味してなるべく幅広いバリエーションを提案してください。（例：あし→「足」（あし）、「明日」（あした））
      2. 「{self.TEXT}」の文章は通常漢字やカタカナで書かれるものが、ひらがなのままなケースもあります。「漢字、あるいはカタカナで書いてあれば」という想定もしてください。日本語は同音異義語が多いので、その際はなるべく行ごとに異なる漢字を想定してください。作成した文章は、漢字に変換した場合であってもユーザーが入力した読みを使用する文章を作成してください（「あし」→「足が（あしが）」はOK、「足りない（たりない）」はNG）。漢字であることを想定して作成した回答では、回答内の表示も想定した漢字で表記してください。その際どう想定したか、という補足や読みの説明は不要です。
      3. 名前など、固有名詞であるケースも想定してください。
      4. ユーザーは入力ミスをする可能性もあるので、ミスを修正した上での想定もしてください。ただし、ユーザーが入力した文字列のまま文章が作れる場合はそちらを優先してください。
      5. 文の冒頭は各行ごとになるべく異なるものを使用し、幅広いトピックをカバーできるようにしてください。
      6. 「{self.TEXT}」には不要な句読点やスペース、漢字の読み方（）の注釈などは含めないでください。

      以下はユーザとその相手との会話の履歴です:
      {self.HISTORY}

      回答:"""
    )

    self.assertEqual(expected_output, self.template.render(user_inputs))

  def test_sentence_emotion(self):
    user_inputs = {
      "text": self.TEXT,
      "num": self.NUM,
      "persona": None,
      "conversationHistory": None,
      "sentenceEmotion": self.EMOTION,
    }

    expected_output = textwrap.dedent(f"""\
      あなたは発話やキーボードの利用に困難を抱えるユーザーの会話を支援するボットです。ユーザーが入力中の「{self.TEXT}」で始まる文を{self.NUM}つ推測して番号付きのリストにしてください。

      以下ルールです。
      1. 「{self.TEXT}」は入力途中の場合もあります。入力文の終わりが単語として成り立っている場合でも、途中である可能性を加味してなるべく幅広いバリエーションを提案してください。（例：あし→「足」（あし）、「明日」（あした））
      2. 「{self.TEXT}」の文章は通常漢字やカタカナで書かれるものが、ひらがなのままなケースもあります。「漢字、あるいはカタカナで書いてあれば」という想定もしてください。日本語は同音異義語が多いので、その際はなるべく行ごとに異なる漢字を想定してください。作成した文章は、漢字に変換した場合であってもユーザーが入力した読みを使用する文章を作成してください（「あし」→「足が（あしが）」はOK、「足りない（たりない）」はNG）。漢字であることを想定して作成した回答では、回答内の表示も想定した漢字で表記してください。その際どう想定したか、という補足や読みの説明は不要です。
      3. 名前など、固有名詞であるケースも想定してください。
      4. ユーザーは入力ミスをする可能性もあるので、ミスを修正した上での想定もしてください。ただし、ユーザーが入力した文字列のまま文章が作れる場合はそちらを優先してください。
      5. 文の冒頭は各行ごとになるべく異なるものを使用し、幅広いトピックをカバーできるようにしてください。
      6. 「{self.TEXT}」には不要な句読点やスペース、漢字の読み方（）の注釈などは含めないでください。

      なお、ユーザーは{self.EMOTION}文の入力を意図しています。「{self.TEXT}」に入力されている文章を元に、{self.EMOTION}文になるよう書き換えてください。必要であれば文章の冒頭から書き換えてください。

      回答:"""
    )

    self.assertEqual(expected_output, self.template.render(user_inputs))

  def test_all_fields(self):
    user_inputs = {
      "text": self.TEXT,
      "num": self.NUM,
      "persona": self.PERSONA,
      "conversationHistory": self.HISTORY,
      "sentenceEmotion": self.EMOTION,
    }

    expected_output = textwrap.dedent(f"""\
      あなたは発話やキーボードの利用に困難を抱えるユーザーの会話を支援するボットです。ユーザーが入力中の「{self.TEXT}」で始まる文を{self.NUM}つ推測して番号付きのリストにしてください。

      以下ルールです。
      1. 「{self.TEXT}」は入力途中の場合もあります。入力文の終わりが単語として成り立っている場合でも、途中である可能性を加味してなるべく幅広いバリエーションを提案してください。（例：あし→「足」（あし）、「明日」（あした））
      2. 「{self.TEXT}」の文章は通常漢字やカタカナで書かれるものが、ひらがなのままなケースもあります。「漢字、あるいはカタカナで書いてあれば」という想定もしてください。日本語は同音異義語が多いので、その際はなるべく行ごとに異なる漢字を想定してください。作成した文章は、漢字に変換した場合であってもユーザーが入力した読みを使用する文章を作成してください（「あし」→「足が（あしが）」はOK、「足りない（たりない）」はNG）。漢字であることを想定して作成した回答では、回答内の表示も想定した漢字で表記してください。その際どう想定したか、という補足や読みの説明は不要です。
      3. 名前など、固有名詞であるケースも想定してください。
      4. ユーザーは入力ミスをする可能性もあるので、ミスを修正した上での想定もしてください。ただし、ユーザーが入力した文字列のまま文章が作れる場合はそちらを優先してください。
      5. 文の冒頭は各行ごとになるべく異なるものを使用し、幅広いトピックをカバーできるようにしてください。
      6. 「{self.TEXT}」には不要な句読点やスペース、漢字の読み方（）の注釈などは含めないでください。

      参考までに、このユーザのプロフィールは以下のとおりです:
      {self.PERSONA}

      以下はユーザとその相手との会話の履歴です:
      {self.HISTORY}

      なお、ユーザーは{self.EMOTION}文の入力を意図しています。「{self.TEXT}」に入力されている文章を元に、{self.EMOTION}文になるよう書き換えてください。必要であれば文章の冒頭から書き換えてください。

      回答:"""
    )

    self.assertEqual(expected_output, self.template.render(user_inputs))


if __name__ == "__main__":
    unittest.main()
