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
"""A simple VOICE simulator (English only).

Usage:
  $ export API_KEY=(API key)
  $ PYTHONPATH=(Path to VOICE app) python -u simple_simulator.py < input.txt
"""

import json
import re
import sys

import macro

SENTENCE_MACRO_ID = 'SentenceEnglish20240703'
WORD_MACRO_ID = 'WordGeneric20240628'
MODEL_ID = 'gemini-1.5-flash-002'

NUM_SENTENCE_SUGGESTIONS = 2

INITIAL_PHRASES = [
    'I',
    'You',
    'They',
    'What',
    'Why',
    'When',
    'Where',
    'How',
    'Who',
    'Can',
    'Could you',
    'Would you',
    'Do you',
]


def parse_response(response):
  response_text = json.loads(response)['messages'][0]['text']
  response_text = response_text.replace('\\\n', '')
  lines = [
      re.sub(r'^\d+\.\s?', '', text.strip())
      for text in response_text.split('\n')
      if re.match(r'^\d+\.', text)
  ]
  return lines


def word_suggestions(text):
  user_input = {'language': 'English', 'num': '5', 'text': text}
  response = macro.RunMacro(WORD_MACRO_ID, user_input, 0, MODEL_ID)
  return parse_response(response)


def sentence_suggestions(text):
  user_input = {'language': 'English', 'num': '5', 'text': text}
  response = macro.RunMacro(SENTENCE_MACRO_ID, user_input, 0, MODEL_ID)
  return parse_response(response)[0:NUM_SENTENCE_SUGGESTIONS]


def tokenize(sentence):
  tokens = filter(lambda x: x, sentence.split(' '))
  # Split punctuations from preceding words.
  results = []
  for token in tokens:
    m = re.match(r'^(.*[^.,!?])([.,!?]+)$', token)
    if m:
      results.append(m.group(1))
      results.append(m.group(2))
    else:
      results.append(token)
  return results


def common_prefix(s1, s2):
  i = 0
  for (c1, c2) in zip(s1, s2):
    if c1.lower() != c2.lower():
      break
    i += 1
  return s1[:i]


def select_from_sentence_suggestions(target_tokens, text_tokens, sentences):
  result = []
  for sentence in sentences:
    prefix = common_prefix(target_tokens, tokenize(sentence))
    if len(prefix) > len(result):
      result = prefix
  if len(result) > len(common_prefix(target_tokens, text_tokens)):
    return result
  return None


def select_from_word_suggestions(target_tokens, text_tokens, words):
  wanted_suggestion = None
  l = len(text_tokens) - 1  # Last index
  if target_tokens[l].lower() == text_tokens[l].lower():
    wanted_suggestion = target_tokens[l + 1]
  else:
    wanted_suggestion = "-" + target_tokens[l][len(text_tokens[l]):]
  if wanted_suggestion in words:
    return wanted_suggestion
  return None


def join_tokens(tokens):
  text = ' '.join(tokens) + ' '
  # Remove spaces before punctuations.
  return re.sub(r' ([.,!?]+)(?= |$)', r'\1', text)


def simulate(target):

  print('target:', target)
  target_tokens = tokenize(target)

  char_count = 0
  word_count = 0
  sentence_count = 0
  initial_phrase_count = 0

  word_len = 0
  sentence_len = 0

  for phrase in INITIAL_PHRASES:
    if target.lower().startswith(phrase.lower()):
      # Is this OK...?
      text = phrase + ' '
      initial_phrase_count += 1
      print('initial phrase:', phrase)
      break
  if initial_phrase_count == 0:
    text = target[:1]
    print('input char:', target[:1])
    char_count += 1

  while not text.lower().startswith(target.lower()):
    print('text:', text + '$')

    text_tokens = tokenize(text)

    sentences = sentence_suggestions(text)
    print('sentence suggestions:', sentences)
    selected_sentence = select_from_sentence_suggestions(
        target_tokens, text_tokens, sentences)
    if selected_sentence:
      print('selected sentence:', selected_sentence)
      text_len = len(text)
      text = join_tokens(selected_sentence)
      sentence_count += 1
      sentence_len += len(text) - text_len
      continue

    words = word_suggestions(text)
    print('word suggestions:', words)
    selected_word = select_from_word_suggestions(target_tokens, text_tokens,
                                                 words)
    if selected_word:
      print('selected word:', selected_word)
      text_len = len(text)
      if selected_word[0] == '-':
        text = join_tokens(text_tokens[:-1] +
                           [text_tokens[-1] + selected_word[1:]])
      else:
        text = join_tokens(text_tokens + [selected_word])
      word_count += 1
      word_len += len(text) - text_len
      continue

    l = len(text_tokens) - 1
    if text_tokens[l].lower() == target_tokens[l].lower():
      text = join_tokens(text_tokens + [target_tokens[l + 1][0]]).rstrip()
      print('input char:', target_tokens[l + 1][0])
    else:
      next_char = target_tokens[l][len(text_tokens[l])]
      text_tokens[l] += next_char
      text = join_tokens(text_tokens).rstrip()
      print('input char:', next_char)
      # Look ahead next token and insert a space if needed.
      if text_tokens[l].lower() == target_tokens[l].lower() and len(
          target_tokens) > len(text_tokens) and not re.match(
              r'^[.,!?].*', target_tokens[l + 1]):
        char_count += 1
        print('input space')
    # Note that two clicks are needed to input one character.
    char_count += 1

  print('input_len:', len(text), 'initial_phrase_count:', initial_phrase_count,
        'char_count:', char_count, 'word_count:', word_count, 'word_len:',
        word_len, 'sentence_count:', sentence_count, 'sentence_len:',
        sentence_len)

  return [
      len(text), initial_phrase_count, char_count, word_count, word_len,
      sentence_count, sentence_len
  ]


def main():
  total_len = 0
  char_count = 0
  word_count = 0
  sentence_count = 0
  initial_phrase_count = 0
  word_len = 0
  sentence_len = 0
  for line in sys.stdin:
    [t, i, c, wc, wl, sc, sl] = simulate(line.rstrip('\n'))
    total_len += t
    initial_phrase_count += i
    char_count += c
    word_count += wc
    sentence_count += sc
    word_len += wl
    sentence_len += sl

    # TODO: Emit the result more reliable way and only when necessary.
    print('total len:', total_len, 'initial_phrase_count:',
          initial_phrase_count, 'char_count:', char_count, 'word_count:',
          word_count, 'word_len:', word_len, 'sentence_count:', sentence_count,
          'sentence_len:', sentence_len)
    print('total clicks:',
          char_count * 2 + word_count + sentence_count + initial_phrase_count)
    print(
        'average chars per click:', total_len /
        (char_count * 2 + word_count + sentence_count + initial_phrase_count))
    print('suggestion select rate:', (word_count + sentence_count) /
          (char_count + word_count + sentence_count + initial_phrase_count))
    # Calculate metrics that count one char selection as one for comparison
    # with more conventional input methods.
    print('total selections:',
          char_count + word_count + sentence_count + initial_phrase_count)
    print(
        'average chars per selection:', total_len /
        (char_count + word_count + sentence_count + initial_phrase_count))


if __name__ == '__main__':
  main()
