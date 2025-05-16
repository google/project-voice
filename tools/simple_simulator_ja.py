"""A simple VOICE simulator (Japanese only).
Usage:
  $ export API_KEY=(API key)
  $ PYTHONPATH=(Path to VOICE app) python -u simple_simulator_ja.py < input.txt
End simulation by typing Ctrl+D
"""

import MeCab
import json
import os
import sys
import traceback
import re
import tinysegmenter

# Debug flag (Set True for print debugging)
DEBUG_LLM_RAW = False  # Raw LLM response
DEBUG_LLM_PARSED = False  # Parsed LLM suggestions
DEBUG_MECAB = False  # MeCab raw output
DEBUG_SIMULATION_STEP = False  # Each step of simulation
DEBUG_STATS_TRANSITION = True  # Stas count for each token
DEBUG_TOKENIZER_OUTPUT = False # TinySegmenter output
DEBUG_YOMIGANA = False # Yomigana from MeCab

# --- This part is to import macro ---
current_script_path = os.path.abspath(__file__)  # Get absolute path of this script
parent_directory = os.path.dirname(os.path.dirname(current_script_path))  # Get parent directory path (usa-input)
if parent_directory not in sys.path:  # Add parent directoy if it's not included in sys.path
  sys.path.append(parent_directory)

import macro
# --- macro imported ---

SENTENCE_JA_MACRO_ID = 'SentenceJapanese20240628'
WORD_JA_MACRO_ID = 'WordGeneric20240628'
# MODEL_ID = 'gemini-1.5-flash-002'
MODEL_ID = 'gemini-2.0-flash-001'

NUM_SENTENCE_SUGGESTIONS = 2

INITIAL_PHRASES_JA = [
  'はい', 'いいえ', 'ありがとう', 'すみません', 'お願いします', '私', 'あなた', '彼', '彼女', '今日', '昨日', '明日'
]

# --- Helper Functions ---
def parse_response(response):
  """ Parse the LLM response (JSON) and returns a list of suggestions """
  try:
    if not response:
      print("Error: Empty response from LLM", file=sys.stderr)
      return []
    response_data = json.loads(response)
    if 'messages' in response_data and response_data['messages'] and 'text' in response_data['messages'][0]:
      response_text = response_data['messages'][0]['text']
    else:
      print(f"Error: Unexpected response structure: {response}", file=sys.stderr)
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
    print(f"Error decoding JSON response: {e}\nResponse: {response}", file=sys.stderr)
    return []
  except Exception as e:
    print(f"Error parsing response: {e}\nResponse: {response}", file=sys.stderr)
    return []

def word_suggestions(text_context):
  user_input = {'language': 'Japanese', 'num': '5', 'text': text_context}
  response = macro.RunMacro(WORD_JA_MACRO_ID, user_input, 0, MODEL_ID)
  if DEBUG_LLM_RAW:
    print(f"DEBUG LLM word_suggestions response for '{text_context}':", repr(response))
  parsed_suggestions = parse_response(response)
  if DEBUG_LLM_PARSED:
    print(f"DEBUG Parsed word suggestions:", parsed_suggestions)
  return parsed_suggestions

def sentence_suggestions(text):
  user_input = {'language': 'Japanese', 'num': '5', 'text': text}
  response = macro.RunMacro(SENTENCE_JA_MACRO_ID, user_input, 0, MODEL_ID)
  if DEBUG_LLM_RAW:
    print(f"DEBUG LLM sentence_suggestions response for '{text}':", repr(response))
  parsed_suggestions = parse_response(response)
  if DEBUG_LLM_PARSED:
    print(f"DEBUG Parsed sentence suggestions:", parsed_suggestions)
  return parsed_suggestions[0:NUM_SENTENCE_SUGGESTIONS]

def katakana_to_hiragana(text):
  """Converts Katakana to Hiragana."""
  return ''.join(chr(ord(ch) - 0x60) if 'ァ' <= ch <= 'ン' else ch for ch in text)

def normalize(text):  # In case text contains alhpabet
  """Normalizes text by converting Katakana to Hiragana (and potentially lowercase)."""
  # Lowercasing doesn't significantly affect Japanese but kept for consistency if mixing Japanese and English scripts
  return katakana_to_hiragana(text.lower())

