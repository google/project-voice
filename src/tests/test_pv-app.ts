/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {ConfigStorage} from '../config-storage.js';
import {CONFIG_DEFAULT} from '../constants.js';
import {LANGUAGES} from '../language.js';
import {TEST_ONLY} from '../pv-app.js';
import {State} from '../state.js';
import {TEST_CONFIG} from './test_config-storage.js';

describe('USA App', () => {
  describe('getSharedPrefix', () => {
    it('should return a blank string if a blank array is given.', () => {
      const result = TEST_ONLY.getSharedPrefix([]);
      expect(result).toEqual('');
    });

    it('should extract the shared prefix', () => {
      const result = TEST_ONLY.getSharedPrefix([
        'hello',
        'helmet',
        'hello goodbye',
      ]);
      expect(result).toEqual('hel');
    });

    it('should return the whole string if included by others.', () => {
      const result = TEST_ONLY.getSharedPrefix([
        'hello ',
        'hello world',
        'hello goodbye',
      ]);
      expect(result).toEqual('hello ');
    });
  });

  describe('normalize', () => {
    it('should keep trailing spaces', () => {
      const result = TEST_ONLY.normalize('hello ');
      expect(result).toEqual('hello ');
    });

    it('should remove leading spaces.', () => {
      const result = TEST_ONLY.normalize(' hello');
      expect(result).toEqual('hello');
    });

    it('should remove redundant spaces.', () => {
      const result = TEST_ONLY.normalize('hello  world');
      expect(result).toEqual('hello world');
    });

    it('should compose Dakuon and Handakuon charactors.', () => {
      const result = TEST_ONLY.normalize('ハ゜ンくた゛さい');
      expect(result).toEqual('パンください');
    });

    it('should keep Dakuten and Handakuten separate when they should be separate.', () => {
      const result = TEST_ONLY.normalize('た゜あ゛');
      expect(result).toEqual('た゜あ゛');
    });
  });

  describe('splitLastSentence', () => {
    it('should split the last sentence with punctulation from a text', () => {
      const result = TEST_ONLY.splitLastSentence(
        'Hello world. This is a test. How are you?',
      );
      expect(result).toEqual(['Hello world. This is a test. ', 'How are you?']);
    });

    it('should split the last sentence with punctulation from a Japanese text', () => {
      const result = TEST_ONLY.splitLastSentence(
        'おはようございます。これはテストです！',
      );
      expect(result).toEqual(['おはようございます。', 'これはテストです！']);
    });

    it('should split an empty string if no sentence is present', () => {
      const result = TEST_ONLY.splitLastSentence('');
      expect(result).toEqual(['', '']);
    });

    it('should handle text with no punctuation', () => {
      const result = TEST_ONLY.splitLastSentence('こんにちは！これはテ');
      expect(result).toEqual(['こんにちは！', 'これはテ']);
    });

    it('should handle text ends with spaces', () => {
      const result = TEST_ONLY.splitLastSentence('こんにちは！  これ  ');
      expect(result).toEqual(['こんにちは！  ', 'これ']);
    });
  });

  describe('splitToSentences', () => {
    it('should split the text to sentences with punctulations', () => {
      const result = TEST_ONLY.splitToSentences(
        'Hello world. This is a test. How are you?',
      );
      expect(result).toEqual([
        'Hello world. ',
        'This is a test. ',
        'How are you?',
      ]);
    });

    it('should split the Japanese text to sentence with punctulations', () => {
      const result = TEST_ONLY.splitToSentences(
        'おはようございます。これはテストです！',
      );
      expect(result).toEqual(['おはようございます。', 'これはテストです！']);
    });

    it('should split an empty string if no sentence is present', () => {
      const result = TEST_ONLY.splitToSentences('');
      expect(result).toEqual([]);
    });

    it('should handle text with no punctuation', () => {
      const result = TEST_ONLY.splitToSentences('こんにちは！これはテ');
      expect(result).toEqual(['こんにちは！', 'これはテ']);
    });

    it('should handle text ends with spaces', () => {
      const result = TEST_ONLY.splitToSentences('こんにちは！  これ  ');
      expect(result).toEqual(['こんにちは！  ', 'これ  ']);
    });

    it('should not split at preceeding period', () => {
      const result = TEST_ONLY.splitToSentences(
        'Oops! Please install .NET components.',
      );
      expect(result).toEqual(['Oops! ', 'Please install .NET components.']);
    });
  });

  describe('splitLastFewSentencesForLLM', () => {
    it('should not split short text', () => {
      const result = TEST_ONLY.splitLastFewSentencesForLLM(
        'Hello world. This is a test. How are you?',
      );
      expect(result).toEqual(['', 'Hello world. This is a test. How are you?']);
    });

    it('should not split short text', () => {
      const result = TEST_ONLY.splitLastFewSentencesForLLM(
        'おはようございます。これはテストです！',
      );
      expect(result).toEqual(['', 'おはようございます。これはテストです！']);
    });

    it('should not split short text', () => {
      const result =
        TEST_ONLY.splitLastFewSentencesForLLM(
          'あああぁぁぁ。。。それは残念ですね。',
        );
      expect(result).toEqual(['', 'あああぁぁぁ。。。それは残念ですね。']);
    });

    it('should split text longer than the threshold which consists with several sentences', () => {
      const result = TEST_ONLY.splitLastFewSentencesForLLM(
        'Hello world. This is a test. How are you? I hope this message finds you well and ready for a day of exciting new experiences starting soon.',
      );
      expect(result).toEqual([
        'Hello world. This is a test. How are you? ',
        'I hope this message finds you well and ready for a day of exciting new experiences starting soon.',
      ]);
    });

    it('should split text longer than the threshold which consists with several sentences', () => {
      const result = TEST_ONLY.splitLastFewSentencesForLLM(
        'おはようございます。これはテストです!ご協力ありがとうございます。本日はよろしくお願いいたします。それでは始めましょう。',
      );
      expect(result).toEqual([
        'おはようございます。',
        'これはテストです!ご協力ありがとうございます。本日はよろしくお願いいたします。それでは始めましょう。',
      ]);
    });
  });

  describe('getUserInputPrefix', () => {
    it('should return the prefix consists of Hiragana for Japanese input', () => {
      const result = TEST_ONLY.getUserInputPrefix('あしたの天気は?');
      expect(result).toEqual('あしたの');
    });

    it('should return an empty string if the text starts with Kanji', () => {
      const result = TEST_ONLY.getUserInputPrefix('明日の天気は?');
      expect(result).toEqual('');
    });

    it('should return the prefix consists of alphabets for pinyin input', () => {
      const result = TEST_ONLY.getUserInputPrefix('wazai');
      expect(result).toEqual('wazai');
    });
  });

  describe('ignoreUnnecessaryDiffs', () => {
    it('should ignore diffs at the beginning of a long sentence', () => {
      const result = TEST_ONLY.ignoreUnnecessaryDiffs(
        'I enjoyed the trip to',
        'Fortunately, I enjoyed the trip to Paris.',
      );
      expect(result).toEqual('I enjoyed the trip to Paris.');
    });

    it('should accept diffs near the end of a sentence', () => {
      const result = TEST_ONLY.ignoreUnnecessaryDiffs(
        '今日はいいてん',
        '今日はいい天気だ。',
      );
      expect(result).toEqual('今日はいい天気だ。');
    });

    it('should ignore more diffs at the beginning of a long sentence', () => {
      const result = TEST_ONLY.ignoreUnnecessaryDiffs(
        'The weather forecast indicates',
        'As far as I can tell, the weather forecast indicates clear skies.',
      );
      expect(result).toEqual('The weather forecast indicates clear skies.');
    });

    it('should accept diffs near the end of a sentence', () => {
      const result = TEST_ONLY.ignoreUnnecessaryDiffs(
        '你好,ti',
        '你好,天气真不错。',
      );
      expect(result).toEqual('你好,天气真不错。');
    });

    it('should accept multiple diffs nicely', () => {
      const result = TEST_ONLY.ignoreUnnecessaryDiffs(
        'さきほど見た天気予報によると、あした',
        '先ほど見た天気予報によると、明日は晴れのようです。',
      );
      expect(result).toEqual(
        'さきほど見た天気予報によると、明日は晴れのようです。',
      );
    });

    it('should accept the new sentence if it is very different from the old one', () => {
      const result = TEST_ONLY.ignoreUnnecessaryDiffs(
        'ラーメンが食べ',
        'チャーハンとラーメン、どちらにしますか?',
      );
      expect(result).toEqual('チャーハンとラーメン、どちらにしますか?');
    });

    it('should accept the new sentence if it is very different from the old one', () => {
      const result = TEST_ONLY.ignoreUnnecessaryDiffs(
        'I want to eat a delicious hamburger.',
        'Which do you want, a hamburger or a sandwich?',
      );
      expect(result).toEqual('Which do you want, a hamburger or a sandwich?');
    });

    it('should not insert both deleted and inserted text at the same position', () => {
      // This is an edge case test. Length of '急に天気が悪くなって' is MODIFIABLE_TEXT_LENGTH.
      const result = TEST_ONLY.ignoreUnnecessaryDiffs(
        'あれ!急に天気が悪くなって',
        'あれ??急に天気が悪くなってきたぞ!',
      );
      expect(result).toEqual('あれ!急に天気が悪くなってきたぞ!');
    });

    it('should handle edge cases nicely', () => {
      // This is an edge case test. diff-match-patch considers there is no
      // common part of these two text except for the last '。'.
      const result = TEST_ONLY.ignoreUnnecessaryDiffs(
        'あめりかにいきたいな。',
        'アメリカに行きたいな、飛行機に乗って。',
      );
      expect(result).toEqual('アメリカに行きたいな、飛行機に乗って。');
    });
  });
});

