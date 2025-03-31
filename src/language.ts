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

import './keyboards/pv-single-row-keyboard.js';

import {msg} from '@lit/localize';
import {html, TemplateResult} from 'lit';
import {literal, StaticValue} from 'lit/static-html.js';

declare class TinySegmenter {
  segment(text: string): string[];
}

declare global {
  interface Window {
    TinySegmenter: typeof TinySegmenter;
  }
}

export interface Language {
  /**
   * The locale code of the language, e.g. 'en-US'. Used for speech synthesis,
   * etc.
   */
  readonly code: string;

  /**
   * The name of the language in English, e.g. 'Japanese'. Used to fill the
   * [[language]] placeholder of prompts.
   */
  readonly promptName: string;

  /** List of the available keyboards for this language in tag name. */
  readonly keyboards: StaticValue[];

  /** Word separator of this language. */
  readonly separetor: string;

  /** Default initial phrases. */
  readonly initialPhrases: string[];

  /** AI configs for this language. */
  readonly aiConfigs: {
    [key: string]: {model: string; sentence: string; word: string};
  };

  // Renders the language name in a human readable way.
  render(): TemplateResult;

  /**
   * Segments a sentence in the language into words.
   *
   * For example, Japanese doesn't separate words with spaces. We need a
   * specific segment / join logic for such languages.
   */
  segment(sentence: string): string[];

  /** Joins words in the language into a sentence. */
  join(words: string[]): string;
}

abstract class LatinScriptLanguage implements Language {
  code = '';
  promptName = '';
  keyboards: StaticValue[] = [];
  separetor = ' ';
  initialPhrases: string[] = [];
  aiConfigs = {
    classic: {
      model: 'gemini-1.5-pro-002',
      sentence: 'SentenceGeneric20250311',
      word: 'WordGeneric20240628',
    },
    fast: {
      model: 'gemini-2.0-flash-lite-001',
      sentence: 'SentenceGeneric20250311',
      word: 'WordGeneric20240628',
    },
    smart: {
      model: 'gemini-2.0-flash-001',
      sentence: 'SentenceGeneric20250311',
      word: 'WordGeneric20240628',
    },
  };

  abstract render(): TemplateResult;

  segment(sentence: string) {
    return sentence.split(' ');
  }

  join(words: string[]) {
    // Remove extra space before punctuation caused by punctuation split, and add a trailing space.
    // For example,
    // 'Yes , I can .' => 'Yes, I can. '
    // 'What is .NET framework ?' => 'What is .NET framework? '
    return words.join(' ').replace(/ ([.,!?]+( |$))/g, '$1') + ' ';
  }
}

abstract class English extends LatinScriptLanguage {
  code = 'en-US';
  promptName = 'English';
  initialPhrases = [
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
  ];
}

class EnglishWithSingleRowKeyboard extends English {
  keyboards = [literal`pv-alphanumeric-single-row-keyboard`];
  override render() {
    return html`${msg('English (single-row keyboard)')}`;
  }
}

abstract class Japanese implements Language {
  code = 'ja-JP';
  promptName = 'Japanese';
  keyboards: StaticValue[] = [];
  separetor = '';
  initialPhrases = [
    'はい',
    'いいえ',
    'ありがとう',
    'すみません',
    'お願いします',
    '私',
    'あなた',
    '彼',
    '彼女',
    '今日',
    '昨日',
    '明日',
  ];
  aiConfigs = {
    classic: {
      model: 'gemini-1.5-pro-002',
      sentence: 'SentenceJapanese20240628',
      word: 'WordGeneric20240628',
    },
    fast: {
      model: 'gemini-2.0-flash-lite-001',
      sentence: 'SentenceJapanese20240628',
      word: 'WordGeneric20240628',
    },
    smart: {
      model: 'gemini-2.0-flash-001',
      sentence: 'SentenceJapaneseLong20241002',
      word: 'WordGeneric20240628',
    },
  };

  abstract render(): TemplateResult;

  private tinySegmenter = window.TinySegmenter
    ? new window.TinySegmenter()
    : null;
  segment(sentence: string) {
    if (!this.tinySegmenter) {
      return [sentence];
    }
    return this.tinySegmenter?.segment(sentence);
  }

  join(words: string[]) {
    return words.join('');
  }
}

class JapaneseWithSingleRowKeyboard extends Japanese {
  keyboards = [
    literal`pv-hiragana-single-row-keyboard`,
    literal`pv-alphanumeric-single-row-keyboard`,
  ];
  render() {
    return html`${msg('Japanese (single-row keyboard)')}`;
  }
}

export const LANGUAGES: {[name: string]: Language} = {
  englishWithSingleRowKeyboard: new EnglishWithSingleRowKeyboard(),
  japaneseWithSingleRowKeyboard: new JapaneseWithSingleRowKeyboard(),
};
