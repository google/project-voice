# Copyright 2025 Google LLC
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
"""A simple VOICE simulator (Japanese only).

This script evaluates the efficiency of prompt by simulating VOICE.
It can be run in two modes:

1. Interactive Mode: For quick, informal tests.
   Processes sentences entered one by one and prints a detailed summary to the console.
   Runs with the following default setting:
     model-id: 'gemini-2.0-flash-001'
     sentence-macro-id: 'SentenceJapaneseLong20250424'
     word-macro-id: 'WordGeneric20240628'
   Usage:
     $ export API_KEY=(API key)
     $ python3 simple_simulator_ja.py

2. Batch Mode: For experiments and comparisons.
   Processes an entire input file and appends a single summary row to a CSV file.
   This allows for easy comparison of different models and macros. (other parameters will be added)
   Usage:
     $ export API_KEY=(API key)
     $ PYTHONPATH=(Path to VOICE app: use pwd command at usa-input directory)
     $ python3 simple_simulator_ja.py \
      --input <input.txt> \
      --output <results.csv> \
      --model-id 'gemini-2.0-flash-001' \
      --sentence-macro-id 'SentenceJapaneseLong20241002'
"""
from collections import Counter
from datetime import datetime
from retry import retry
import MeCab
import json
import os
import sys
import traceback
import re
import ipadic
import tinysegmenter
import argparse
import csv

# Debug flag (Set True for print debugging)
DEBUG_LLM_RAW = False  # Raw LLM response
DEBUG_LLM_PARSED = False  # Parsed LLM suggestions
DEBUG_MECAB = False  # MeCab raw output
DEBUG_SIMULATION_STEP = False  # Each step of simulation
DEBUG_STATS_TRANSITION = True  # Stas count for each token (enabled by default)
DEBUG_TOKENIZER_OUTPUT = False  # TinySegmenter output
DEBUG_YOMIGANA = False  # Yomigana from MeCab

# --- This part is to import macro ---
current_script_path = os.path.abspath(__file__)
parent_directory = os.path.dirname(os.path.dirname(current_script_path))
if parent_directory not in sys.path:
  sys.path.append(parent_directory)

import macro
# --- macro imported ---

NUM_SENTENCE_SUGGESTIONS = 2
INITIAL_PHRASES_JA = [
    'はい', 'いいえ', 'ありがとう', 'すみません', 'お願いします', '私', 'あなた', '彼', '彼女', '今日', '昨日',
    '明日'
]


# --- Helper Functions ---
def parse_response(response):
  try:
    if not response:
      return []
    response_data = json.loads(response)
    response_text = response_data.get('messages', [{}])[0].get('text', '')
    if not response_text:
      return []
    response_text = response_text.replace('\\\n', '')
    lines = [
        re.sub(r'^\d+\.\s?', '', t.strip())
        for t in response_text.split('\n')
        if t.strip() and re.match(r'^\d+\.', t.strip())
    ]
    return lines
  except (json.JSONDecodeError, IndexError, KeyError) as e:
    print(f"Error parsing response: {e}\nResponse: {response}", file=sys.stderr)
    return []


@retry(tries=5, delay=3)
def run_macro_with_retry(macro_id, user_input, temperature, model_id):
  return macro.RunMacro(macro_id, user_input, temperature, model_id)


def word_suggestions(text_context, word_macro_id, model_id):
  user_input = {'language': 'Japanese', 'num': '5', 'text': text_context}
  response = run_macro_with_retry(word_macro_id, user_input, 0, model_id)
  if DEBUG_LLM_RAW:
    print(f"DEBUG LLM word_suggestions response for '{text_context}':",
          repr(response))
  parsed_suggestions = parse_response(response)
  if DEBUG_LLM_PARSED:
    print(f"DEBUG Parsed word suggestions:", parsed_suggestions)
  return parsed_suggestions