def initialize_tiny_segmenter():
  """Initialize TinySegmenter."""
  try:
    segmenter = tinysegmenter.TinySegmenter()
    return segmenter
  except Exception as e:
    print(f"FATAL ERROR: Failed to initialize TinySegmenter: {e}", file=sys.stderr)
    print("Ensure 'tinysegmenter' is installed (e.g., pip install tinysegmenter).", file=sys.stderr)
    return None

def initialize_mecab_tagger():
  """ Initialize MeCab Tagger object """
  mecab = None
  try:
    # 1. try default path
    mecab = MeCab.Tagger()
  except RuntimeError as e1:
    # 2. try homebew path
    mecab_rc_path_fallback = "-r /opt/homebrew/etc/mecabrc"
    try:
      mecab = MeCab.Tagger(mecab_rc_path_fallback)
    except RuntimeError as e2:
      print(
        f"FATAL ERROR: Failed to initialize MeCab Tagger with both default and fallback path: {e2}",
        file=sys.stderr)
      print(
        f"       (Initial attempt with default path also failed: {e1})",
        file=sys.stderr)
      print(
        "Please ensure MeCab is installed correctly and the path is accessible.",
        file=sys.stderr)
      return None
    except ImportError:
      print(
        "FATAL ERROR: mecab-python3 not found. Please install it (e.g., pip install mecab-python3).",
        file=sys.stderr)
      return None
  return mecab

def get_yomigana(surface_token, mecab_tagger):
  """
  Get the Hiragana reading (yomigana) of a surface token using MeCab.
  Falls back to the original token if yomigana is not found or applicable.
  """
  if not mecab_tagger:
    print("ERROR: MeCab tagger not available for yomigana.", file=sys.stderr)
    return katakana_to_hiragana(surface_token)

  if not surface_token.strip():
    return ""

  try:
    parsed_nodes = mecab_tagger.parse(surface_token)
    if DEBUG_MECAB:
      print(f"DEBUG MeCab yomigana parse for '{surface_token}':\n{repr(parsed_nodes)}")

    lines = parsed_nodes.splitlines()
    if lines:
      first_node_line = lines[0]
      if first_node_line == 'EOS':
        if DEBUG_YOMIGANA:
          print(f"DEBUG Yomigana: EOS for '{surface_token}', returning surface.")
        return katakana_to_hiragana(surface_token)
          
      parts = first_node_line.split('\t')
      if len(parts) > 1:
        features = parts[1].split(',')
        if len(features) > 7 and features[7] != '*':
          yomi = features[7]
          if DEBUG_YOMIGANA:
            print(f"DEBUG Yomigana: Extracted '{yomi}' for '{surface_token}' from features: {features}")
          return katakana_to_hiragana(yomi)
        elif len(features) > 0 and parts[0] == features[0] and features[0] != '*':
          if DEBUG_YOMIGANA:
            print(f"DEBUG Yomigana: Using feature[0] '{features[0]}' for '{surface_token}' as yomi.")
          return katakana_to_hiragana(features[0])
      if DEBUG_YOMIGANA:
        print(f"DEBUG Yomigana: No yomigana found for '{surface_token}', returning surface.")
      return katakana_to_hiragana(surface_token)

  except Exception as e:
    print(f"ERROR: Exception during yomigana extraction for '{surface_token}': {e}", file=sys.stderr)
    traceback.print_exc()
    return katakana_to_hiragana(surface_token)
    
def get_sentence_yomigana(text, mecab_tagger):
  """
  Get the yomigana of the whole target sentence from MeCab yomigana.
  Calculates the keystroke input cost to compare with simulator input cost
  """
  try:
    mecab_tagger.parse('')
    node = mecab_tagger.parseToNode(text)
    sentence_yomigana = ""

    while node:
      features = node.feature.split(',')
      if len(features) > 7 and features[7] != '*':
        sentence_yomigana += katakana_to_hiragana(features[7])
      elif node.surface:
        sentence_yomigana += node.surface
      node = node.next
    return sentence_yomigana
  except Exception as ae:
    print(f"ERROR: Exception in get_sentence_yomigana: {e}", file=sys.stderr)
    traceback.print_exc()
    return ""

