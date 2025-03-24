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

import {LARGE_MARGIN_LINE_LIMIT} from './constants.js';
import {InputSource} from './input-history.js';
import {LANGUAGES} from './language.js';
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

/**
 * Decorator that plays a click sound when a method is called.
 */
function playClickSound() {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    descriptor.value = function (this: PvAppElement, ...args: unknown[]) {
      if (this.state.enableEarcons) {
        const audio = new Audio('/static/click2.wav');
        audio.play();
      }
      return originalMethod.apply(this, args);
    };
    return descriptor;
  };
}

@customElement('pv-app')
@localized()
export class PvAppElement extends SignalWatcher(LitElement) {
  private apiClient: MacroApiClient;
  private stateInternal: State;

  constructor(
    state: State | null = null,
    apiClient: MacroApiClient | null = null,
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

  @property({type: String, attribute: 'feature-locale'})
  locale = 'ja';

  @property({type: String, attribute: 'feature-sentence-macro-id'})
  private sentenceMacroId: string | null = null;

  // TODO: Make this configurable.
  @property({type: String, attribute: 'feature-languages'})
  languageLabels = 'japaneseWithSingleRowKeyboard,englishWithSingleRowKeyboard';

  private languageIndex = 0;
  private keyboardIndex = 0;

  @query('.language-name')
  private languageName?: HTMLElement;

  static styles = pvAppStyle;

  connectedCallback() {
    super.connectedCallback();

    setLocale(this.locale ? this.locale : 'ja');

    this.stateInternal.features = {
      languages: this.languageLabels.split(','),
      sentenceMacroId: this.sentenceMacroId,
      wordMacroId: null,
    };

    this.stateInternal.lang =
      LANGUAGES[this.stateInternal.features.languages[0]];
    this.stateInternal.keyboard =
      this.stateInternal.lang.keyboards[this.keyboardIndex];

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has(URL_PARAMS.SENTENCE_MACRO_ID)) {
      this.stateInternal.features.sentenceMacroId = urlParams.get(
        URL_PARAMS.SENTENCE_MACRO_ID,
      );
    }
    if (urlParams.has(URL_PARAMS.WORD_MACRO_ID)) {
      this.stateInternal.features.wordMacroId = urlParams.get(
        URL_PARAMS.WORD_MACRO_ID,
      );
    }

    // This behavior is a bit tricky. The default initial phrases are stored
    // to local storage. So initial phrases won't be changed by switching input
    // language.
    if (!this.stateInternal.initialPhrases.some(str => str)) {
      this.stateInternal.initialPhrases =
        this.stateInternal.lang.initialPhrases;
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
        this.stateInternal.lang.promptName,
        this.stateInternal.model,
        {
          sentenceMacroId:
            this.state.features.sentenceMacroId ??
            this.stateInternal.sentenceMacroId,
          wordMacroId:
            this.state.features.wordMacroId ?? this.stateInternal.wordMacroId,
          persona: this.stateInternal.persona,
        },
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

  private onCharacterSelect(e: CharacterSelectEvent) {
    const textfield = this.textField;
    if (!textfield) return;
    const normalized = normalize(
      textfield.value + e.detail,
      textfield.isLastInputSuggested(),
    );
    textfield.setTextFieldValue(normalized, [InputSource.CHARACTER]);
  }

  @playClickSound()
  private onSuggestionSelect(e: SuggestionSelectEvent) {
    this.textField?.setTextFieldValue(e.detail, [
      InputSource.SUGGESTED_SENTENCE,
    ]);
  }

  @playClickSound()
  private onSuggestedWordClick(word: string) {
    const separator = this.stateInternal.lang.separetor;
    const body = word.startsWith('-') ? word.slice(1) : `${separator}${word}`;
    const concat = this.textField?.value + body + separator;
    const normalized = normalize(concat);
    this.textField?.setTextFieldValue(normalized, [InputSource.SUGGESTED_WORD]);
  }

  @playClickSound()
  private onSettingClick() {
    this.settingPanel!.show();
  }

  @playClickSound()
  private onUndoClick() {
    this.textField?.textUndo();
  }

  @playClickSound()
  private onBackspaceClick() {
    this.textField?.textBackspace();
  }

  @playClickSound()
  private onDeleteClick() {
    this.textField?.textDelete();
  }

  @playClickSound()
  private onLanguageChangeClick() {
    this.languageIndex =
      (this.languageIndex + 1) % this.stateInternal.features.languages.length;
    this.state.lang =
      LANGUAGES[this.stateInternal.features.languages[this.languageIndex]];
    this.keyboardIndex = 0;
    this.state.keyboard = this.state.lang.keyboards[this.keyboardIndex];
    this.updateSuggestions();
    if (this.languageName) {
      this.languageName.setAttribute('active', 'true');
      setTimeout(() => {
        this.languageName?.removeAttribute('active');
      }, 750);
    }
  }

  @playClickSound()
  private onKeyboardChangeClick() {
    this.keyboardIndex =
      (this.keyboardIndex + 1) % this.state.lang.keyboards.length;
    this.state.keyboard = this.state.lang.keyboards[this.keyboardIndex];
    this.updateSuggestions();
  }

  @playClickSound()
  private onContentCopyClick() {
    this.textField?.contentCopy();
  }

  protected render() {
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
                @click="${() => this.onSuggestedWordClick(word)}"
              ></pv-button>
            </li>
          `,
    );

    const bodyOfSentenceSuggestions = this.suggestions.map(suggestion => {
      if (!this.textField?.value) return '';
      const text = normalize(this.textField.value);
      const sharedOffset = getSharedPrefix([suggestion, text]);
      return html` <li
        class="${this.stateInternal.sentenceSmallMargin ? 'tight' : ''}"
      >
        <pv-suggestion-stripe
          .state=${this.stateInternal}
          .offset="${sharedOffset}"
          .suggestion="${suggestion}"
          @select="${this.onSuggestionSelect}"
        ></pv-suggestion-stripe>
      </li>`;
    });

    return html`
      <pv-functions-bar
        .state=${this.stateInternal}
        @undo-click=${this.onUndoClick}
        @backspace-click=${this.onBackspaceClick}
        @delete-click=${this.onDeleteClick}
        @language-change-click=${this.onLanguageChangeClick}
        @keyboard-change-click=${this.onKeyboardChangeClick}
        @content-copy-click=${this.onContentCopyClick}
        @setting-click=${this.onSettingClick}
      ></pv-functions-bar>
      <div class="main">
        <div class="keypad">
          <pv-character-input
            .state=${this.stateInternal}
            @character-select="${this.onCharacterSelect}"
          ></pv-character-input>
          <div class="suggestions">
            <ul class="word-suggestions">
              ${bodyOfWordSuggestions}
            </ul>
            <ul class="sentence-suggestions">
              ${bodyOfSentenceSuggestions}
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
        <div class="language-name">${this.stateInternal.lang.render()}</div>
      </div>
      <pv-setting-panel .state=${this.stateInternal}></pv-setting-panel>
    `;
  }
}

export const TEST_ONLY = {
  getSharedPrefix,
  normalize,
  PvAppElement,
};
