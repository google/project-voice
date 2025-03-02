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

import {TEST_ONLY} from '../pv-suggestion-stripe.js';

describe('USA Suggestion Stripe', () => {
  describe('getLeadingWords', () => {
    it('should return a blank list when the offset is blank.', () => {
      const result = TEST_ONLY.getLeadingWords(['hello', 'world'], ['']);
      expect(result).toEqual([]);
    });

    it('should return the words contained in the offset.', () => {
      const result = TEST_ONLY.getLeadingWords(['I', 'can', 'fly'], ['I']);
      expect(result).toEqual(['I']);
    });

    it('should ignore unmatched words with punctuations.', () => {
      const result = TEST_ONLY.getLeadingWords(
        ['I', 'am', 'a', 'student', 'in'],
        ['I', 'am', 'a', 'student.']
      );
      expect(result).toEqual(['I', 'am', 'a']);
    });
  });
  describe('splitPunctuations', () => {
    it('should keep input words when none of them end with a punctuation.', () => {
      const result = TEST_ONLY.splitPunctuations([
        'hello',
        'world',
        'my',
        'name',
        'is',
        'nakano',
      ]);
      expect(result).toEqual(['hello', 'world', 'my', 'name', 'is', 'nakano']);
    });

    it('should split normal words end with a puctuation.', () => {
      const result = TEST_ONLY.splitPunctuations([
        'I',
        'can',
        'fly,',
        'but',
        'cannot',
        'swim...',
      ]);
      expect(result).toEqual([
        'I',
        'can',
        'fly',
        ',',
        'but',
        'cannot',
        'swim',
        '...',
      ]);
    });

    it('should not split at commas or periods in the middle of words.', () => {
      const result = TEST_ONLY.splitPunctuations([
        'Please',
        'visit',
        'example.com',
        'and',
        'google.com.',
      ]);
      expect(result).toEqual([
        'Please',
        'visit',
        'example.com',
        'and',
        'google.com',
        '.',
      ]);
    });
  });
});
