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

declare class TinySegmenter {
  segment(text: string): string[];
}

declare global {
  interface Window {
    TinySegmenter: typeof TinySegmenter;
  }
}

export class SuggestionSelectEvent extends CustomEvent<string> {}

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
  @property({type: String, reflect: true})
  suggestion = '';

  @property({type: String, reflect: true})
  offset = '';

  @property({type: String, reflect: true})
  lang = 'en';

  @property({type: Number})
  mouseoverIndex = -1;

  private tinySegmenter = new window.TinySegmenter();

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

  segment(sentence: string) {
    return this.lang === 'ja'
      ? this.tinySegmenter.segment(sentence)
      : sentence.split(' ');
  }

  join(words: string[]) {
    if (this.lang === 'ja') {
      return words.join('');
    }
    // Remove extra space before punctuation caused by punctuation split, and add a trailing space.
    // For example,
    // 'Yes , I can .' => 'Yes, I can. '
    // 'What is .NET framework ?' => 'What is .NET framework? '
    return words.join(' ').replace(/ ([.,!?]+( |$))/g, '$1') + ' ';
  }

  render() {
    // TODO when we accept other languages than English, update this segmenter.
    const words = splitPunctuations(this.segment(this.suggestion));
    const leadingWords = getLeadingWords(
      words,
      splitPunctuations(this.segment(this.offset))
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
                  detail: this.join(words.slice(0, i + 1)),
                })
              );
            }}"
          ></pv-button>`
    )}`;
  }
}

export const TEST_ONLY = {
  getLeadingWords,
  splitPunctuations,
};
