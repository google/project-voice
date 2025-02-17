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
});

describe('PvAppElement', () => {
  describe('initialization', () => {
    it('should create with default state when no state provided', () => {
      const element = new TEST_ONLY.PvAppElement();

      // Compare all state members with CONFIG_DEFAULT
      expect(element.state.aiConfig).toBe(CONFIG_DEFAULT.aiConfig);
      expect(element.state.expandAtOrigin).toBe(CONFIG_DEFAULT.expandAtOrigin);
      expect(element.state.initialPhrases).toEqual(
        CONFIG_DEFAULT.initialPhrases
      );
      expect(element.state.persona).toBe(CONFIG_DEFAULT.persona);
      expect(element.state.sentenceSmallMargin).toBe(
        CONFIG_DEFAULT.sentenceSmallMargin
      );
      expect(element.state.voiceName).toBe(CONFIG_DEFAULT.ttsVoice);
      expect(element.state.voicePitch).toBe(CONFIG_DEFAULT.voicePitch);
      expect(element.state.voiceSpeakingRate).toBe(
        CONFIG_DEFAULT.voiceSpeakingRate
      );
      expect(element.state.lang).toBe('en');
    });

    it('should use provided state', () => {
      const storage = new ConfigStorage('test', TEST_CONFIG);
      const state = new State(storage);
      state.lang = 'ja';
      const element = new TEST_ONLY.PvAppElement(state);

      // Compare all state members with TEST_CONFIG
      expect(element.state.aiConfig).toBe(TEST_CONFIG.aiConfig);
      expect(element.state.expandAtOrigin).toBe(TEST_CONFIG.expandAtOrigin);
      expect(element.state.initialPhrases).toEqual(TEST_CONFIG.initialPhrases);
      expect(element.state.persona).toBe(TEST_CONFIG.persona);
      expect(element.state.sentenceSmallMargin).toBe(
        TEST_CONFIG.sentenceSmallMargin
      );
      expect(element.state.voiceName).toBe(TEST_CONFIG.ttsVoice);
      expect(element.state.voicePitch).toBe(TEST_CONFIG.voicePitch);
      expect(element.state.voiceSpeakingRate).toBe(
        TEST_CONFIG.voiceSpeakingRate
      );
      expect(element.state.lang).toBe('ja');
    });
  });
});