def tokenize_with_tinysegmenter(text, tiny_segmenter):
  """
  Tokenizes text using TinySegmenter and returns a list of surface strings.
  """
  if not tiny_segmenter:
    print("ERROR: TinySegmenter not available. Falling back to char split.", file=sys.stderr)
    return [char for char in text] # Fallback to character list

  surface_tokens = tiny_segmenter.tokenize(text)
  if DEBUG_TOKENIZER_OUTPUT:
    print(f"DEBUG TinySegmenter Output for '{text}':\n", surface_tokens)
  return surface_tokens

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
def simulate_japanese(target, tiny_segmenter, mecab_tagger):
  if not tiny_segmenter:
    print("ERROR: TinySegmenter not provided to simulate_japanese.", file=sys.stderr)
    return None

  if DEBUG_SIMULATION_STEP:
    print('Target sentence:', target)
  # Tokenize to list of surface strings
  target_tokens = tokenize_with_tinysegmenter(target, tiny_segmenter)
  if not target_tokens and target:
    print(f"WARN: Tokenizer returned empty list for non-empty target: '{target}'. Using char split.", file=sys.stderr)
    target_tokens = [char for char in target]
  elif not target_tokens and not target:
    if DEBUG_SIMULATION_STEP:
      print("Target is an empty string.")
    return [0,0,0,0,0]
  if DEBUG_SIMULATION_STEP:
    print('Target tokens (TS surface):', target_tokens)

  # --- Start Initial Phase ---
  text_tokens = []
  total_clicks = 0
  sentence_suggestion_used = 0
  word_suggestion_used = 0
  fallback_token_event_count = 0 # Counts how many times fallback occurred
  best_match_tokens = []
  best_match_phrase = ""

  if DEBUG_SIMULATION_STEP:
    print("DEBUG: Checking initial phrases...")
  for phrase in INITIAL_PHRASES_JA:
    if target.startswith(phrase):
      if DEBUG_SIMULATION_STEP:
        print(f"DEBUG: Phrase '{phrase}' matches start of target surface.")
      if len(phrase) > len(best_match_phrase):
        current_match_tokens = tokenize_with_tinysegmenter(phrase, tiny_segmenter)
        # Compare lists of surface strings
        if target_tokens[:len(current_match_tokens)] == current_match_tokens:
          best_match_phrase = phrase
          best_match_tokens = current_match_tokens
          if DEBUG_SIMULATION_STEP:
            print(f"DEBUG: Found new best initial phrase match: '{phrase}', tokens: {best_match_tokens}")

  if best_match_tokens:
    text_tokens = best_match_tokens
    cost_added = 1
    total_clicks += cost_added
    word_suggestion_used += 1
    added_text = "".join(best_match_tokens)
    if DEBUG_STATS_TRANSITION:
      print(f"  [STATS] Initial Phrase      : clicks +{cost_added} -> {total_clicks} (Added: '{added_text}')")
  else: # No initial phrase matched
    if DEBUG_SIMULATION_STEP:
      print("DEBUG: No initial phrase matched.")
    if target_tokens:
      first_token = target_tokens[0]
      text_tokens = [first_token]
      cost_added = 2
      total_clicks += cost_added
      fallback_token_event_count += 1
      if DEBUG_STATS_TRANSITION:
        print(
          f"  [STATS] Initial Fallback    : clicks +{cost_added} -> {total_clicks}, fb_events +1 -> {fallback_token_event_count} (Added: '{first_token}')"
          )
    else: # Target was empty and no initial phrases (should have been caught earlier if target_tokens was empty)
      if DEBUG_SIMULATION_STEP:
        print("DEBUG: Target is empty, cannot initialize further.")
      return [0,0,0,0,0]

  # --- Start Main While Loop ---
  while text_tokens != target_tokens:
    current_text_surface = "".join(text_tokens)
    if DEBUG_SIMULATION_STEP:
      print(f'\nCurrent input surface: "{current_text_surface}" (Tokens: {text_tokens})')

    # --- Sentence Suggestion ---
    suggested_sentences = sentence_suggestions(current_text_surface if text_tokens else "")
    selected_sentence_tokens = None
    longest_prefix_len = len(text_tokens)

    for s in suggested_sentences:
      s_tokens = tokenize_with_tinysegmenter(s, tiny_segmenter)
      if not s_tokens: continue
      prefix = common_prefix(target_tokens, s_tokens)
      if len(prefix) > longest_prefix_len:
        if prefix[:len(text_tokens)] == text_tokens:
          selected_sentence_tokens = prefix
          longest_prefix_len = len(prefix)

    if selected_sentence_tokens:
      added_tokens_data = selected_sentence_tokens[len(text_tokens):]
      text_tokens = selected_sentence_tokens
      cost_added = 1
      total_clicks += cost_added
      sentence_suggestion_used += 1
      added_text_string = "".join(added_tokens_data)
      if DEBUG_STATS_TRANSITION:
        print(
        f"  [STATS] Sentence Suggestion : clicks +{cost_added} -> {total_clicks}, sent_c +1 -> {sentence_suggestion_used} (Added: '{added_text_string}')"
        )
      if "".join(text_tokens) == target:
        break
      continue

    # --- Word Suggestion ---
    word_selected = False
    if len(text_tokens) < len(target_tokens):
      candidates = word_suggestions(current_text_surface)
      for word_candidate_surface in candidates:
        # A word candidate might be multiple tiny_segmenter tokens
        word_candidate_tokens = tokenize_with_tinysegmenter(word_candidate_surface, tiny_segmenter)
        if not word_candidate_tokens: continue

        start_index = len(text_tokens)
        end_index = start_index + len(word_candidate_tokens)
        if end_index <= len(target_tokens) and target_tokens[start_index:end_index] == word_candidate_tokens:
          text_tokens.extend(word_candidate_tokens)
          cost_added = 1
          total_clicks += cost_added
          word_suggestion_used += 1
          added_text = "".join(word_candidate_tokens)
          if DEBUG_STATS_TRANSITION:
            print(
            f"  [STATS] Word Suggestion     : clicks +{cost_added} -> {total_clicks}, word_c +1 -> {word_suggestion_used} (Added: '{added_text}')"
            )
          word_selected = True
          break
      if word_selected:
        if "".join(text_tokens) == target:
          break
        continue

    # --- Token Input Fallback (Character-by-character with yomigana and LLM checks) ---
    if len(text_tokens) >= len(target_tokens):
      if "".join(text_tokens) != target and DEBUG_SIMULATION_STEP:
        print(f"DEBUG: Loop condition issue or mismatch. Current: '{''.join(text_tokens)}', Target: '{target}'", file=sys.stderr)
      break

    next_target_surface_token = target_tokens[len(text_tokens)]
    if DEBUG_SIMULATION_STEP:
      print(f"DEBUG: Fallback for target token: '{next_target_surface_token}'")

    yomigana_hiragana = get_yomigana(next_target_surface_token, mecab_tagger)
    if DEBUG_YOMIGANA:
      print(f"DEBUG Yomigana for fallback token '{next_target_surface_token}': '{yomigana_hiragana}'")

    current_char_input_for_token = ""
    typed_chars_count_for_token = 0
    suggestion_taken_for_this_token = False

    for char_idx, yomi_char in enumerate(yomigana_hiragana):
      current_char_input_for_token += yomi_char
      typed_chars_count_for_token += 1 # 1 click for typing a character

      # Context for LLM is the existing sentence + current partial yomigana input
      context_for_llm_suggestions = "".join(text_tokens) + current_char_input_for_token
      if DEBUG_SIMULATION_STEP:
        print(f"DEBUG Fallback: Typing '{yomi_char}', current token input: '{current_char_input_for_token}', LLM context: '{context_for_llm_suggestions}'")

      char_level_suggestions = word_suggestions(context_for_llm_suggestions)

      for sugg_surface in char_level_suggestions:
        # We expect the suggestion to be the *exact* surface form of the token we are trying to type
        if sugg_surface == next_target_surface_token:
          text_tokens.append(next_target_surface_token)
          cost_added = typed_chars_count_for_token + 1 # typed chars + 1 click for suggestion selection
          total_clicks += cost_added
          word_suggestion_used += 1
          if DEBUG_STATS_TRANSITION:
            print(
              f"  [STATS] Word Sugg. (Fallback): clicks +{cost_added} -> {total_clicks}, word_c +1 -> {word_suggestion_used} (Added: '{next_target_surface_token}' after typing '{current_char_input_for_token}')"
            )
          suggestion_taken_for_this_token = True
          break
      if suggestion_taken_for_this_token:
        break

    if not suggestion_taken_for_this_token: # Full yomigana was typed
      text_tokens.append(next_target_surface_token)
      cost_added = typed_chars_count_for_token
      total_clicks += cost_added
      fallback_token_event_count += 1
      if DEBUG_STATS_TRANSITION:
        print(
          f"  [STATS] Direct Input (Yomi) : clicks +{cost_added} -> {total_clicks}, fb_event +1 -> {fallback_token_event_count} (Added: '{next_target_surface_token}' by typing '{yomigana_hiragana}')"
        )

  final_text_surface = "".join(target_tokens)
  target_char_len = len(final_text_surface)
  return [
    total_clicks, sentence_suggestion_used, word_suggestion_used, fallback_token_event_count, target_char_len
  ]
