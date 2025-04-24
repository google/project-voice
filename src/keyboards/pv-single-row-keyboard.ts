/**
 * Copyright 2025 Google LLC
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

import '../pv-expand-keypad.js';

import {css, html, LitElement} from 'lit';
import {customElement, property, queryAll} from 'lit/decorators.js';

import type {PvExpandKeypadElement} from '../pv-expand-keypad.js';
import {State} from '../state.js';

type Key = {label: string; value: string[]};

export const ALPHANUMERIC_SINGLE_ROW_KEYGRID: Key[][] = [
  [
    {label: 'abc', value: ['abc']},
    {label: 'def', value: ['def']},
    {label: 'ghi', value: ['ghi']},
    {label: 'jkl', value: ['jkl']},
    {label: 'mno', value: ['mno']},
    {label: 'pqrs', value: ['pqrs']},
    {label: 'tuv', value: ['tuv']},
    {label: 'wxyz', value: ['wxyz']},
    {label: '0~9', value: ['01234', '56789']},
    {label: '.,!?', value: ['␣.,!?']},
  ],
];

export const HIRAGANA_SINGLE_ROW_KEYGRID: Key[][] = [
  [
    {label: 'あ', value: ['あいうえお', 'ぁぃぅぇぉ']},
    {label: 'か', value: ['かきくけこ', 'がぎぐげご']},
    {label: 'さ', value: ['さしすせそ', 'ざじずぜぞ']},
    {label: 'た', value: ['たちつてとっ', 'だぢづでど']},
    {label: 'な', value: ['なにぬねの']},
    {label: 'は', value: ['はひふへほ', 'ばびぶべぼ', 'ぱぴぷぺぽ']},
    {label: 'ま', value: ['まみむめも']},
    {label: 'や', value: ['やゆよ', 'ゃゅょ']},
    {label: 'ら', value: ['らりるれろ']},
    {label: 'わ', value: ['わをん']},
    {label: '゛゜', value: ['。、ー？！', '␣゛゜']},
  ],
];

export const FRENCH_SINGLE_ROW_KEYGRID: Key[][] = [
  [
    {label: 'abc', value: ['abc', 'àâç']},
    {label: 'def', value: ['def', 'èéêë']},
    {label: 'ghi', value: ['ghi', 'îï']},
    {label: 'jkl', value: ['jkl']},
    {label: 'mno', value: ['mno', 'ôœ']},
    {label: 'pqrs', value: ['pqrs']},
    {label: 'tuv', value: ['tuv', 'ùûü']},
    {label: 'wxyz', value: ['wxyz', 'ÿ']},
    {label: '0~9', value: ['01234', '56789']},
    {label: '.,!?', value: ['␣.,!?']},
  ],
];

export const GERMAN_SINGLE_ROW_KEYGRID: Key[][] = [
  [
    {label: 'abc', value: ['abc', 'ä']},
    {label: 'def', value: ['def']},
    {label: 'ghi', value: ['ghi']},
    {label: 'jkl', value: ['jkl']},
    {label: 'mno', value: ['mno', 'ö']},
    {label: 'pqrs', value: ['pqrs']},
    {label: 'tuv', value: ['tuv', 'ü']},
    {label: 'wxyz', value: ['wxyz']},
    {label: '0~9', value: ['01234', '56789']},
    {label: '.,!?', value: ['␣.,!?']},
  ],
];

export const SWEDISH_SINGLE_ROW_KEYGRID: Key[][] = [
  [
    {label: 'abc', value: ['abc', 'åä']},
    {label: 'def', value: ['def']},
    {label: 'ghi', value: ['ghi']},
    {label: 'jkl', value: ['jkl']},
    {label: 'mno', value: ['mno', 'ö']},
    {label: 'pqrs', value: ['pqrs']},
    {label: 'tuv', value: ['tuv', 'ü']},
    {label: 'wxyz', value: ['wxyz']},
    {label: '0~9', value: ['01234', '56789']},
    {label: '.,!?', value: ['␣.,!?']},
  ],
];

export class PvSingleRowKeyboard extends LitElement {
  constructor(public keygrid: Key[][]) {
    super();
  }

  @property({type: Object})
  private state?: State;

  @queryAll('pv-expand-keypad')
  keypads?: PvExpandKeypadElement[];

  static styles = css`
    :host {
      position: relative;
    }

    ul {
      display: flex;
      gap: 0.5rem;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    li {
      flex: 1;
      max-width: 9rem;
    }
  `;

  protected firstUpdated() {
    this.addEventListener('keypad-open', (e: Event) => {
      const target = e.composedPath()[0];
      this.keypads?.forEach(keypad => {
        keypad.open = keypad === target;
      });
    });
  }

  render() {
    return this.keygrid.map(
      keys => html`
        <ul>
          ${keys.map(
            keypad => html`
              <li>
                <pv-expand-keypad
                  .label=${keypad.label}
                  .value=${keypad.value}
                  ?expandAtOrigin=${this.state?.expandAtOrigin || false}
                ></pv-expand-keypad>
              </li>
            `,
          )}
        </ul>
      `,
    );
  }
}

@customElement('pv-alphanumeric-single-row-keyboard')
export class PvAlphanumericSingleRowKeyboard extends PvSingleRowKeyboard {
  constructor() {
    super(ALPHANUMERIC_SINGLE_ROW_KEYGRID);
  }
}

@customElement('pv-hiragana-single-row-keyboard')
export class PvHiraganaSingleRowKeyboard extends PvSingleRowKeyboard {
  constructor() {
    super(HIRAGANA_SINGLE_ROW_KEYGRID);
  }
}

@customElement('pv-french-single-row-keyboard')
export class PvFrenchSingleRowKeyboard extends PvSingleRowKeyboard {
  constructor() {
    super(FRENCH_SINGLE_ROW_KEYGRID);
  }
}

@customElement('pv-german-single-row-keyboard')
export class PvGermanSingleRowKeyboard extends PvSingleRowKeyboard {
  constructor() {
    super(GERMAN_SINGLE_ROW_KEYGRID);
  }
}

@customElement('pv-swedish-single-row-keyboard')
export class PvSwedishSingleRowKeyboard extends PvSingleRowKeyboard {
  constructor() {
    super(SWEDISH_SINGLE_ROW_KEYGRID);
  }
}
