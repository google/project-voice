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

const KEYS = [
  ['あ', 'い', 'う', 'え', 'お'],
  ['か', 'き', 'く', 'け', 'こ'],
  ['さ', 'し', 'す', 'せ', 'そ'],
  ['た', 'ち', 'つ', 'て', 'と'],
  ['な', 'に', 'ぬ', 'ね', 'の'],
  ['は', 'ひ', 'ふ', 'へ', 'ほ'],
  ['ま', 'み', 'む', 'め', 'も'],
  ['や', 'ゆ', 'よ'],
  ['ら', 'り', 'る', 'れ', 'ろ'],
  ['わ', 'を', 'ん', '、', '。'],
  ['゛', '゜', 'ー', '？', '！'],
];

@customElement('pv-fifty-key-keyboard')
export class PvFiftyKeyKeyboard extends LitElement {
  static styles = css`
    .container {
      display: flex;
      flex-direction: row-reverse;
      gap: 0.5rem;
    }

    button {
      background: var(--app-background-color, white);
      border-radius: 0.5vh;
      border: solid 3px #8ab4f8;
      color: var(--app-color);
      cursor: pointer;
      font-family: 'Roboto Mono', 'Noto Sans JP', monospace;
      font-size: min(5vh, 2rem);
      padding: 0 1rem;
    }

    .row {
      display: flex;
      flex-direction: column;
      flex: 1;
      gap: 0.5rem;
      justify-content: space-between;
    }

    .row.odd button {
      background: #e8f0fe;
    }

    .row button:focus,
    .row button:hover {
      background: var(--app-highlight-background-color, yellow);
    }
  `;
  render() {
    return html`<div class="container">
      ${KEYS.map(
        (row, i) =>
          html`<div class="row ${i % 2 === 0 ? 'even' : 'odd'}">
            ${row.map(
              key =>
                html`<button
                  @click=${() => {
                    this.dispatchEvent(
                      new CustomEvent('character-select', {
                        detail: key,
                        bubbles: true,
                        composed: true,
                      }),
                    );
                  }}
                >
                  ${key}
                </button>`,
            )}
          </div>`,
      )}
    </div>`;
  }
}
