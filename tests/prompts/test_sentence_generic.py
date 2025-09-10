"""Test suite for the SentenceGeneric Jinja2 template.
"""

import os
import unittest
import jinja2
import textwrap

class TestSentenceGenericTemplate(unittest.TestCase):
  """ Test class for the SentenceGeneric Jinja2 template."""

  TEMPLATE_FILE = 'SentenceGeneric20250311.jinja2'

  TEXT = "how about"
  NUM = 5
  LANGUAGE = "English"
  LAST_INPUT_SPEECH = "Let's go to the park."
  LAST_OUTPUT_SPEECH = "Okay, sounds good."
  HISTORY = "User: What time? You: Around 2 PM."
  PERSONA = "Age: 30, Interests: Hiking, Reading"
  EMOTION = "Statement"

  def setUp(self):
    """Set up the Jinja2 environment."""
    template_dir = os.path.join(os.path.dirname(__file__), '..', '..','templates', 'prompts')
    self.template = jinja2.Environment(
      loader=jinja2.FileSystemLoader(template_dir),
      trim_blocks=True,
      lstrip_blocks=True
    ).get_template(self.TEMPLATE_FILE)

  def test_minimal(self):
    """Test minimal required inputs."""
    user_inputs = {
      "text": self.TEXT,
      "num": self.NUM,
      "language": self.LANGUAGE,
      "lastInputSpeech": None,
      "lastOutputSpeech": None,
      "conversationHistory": None,
      "persona": None,
      "sentenceEmotion": None,
    }

    expected_output = textwrap.dedent(f"""\
      Please guess and generate a list of {self.NUM} different sentences that start with "{self.TEXT}".

      Please note the word I provide may not be complete, so use your best guess. Each answer must start with an index number, and each answer should start with different word to cover wider topics. The response should be in {self.LANGUAGE}. Those sentences should not be the same. Do not highlight answers with asterisk. Since your output will be used as the user's input, do not include any extra notes, labels or explanations in your output.
      The answer should be in {self.LANGUAGE}.

      Answer:"""
    )

    self.assertEqual(expected_output, self.template.render(user_inputs))

  def test_last_input_output_with_history(self):
    """Test with lastInputSpeech, lastOutputSpeech, and conversationHistory."""
    user_inputs = {
      "text": self.TEXT,
      "num": self.NUM,
      "language": self.LANGUAGE,
      "lastInputSpeech": self.LAST_INPUT_SPEECH,
      "lastOutputSpeech": self.LAST_OUTPUT_SPEECH,
      "conversationHistory": self.HISTORY,
      "persona": None,
      "sentenceEmotion": None,
    }

    expected_output = textwrap.dedent(f"""\
      You are talking with your partner. The conversation is as follows:
      You:
      {self.LAST_OUTPUT_SPEECH}
      Partner:
      {self.LAST_INPUT_SPEECH}

      Here is the conversation history:
      {self.HISTORY}

      Considering this context, please guess and generate a list of {self.NUM} different sentences that start with "{self.TEXT}".

      Please note the word I provide may not be complete, so use your best guess. Each answer must start with an index number, and each answer should start with different word to cover wider topics. The response should be in {self.LANGUAGE}. Those sentences should not be the same. Do not highlight answers with asterisk. Since your output will be used as the user's input, do not include any extra notes, labels or explanations in your output.
      The answer should be in {self.LANGUAGE}.

      Answer:"""
    )

    self.assertEqual(expected_output, self.template.render(user_inputs))

  def test_persona(self):
    """When persona is provided without prior conversation, include FYI block."""
    user_inputs = {
      "text": self.TEXT,
      "num": self.NUM,
      "language": self.LANGUAGE,
      "lastInputSpeech": None,
      "lastOutputSpeech": None,
      "conversationHistory": None,
      "persona": self.PERSONA,
      "sentenceEmotion": None,
    }

    expected_output = textwrap.dedent(f"""\
      Please guess and generate a list of {self.NUM} different sentences that start with "{self.TEXT}".

      Please note the word I provide may not be complete, so use your best guess. Each answer must start with an index number, and each answer should start with different word to cover wider topics. The response should be in {self.LANGUAGE}. Those sentences should not be the same. Do not highlight answers with asterisk. Since your output will be used as the user's input, do not include any extra notes, labels or explanations in your output.
      The answer should be in {self.LANGUAGE}.

      FYI: The user's profile is as follows:
      {self.PERSONA}

      Answer:"""
    )

    self.assertEqual(expected_output, self.template.render(user_inputs))

  def test_sentence_emotion(self):
    """Include sentenceEmotion note and ensure placement after the request line."""
    user_inputs = {
      "text": self.TEXT,
      "num": self.NUM,
      "language": self.LANGUAGE,
      "lastInputSpeech": None,
      "lastOutputSpeech": None,
      "conversationHistory": None,
      "persona": None,
      "sentenceEmotion": self.EMOTION,
    }

    expected_output = textwrap.dedent(f"""\
      Please guess and generate a list of {self.NUM} different sentences that start with "{self.TEXT}".

      Note that the user has indicated their intention to input a {self.EMOTION} sentence.

      Please note the word I provide may not be complete, so use your best guess. Each answer must start with an index number, and each answer should start with different word to cover wider topics. The response should be in {self.LANGUAGE}. Those sentences should not be the same. Do not highlight answers with asterisk. Since your output will be used as the user's input, do not include any extra notes, labels or explanations in your output.
      The answer should be in {self.LANGUAGE}.

      Answer:"""
    )

    self.assertEqual(expected_output, self.template.render(user_inputs))

  def test_all_fields_present(self):
    """Test when all inputs are provided (no None values)."""
    user_inputs = {
      "text": self.TEXT,
      "num": self.NUM,
      "language": self.LANGUAGE,
      "lastInputSpeech": self.LAST_INPUT_SPEECH,
      "lastOutputSpeech": self.LAST_OUTPUT_SPEECH,
      "conversationHistory": self.HISTORY,
      "persona": self.PERSONA,
      "sentenceEmotion": self.EMOTION,
    }

    expected_output = textwrap.dedent(f"""\
      You are talking with your partner. The conversation is as follows:
      You:
      {self.LAST_OUTPUT_SPEECH}
      Partner:
      {self.LAST_INPUT_SPEECH}

      Here is the conversation history:
      {self.HISTORY}

      Considering this context, please guess and generate a list of {self.NUM} different sentences that start with "{self.TEXT}".

      Note that the user has indicated their intention to input a {self.EMOTION} sentence.

      Please note the word I provide may not be complete, so use your best guess. Each answer must start with an index number, and each answer should start with different word to cover wider topics. The response should be in {self.LANGUAGE}. Those sentences should not be the same. Do not highlight answers with asterisk. Since your output will be used as the user's input, do not include any extra notes, labels or explanations in your output.
      The answer should be in {self.LANGUAGE}.

      FYI: The user's profile is as follows:
      {self.PERSONA}

      Answer:"""
    )

    self.assertEqual(expected_output, self.template.render(user_inputs))

if __name__ == '__main__':
    unittest.main()