def sentence_suggestions(text, sentence_macro_id, model_id):
  user_input = {'language': 'Japanese', 'num': '5', 'text': text}
  response = run_macro_with_retry(sentence_macro_id, user_input, 0, model_id)
  if DEBUG_LLM_RAW:
    print(f"DEBUG LLM sentence_suggestions response for '{text}':",
          repr(response))
  parsed_suggestions = parse_response(response)
  if DEBUG_LLM_PARSED:
    print(f"DEBUG Parsed sentence suggestions:", parsed_suggestions)
  return parsed_suggestions[0:NUM_SENTENCE_SUGGESTIONS]


def katakana_to_hiragana(text):
  return ''.join(chr(ord(ch) - 0x60) if 'ァ' <= ch <= 'ン' else ch for ch in text)


def initialize_tiny_segmenter():
  try:
    return tinysegmenter.TinySegmenter()
  except Exception as e:
    print(
        f"FATAL ERROR: Failed to initialize TinySegmenter: {e}",
        file=sys.stderr)
    return None


def initialize_mecab_tagger():
  """ Initialize MeCab Tagger object """
  mecab = None
  try:
    # 1. try default path
    mecab = MeCab.Tagger(ipadic.MECAB_ARGS)
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
          "Please ensure MeCab is installed correctly and the path is accessible.",
          file=sys.stderr)
      return None
  return mecab


def get_yomigana(surface_token, mecab_tagger):
  if not mecab_tagger or not surface_token.strip():
    return katakana_to_hiragana(surface_token)
  try:
    parsed_nodes = mecab_tagger.parse(surface_token)
    yomi_katakana = ""
    for line in parsed_nodes.splitlines():
      if line == 'EOS':
        break
      parts = line.split('\t')
      if len(parts) > 1:
        features = parts[1].split(',')
        if len(features) > 7 and features[7] != '*':
          yomi_katakana += features[7]
        else:
          yomi_katakana += parts[0]
    return katakana_to_hiragana(
        yomi_katakana if yomi_katakana else surface_token)

  except Exception as e:
    print(
        f"ERROR: Yomigana extraction failed for '{surface_token}': {e}",
        file=sys.stderr)
    traceback.print_exc()
    return katakana_to_hiragana(surface_token)


def get_sentence_yomigana(text, mecab_tagger):
  try:
    mecab_tagger.parse('')
    node = mecab_tagger.parseToNode(text)
    yomigana = ""
    while node:
      features = node.feature.split(',')
      if len(features) > 7 and features[7] != '*':
        yomigana += features[7]
      else:
        yomigana += node.surface
      node = node.next
    return katakana_to_hiragana(yomigana)

  except Exception as e:
    print(f"ERROR: get_sentence_yomigana failed: {e}", file=sys.stderr)
    return ""


def tokenize_with_tinysegmenter(text, tiny_segmenter):
  if not tiny_segmenter:
    return [char for char in text]
  return tiny_segmenter.tokenize(text)


def common_prefix(target_tokens, text_tokens):
  i = 0
  while i < len(target_tokens) and i < len(
      text_tokens) and target_tokens[i] == text_tokens[i]:
    i += 1
  return target_tokens[:i]


