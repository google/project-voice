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

import '@material/web/progress/circular-progress.js';
import './macro-api-client.js';
import './pv-button.js';
import './pv-character-input.js';
import './pv-functions-bar.js';
import './pv-setting-panel.js';
import './pv-suggestion-stripe.js';
import './pv-textarea-wrapper.js';

import {configureLocalization, localized} from '@lit/localize';
import {SignalWatcher} from '@lit-labs/signals';
import {html, LitElement} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';

import {INITIAL_PHRASES, LARGE_MARGIN_LINE_LIMIT} from './constants.js';
import {InputSource} from './input-history.js';
import {sourceLocale, targetLocales} from './locale-codes.js';
import {MacroApiClient} from './macro-api-client.js';
import {pvAppStyle} from './pv-app-css.js';
import type {CharacterSelectEvent} from './pv-expand-keypad.js';
import type {PvFunctionsBar} from './pv-functions-bar.js';
import type {PvSettingPanel} from './pv-setting-panel.js';
import type {SuggestionSelectEvent} from './pv-suggestion-stripe.js';
import type {PvTextareaWrapper} from './pv-textarea-wrapper.js';
import {State} from './state.js';

const URL_PARAMS = {
  SENTENCE_MACRO_ID: 'sentenceMacroId',
  WORD_MACRO_ID: 'wordMacroId',
} as const;

const {setLocale} = configureLocalization({
  sourceLocale,
  targetLocales,
  loadLocale: locale => import(`/static/locales/${locale}.js`),
});

/**
 * Gets the shared prefix among the given strings.
 * @param sentences A list of strings
 * @returns The shared prefix
 */
function getSharedPrefix(sentences: string[]) {
  if (sentences.length === 0) return '';
  const sentenceLengths = sentences.map(s => s.length);
  const minLength = Math.min(...sentenceLengths);
  for (let i = 0; i < minLength; i++) {
    if (new Set(sentences.map(s => s[i])).size !== 1) {
      return sentences[0].slice(0, i);
    }
  }
  return sentences[sentenceLengths.indexOf(minLength)];
}

/**
 * Normalizes the given sentence by:
 * - removing redundant spaces
 * - applying Unicode NFKC normalization to compose Dakuon and Handakuon characters.
 *
 * @param sentence An input sentence
 * @param isLastInputFromSuggestion When true, and if the last input char is a punctuation,
 *     remove a space before the punctuation if any
 * @returns The normalized sentence
 */
function normalize(sentence: string, isLastInputFromSuggestion?: boolean) {
  let result = sentence
    .replaceAll('゛', '\u3099')
    .replaceAll('゜', '\u309a')
    .normalize('NFKC')
    .replaceAll('\u3099', '゛')
    .replaceAll('\u309a', '゜')
    .replace(/^\s+/, '')
    .replace(/\s\s+/, ' ');
  if (isLastInputFromSuggestion) {
    result = result.replace(/ ([,.?!])$/, '$1');
  }
  return result;
}

@customElement('pv-app')
@localized()
export class PvAppElement extends SignalWatcher(LitElement) {
  private apiClient: MacroApiClient;
  private stateInternal: State;

  constructor(
    state: State | null = null,
    apiClient: MacroApiClient | null = null
  ) {
    super();
    this.stateInternal = state ?? new State();
    this.apiClient = apiClient ?? new MacroApiClient();
  }

  get state(): State {
    return this.stateInternal;
  }

  @property({type: Array})
  suggestions: string[] = [];

  @property({type: Array})
  words: string[] = [];

  @property()
  isLoading = false;

  @query('pv-textarea-wrapper')
  private textField?: PvTextareaWrapper;

  @query('pv-functions-bar')
  functionsBar?: PvFunctionsBar;

  @query('pv-setting-panel')
  private settingPanel?: PvSettingPanel;

  @property({type: String, attribute: 'feature-sentence-suggestion-lang'})
  sentenceSuggestionLang = '';

