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

import {css, html, LitElement} from 'lit';
import {customElement} from 'lit/decorators.js';

/**
 * Special character from PAU to transform the last input kana character to its
 * small form (e.g. や→ゃ).
 */
export const SMALL_KANA_TRIGGER = String.fromCodePoint(0xf000);

/**
 * Hiragana characters that have small forms.
 *
 * ref. https://ja.wikipedia.org/wiki/%E6%8D%A8%E3%81%A6%E4%BB%AE%E5%90%8D
 */
export const STEGANA = new Map([
  ['あ', 'ぁ'],
  ['い', 'ぃ'],
  ['う', 'ぅ'],
  ['え', 'ぇ'],
  ['お', 'ぉ'],
  ['つ', 'っ'],
  ['や', 'ゃ'],
  ['ゆ', 'ゅ'],
  ['よ', 'ょ'],
  ['わ', 'ゎ'],
  ['か', 'ゕ'],
  ['け', 'ゖ'],
]);

/**
 * Inverted {@link STEGANA} map.
 */
export const STEGANA_INVERT = new Map(
  Array.from(STEGANA, entry => [entry[1], entry[0]]),
);

type Key = {label: string; value: string};

const KEYS: (string | Key)[][] = [
  ['あ', 'い', 'う', 'え', 'お'],
  ['か', 'き', 'く', 'け', 'こ'],
  ['さ', 'し', 'す', 'せ', 'そ'],
  ['た', 'ち', 'つ', 'て', 'と'],
  ['な', 'に', 'ぬ', 'ね', 'の'],
  ['は', 'ひ', 'ふ', 'へ', 'ほ'],
  ['ま', 'み', 'む', 'め', 'も'],
  ['や', 'ゆ', 'よ', '', {label: '小', value: SMALL_KANA_TRIGGER}],
  ['ら', 'り', 'る', 'れ', 'ろ'],
  ['わ', 'を', 'ん', '、', '。'],
  ['゛', '゜', 'ー', '？', '！'],
];

@customElement('pv-fifty-key-keyboard')
export class PvFiftyKeyKeyboard extends LitElement {
  static styles = css`
    .container {
      direction: rtl;
      display: grid;
      gap: 0.5rem;
      grid-template-columns: repeat(${KEYS.length}, 1fr);
      grid-template-rows: repeat(5, 1fr);
    }

    button {
      align-items: center;
      background: var(--color-surface, white);
      border-radius: 0.5vh;
      border: solid 3px #8ab4f8;
      color: var(--color-on-surface);
      cursor: pointer;
      direction: ltr;
      display: flex;
      font-family: 'Roboto Mono', 'Noto Sans JP', monospace;
      font-size: max(3vh, 1rem);
      justify-content: center;
      padding: 0 0.5rem;
      text-align: center;
      overflow: hidden;
      white-space: nowrap;
    }

    button.odd {
      background: var(--color-secondary);
    }

    button:focus,
    button:hover {
      background: var(--color-primary, yellow);
    }
  `;
  render() {
    return html`<div class="container">
      ${KEYS.map((row, i) =>
        row.map((key, j) =>
          key
            ? html`<button
                class="${i % 2 === 0 ? 'even' : 'odd'}"
                style="grid-column: ${i + 1}; grid-row: ${j + 1}"
                @click=${() => {
                  this.dispatchEvent(
                    new CustomEvent('character-select', {
                      detail: typeof key === 'string' ? key : key.value,
                      bubbles: true,
                      composed: true,
                    }),
                  );
                }}
              >
                ${typeof key === 'string' ? key : key.label}
              </button>`
            : html`<span></span>`,
        ),
      )}
    </div>`;
  }
}