# --- Main Simulation Function ---
def simulate_japanese(target, tiny_segmenter, mecab_tagger, sim_params,
                      sugg_lengths_log):
  model_id = sim_params['model_id']
  sentence_macro_id = sim_params['sentence_macro_id']
  word_macro_id = sim_params['word_macro_id']
  output_stream = sim_params['output_stream']

  target_tokens = tokenize_with_tinysegmenter(target, tiny_segmenter)
  if not target_tokens and target:
    print(
        f"WARN: Tokenizer returned empty list for non-empty target: '{target}'. Using char split.",
        file=sys.stderr)
    target_tokens = [char for char in target]
  elif not target_tokens and not target:
    return [0, 0, 0, 0, 0, 0, 0]

  text_tokens = []
  total_clicks = 0
  sentence_suggestion_used = 0
  word_suggestion_used = 0
  fallback_token_event_count = 0
  s_sugg_segments_this_run = 0
  w_sugg_segments_this_run = 0

  # --- Start Initial Phase ---
  best_match_tokens = []
  best_match_phrase = ""
  for phrase in INITIAL_PHRASES_JA:
    if target.startswith(phrase):
      if len(phrase) > len(best_match_phrase):
        current_match_tokens = tokenize_with_tinysegmenter(
            phrase, tiny_segmenter)
        if target_tokens[:len(current_match_tokens)] == current_match_tokens:
          best_match_phrase = phrase
          best_match_tokens = current_match_tokens

  if best_match_tokens:
    text_tokens = best_match_tokens
    cost_added = 1
    total_clicks += cost_added
    word_suggestion_used += 1
    w_sugg_segments_this_run += len(best_match_tokens)
    sugg_lengths_log['word'].append(len(best_match_tokens))
    if DEBUG_STATS_TRANSITION:
      print(
          f"  [STATS] Initial Phrase: clicks +{cost_added} (Added: '{''.join(best_match_tokens)}')",
          file=output_stream)
  else:
    if target_tokens:
      next_target_surface_token = target_tokens[0]
      yomigana_hiragana = get_yomigana(next_target_surface_token, mecab_tagger)
      current_char_input = ""
      typed_chars_count = 0
      suggestion_taken_initial = False

      for yomi_char in yomigana_hiragana:
        current_char_input += yomi_char
        typed_chars_count += 1
        context_text = current_char_input
        suggestions = word_suggestions(context_text, word_macro_id, model_id)
        if next_target_surface_token in suggestions:
          text_tokens = [next_target_surface_token]
          cost_added = typed_chars_count + 1
          total_clicks += cost_added
          word_suggestion_used += 1
          w_sugg_segments_this_run += 1
          sugg_lengths_log['word'].append(1)
          suggestion_taken_initial = True
          if DEBUG_STATS_TRANSITION:
            print(
                f"  [STATS] Initial Word Sugg.: clicks +{cost_added} (Token: '{next_target_surface_token}')",
                file=output_stream)
          break

      if not suggestion_taken_initial:
        text_tokens = [next_target_surface_token]
        cost_added = len(yomigana_hiragana) if yomigana_hiragana else 0
        total_clicks += cost_added
        fallback_token_event_count += 1
        if DEBUG_STATS_TRANSITION:
          print(
              f"  [STATS] Initial Direct Input: clicks +{cost_added} (Token: '{next_target_surface_token}')",
              file=output_stream)
    else:
      return [0, 0, 0, 0, 0, 0, 0]

  # --- Start Main While Loop ---
  while text_tokens != target_tokens:
    current_text_surface = "".join(text_tokens)
    if DEBUG_SIMULATION_STEP:
      print(
          f'\nCurrent input surface: "{current_text_surface}" (Tokens: {text_tokens})'
      )

    # --- Step 1: Sentence Suggestion ---
    selected_sentence_tokens = None
    if current_text_surface:
      suggested_sentences = sentence_suggestions(current_text_surface,
                                                 sentence_macro_id, model_id)
      longest_prefix_len = len(text_tokens)
      for s in suggested_sentences:
        s_tokens = tokenize_with_tinysegmenter(s, tiny_segmenter)
        if not s_tokens:
          continue
        prefix = common_prefix(target_tokens, s_tokens)
        if len(prefix) > longest_prefix_len and prefix[:len(text_tokens
                                                           )] == text_tokens:
          selected_sentence_tokens = prefix
          longest_prefix_len = len(prefix)

    if selected_sentence_tokens:
      added_segments_count = len(selected_sentence_tokens) - len(text_tokens)
      text_tokens = selected_sentence_tokens
      cost_added = 1
      total_clicks += cost_added
      sentence_suggestion_used += 1
      s_sugg_segments_this_run += added_segments_count
      sugg_lengths_log['sentence'].append(added_segments_count)
      if DEBUG_STATS_TRANSITION:
        added_text_string = "".join(
            selected_sentence_tokens[-added_segments_count:]
        ) if added_segments_count > 0 else ""
        print(
            f"  [STATS] Sentence Suggestion: clicks +{cost_added} (Added {added_segments_count} segments: '{added_text_string}')",
            file=output_stream)
      if text_tokens == target_tokens:
        break
      continue

    # --- Step 2: Word Suggestion ---
    word_selected_this_turn = False
    if len(text_tokens) < len(target_tokens) and current_text_surface:
      candidates = word_suggestions(current_text_surface, word_macro_id,
                                    model_id)
      for word_candidate_surface in candidates:
        word_candidate_tokens = tokenize_with_tinysegmenter(
            word_candidate_surface, tiny_segmenter)
        if not word_candidate_tokens:
          continue
        start_index = len(text_tokens)
        end_index = start_index + len(word_candidate_tokens)
        if end_index <= len(target_tokens) and target_tokens[
            start_index:end_index] == word_candidate_tokens:
          text_tokens.extend(word_candidate_tokens)
          cost_added = 1
          total_clicks += cost_added
          word_suggestion_used += 1
          w_sugg_segments_this_run += len(word_candidate_tokens)
          sugg_lengths_log['word'].append(len(word_candidate_tokens))
          word_selected_this_turn = True
          if DEBUG_STATS_TRANSITION:
            print(
                f"  [STATS] Word Suggestion: clicks +{cost_added} (Added: '{''.join(word_candidate_tokens)}')",
                file=output_stream)
          break
      if word_selected_this_turn:
        if text_tokens == target_tokens:
          break
        continue

    # --- Step 3 & 4: Fallback Logic ---
    if len(text_tokens) < len(target_tokens):
      next_target_surface_token = target_tokens[len(text_tokens)]
      yomigana_hiragana = get_yomigana(next_target_surface_token, mecab_tagger)

      suggestion_taken_in_fallback = False

      # --- Step 3: First-Character Suggestion ---
      if yomigana_hiragana:
        context_text_1st_char = "".join(text_tokens) + yomigana_hiragana[0]
        suggestions = word_suggestions(context_text_1st_char, word_macro_id,
                                       model_id)
        if next_target_surface_token in suggestions:
          text_tokens.append(next_target_surface_token)
          cost_added = 2
          total_clicks += cost_added
          word_suggestion_used += 1
          w_sugg_segments_this_run += 1
          sugg_lengths_log['word'].append(1)
          suggestion_taken_in_fallback = True
          if DEBUG_STATS_TRANSITION:
            print(
                f"  [STATS] Word Sugg. (1st Char): clicks +{cost_added} (Added: '{next_target_surface_token}')",
                file=output_stream)

      # --- Step 4: Final Fallback (Character-by-character) ---
      if not suggestion_taken_in_fallback:
        current_char_input_final = ""
        typed_chars_count_final = 0
        suggestion_taken_in_char_loop = False

        for yomi_char in yomigana_hiragana:
          current_char_input_final += yomi_char
          typed_chars_count_final += 1
          context_text_char_loop = current_char_input_final  # Local context for mid-word typing
          suggestions = word_suggestions(context_text_char_loop, word_macro_id,
                                         model_id)
          if next_target_surface_token in suggestions:
            text_tokens.append(next_target_surface_token)
            cost_added = typed_chars_count_final + 1
            total_clicks += cost_added
            word_suggestion_used += 1
            w_sugg_segments_this_run += 1
            sugg_lengths_log['word'].append(1)
            suggestion_taken_in_char_loop = True
            if DEBUG_STATS_TRANSITION:
              print(
                  f"  [STATS] Word Sugg. (Mid-typing): clicks +{cost_added} (Added: '{next_target_surface_token}')",
                  file=output_stream)
            break

        if not suggestion_taken_in_char_loop:
          text_tokens.append(next_target_surface_token)
          cost_added = len(yomigana_hiragana) if yomigana_hiragana else 0
          total_clicks += cost_added
          fallback_token_event_count += 1
          if DEBUG_STATS_TRANSITION:
            print(
                f"  [STATS] Direct Input (Yomi): clicks +{cost_added} (Added: '{next_target_surface_token}' by typing '{yomigana_hiragana}')",
                file=output_stream)

    if text_tokens == target_tokens:
      break

  target_char_len = len("".join(target_tokens))
  return [
      total_clicks, sentence_suggestion_used, word_suggestion_used,
      fallback_token_event_count, target_char_len, s_sugg_segments_this_run,
      w_sugg_segments_this_run
  ]


