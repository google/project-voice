"""A simple VOICE simulator (Japanese only).
Usage:
  $ export API_KEY=(API key)
  $ PYTHONPATH=(Path to VOICE app) python -u simple_simulator_ja.py < input.txt
"""

import MeCab
import json
import os
import sys
import traceback
import re

# Debug flag (Set True for print debugging)
DEBUG_LLM_RAW = False  # Raw LLM response
DEBUG_LLM_PARSED = False  # Parsed LLM suggestions
DEBUG_MECAB = False  # MeCab raw output
DEBUG_SIMULATION_STEP = False  # Each step of simulation
DEBUG_STATS_TRANSITION = True  # Stas count for each token

# --- This part is to import macro ---
current_script_path = os.path.abspath(
    __file__)  # Get absolute path of this script
parent_directory = os.path.dirname(os.path.dirname(
    current_script_path))  # Get parent directory path (usa-input)
if parent_directory not in sys.path:  # Add parent directoy if it's not included in sys.path
  sys.path.append(parent_directory)

import macro
# --- macro imported ---

SENTENCE_JA_MACRO_ID = 'SentenceJapanese20240628'  # We also have SentenceJapaneseLong20241002 and we may use it for debugging purposes.
WORD_JA_MACRO_ID = 'WordGeneric20240628'  # WordGeneric20240628 uses English example as the few shot prompt, but it seems it works with Japanese as well.
MODEL_ID = 'gemini-1.5-flash-002'  # To be changed to more recent versions

NUM_SENTENCE_SUGGESTIONS = 2

# To be updated
INITIAL_PHRASES_JA = [
    '私は', 'あなたは', '皆さんは', 'こんにちは', 'すみません', 'ありがとう', 'おはよう', 'こんばんは'
]


# --- Helper Functions ---
def parse_response(response):
  """ Parse the LLM response (JSON) and returns a list of suggestions """
  try:
    if not response:
      print("Error: Empty response from LLM", file=sys.stderr)
      return []
    response_data = json.loads(response)
    if 'messages' in response_data and response_data[
        'messages'] and 'text' in response_data['messages'][0]:
      response_text = response_data['messages'][0]['text']
    else:
      print(
          f"Error: Unexpected response structure: {response}", file=sys.stderr)
      return []

    response_text = response_text.replace('\\\n', '')
    lines = [
        re.sub(r'^\d+\.\s?', '', text.strip())
        for text in response_text.split('\n')
        if text.strip() and re.match(r'^\d+\.', text.strip(
        ))  # Remove the number and dot at the beginning of the sentence
    ]
    return lines
  except json.JSONDecodeError as e:
    print(
        f"Error decoding JSON response: {e}\nResponse: {response}",
        file=sys.stderr)
    return []
  except Exception as e:
    print(f"Error parsing response: {e}\nResponse: {response}", file=sys.stderr)
    return []


def word_suggestions(text_context):
  user_input = {'language': 'Japanese', 'num': '5', 'text': text_context}
  response = macro.RunMacro(WORD_JA_MACRO_ID, user_input, 0, MODEL_ID)
  if DEBUG_LLM_RAW:
    print(f"DEBUG LLM word_suggestions response for '{text_context}':",
          repr(response))
  parsed_suggestions = parse_response(response)
  if DEBUG_LLM_PARSED:
    print(f"DEBUG Parsed word suggestions:", parsed_suggestions)
  return parsed_suggestions


def sentence_suggestions(text):
  user_input = {'language': 'Japanese', 'num': '5', 'text': text}
  response = macro.RunMacro(SENTENCE_JA_MACRO_ID, user_input, 0, MODEL_ID)
  if DEBUG_LLM_RAW:
    print(f"DEBUG LLM sentence_suggestions response for '{text}':",
          repr(response))
  parsed_suggestions = parse_response(response)
  if DEBUG_LLM_PARSED:
    print(f"DEBUG Parsed sentence suggestions:", parsed_suggestions)
  return parsed_suggestions[0:NUM_SENTENCE_SUGGESTIONS]


#TODO: Get the reading of kanji using MeCab yomigana feature
def katakana_to_hiragana(text):
  """Converts Katakana to Hiragana."""
  return ''.join(chr(ord(ch) - 0x60) if 'ァ' <= ch <= 'ン' else ch for ch in text)


def normalize(text):  # In case text contains alhpabet
  """Normalizes text by converting Katakana to Hiragana (and potentially lowercase)."""
  # Lowercasing doesn't significantly affect Japanese but kept for consistency if mixing Japanese and English scripts
  return katakana_to_hiragana(text.lower())


