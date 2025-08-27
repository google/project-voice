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

import {css, html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';

@customElement('pv-sentence-type-selector')
export class PvSentenceTypeSelectorElement extends LitElement {
  @property({type: String})
  selected = '';

  @property({type: Array})
  sentenceTypes: {emoji: string; prompt: string; label: string}[] = [];

  static styles = css`
    ul {
      background: var(--color-surface);
      border-radius: 2rem;
      display: inline-flex;
      gap: 1rem;
      list-style: none;
      margin: 0;
      padding: 0;
      padding: 1rem;
    }

    li {
      text-align: center;
    }

    button {
      border-radius: 1rem;
      border: solid 3px transparent;
      color: #202124;
      cursor: pointer;
      font-family: var(--font-family-base);
      padding: 0.5rem 1rem;
      width: 8rem;
    }

    button:hover,
    button.selected {
      background: var(--color-primary);
    }

    button.selected {
      border-color: black;
    }

    button .emoji {
      font-size: 3rem;
      line-height: 1;
    }

    button .label {
      font-weight: 500;
    }
  `;
  render() {
    return html`<ul>
      ${this.sentenceTypes.map(sentenceType => {
        return html`<li>
          <button
            @click=${() => {
              this.selected =
                sentenceType.prompt === this.selected
                  ? ''
                  : sentenceType.prompt;
              this.dispatchEvent(new Event('select'));
            }}
            class="${sentenceType.prompt === this.selected ? 'selected' : ''}"
          >
            <div class="emoji">${sentenceType.emoji}</div>
            <div class="label">
              ${sentenceType.label ?? sentenceType.prompt}
            </div>
          </button>
        </li>`;
      })}
    </ul>`;
  }
}