# --- Batch/CSV Functions ---
def append_to_csv(output_file, results_dict):
  num_hist_bins = 5  # Must match the value used in run_batch_simulation
  """Appends a dictionary of results to a CSV file."""
  fieldnames = [
      'Timestamp', 'Duration', 'Model ID', 'Sentence Macro ID', 'Word Macro ID',
      'Input File', 'Total Lines Processed', 'Total Target Characters',
      'Total Clicks', 'Total Keystrokes (Yomigana)',
      'Sentence Suggestions Used', 'Word Suggestions Used',
      'Fallback Tokens Typed', 'Keystroke Saving Rate (%)',
      'Average Chars per Click', 'Suggestion Select Rate (%)',
      'Average Chars per Selection', 'Total Segments from Sentence Sugg',
      'Avg Segments per Sentence Sugg', 'Total Segments from Word Sugg',
      'Avg Segments per Word Sugg'
  ]

  for i in range(1, num_hist_bins + 1):
    fieldnames.append(f'SentSuggFreq_{i}')
  fieldnames.append(f'SentSuggFreq_{num_hist_bins + 1}plus')

  for i in range(1, num_hist_bins + 1):
    fieldnames.append(f'WordSuggFreq_{i}')
  fieldnames.append(f'WordSuggFreq_{num_hist_bins + 1}plus')

  file_exists = os.path.isfile(output_file)
  try:
    with open(
        output_file, 'a', newline='',
        encoding='utf-8') as f:  # 'a' is for append mode
      writer = csv.DictWriter(f, fieldnames=fieldnames)
      if not file_exists:
        writer.writeheader()
      writer.writerow(results_dict)
  except IOError as e:
    print(f"Error writing to output file {output_file}: {e}", file=sys.stderr)


