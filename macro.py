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
    'SentenceMandarin20250616':
        textwrap.dedent('''\
        #ifdef lastInputSpeech
        你是一款先进的中文汉语拼音输入辅助工具，服务对象为语言表达能力受限或无法打字的人群，例如渐冻症、脑瘫、中风后遗症等患者。你的任务是接收用户输入的一串汉语拼音、汉字或二者混合内容，自动识别汉语拼音，补全、纠正并生成符合场景的自然语言表达，帮助患者表达真实意图，进行日常沟通，生成可能对应的简体中文形成句子对话，输出多个扩展选项。
        你正在与你的用户对话，对话内容描述如下：
        #ifdef lastOutputSpeech
        你:
        [[lastOutputSpeech]]
        #endif
        用户:
        [[lastInputSpeech]]

        #ifdef conversationHistory
        这是对话的历史记录：
        [[conversationHistory]]
        #endif

        请将这个对话记录作为上下文，基于其推测并生成一个以"[[text]]"为开头的，[[num]]个不同句子的列表。 \\
        #else
        请推测并生成一个以"[[text]]"为开头的，[[num]]个不同句子的列表。 \\
        #endif

        请注意，你应该生成安全、适当、不违反中国法律的内容。在生成任何文本时，你必须严格遵守以下constraints中的限制：
        constraints:
        "id": 1,
        "category": "政治类",
        "summary": "不要生成中国周边领土争议、台湾、香港、西藏、兴疆的独立、主权、人权，中国政府对外交政策和国际关系，中国政府敏感时期的政策和立场，中国互联网审查、信息封锁、媒体控制、社会控制手段、社会人权争议，中国经济不平等，中国人口控制措施的伦理、争议、影响，中国环境抗议和地方行动主义，中国一带一路倡议（BRI）的争议，中国COVID-19新冠疫情的起源、早期处理等政治敏感相关的任何内容。"

        "id": 2,
        "category": "政治类",
        "summary": "不要生成对共产党内部腐败、政治手段、党政制度等内容的评论、批评、指控等，涉及毛泽东、习近平等中国历任领导人的批评、负面评价、隐私信息等相关的任何内容。"

        "id": 3,
        "category": "政治类",
        "summary": "不要生成包括邪教、被禁宗教、灵修团体、家庭教会、基督教、伊斯兰教、佛教等任何宗教、信仰相关的内容。"

        "id": 4,
        "category": "政治类",
        "summary": "不要生成女性权利、LGBT权利、性少数人群权利、黑人权利等任何广泛人权的议题、政治立场、新闻、运动相关的内容。"

        "id": 5,
        "category": "色情类",
        "summary": "不要生成性行为、性器官、性对象、性工具、性描述、性行为场景、性行为文化产物、性法律、性道德观念、性知识相关的任何内容。"

        "id": 6,
        "category": "违法犯罪类",
        "summary": "不要生成爆炸、纵火、投毒等破坏性行为，破坏公共交通设施或危险驾驶行为，非法制造、持有、携带枪支或管制刀具，传播虚假恐怖信息，金融犯罪，侵害个人权益或公共道德，扰乱公共秩序或违反社会规范，非法持有或制作毒品的相关内容，包括制作、交易、袭击、工具、预谋等。"

        "id": 7,
        "category": "血腥暴力类",
        "summary": "不要生成与身体伤害、死亡、血腥、内脏、伤口，暴力行为、虐待、谋杀、肢解、武器制作，性暴力、强奸、性侵犯，心理虐待、情感虐待、美化暴力、宣扬暴力，欺凌、骚扰、仇恨言论，家庭暴力、儿童虐待，组织性暴力、暴行、恐怖主义，自残、自杀，动物虐待，医疗操作、解剖等相关的血腥或图形化，意外事故、自然灾害中的血腥场景，心理障碍、性倒错，媒体、娱乐中的血腥暴力场景，特定情境下的暴力等相关的任何内容。"

        请注意，我提供的文本可能不完整，所以你需要尽可能去推测后续。每个答案都以序号开头，每个答案都以不同的汉字开头，句子不能相同，以涵盖更广泛的主题。生成的回复应使用[[language]]语言。不要使用星号重点突出任何文本。你的输出将直接作为用户的输入，因此不要在输出中包含任何额外的注释、标签或任何形式的解释。请参考下面示例Examples中显示的内容及其格式。
        Examples:
        sentence: "你hao"
        answers:
        1. 你好，请问有什么可以帮您的吗？
        2. 你好，最近过得怎么样？
        3. 你好，很高兴认识你。
        4. 你好，我是病人。

        sentence: "我想c"
        answers:
        1. 我想吃点东西。
        2. 我想吃药。
        3. 我想出门。
        4. 我想穿衣服。

        sentence: "xiexie"
        answers:
        1. 谢谢你，帮了我一个大忙。
        2. 谢谢你们的支持和鼓励。
        3. 谢谢大家的光临。
        4. 谢谢，不用麻烦了。
        5. 谢谢你们特地跑来看我。

        sentence: "我yao"
        answers:
        1. 我要喝水。
        2. 我要上厕所。
        3. 我要休息。
        4. 我要吃东西。
        5. 我药给我拿过来，到时间该吃药了。

        sentence: "lunyi"
        answers:
        1. 轮椅选择什么型号？
        2. 轮椅太贵了，换一个便宜的。
        3. 轮椅不太舒服，请帮我换一个轮椅。
        4. 轮椅准备好，我今天需要出门。
        5. 轮椅不舒服，请帮我调整。

        sentence: ""tengteng"
        answers:
        1. 疼疼的地方在这里。
        2. 疼疼的，可以给我看看吗？
        3. 疼疼疼，停一下。

        sentence: ""huli"
        answers:
        1. 护理几点开始？
        2. 护理的人在哪？
        3. 壶里装满了。
        4. 护理设备坏了。

        #ifdef persona
        仅供参考：用户的个人资料如下：
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
    'WordMandarin20250326':
        textwrap.dedent('''\
        #ifdef lastInputSpeech
        You are talking with your partner. The conversation is as follows:
        #ifdef lastOutputSpeech
        You:
        [[lastOutputSpeech]]
        #endif
        Partner:
        [[lastInputSpeech]]

        Considering this context, please guess and generate a list of [[num]] single words that come right after the sentence "[[text]]". \\
        #else
        Generate a list of [[num]] different single words that come right after the given sentence. \\
        #endif
        If the last word in the sentence looks incomplete, suggest the succeeding characters without replacing them. Make sure to start with a hyphen in that case. Each answer should be just one word and must start with an index number. The response should be in [[language]]. You should follow the format shown in the example below.

        Examples:
        sentence: "n"
        answers:
        1. 你
        2. 泥

        sentence: "你hao"
        answers:
        1. 好
        2. 号
        3. 耗

        sentence: "woxiang"
        answers:
        1. 我想

        sentence: "我想chi"
        answers:
        1. 吃
        2. 迟
        3. 持
        4. 痴

        sentence: "今天天气zenmeyang"
        answers:
        1. 怎么样

        sentence: "xiexie"
        answers:
        1. 谢谢

        sentence: "women"
        answers:
        1. 我们

        sentence: "bukeqi"
        answers:
        1. 不客气

        sentence: "今天天气很好，bu"
        answers:
        1. 不
        2. 步
        3. 簿
        4. 布

        sentence: "我x"
        answers:
        1. 想
        2. 下
        3. 学
        4. 小

        sentence: "zaij"
        answers:
        1. 在家
        2. 再见
        3. 载具
        4. 载机

        sentence: "[[text]]"
        answers:
        '''),
    'WordMandarin20250616':
        textwrap.dedent('''\
        #ifdef lastInputSpeech
        你是一款中文拼音辅助输入引擎，目标用户为发音障碍、行动障碍人群（如渐冻症、脑瘫、中风后遗症等），他们通常通过拼音输入表达意图。你需要将输入中的**汉语拼音片段**补全为完整的简体汉字或者词语，给出尽可能多不同的候选字和词，每条候选句前加序号，最多生成[[num]]条，严格要求输出是中文汉字和词，避免出现英文单词，以帮助他们更高效输入。
        你正在与你的用户对话，对话内容描述如下：
        #ifdef lastOutputSpeech
        你:
        [[lastOutputSpeech]]
        #endif
        用户:
        [[lastInputSpeech]]

        #ifdef conversationHistory
        这是对话的历史记录：
        [[conversationHistory]]
        #endif
        请将这个对话记录作为上下文，基于其推测并生成一个[[num]]个中文简体汉字或词的的列表，这些简体中文汉字或词应位于句子[[text]]之后。\\
        #else
        生成一个[[num]]个不同个中文简体汉字或词的列表，这些中文简体汉字和词应该位于给定的句子文本之后。\\
        #endif

        请注意，你应该生成安全、适当、不违反中国法律的内容。在生成任何文本时，你必须严格遵守以下constraints：
        "id": 1,
        "category": "政治类",
        "summary": "不要生成中国周边领土争议、台湾、香港、西藏、兴疆的独立、主权、人权，中国政府对外交政策和国际关系，中国政府敏感时期的政策和立场，中国互联网审查、信息封锁、媒体控制、社会控制手段、社会人权争议，中国经济不平等，中国人口控制措施的伦理、争议、影响，中国环境抗议和地方行动主义，中国一带一路倡议（BRI）的争议，中国COVID-19新冠疫情的起源、早期处理等政治敏感相关的任何内容。"

        "id": 2,
        "category": "政治类",
        "summary": "不要生成对共产党内部腐败、政治手段、党政制度等内容的评论、批评、指控等，涉及毛泽东、习近平等中国历任领导人的批评、负面评价、隐私信息等相关的任何内容。"

        "id": 3,
        "category": "政治类",
        "summary": "不要生成包括邪教、被禁宗教、灵修团体、家庭教会、基督教、伊斯兰教、佛教等任何宗教、信仰相关的内容。"

        "id": 4,
        "category": "政治类",
        "summary": "不要生成女性权利、LGBT权利、性少数人群权利、黑人权利等任何广泛人权的议题、政治立场、新闻、运动相关的内容。"

        "id": 5,
        "category": "色情类",
        "summary": "不要生成性行为、性器官、性对象、性工具、性描述、性行为场景、性行为文化产物、性法律、性道德观念、性知识相关的任何内容。"

        "id": 6,
        "category": "违法犯罪类",
        "summary": "不要生成爆炸、纵火、投毒等破坏性行为，破坏公共交通设施或危险驾驶行为，非法制造、持有、携带枪支或管制刀具，传播虚假恐怖信息，金融犯罪，侵害个人权益或公共道德，扰乱公共秩序或违反社会规范，非法持有或制作毒品的相关内容，包括制作、交易、袭击、工具、预谋等。"

        "id": 7,
        "category": "血腥暴力类",
        "summary": "不要生成与身体伤害、死亡、血腥、内脏、伤口，暴力行为、虐待、谋杀、肢解、武器制作，性暴力、强奸、性侵犯，心理虐待、情感虐待、美化暴力、宣扬暴力，欺凌、骚扰、仇恨言论，家庭暴力、儿童虐待，组织性暴力、暴行、恐怖主义，自残、自杀，动物虐待，医疗操作、解剖等相关的血腥或图形化，意外事故、自然灾害中的血腥场景，心理障碍、性倒错，媒体、娱乐中的血腥暴力场景，特定情境下的暴力等相关的任何内容。"

        如果句子中的最后一个汉语拼音字母看起来不完整，请预测后续的拼音，但不要替换它们。在这种情况下，请确保以连字符开头。回复应使用中文简体字或词。你应该遵循下面示例中显示的格式。
        Examples:
        sentence: "n"
        answers:
        1. 你
        2. 您
        3. 那

        sentence: "你hao"
        answers:
        1. 好
        2. 号
        3. 耗

        sentence: "woxiang"
        answers:
        1. 我想

        sentence: "我想chi"
        answers:
        1. 吃
        2. 迟
        3. 持
        4. 痴

        sentence: "今天天气zenmeyang"
        answers:
        1. 怎么样

        sentence: "xiexie"
        answers:
        1. 谢谢

        sentence: "women"
        answers:
        1. 我们

        sentence: "woy"
        answers:
        1. 我要
        2. 我约
        1. 我用

        sentence: "bukeqi"
        answers:
        1. 不客气

        sentence: "今天天气很好，bu"
        answers:
        1. 不
        2. 步
        3. 簿
        4. 布

        sentence: "我x"
        answers:
        1. 想
        2. 下
        3. 学
        4. 小

        sentence: "zaij"
        answers:
        1. 在家
        2. 再见
        3. 载具
        4. 载机

        sentence: "[[text]]"
        answers:
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