def initialize_mecab_tagger():
  """ Initialize MeCab Tagger object """
  mecab = None
  try:
    # 1. try default path
    mecab = MeCab.Tagger()
    print("INFO: MeCab Tagger initialized with default settings.")
  except RuntimeError as e1:
    print(
        f"WARN: Failed to initialize MeCab with default settings: {e1}",
        file=sys.stderr)
    # 2. try homebew path
    mecab_rc_path_fallback = "-r /opt/homebrew/etc/mecabrc"
    print(f"INFO: Trying fallback MeCab path: {mecab_rc_path_fallback}")
    try:
      mecab = MeCab.Tagger(mecab_rc_path_fallback)
      print(f"INFO: MeCab Tagger initialized with fallback path.")
    except RuntimeError as e2:
      print(
          f"FATAL ERROR: Failed to initialize MeCab Tagger with both default and fallback path: {e2}",
          file=sys.stderr)
      print(
          "Please ensure MeCab is installed correctly and the path is accessible.",
          file=sys.stderr)
      return None  # or sys.exit(1)
  except ImportError:
    print(
        "FATAL ERROR: python-mecab library not found. Please install it.",
        file=sys.stderr)
    # sys.exit(1)
    return None
  return mecab


def tokenize_japanese(text, mecab_tagger):
  if not mecab_tagger:
    print("ERROR: MeCab tagger object is not valid.", file=sys.stderr)
    return []
  ## """Split the sentence using MeCab and returns list of surface forms"""
  ## # !!! IMPORTANT: Adjust this path to your MeCab resource file !!!
  ## mecab_rc_path = "-r /opt/homebrew/etc/mecabrc"
  ## # If using default dictionary directly (alternative):
  ## # mecab_dic_path = "-d /opt/homebrew/lib/mecab/dic/ipadic"
  ## try:
  ##     mecab = MeCab.Tagger(mecab_rc_path) # Or use mecab_dic_path
  ## except RuntimeError as e:
  ##     print(f"FATAL ERROR: Failed to initialize MeCab Tagger: {e}", file=sys.stderr)
  ##     print(f"Please ensure MeCab is installed correctly and the path '{mecab_rc_path}' is correct.", file=sys.stderr)
  ##     sys.exit(1)

  parsed = mecab_tagger.parse(text)
  if parsed is None:
    print(
        "ERROR: mecab.parse(text) returned None for text:",
        repr(text),
        file=sys.stderr)
    return []

  # --- Keep this print for now to see MeCab's raw output ---
  if DEBUG_MECAB:
    print(f"DEBUG MeCab Raw Output for '{text}':\n", repr(parsed))
  # ---

  tokens = []
  for line in parsed.splitlines():
    if line == 'EOS':
      break
    # MeCab output consists of Surface form and Features separated by a tab.
    # Surface form is the first part of MeCab output before the tab.
    # Features consists of eight elements, but we may only use Yomigana (features[7] after splitting cols[1] by comma).
    # Yomigana can also be obtained as MeCab.Tagger("-Oyomi")
    cols = line.split('\t')
    if len(cols) >= 1 and cols[0]:
      surface = cols[0]
      tokens.append(surface)
  return tokens


def common_prefix(target_tokens, text_tokens):
  """Finds the longest common starting sequence between two token lists."""
  i = 0
  while i < len(target_tokens) and i < len(text_tokens):
    if target_tokens[i] != text_tokens[i]:
      break
    i += 1
  return target_tokens[:i]


# --- End Helper Functions ---