def run_batch_simulation(args):
  start_time = datetime.now()
  """Runs simulation on a whole file and writes results to CSV."""
  print(f"Starting batch simulation...")
  print(f"  Input file: {args.input}")
  print(f"  Output CSV: {args.output}")
  print(f"  Model ID: {args.model_id}")

  tiny_segmenter = initialize_tiny_segmenter()
  mecab_tagger = initialize_mecab_tagger()
  if not tiny_segmenter or not mecab_tagger:
    return

  stats = {
      'total_len': 0,
      'total_clicks': 0,
      's_count': 0,
      'w_count': 0,
      'fb_count': 0,
      'kb_input': 0,
      'line_count': 0,
      's_sugg_segments': 0,
      'w_sugg_segments': 0
  }

  sugg_lengths_log = {'sentence': [], 'word': []}

  sim_params = {
      'model_id':
          args.model_id,
      'sentence_macro_id':
          args.sentence_macro_id,
      'word_macro_id':
          args.word_macro_id,
      'output_stream':
          sys.stderr if DEBUG_STATS_TRANSITION else open(os.devnull, 'w')
  }

  try:
    with open(args.input, 'r', encoding='utf-8') as f_in:
      for line in f_in:
        target = line.strip()
        if not target:
          continue
        stats['line_count'] += 1

        line_stats = simulate_japanese(target, tiny_segmenter, mecab_tagger,
                                       sim_params, sugg_lengths_log)

        stats['total_clicks'] += line_stats[0]
        stats['s_count'] += line_stats[1]
        stats['w_count'] += line_stats[2]
        stats['fb_count'] += line_stats[3]
        stats['total_len'] += line_stats[4]
        stats['kb_input'] += len(get_sentence_yomigana(target, mecab_tagger))
        stats['s_sugg_segments'] += line_stats[5]
        stats['w_sugg_segments'] += line_stats[6]

  except FileNotFoundError:
    print(f"Error: Input file not found at {args.input}", file=sys.stderr)
    return

  end_time = datetime.now()
  duration_timedelta = end_time - start_time
  duration_str = format_duration(duration_timedelta.total_seconds())

  # Calculate final metrics
  ksr = (1 - (stats['total_clicks'] /
              stats['kb_input'])) * 100 if stats['kb_input'] > 0 else 0
  avg_chars_click = stats['total_len'] / stats['total_clicks'] if stats[
      'total_clicks'] > 0 else 0
  total_events = stats['s_count'] + stats['w_count'] + stats['fb_count']
  sugg_rate = ((stats['s_count'] + stats['w_count']) /
               total_events) * 100 if total_events > 0 else 0
  avg_chars_select = stats['total_len'] / total_events if total_events > 0 else 0
  avg_s_sugg_len = stats['s_sugg_segments'] / stats['s_count'] if stats[
      's_count'] > 0 else 0
  avg_w_sugg_len = stats['w_sugg_segments'] / stats['w_count'] if stats[
      'w_count'] > 0 else 0

  # Calculate binned frequency distributions for making histogram
  num_hist_bins = 5  # We'll have bins for 1, 2, 3, 4, 5, and then 6+
  sentence_sugg_binned_freq = calculate_binned_frequency(
      sugg_lengths_log['sentence'], num_hist_bins)
  word_sugg_binned_freq = calculate_binned_frequency(sugg_lengths_log['word'],
                                                     num_hist_bins)

  results_dict = {
      'Timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
      'Duration': duration_str,
      'Model ID': args.model_id,
      'Sentence Macro ID': args.sentence_macro_id,
      'Word Macro ID': args.word_macro_id,
      'Input File': os.path.basename(args.input),
      'Total Lines Processed': stats['line_count'],
      'Total Target Characters': stats['total_len'],
      'Total Clicks': stats['total_clicks'],
      'Total Keystrokes (Yomigana)': stats['kb_input'],
      'Sentence Suggestions Used': stats['s_count'],
      'Word Suggestions Used': stats['w_count'],
      'Fallback Tokens Typed': stats['fb_count'],
      'Keystroke Saving Rate (%)': f"{ksr:.2f}",
      'Average Chars per Click': f"{avg_chars_click:.2f}",
      'Suggestion Select Rate (%)': f"{sugg_rate:.2f}",
      'Average Chars per Selection': f"{avg_chars_select:.2f}",
      'Total Segments from Sentence Sugg': stats['s_sugg_segments'],
      'Avg Segments per Sentence Sugg': f"{avg_s_sugg_len:.2f}",
      'Total Segments from Word Sugg': stats['w_sugg_segments'],
      'Avg Segments per Word Sugg': f"{avg_w_sugg_len:.2f}"
  }

  # Dynamically add columns to the csv for making histogram with specified size
  for i in range(1, num_hist_bins + 1):
    results_dict[f'SentSuggFreq_{i}'] = sentence_sugg_binned_freq.get(
        f'Freq_{i}', 0)
  results_dict[
      f'SentSuggFreq_{num_hist_bins + 1}plus'] = sentence_sugg_binned_freq.get(
          f'Freq_{num_hist_bins + 1}plus', 0)

  for i in range(1, num_hist_bins + 1):
    results_dict[f'WordSuggFreq_{i}'] = word_sugg_binned_freq.get(
        f'Freq_{i}', 0)
  results_dict[
      f'WordSuggFreq_{num_hist_bins + 1}plus'] = word_sugg_binned_freq.get(
          f'Freq_{num_hist_bins + 1}plus', 0)

  append_to_csv(args.output, results_dict)
  print(
      f"Simulation complete. Took {duration_str}. Results appended to {args.output}"
  )