# --- End Main Simulation Function ---

def main():
  total_target_char_length = 0
  cumulative_total_clicks = 0
  total_sentence_count = 0
  total_word_count = 0
  total_fallback_event_count = 0
  line_count = 0

  total_keyboard_input = 0

  tiny_segmenter = initialize_tiny_segmenter()
  mecab_tagger = initialize_mecab_tagger()
  if not tiny_segmenter:
    print("TinySegmenter initialization failed. Exiting.")
    return
  if not mecab_tagger:
    print("MeCab Tagger initialization failed. Exiting.")
    return

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
    target_yomigana = get_sentence_yomigana(target_sentence, mecab_tagger)
    target_yomigana_length = len(target_yomigana)
    print(f"[Target Yomigana] -> {target_yomigana} (Char Count: {target_yomigana_length})")

    stats = simulate_japanese(target_sentence, tiny_segmenter, mecab_tagger)
    if stats is not None:
      clicks, s_count, w_count, fb_count, target_len = stats
    else:
      print(f"  [line {line_count}] Simulation failed or returned no stats for '{target_sentence}'.")

    total_target_char_length += target_len
    cumulative_total_clicks += clicks
    total_sentence_count += s_count
    total_word_count += w_count
    total_fallback_event_count += fb_count

    total_keyboard_input += len(target_yomigana)

    print("-" * 40)
    print("Enter>", end=' ', flush=True)

  print("\n\n" + "=" * 40)
  print("--- Cummulative Results ---")
  if line_count > 0:
    print(f"Processed lines: {line_count}")
    print_cumulative_stats(
      total_target_char_length, cumulative_total_clicks,
      total_sentence_count, total_word_count,
      total_fallback_event_count, total_keyboard_input)
  else:
    print("Empty Input")
  print("=" * 40)