# --- Main Simulation Function ---
def simulate_japanese(target, mecab_tagger):
  """Simulates typing a target Japanese sentence using suggestions."""
  if not mecab_tagger:
    print(
        "ERROR: MeCab tagger not provided to simulate_japanese.",
        file=sys.stderr)
    return None
  if DEBUG_SIMULATION_STEP:
    print('Target sentence:', target)
  target_tokens = tokenize_japanese(target, mecab_tagger)
  if not target_tokens:
    print("ERROR: Target sentence could not be tokenized.", file=sys.stderr)
    return
  if DEBUG_SIMULATION_STEP:
    print('Target token:', target_tokens)

  # --- Start Initial Phase ---
  text_tokens = []
  total_clicks = 0
  sentence_count = 0
  word_count = 0
  char_count = 0
  best_match_tokens = []
  best_match_phrase = ""

  if DEBUG_SIMULATION_STEP:
    print("DEBUG: Checking initial phrases...")
  for phrase in INITIAL_PHRASES_JA:
    match_condition = target.startswith(phrase)

    if match_condition:
      if DEBUG_SIMULATION_STEP:
        print(f"DEBUG: Phrase '{phrase}' matches start of target.")
      # Check if this match is longer than the previous best match
      if len(phrase) > len(best_match_phrase):
        current_match_tokens = tokenize_japanese(
            phrase, mecab_tagger)  # Gets surface tokens
        # Ensure token sequence also matches target prefix
        if target_tokens[:len(current_match_tokens)] == current_match_tokens:
          best_match_phrase = phrase
          best_match_tokens = current_match_tokens
          if DEBUG_SIMULATION_STEP:
            print(
                f"DEBUG: Found new best initial phrase match: '{phrase}', tokens: {best_match_tokens}"
            )
        else:
          if DEBUG_SIMULATION_STEP:
            print(
                f"DEBUG: Phrase '{phrase}' matches start string but not token sequence."
            )

  if best_match_tokens:  # If a best match was found after checking all phrases
    text_tokens = best_match_tokens
    cost_added = 1
    total_clicks += cost_added
    added_text = best_match_phrase
    if DEBUG_STATS_TRANSITION:
      print(
          f"  [STATS] Initial Phrase      : clicks +{cost_added} -> {total_clicks} (Added: '{added_text}')"
      )
    if DEBUG_SIMULATION_STEP:
      print(f'Initial Word Match: {best_match_phrase}')
      print(
          f"DEBUG: Initial text_tokens set to {text_tokens}, clicks = {total_clicks}"
      )
  else:  # No initial phrase matched
    if DEBUG_SIMULATION_STEP:
      print("DEBUG: No initial phrase matched.")
    # Fallback to first token input
    if target_tokens:
      first_token = target_tokens[0]
      text_tokens = [first_token]
      cost_added = 2  # or cost based on Yomigana
      total_clicks += cost_added
      char_count += 1
      added_token = first_token
      if DEBUG_STATS_TRANSITION:
        print(
            f"  [STATS] Initial Fallback    : clicks +{cost_added} -> {total_clicks}, fb_tok_c +1 -> {char_count} (Added: '{added_token})"
        )
      if DEBUG_SIMULATION_STEP:
        print(f'Token input: {first_token}')
        print(
            f"DEBUG: text_tokens set to {text_tokens}, clicks = {total_clicks}")
    else:
      if DEBUG_SIMULATION_STEP:
        print("DEBUG: Target is empty, cannot initialize.")
      return
  # --- End Initial Phase ---

  # --- Start Main While Loop ---
  while text_tokens != target_tokens:
    text = "".join(text_tokens)
    if DEBUG_SIMULATION_STEP:
      print('\nCurrent input:', text)

    # --- Sentence Suggestion ---
    sentences = sentence_suggestions(text)
    selected = None
    longest_prefix_len = len(text_tokens)

    for s in sentences:
      s_tokens = tokenize_japanese(s, mecab_tagger)  # Gets surface tokens
      prefix = common_prefix(target_tokens, s_tokens)
      # Select if prefix is longer than current input AND longest found so far
      if len(prefix) > longest_prefix_len:
        selected = prefix
        longest_prefix_len = len(prefix)

    if selected:
      added_tokens_data = selected[len(text_tokens):]
      text_tokens = selected
      cost_added = 1
      total_clicks += cost_added
      sentence_count += 1
      added_text_string = "".join(added_tokens_data)
      if DEBUG_STATS_TRANSITION:
        print(
            f"  [STATS] Sentence Suggestion : clicks +{cost_added} -> {total_clicks}, sent_c +1 -> {sentence_count} (Added: '{added_text_string}')"
        )
      if DEBUG_SIMULATION_STEP:
        print('Select sentence suggestion:', selected)
      continue

    # --- Word Suggestion ---
    word_selected = False
    if text_tokens:
      current_context = "".join(text_tokens)
      candidates = word_suggestions(current_context)

      for word in candidates:
        word_tokens = tokenize_japanese(word, mecab_tagger)
        if not word_tokens:
          continue

        start_index = len(text_tokens)
        end_index = start_index + len(word_tokens)

        if end_index > len(target_tokens):
          continue

        if target_tokens[start_index:end_index] == word_tokens:
          text_tokens += word_tokens
          cost_added = 1
          total_clicks += cost_added
          word_count += 1
          added_text = "".join(word_tokens)
          if DEBUG_STATS_TRANSITION:
            print(
                f"  [STATS] Word Suggestion     : clicks +{cost_added} -> {total_clicks}, word_c +1 -> {word_count} (Added: '{added_text}')"
            )
          if DEBUG_SIMULATION_STEP:
            print('Select word suggestion:', word)
            print(' -> Tokens added:', word_tokens)
          word_selected = True
          break

      if word_selected:
        continue

    # --- Character (Token) Input Fallback ---
    if len(text_tokens) >= len(target_tokens):
      print(
          "DEBUG: Reached target length unexpectedly? Breaking loop.",
          file=sys.stderr)
      break
    # Append the next required surface token
    #TODO: Make the cost calculation accurate
    next_token = target_tokens[len(text_tokens)]
    text_tokens.append(next_token)
    cost_added = 2
    total_clicks += cost_added  # Cost for direct token input
    char_count += 1
    added_text = next_token
    if DEBUG_STATS_TRANSITION:
      print(
          f"  [STATS] Direct Input        : clicks +{cost_added} -> {total_clicks}, char_c +1 -> {char_count} (Added: '{added_text}')"
      )
    if DEBUG_SIMULATION_STEP:
      print('Next Token:', next_token)

  # --- Results ---
  #print('\n---Results---')
  #print('Number of clicks:', total_clicks)
  #print('Number of Sentence Suggestions Used:', sentence_count)
  #print('Number of Word Suggestions Used:', word_count)
  #print('Direct Char Input:', char_count)
  target_char_length = len("".join(target_tokens))

  return [
      total_clicks, sentence_count, word_count, char_count, target_char_length
  ]