def format_duration(total_seconds):
  if total_seconds < 0:
    total_seconds = 0

  hours = int(total_seconds // 3600)
  minutes = int((total_seconds % 3600) // 60)
  seconds = total_seconds % 60

  parts = []
  if hours > 0:
    parts.append(f"{hours} hh")
  if minutes > 0:
    parts.append(f"{minutes} mm")

  formatted_seconds_str = f"{seconds:.2f}"
  parts.append(f"{formatted_seconds_str} ss")

  if not parts:
    return "0.00 ss"

  return " ".join(parts)


# --- Interactive Mode Functions ---
def print_interactive_summary(stats, params):
  """Prints a detailed summary to the console for interactive mode."""
  print("\n\n" + "=" * 40)
  print("--- Interactive Session Summary ---")

  total_script_processing_time_seconds = stats.get(
      'total_script_processing_time_seconds', 0.0)
  session_total_duration_seconds = stats.get('session_total_duration_seconds',
                                             0.0)

  total_len = stats['total_len']
  total_clicks = stats['total_clicks']
  s_count = stats['s_count']
  w_count = stats['w_count']
  fb_count = stats['fb_count']
  kb_input = stats['kb_input']
  avg_s_sugg_len = stats['s_sugg_segments'] / stats['s_count'] if stats[
      's_count'] > 0 else 0
  avg_w_sugg_len = stats['w_sugg_segments'] / stats['w_count'] if stats[
      'w_count'] > 0 else 0

  if stats['line_count'] > 0:
    print(f"Processed lines: {stats['line_count']}")
    print(f"Gemini Model: {params['model_id']}")
    print(f"Sentence Macro: {params['sentence_macro_id']}")
    print("-" * 20)
    print(f'Total Target Length: {total_len} characters')
    print(f'Total Clicks: {total_clicks}')
    print(f'Total Sentence Suggestions Used: {s_count}')
    print(f'Total Word Suggestions Used: {w_count}')
    print(f'Total Tokens Typed by Yomigana: {fb_count}')
    print("-" * 20)
    print(f'Total Segments from Sentence Sugg: {stats["s_sugg_segments"]}')
    print(f'Avg Segments per Sentence Sugg: {avg_s_sugg_len:.2f}')
    print(f'Total Segments from Word Sugg: {stats["w_sugg_segments"]}')
    print(f'Avg Segments per Word Sugg: {avg_w_sugg_len:.2f}')

    if total_clicks > 0 and kb_input > 0:
      avg_chars_per_click = total_len / total_clicks
      print(f'Average Chars/Click: {avg_chars_per_click:.2f}')

      keystroke_saving_rate = 1 - (total_clicks / kb_input)
      print(f'Total Keystrokes (for comparison): {kb_input}')
      print(f'Keystroke Saving Rate: {keystroke_saving_rate:.2%}')

      total_events = s_count + w_count + fb_count
      if total_events > 0:
        suggestion_rate = (s_count + w_count) / total_events
        print(f'Suggestion Select Rate: {suggestion_rate:.2%}')

      total_selections = s_count + w_count + fb_count
      if total_selections > 0:
        avg_chars_per_selection = total_len / total_selections
        print(f'Total Selections (Suggestion or Fallback): {total_selections}')
        print(f'Average Chars/Selection: {avg_chars_per_selection:.2f}')
    print("-" * 20)
    print(
        f'Total Script Processing Time: {format_duration(total_script_processing_time_seconds)}'
    )
    avg_script_processing_time = total_script_processing_time_seconds / stats[
        'line_count']
    print(
        f'Avg. Script Processing Time per Sentence: {format_duration(avg_script_processing_time)}'
    )
    if session_total_duration_seconds > 0:
      print(
          f'Total Interactive Session Duration: {format_duration(session_total_duration_seconds)}'
      )
  else:
    print("No lines were processed.")
  print("=" * 40)


def run_interactive_mode(args):
  session_start_time = datetime.now()
  """Runs the simulation interactively in the console."""
  print("--- Starting Interactive Simulation ---")
  print(
      "Enter Japanese sentence. Press Ctrl+D (or Ctrl+Z on Windows) to end and see summary."
  )
  print("-" * 40)

  tiny_segmenter = initialize_tiny_segmenter()
  mecab_tagger = initialize_mecab_tagger()
  if not tiny_segmenter or not mecab_tagger:
    print("ERROR: Could not initialize tokenizers. Exiting.", file=sys.stderr)
    return

  stats = {
      'total_len': 0,
      'total_clicks': 0,
      's_count': 0,
      'w_count': 0,
      'fb_count': 0,
      'kb_input': 0,
      'line_count': 0,
      's_sugg_segments': 0,
      'w_sugg_segments': 0,
      'total_script_processing_time_seconds': 0.0
  }

  sugg_lengths_log = {'sentence': [], 'word': []}

  sim_params = {
      'model_id': args.model_id,
      'sentence_macro_id': args.sentence_macro_id,
      'word_macro_id': args.word_macro_id,
      'output_stream': sys.stdout
  }

  for line in sys.stdin:
    target = line.strip()
    if not target:
      print("Enter>", end=' ', flush=True)
      continue

    print(f"\n  [Processing] -> {target}")
    stats['line_count'] += 1

    target_yomigana = get_sentence_yomigana(target, mecab_tagger)
    print(f"  [Yomigana ({len(target_yomigana)} chars)] -> {target_yomigana}")

    sentence_process_start_time = datetime.now()

    line_stats = simulate_japanese(target, tiny_segmenter, mecab_tagger,
                                   sim_params, sugg_lengths_log)

    sentence_process_end_time = datetime.now()
    sentence_duration_seconds = (sentence_process_end_time -
                                 sentence_process_start_time).total_seconds()
    stats['total_script_processing_time_seconds'] += sentence_duration_seconds

    if line_stats:
      stats['total_clicks'] += line_stats[0]
      stats['s_count'] += line_stats[1]
      stats['w_count'] += line_stats[2]
      stats['fb_count'] += line_stats[3]
      stats['total_len'] += line_stats[4]
      stats['kb_input'] += len(get_sentence_yomigana(target, mecab_tagger))
      stats['s_sugg_segments'] += line_stats[5]
      stats['w_sugg_segments'] += line_stats[6]

    print(
        f"  [INFO] This sentence processed in {format_duration(sentence_duration_seconds)}"
    )
    print("-" * 20)
    print("Enter>", end=' ', flush=True)

  session_end_time = datetime.now()
  session_total_duration = (session_end_time -
                            session_start_time).total_seconds()
  stats['session_total_duration_seconds'] = session_total_duration

  print_interactive_summary(stats, sim_params)


def calculate_binned_frequency(lengths_list, num_individual_bins=5):
  """
    Calculates the frequency for predefined bins: 1, 2, ..., num_individual_bins,
    and a final '(num_individual_bins + 1)+' bin.
    Returns a dictionary where keys are bin names (e.g., 'Freq_1', 'Freq_5', 'Freq_6plus')
    and values are the counts.
    """
  bin_keys = [f"Freq_{i}" for i in range(1, num_individual_bins + 1)]
  bin_keys.append(f"Freq_{num_individual_bins + 1}plus")

  binned_counts = {key: 0 for key in bin_keys}

  if not lengths_list:
    return binned_counts

  counts = Counter(lengths_list)
  for length, count in counts.items():
    if length <= num_individual_bins:
      binned_counts[f"Freq_{length}"] += count
    else:
      binned_counts[f"Freq_{num_individual_bins + 1}plus"] += count
  return binned_counts


def main():
  parser = argparse.ArgumentParser(
      description="A simple VOICE simulator for Japanese.",
      formatter_class=argparse.RawTextHelpFormatter,
      epilog="""
Usage examples:
  1. Interactive mode (for quick tests):
     $ python3 simple_simulator_ja.py

  2. Batch mode (for experiments, appends to CSV):
     $ python3 simple_simulator_ja.py --input sentences.txt --output results.csv \
       --model-id 'gemini-2.0-flash-001' \
       --sentence-macro-id 'SentenceJapaneseLong20250424'
""")
  # Input/Output arguments
  parser.add_argument(
      '-i', '--input', type=str, help='Path to the input text file.')
  parser.add_argument(
      '-o', '--output', type=str, help='Path to the output CSV file.')

  # Model and Macro arguments
  parser.add_argument(
      '--model-id',
      type=str,
      default='gemini-2.0-flash-001',
      help='Gemini model ID to use.')
  parser.add_argument(
      '--sentence-macro-id',
      type=str,
      default='SentenceJapaneseLong20250424',
      help='The macro ID for sentence suggestions.')
  parser.add_argument(
      '--word-macro-id',
      type=str,
      default='WordGeneric20240628',
      help='The macro ID for word suggestions.')

  args = parser.parse_args()

  # Decide mode based on arguments
  if args.input and args.output:
    run_batch_simulation(args)
  elif not args.input and not args.output:
    run_interactive_mode(args)
  else:
    parser.error("For batch mode, both --input and --output must be specified.")


if __name__ == '__main__':
  try:
    main()
  except Exception as e:
    print(f"\n--- AN UNHANDLED ERROR OCCURRED ---", file=sys.stderr)
    traceback.print_exc()