def print_cumulative_stats(total_len, total_clicks, s_count, w_count, fb_count, kb_input):
  """ Helper function for printing stats """
  print(f'Total Target Length: {total_len} characters')
  print(f'Total Clicks: {total_clicks}')
  print(f'Total Sentence Suggestions Used: {s_count}')
  print(f'Total Word Suggestions Used: {w_count}')
  print(f'Total Tokens Typed by Yomigana: {fb_count}')

  if total_clicks > 0 and kb_input > 0:
    avg_chars_per_click = total_len / total_clicks
    print(f'Average Chars/Click: {avg_chars_per_click:.2f}')

    keystroke_saving_rate = 1 - (total_clicks / kb_input) # How many percent saved compared with input by keystrokes
    print(f'Total Keystrokes (for comparison): {kb_input}') # Assuming one stroke per character
    print(f'Keystroke Saving Rate (1 - (Total Clicks / Totak Keystrokes)): {keystroke_saving_rate:.2%}')

    total_events = s_count + w_count + fb_count
    if total_events > 0:
      suggestion_rate = (s_count + w_count) / total_events
    print(f'Suggestion Select Rate (Sentence+Word / Total Events): {suggestion_rate:.2%}')

    # Calculate selections (1 fallback token = 1 selection)
    total_selections = s_count + w_count + fb_count
    if total_selections > 0:
      avg_chars_per_selection = total_len / total_selections
    print(f'Total Selections (Suggestion or Fallback Token): {total_selections}')
    print(f'Average Chars/Selection: {avg_chars_per_selection:.2f}')

  else:
    print('Metrics based on clicks/selections: N/A (0 clicks/selections)')

if __name__ == '__main__':
  try:
    main()
  except Exception as e:
    print(f"\n--- AN ERROR OCCURRED ---", file=sys.stderr)
    traceback.print_exc()