  @property({type: String, attribute: 'feature-locale'})
  locale = 'ja';

  @property({type: String, attribute: 'feature-sentence-macro-id'})
  private sentenceMacroId: string | null = null;

  static styles = pvAppStyle;

  connectedCallback() {
    super.connectedCallback();

    setLocale(this.locale ? this.locale : 'ja');
    this.stateInternal.lang = this.locale ? this.locale : 'ja';

    this.stateInternal.features = {
      sentenceMacroId: this.sentenceMacroId,
      wordMacroId: null,
    };
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has(URL_PARAMS.SENTENCE_MACRO_ID)) {
      this.stateInternal.features.sentenceMacroId = urlParams.get(
        URL_PARAMS.SENTENCE_MACRO_ID
      );
    }
    if (urlParams.has(URL_PARAMS.WORD_MACRO_ID)) {
      this.stateInternal.features.wordMacroId = urlParams.get(
        URL_PARAMS.WORD_MACRO_ID
      );
    }

    // This behavior is a bit tricky. The default initial phrases are stored
    // to local storage. So initial phrases won't be changed by switching input
    // language.
    if (!this.stateInternal.initialPhrases.some(str => str)) {
      this.stateInternal.initialPhrases =
        INITIAL_PHRASES[this.stateInternal.lang];
    }
  }

  private isBlank() {
    return this.textField && this.textField.value === '';
  }

  private updateSentences(suggestions: string[]) {
    if (!this.stateInternal.sentenceSmallMargin) {
      suggestions = suggestions.slice(0, LARGE_MARGIN_LINE_LIMIT);
    }
    this.suggestions = suggestions.map(s => normalize(s));
  }

  private updateWords(words: string[]) {
    this.words = words.map(w => normalize(w));
  }

  private timeoutId: number | undefined;
  private inFlightRequests = 0;

  private prevCallsMs: number[] = [];

  /**
   * Returns delay in ms before calling fetchSuggestions() depending on recent
   * qps of updateSuggestions(). Returns 0 when qps = 1.
   */
  private delayBeforeFetchMs() {
    return Math.min(150 * (this.prevCallsMs.length - 1), 300);
  }

  async updateSuggestions() {
    window.clearTimeout(this.timeoutId);

    const now = Date.now();
    this.prevCallsMs.push(now);
    this.prevCallsMs = this.prevCallsMs.filter(item => item > now - 1000);

    if (this.isBlank()) {
      this.apiClient.abortFetch();
      this.isLoading = false;
      this.suggestions = [];
      this.words = [];
      return;
    }

    this.timeoutId = window.setTimeout(async () => {
      this.inFlightRequests++;
      this.isLoading = true;
      const result = await this.apiClient.fetchSuggestions(
        this.textField!.value ?? '',
        this.stateInternal.lang === 'en' ? 'English' : 'Japanese',
        this.stateInternal.model,
        {
          sentenceMacroId:
            this.state.features.sentenceMacroId ??
            this.stateInternal.sentenceMacroId,
          wordMacroId:
            this.state.features.wordMacroId ?? this.stateInternal.wordMacroId,
          persona: this.stateInternal.persona,
        }
      );
      this.inFlightRequests--;
      if (this.inFlightRequests === 0) {
        this.isLoading = false;
      }
      if (!result) {
        return;
      }
      const [sentences, words] = result;
      this.updateSentences(sentences);
      this.updateWords(words);
      this.requestUpdate();
    }, this.delayBeforeFetchMs());
  }

  private playClickSound() {
    if (!this.state.enableEarcons) {
      return;
    }
    const audio = new Audio('/static/click2.wav');
    audio.addEventListener('canplaythrough', () => {
      audio.play();
    });
  }

  onSettingClick() {
    this.playClickSound();
    this.settingPanel!.show();
  }

  protected render() {
    const onCharacterSelect = (e: CharacterSelectEvent) => {
      const textfield = this.textField;
      if (!textfield) return;
      const normalized = normalize(
        textfield.value + e.detail,
        textfield.isLastInputSuggested()
      );
      textfield.setTextFieldValue(normalized, [InputSource.CHARACTER]);
    };

    const onSuggestedWordClick = (word: string) => () => {
      this.playClickSound();
      const separator = this.stateInternal.lang === 'en' ? ' ' : '';
      const body = word.startsWith('-') ? word.slice(1) : `${separator}${word}`;

      const concat = this.textField?.value + body + separator;
      const normalized = normalize(concat);

      this.textField?.setTextFieldValue(normalized, [
        InputSource.SUGGESTED_WORD,
      ]);
    };

    const words = this.isBlank()
      ? this.stateInternal.initialPhrases
      : this.words;
    const bodyOfWordSuggestions = words.map(word =>
      !word
        ? ''
        : html`
            <li>
              <pv-button
                label="${word}"
                rounded
                @click="${onSuggestedWordClick(word)}"
              ></pv-button>
            </li>
          `
    );

    return html`
      <pv-functions-bar
        .state=${this.stateInternal}
        @undo-click=${() => {
          this.playClickSound();
          this.textField?.textUndo();
        }}
        @backspace-click=${() => {
          this.playClickSound();
          this.textField?.textBackspace();
        }}
        @delete-click=${() => {
          this.playClickSound();
          this.textField?.textDelete();
        }}
        @language-change-click=${() => {
          this.playClickSound();
          this.stateInternal.lang =
            this.stateInternal.lang === 'en' ? 'ja' : 'en';
          this.updateSuggestions();
        }}
        @content-copy-click=${() => {
          this.playClickSound();
          this.textField?.contentCopy();
        }}
        @setting-click=${this.onSettingClick}
      ></pv-functions-bar>
      <div class="main">
        <div class="keypad">
          <pv-character-input
            .state=${this.stateInternal}
            @character-select="${onCharacterSelect}"
          ></pv-character-input>
          <div class="suggestions">
            <ul class="word-suggestions">
              ${bodyOfWordSuggestions}
            </ul>
            <ul class="sentence-suggestions">
              ${this.makeSentenceListItems()}
            </ul>
            <div class="loader ${this.isLoading ? 'loading' : ''}">
              <md-circular-progress indeterminate></md-circular-progress>
            </div>
          </div>
        </div>
        <div>
          <pv-textarea-wrapper
            .state=${this.stateInternal}
            @text-update=${() => {
              this.updateSuggestions();
            }}
          ></pv-textarea-wrapper>
        </div>
      </div>
      <pv-setting-panel .state=${this.stateInternal}></pv-setting-panel>
    `;
  }

  private makeSentenceListItems() {
    if (!this.textField || this.textField.value === '') {
      return html``;
    }
    const text = normalize(this.textField.value);

    const onSuggestionSelect = (e: SuggestionSelectEvent) => {
      this.playClickSound();
      this.textField?.setTextFieldValue(e.detail, [
        InputSource.SUGGESTED_SENTENCE,
      ]);
    };

    const toListItem = (suggestion: string) => {
      const sharedOffset = getSharedPrefix([suggestion, text]);
      return html` <li
        class="${this.stateInternal.sentenceSmallMargin ? 'tight' : ''}"
      >
        <pv-suggestion-stripe
          .offset="${sharedOffset}"
          .suggestion="${suggestion}"
          .lang="${this.sentenceSuggestionLang
            ? this.sentenceSuggestionLang
            : this.stateInternal.lang}"
          @select="${onSuggestionSelect}"
        ></pv-suggestion-stripe>
      </li>`;
    };

    return this.suggestions.map(toListItem);
  }
}

export const TEST_ONLY = {
  getSharedPrefix,
  normalize,
  PvAppElement,
};
