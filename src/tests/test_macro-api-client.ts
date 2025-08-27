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

import {TEST_ONLY} from '../macro-api-client.js';

describe('Macro API Client', () => {
  describe('parseResponse', () => {
    it('should remove leading numbers and dots', () => {
      const result = TEST_ONLY.parseResponse(
        '1. This is the first line.\n2. This is the second line.',
        5,
      );
      expect(result).toEqual([
        'This is the first line.',
        'This is the second line.',
      ]);
    });

    it('should remove unnecessary line breaks', () => {
      const result = TEST_ONLY.parseResponse(
        '1. This is the first line.\n2. This is the second line.\n\n3. This is the third line.',
        5,
      );
      expect(result).toEqual([
        'This is the first line.',
        'This is the second line.',
        'This is the third line.',
      ]);
    });

    it('should remove leading spaces', () => {
      const result = TEST_ONLY.parseResponse(
        '1. This is the first line.\n   2. This is the second line.',
        5,
      );
      expect(result).toEqual([
        'This is the first line.',
        'This is the second line.',
      ]);
    });

    it('should remove trailing spaces', () => {
      const result = TEST_ONLY.parseResponse(
        '1. This is the first line. \n2. This is the second line.',
        5,
      );
      expect(result).toEqual([
        'This is the first line.',
        'This is the second line.',
      ]);
    });

    it('should ignore escaped line breaks', () => {
      const result = TEST_ONLY.parseResponse(
        '1. This is the\\\n first line.\n2. This is the second line.',
        5,
      );
      expect(result).toEqual([
        'This is the first line.',
        'This is the second line.',
      ]);
    });

    it('should ignore unrelated lines', () => {
      const result = TEST_ONLY.parseResponse(
        'Here we go!\n1. This is the first line.\n2. This is the second line.\nGood luck.',
        5,
      );
      expect(result).toEqual([
        'This is the first line.',
        'This is the second line.',
      ]);
    });

    it('should not return more than num results', () => {
      const result = TEST_ONLY.parseResponse(
        '1. a\n2. b\n3. c\n4. d\n5. e\n6. f\n7. g',
        5,
      );
      expect(result).toEqual(['a', 'b', 'c', 'd', 'e']);
    });
  });
});
