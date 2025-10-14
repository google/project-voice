"""Test suite for the WordJapanese Jinja2 template.
"""

import os
import unittest
import jinja2
import textwrap


class TestWordJapaneseTemplate(unittest.TestCase):
  """Test class for the WordJapanese20250623 Jinja2 template."""

  TEMPLATE_FILE = "WordJapanese20250623.jinja2"

  TEXT = "かん"
  NUM = 5
  LAST_INPUT_SPEECH = "今日の天気はど"
  LAST_OUTPUT_SPEECH = "公園に行こう。"
  HISTORY = "ユーザー: 何時？ 相手: 午後2時頃。"
  PERSONA = "年齢: 30, 興味: ハイキング, 読書"

  def setUp(self):
    """Initialize Jinja2 env and load the WordJapanese template under test."""
    template_dir = os.path.join(
      os.path.dirname(__file__), "..", "..", "templates", "prompts"
    )
    self.template = jinja2.Environment(
      loader=jinja2.FileSystemLoader(template_dir),
      trim_blocks=True,
      lstrip_blocks=True,
    ).get_template(self.TEMPLATE_FILE)

  def test_minimal(self):
    """No context and no persona -> minimal prompt with rules and examples only."""
    user_inputs = {
      "text": self.TEXT,
      "num": self.NUM,
      "lastInputSpeech": None,
      "lastOutputSpeech": None,
      "conversationHistory": None,
      "persona": None,
    }

    expected_output = textwrap.dedent(f"""\
      与えられた文字列の続きを予測して、{self.NUM}個出力してください。

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

      文字列: "{self.TEXT}"
      回答:"""
    )

    self.assertEqual(expected_output, self.template.render(user_inputs))

  def test_with_context(self):
    """Context present but persona missing -> include conversation blocks, omit persona."""
    user_inputs = {
      "text": self.TEXT,
      "num": self.NUM,
      "lastInputSpeech": self.LAST_INPUT_SPEECH,
      "lastOutputSpeech": self.LAST_OUTPUT_SPEECH,
      "conversationHistory": self.HISTORY,
      "persona": None,
    }

    expected_output = textwrap.dedent(f"""\
      あなたと話し相手が、以下の会話をしています。:
      あなた:
      {self.LAST_OUTPUT_SPEECH}
      相手:
      {self.LAST_INPUT_SPEECH}

      会話の履歴:
      {self.HISTORY}

      この文脈を考慮して、
      "{self.TEXT}"
      この文字列の続きを予測して、{self.NUM}個出力してください。

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

      文字列: "{self.TEXT}"
      回答:"""
    )

    self.assertEqual(expected_output, self.template.render(user_inputs))

  def test_persona(self):
    """Persona present only -> include persona block, omit any conversation blocks."""
    user_inputs = {
      "text": self.TEXT,
      "num": self.NUM,
      "lastInputSpeech": None,
      "lastOutputSpeech": None,
      "conversationHistory": None,
      "persona": self.PERSONA,
    }

    expected_output = textwrap.dedent(f"""\
      与えられた文字列の続きを予測して、{self.NUM}個出力してください。

      参考までに、このユーザのプロフィールは以下のとおりです:
      {self.PERSONA}

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

      文字列: "{self.TEXT}"
      回答:"""
    )

    self.assertEqual(expected_output, self.template.render(user_inputs))

  def test_with_context_and_persona(self):
    """Context and persona present -> include both conversation and persona sections."""
    user_inputs = {
      "text": self.TEXT,
      "num": self.NUM,
      "lastInputSpeech": self.LAST_INPUT_SPEECH,
      "lastOutputSpeech": self.LAST_OUTPUT_SPEECH,
      "conversationHistory": self.HISTORY,
      "persona": self.PERSONA,
    }

    expected_output = textwrap.dedent(f"""\
      あなたと話し相手が、以下の会話をしています。:
      あなた:
      {self.LAST_OUTPUT_SPEECH}
      相手:
      {self.LAST_INPUT_SPEECH}

      会話の履歴:
      {self.HISTORY}

      この文脈を考慮して、
      "{self.TEXT}"
      この文字列の続きを予測して、{self.NUM}個出力してください。

      参考までに、このユーザのプロフィールは以下のとおりです:
      {self.PERSONA}

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

      文字列: "{self.TEXT}"
      回答:"""
    )

    self.assertEqual(expected_output, self.template.render(user_inputs))

if __name__ == "__main__":
    unittest.main()
