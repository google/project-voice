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

import {LANGUAGES} from '../language.js';

describe('Language Functionality Tests', () => {
  describe('English Language Tests', () => {
    const englishSingleRow = LANGUAGES['englishWithSingleRowKeyboard'];
    const englishQwerty = LANGUAGES['englishWithQwertyKeyboard'];

    describe('segment', () => {
      it('should segment English text by spaces', () => {
        const text = 'Hello world this is a test';
        const expected = ['Hello', 'world', 'this', 'is', 'a', 'test'];

        expect(englishSingleRow.segment(text)).toEqual(expected);
        expect(englishQwerty.segment(text)).toEqual(expected);
      });

      it('should handle single word', () => {
        const text = 'Hello';
        const expected = ['Hello'];

        expect(englishSingleRow.segment(text)).toEqual(expected);
        expect(englishQwerty.segment(text)).toEqual(expected);
      });

      it('should handle empty string', () => {
        const text = '';
        const expected = [''];

        expect(englishSingleRow.segment(text)).toEqual(expected);
        expect(englishQwerty.segment(text)).toEqual(expected);
      });

      it('should handle emoji', () => {
        const text = 'Hello 🙂 world';
        const expected = ['Hello', '🙂', 'world'];

        expect(englishSingleRow.segment(text)).toEqual(expected);
        expect(englishQwerty.segment(text)).toEqual(expected);
      });
    });

    describe('join', () => {
      it('should join words with spaces and add trailing space', () => {
        const words = ['Hello', 'world', 'this', 'is', 'a', 'test'];
        const expected = 'Hello world this is a test ';

        expect(englishSingleRow.join(words)).toEqual(expected);
        expect(englishQwerty.join(words)).toEqual(expected);
      });

      it('should handle single word', () => {
        const words = ['Hello'];
        const expected = 'Hello ';

        expect(englishSingleRow.join(words)).toEqual(expected);
        expect(englishQwerty.join(words)).toEqual(expected);
      });

      it('should handle empty array', () => {
        const words: string[] = [];
        const expected = ' ';

        expect(englishSingleRow.join(words)).toEqual(expected);
        expect(englishQwerty.join(words)).toEqual(expected);
      });

      it('should remove extra space before punctuation', () => {
        const words = ['Yes', ',', 'I', 'can', '.'];
        const expected = 'Yes, I can. ';

        expect(englishSingleRow.join(words)).toEqual(expected);
        expect(englishQwerty.join(words)).toEqual(expected);
      });

      it('should handle multiple punctuation marks', () => {
        const words = ['What', 'is', '.NET', 'framework', '?'];
        const expected = 'What is .NET framework? ';

        expect(englishSingleRow.join(words)).toEqual(expected);
        expect(englishQwerty.join(words)).toEqual(expected);
      });
    });

    describe('appendWord', () => {
      it('should append word with leading space', () => {
        const text = 'Hello';
        const word = 'world';
        const expected = 'Hello world ';

        expect(englishSingleRow.appendWord(text, word)).toEqual(expected);
        expect(englishQwerty.appendWord(text, word)).toEqual(expected);
      });

      it('should handle word starting with hyphen', () => {
        const text = 'Hel';
        const word = '-lo';
        const expected = 'Hello ';

        expect(englishSingleRow.appendWord(text, word)).toEqual(expected);
        expect(englishQwerty.appendWord(text, word)).toEqual(expected);
      });
    });
  });

  describe('Japanese Language Tests', () => {
    const japaneseSingleRow = LANGUAGES['japaneseWithSingleRowKeyboard'];
    const japaneseFull = LANGUAGES['japaneseWithFullkeyboard'];

    describe('join', () => {
      it('should join Japanese words without spaces', () => {
        const words = ['こんにちは', '世界'];
        const expected = 'こんにちは世界';

        expect(japaneseSingleRow.join(words)).toEqual(expected);
        expect(japaneseFull.join(words)).toEqual(expected);
      });

      it('should handle single word', () => {
        const words = ['こんにちは'];
        const expected = 'こんにちは';

        expect(japaneseSingleRow.join(words)).toEqual(expected);
        expect(japaneseFull.join(words)).toEqual(expected);
      });

      it('should handle empty array', () => {
        const words: string[] = [];
        const expected = '';

        expect(japaneseSingleRow.join(words)).toEqual(expected);
        expect(japaneseFull.join(words)).toEqual(expected);
      });
    });

    describe('appendWord', () => {
      it('should append word without space', () => {
        const text = 'こんにちは';
        const word = '世界';
        const expected = 'こんにちは世界';

        expect(japaneseSingleRow.appendWord(text, word)).toEqual(expected);
        expect(japaneseFull.appendWord(text, word)).toEqual(expected);
      });

      it('should handle word starting with hyphen', () => {
        const text = 'こんにちは';
        const word = '-世界';
        const expected = 'こんにちは世界';

        expect(japaneseSingleRow.appendWord(text, word)).toEqual(expected);
        expect(japaneseFull.appendWord(text, word)).toEqual(expected);
      });

      it('should handle empty text', () => {
        const text = '';
        const word = 'こんにちは';
        const expected = 'こんにちは';

        expect(japaneseSingleRow.appendWord(text, word)).toEqual(expected);
        expect(japaneseFull.appendWord(text, word)).toEqual(expected);
      });
    });
  });

  describe('Mandarin Language Tests', () => {
    const mandarin = LANGUAGES['mandarinWithSingleRowKeyboard'];

    describe('segment', () => {
      it('should segment Mandarin text character by character', () => {
        const text = '你好世界';
        const expected = ['你', '好', '世', '界'];

        expect(mandarin.segment(text)).toEqual(expected);
      });

      it('should handle single character', () => {
        const text = '你';
        const expected = ['你'];

        expect(mandarin.segment(text)).toEqual(expected);
      });

      it('should handle empty string', () => {
        const text = '';
        const expected: string[] = [];

        expect(mandarin.segment(text)).toEqual(expected);
      });

      it('should handle emoji', () => {
        const text = '你好🙂世界';
        const expected = ['你', '好', '🙂', '世', '界'];

        expect(mandarin.segment(text)).toEqual(expected);
      });
    });

    describe('join', () => {
      it('should join Mandarin characters without spaces', () => {
        const words = ['你', '好', '世', '界'];
        const expected = '你好世界';

        expect(mandarin.join(words)).toEqual(expected);
      });

      it('should handle single character', () => {
        const words = ['你'];
        const expected = '你';

        expect(mandarin.join(words)).toEqual(expected);
      });

      it('should handle empty array', () => {
        const words: string[] = [];
        const expected = '';

        expect(mandarin.join(words)).toEqual(expected);
      });
    });

    describe('appendWord', () => {
      it('should append word without space', () => {
        const text = '你好';
        const word = '世界';
        const expected = '你好世界';

        expect(mandarin.appendWord(text, word)).toEqual(expected);
      });

      it('should handle word starting with hyphen', () => {
        const text = '你好';
        const word = '-世界';
        const expected = '你好世界';

        expect(mandarin.appendWord(text, word)).toEqual(expected);
      });

      it('should remove pinyin part if any', () => {
        const text = '你hao';
        const word = '好';
        const expected = '你好';

        expect(mandarin.appendWord(text, word)).toEqual(expected);
      });

      it('should handle empty text', () => {
        const text = '';
        const word = '你好';
        const expected = '你好';

        expect(mandarin.appendWord(text, word)).toEqual(expected);
      });
    });
  });
});