# --- End Main Simulation Function ---


def main():
  total_target_char_length = 0
  total_total_clicks = 0
  total_sentence_count = 0
  total_word_count = 0
  total_char_count = 0
  line_count = 0

  mecab_tagger = initialize_mecab_tagger()
  if not mecab_tagger:
    print("MeCab Tagger initialization failed. Exiting.")
    return  # or sys.exit(1)

  print("--- Starting Simulation from Standard Input ---")
  # Initial terminal message
  print("Enter Japanese sentence")
  print("Enter Ctrl+D (Mac/Linux) or Ctrl+Z -> Enter (Windows) to show results")
  print("-" * 40)

  # Initial prompt
  print("Enter>", end=' ', flush=True)

  for line in sys.stdin:
    target_sentence = line.rstrip('\n')
    if not target_sentence:
      print("Enter>", end=' ', flush=True)
      continue

    line_count += 1
    print(f"\n[Processing line {line_count}] -> {target_sentence}")

    stats = simulate_japanese(target_sentence, mecab_tagger)
    if stats is not None:
      clicks, s_count, w_count, c_count, target_len = stats

      total_target_char_length += target_len
      total_total_clicks += clicks
      total_sentence_count += s_count
      total_word_count += w_count
      total_char_count += c_count

      # print(f"  Results: Clicks={clicks}, Sentence={s_count}, Word={w_count}, Fallback={c_count}, Len={target_len}")

    else:
      print(f"  [line {line_count}] Failed")

    print("-" * 40)
    print("Enter next line of finish simulation by Ctrl+D / Ctrl+Z+Enter")
    print("Enter>", end=' ', flush=True)

  print("\n\n" + "=" * 40)
  print("--- Cummulative Results ---")
  if line_count > 0:
    print(f"Processed lines: {line_count}")
    print_cumulative_stats(total_target_char_length, total_total_clicks,
                           total_sentence_count, total_word_count,
                           total_char_count)
  else:
    print("Empty Input")
  print("=" * 40)


def print_cumulative_stats(total_len, total_clicks, s_count, w_count, c_count):
  """ Helper function for printing stats """
  print(f'Total Target Length: {total_len} characters')
  print(f'Total Clicks: {total_clicks}')
  print(f'Total Sentence Suggestions Used: {s_count}')
  print(f'Total Word Suggestions Used: {w_count}')
  print(f'Total Tokens Typed via Fallback: {c_count}')

  if total_clicks > 0:
    avg_chars_per_click = total_len / total_clicks
    print(f'Average Chars/Click: {avg_chars_per_click:.2f}')

    # Calculate suggestion select rate (based on events: sentence, word, direct input)
    # Initial phrase is counted in simulate_japanese separately: need to be returned if required or just plus one (it seems always no more than +1)
    total_events = s_count + w_count + c_count  # Without initial
    if total_events > 0:
      suggestion_rate = (s_count + w_count) / total_events
      print(
          f'Suggestion Select Rate (Sentence+Word / Total Events): {suggestion_rate:.2%}'
      )

    # Calculate selections (1 fallback token = 1 selection)
    total_selections = s_count + w_count + c_count  # Without initial
    if total_selections > 0:
      avg_chars_per_selection = total_len / total_selections
      print(
          f'Total Selections (Suggestion or Fallback Token): {total_selections}'
      )
      print(f'Average Chars/Selection: {avg_chars_per_selection:.2f}')

  else:
    print('Metrics based on clicks/selections: N/A (0 clicks/selections)')


if __name__ == '__main__':
  try:
    main()
    #print("--- Running Test Case ---")
    #simulate_japanese("こんにちは。今日もいい天気ですね。")
    #print("\n" + "="*40 + "\n") # Separator
  except Exception as e:
    print(f"\n--- AN ERROR OCCURRED ---", file=sys.stderr)
    traceback.print_exc()