describe('PvAppElement', () => {
  describe('initialization', () => {
    it('should create with default state when no state provided', () => {
      const element = new TEST_ONLY.PvAppElement();

      // Compare all state members with CONFIG_DEFAULT
      expect(element.state.aiConfig).toBe(CONFIG_DEFAULT.aiConfig);
      expect(element.state.expandAtOrigin).toBe(CONFIG_DEFAULT.expandAtOrigin);
      // Initial phrases are now loaded from the language definition by default
      expect(element.state.initialPhrases).toEqual(
        LANGUAGES['japaneseWithSingleRowKeyboard'].initialPhrases,
      );
      expect(element.state.persona).toBe(CONFIG_DEFAULT.persona);
      expect(element.state.sentenceSmallMargin).toBe(
        CONFIG_DEFAULT.sentenceSmallMargin,
      );
      expect(element.state.voiceName).toBe(CONFIG_DEFAULT.ttsVoice);
      expect(element.state.voicePitch).toBe(CONFIG_DEFAULT.voicePitch);
      expect(element.state.voiceSpeakingRate).toBe(
        CONFIG_DEFAULT.voiceSpeakingRate,
      );
      expect(element.state.lang.code).toBe('ja-JP');
    });

    it('should use provided state', () => {
      const storage = new ConfigStorage('test', TEST_CONFIG);
      const state = new State(storage);
      state.lang = LANGUAGES['japaneseWithSingleRowKeyboard'];
      const element = new TEST_ONLY.PvAppElement(state);

      // Compare all state members with TEST_CONFIG
      expect(element.state.aiConfig).toBe(TEST_CONFIG.aiConfig);
      expect(element.state.expandAtOrigin).toBe(TEST_CONFIG.expandAtOrigin);
      expect(element.state.initialPhrases).toEqual(TEST_CONFIG.initialPhrases);
      expect(element.state.persona).toBe(TEST_CONFIG.persona);
      expect(element.state.sentenceSmallMargin).toBe(
        TEST_CONFIG.sentenceSmallMargin,
      );
      expect(element.state.voiceName).toBe(TEST_CONFIG.ttsVoice);
      expect(element.state.voicePitch).toBe(TEST_CONFIG.voicePitch);
      expect(element.state.voiceSpeakingRate).toBe(
        TEST_CONFIG.voiceSpeakingRate,
      );
      expect(element.state.lang.code).toBe('ja-JP');
    });
  });
});
