"""Test suite for the WordGeneric Jinja2 template.
"""

import os
import unittest
import jinja2
import textwrap


class TestWordGenericTemplate(unittest.TestCase):
  """Test class for the WordGeneric Jinja2 template."""

  TEMPLATE_FILE = "WordGeneric20240628.jinja2"

  TEXT = "Hello wo"
  NUM = 3
  LANGUAGE = "English"
  LAST_INPUT_SPEECH = "I'm heading to the school."
  LAST_OUTPUT_SPEECH = "Great, let's meet there."
  HISTORY = "User: Where are you? You: On my way."

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
      "language": self.LANGUAGE,
      "lastInputSpeech": None,
      "lastOutputSpeech": None,
      "conversationHistory": None,
    }

    expected_output = textwrap.dedent(f"""\
      Generate a list of {self.NUM} different single words that come right after the given sentence.
      If the last word in the sentence looks incomplete, suggest the succeeding characters without replacing them. Make sure to start with a hyphen in that case. Each answer should be just one word and must start with an index number. The response should be in {self.LANGUAGE}. You should follow the format shown in the example below.

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

      sentence: "{self.TEXT}"
      answers:"""
    )

    self.assertEqual(expected_output, self.template.render(user_inputs))

  def test_last_input_and_output_speech(self):
    user_inputs = {
      "text": self.TEXT,
      "num": self.NUM,
      "language": self.LANGUAGE,
      "lastInputSpeech": self.LAST_INPUT_SPEECH,
      "lastOutputSpeech": self.LAST_OUTPUT_SPEECH,
      "conversationHistory": None,
    }

    expected_output = textwrap.dedent(f"""\
      You are talking with your partner. The conversation is as follows:
      You:
      {self.LAST_OUTPUT_SPEECH}
      Partner:
      {self.LAST_INPUT_SPEECH}

      Considering this context, please guess and generate a list of {self.NUM} single words that come right after the sentence "{self.TEXT}".
      If the last word in the sentence looks incomplete, suggest the succeeding characters without replacing them. Make sure to start with a hyphen in that case. Each answer should be just one word and must start with an index number. The response should be in {self.LANGUAGE}. You should follow the format shown in the example below.

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

      sentence: "{self.TEXT}"
      answers:"""
    )

    self.assertEqual(expected_output, self.template.render(user_inputs))

  def test_with_context(self):
    user_inputs = {
      "text": self.TEXT,
      "num": self.NUM,
      "language": self.LANGUAGE,
      "lastInputSpeech": self.LAST_INPUT_SPEECH,
      "lastOutputSpeech": self.LAST_OUTPUT_SPEECH,
      "conversationHistory": self.HISTORY,
    }

    expected_output = textwrap.dedent(f"""\
      You are talking with your partner. The conversation is as follows:
      You:
      {self.LAST_OUTPUT_SPEECH}
      Partner:
      {self.LAST_INPUT_SPEECH}

      Here is the conversation history:
      {self.HISTORY}

      Considering this context, please guess and generate a list of {self.NUM} single words that come right after the sentence "{self.TEXT}".
      If the last word in the sentence looks incomplete, suggest the succeeding characters without replacing them. Make sure to start with a hyphen in that case. Each answer should be just one word and must start with an index number. The response should be in {self.LANGUAGE}. You should follow the format shown in the example below.

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

      sentence: "{self.TEXT}"
      answers:"""
    )

    self.assertEqual(expected_output, self.template.render(user_inputs))


if __name__ == "__main__":
    unittest.main()
