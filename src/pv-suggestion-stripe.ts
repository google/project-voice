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

import './pv-button.js';

import {css, html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {State} from './state.js';

export enum SentenceSuggestionSource {
  HISTORY = 'HISTORY',
  LLM = 'LLM',
}

export class SentenceSuggestion {
  constructor(
    public source: SentenceSuggestionSource,
    public value: string,
  ) {}
}

export class SuggestionSelectEvent extends CustomEvent<
  [string, number, SentenceSuggestionSource]
> {}

/**
 * Returns the leading words covered by the offset string.
 * @param words The target words.
 * @param offsetWords The offset words to examine.
 * @returns The leading words covered by the offset.
 */
function getLeadingWords(words: string[], offsetWords: string[]) {
  const result = [];
  for (let i = 0; i < words.length; i++) {
    if (words[i] === offsetWords[0]) {
      result.push(offsetWords.shift());
    } else {
      break;
    }
  }
  return result;
}

function splitPunctuations(words: string[]) {
  const splitWords = [];

  for (const word of words) {
    const m = word.match(/^(.*[^.,!?])([.,!?]+)$/);
    if (m) {
      splitWords.push(m[1]);
      splitWords.push(m[2]);
    } else {
      splitWords.push(word);
    }
  }

  return splitWords;
}

@customElement('pv-suggestion-stripe')
export class PvSuggestionStripeElement extends LitElement {
  @property({type: Object})
  private state!: State;

  @property({type: Object, reflect: true})
  suggestion = new SentenceSuggestion(SentenceSuggestionSource.LLM, '');

  @property({type: String, reflect: true})
  offset = '';

  @property({type: Number})
  mouseoverIndex = -1;

  static styles = css`
    :host {
      -ms-overflow-style: none;
      display: block;
      overflow-x: scroll;
      scrollbar-width: none;
      white-space: nowrap;
    }

    :host::-webkit-scrollbar {
      display: none;
    }

    pv-button {
      margin-right: 0.5rem;
    }

    .ellipsis {
      font-family: 'Roboto Mono', monospace;
      font-size: 5vh;
    }
  `;

  render() {
    const words = splitPunctuations(
      this.state.lang.segment(this.suggestion.value),
    );
    const leadingWords = getLeadingWords(
      words,
      splitPunctuations(this.state.lang.segment(this.offset)),
    );
    return html`${leadingWords.length > 0
      ? html`<span class="ellipsis">… </span>`
      : ''}
    ${words.map((word, i) =>
      i < leadingWords.length
        ? ''
        : html` <pv-button
            ?active="${i <= this.mouseoverIndex}"
            .label="${word}"
            @mouseenter="${() => {
              this.mouseoverIndex = i;
            }}"
            @mouseleave="${() => {
              this.mouseoverIndex = -1;
            }}"
            @click="${() => {
              this.dispatchEvent(
                new SuggestionSelectEvent('select', {
                  detail: [
                    this.state.lang.join(words.slice(0, i + 1)),
                    i - leadingWords.length,
                    this.suggestion.source,
                  ],
                }),
              );
            }}"
          ></pv-button>`,
    )}`;
  }
}

export const TEST_ONLY = {
  getLeadingWords,
  splitPunctuations,
};
