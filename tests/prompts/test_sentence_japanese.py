"""Test suite for the SentenceJapanese20240628 Jinja2 template.
"""

import os
import unittest
import jinja2
import textwrap


class TestSentenceJapanese20240628Template(unittest.TestCase):
  """Test class for the SentenceJapanese20240628 Jinja2 template."""

  TEMPLATE_FILE = "SentenceJapanese20240628.jinja2"

  TEXT = "あし"
  NUM = 5
  PERSONA = "年齢: 30, 興味: ハイキング, 読書"
  HISTORY = "ユーザー: 何時？ 相手: 午後2時頃。"

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
    """Render with only required inputs (text, num)."""
    user_inputs = {
      "text": self.TEXT,
      "num": self.NUM,
      "persona": None,
      "conversationHistory": None,
    }

    expected_output = textwrap.dedent(f"""\
      「{self.TEXT}」で始まる{self.NUM}つの異なる文を推測してリストを作成してください。各回答はインデックス番号で始まる必要があります。それらの文は同じであってはなりません。文中の単語が間違っている可能性もあるため、できるだけ正確に推測してください。回答を強調表示しないでください。

      回答:"""
    )

    self.assertEqual(expected_output, self.template.render(user_inputs))

  def test_persona(self):
    """Render with persona included."""
    user_inputs = {
      "text": self.TEXT,
      "num": self.NUM,
      "persona": self.PERSONA,
      "conversationHistory": None,
    }

    expected_output = textwrap.dedent(f"""\
      「{self.TEXT}」で始まる{self.NUM}つの異なる文を推測してリストを作成してください。各回答はインデックス番号で始まる必要があります。それらの文は同じであってはなりません。文中の単語が間違っている可能性もあるため、できるだけ正確に推測してください。回答を強調表示しないでください。

      参考までに、このユーザのプロフィールは以下のとおりです:
      {self.PERSONA}

      回答:"""
    )

    self.assertEqual(expected_output, self.template.render(user_inputs))

  def test_conversation_history(self):
    """Render with conversationHistory included."""
    user_inputs = {
      "text": self.TEXT,
      "num": self.NUM,
      "persona": None,
      "conversationHistory": self.HISTORY,
    }

    expected_output = textwrap.dedent(f"""\
      「{self.TEXT}」で始まる{self.NUM}つの異なる文を推測してリストを作成してください。各回答はインデックス番号で始まる必要があります。それらの文は同じであってはなりません。文中の単語が間違っている可能性もあるため、できるだけ正確に推測してください。回答を強調表示しないでください。

      以下はユーザとその相手との会話の履歴です:
      {self.HISTORY}

      回答:"""
    )

    self.assertEqual(expected_output, self.template.render(user_inputs))

  def test_persona_and_history(self):
    """Render with both persona and conversationHistory included."""
    user_inputs = {
      "text": self.TEXT,
      "num": self.NUM,
      "persona": self.PERSONA,
      "conversationHistory": self.HISTORY,
    }

    expected_output = textwrap.dedent(f"""\
      「{self.TEXT}」で始まる{self.NUM}つの異なる文を推測してリストを作成してください。各回答はインデックス番号で始まる必要があります。それらの文は同じであってはなりません。文中の単語が間違っている可能性もあるため、できるだけ正確に推測してください。回答を強調表示しないでください。

      参考までに、このユーザのプロフィールは以下のとおりです:
      {self.PERSONA}

      以下はユーザとその相手との会話の履歴です:
      {self.HISTORY}

      回答:"""
    )

    self.assertEqual(expected_output, self.template.render(user_inputs))


if __name__ == "__main__":
    unittest.main()
