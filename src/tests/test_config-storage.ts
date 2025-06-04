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

import {Config, ConfigStorage} from '../config-storage.js';

export const TEST_CONFIG: Config = {
  aiConfig: 'smart',
  checkedLanguages: ['japaneseSingleRowKeyboard'],
  enableEarcons: false,
  expandAtOrigin: true,
  initialPhrases: ['Yes', 'No'],
  messageHistory: [],
  persona: "I'm an example model smarter than example model 1.0",
  sentenceSmallMargin: false,
  ttsVoice: 'ja-JP-ExampleVoice-X',
  voicePitch: 5,
  voiceSpeakingRate: 3,
};

describe('UsaStorage', () => {
  describe('read', () => {
    beforeEach(() => {
      window.localStorage.clear();
    });

    afterAll(() => {
      window.localStorage.clear();
    });

    it('should return the given default value when nothing is written.', () => {
      const storage = new ConfigStorage('test', TEST_CONFIG);

      expect(storage.read('expandAtOrigin')).toEqual(true);
      expect(storage.read('voiceSpeakingRate')).toEqual(3);
      expect(storage.read('initialPhrases')).toEqual(['Yes', 'No']);
    });

    it('should return the written value when something is written.', () => {
      const storage = new ConfigStorage('test', TEST_CONFIG);
      storage.write('sentenceSmallMargin', true);
      storage.write('voicePitch', 0);
      storage.write('initialPhrases', ['I', 'You', 'They']);

      expect(storage.read('sentenceSmallMargin')).toEqual(true);
      expect(storage.read('voicePitch')).toEqual(0);
      expect(storage.read('initialPhrases')).toEqual(['I', 'You', 'They']);
    });
  });
});
