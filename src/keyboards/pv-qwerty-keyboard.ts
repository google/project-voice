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
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', '?', '!'],
  [',', ' ', '.'],
];

@customElement('pv-qwerty-keyboard')
export class PvQwertyKeyboard extends LitElement {
  static styles = css`
    .container {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    button {
      background: var(--color-surface, white);
      border-radius: 0.5vh;
      border: solid 3px #8ab4f8;
      color: var(--color-on-surface);
      cursor: pointer;
      flex: 1;
      font-family: 'Roboto Mono', 'Noto Sans JP', monospace;
      font-size: min(4vh, 1.5rem);
      min-width: 2em;
      padding: 0.5rem 1rem;
      text-align: center;
    }

    .row {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
    }

    .row.odd button {
      background: var(--color-secondary);
    }

    .row button:focus,
    .row button:hover {
      background: var(--color-primary, yellow);
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
