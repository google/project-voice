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
import './pv-conversation-history.js';
import './pv-functions-bar.js';
import './pv-setting-panel.js';
import './pv-snackbar.js';
import './pv-suggestion-stripe.js';
import './pv-textarea-wrapper.js';
import './pv-sentence-type-selector.js';

import {
  configureLocalization,
  LocaleModule,
  localized,
  msg,
  str,
} from '@lit/localize';
import {SignalWatcher} from '@lit-labs/signals';
import {diff_match_patch} from 'diff-match-patch';
import {html, LitElement} from 'lit';
import {customElement, property, query, queryAll} from 'lit/decorators.js';

import {AudioManager} from './audio-manager.js';
import {ConfigStorage} from './config-storage.js';
import {CONFIG_DEFAULT, LARGE_MARGIN_LINE_LIMIT} from './constants.js';
import {InputSource, InputSourceKind} from './input-history.js';
import {
  SMALL_KANA_TRIGGER,
  STEGANA,
  STEGANA_INVERT,
} from './keyboards/pv-fifty-key-keyboard.js';
import {LANGUAGES} from './language.js';
import {sourceLocale, targetLocales} from './locale-codes.js';
import * as jaModule from './locales/ja.js';
import {MacroApiClient} from './macro-api-client.js';
import {pvAppStyle} from './pv-app-css.js';
import type {CharacterSelectEvent} from './pv-expand-keypad.js';
import type {PvFunctionsBar} from './pv-functions-bar.js';
import {PvSentenceTypeSelectorElement} from './pv-sentence-type-selector.js';
import type {PvSettingPanel} from './pv-setting-panel.js';
import {PvSnackbar} from './pv-snackbar.js';
import {
  SentenceSuggestion,
  SentenceSuggestionSource,
  SuggestionSelectEvent,
} from './pv-suggestion-stripe.js';
import type {PvTextareaWrapper} from './pv-textarea-wrapper.js';
import {State} from './state.js';

const URL_PARAMS = {
  SENTENCE_MACRO_ID: 'sentenceMacroId',
  WORD_MACRO_ID: 'wordMacroId',
} as const;

const MIN_MESSAGE_LENGTH = 0;
const MAX_EDIT_DIFF_LENGTH = 10;
const MESSAGE_HISTORY_LIMIT = 1024;
const MIN_SUGGESTION_LENGTH = 3;
const MODIFIABLE_TEXT_LENGTH = 10;
const MAX_SENTENCE_LENGTH_NICE_TO_LLM = 30;
const MAX_DIFFS = 10;

const {setLocale} = configureLocalization({
  sourceLocale,
  targetLocales,
  loadLocale: async locale => {
    return new Promise(resolve => {
      switch (locale) {
        case 'ja':
          resolve(jaModule);
          break;
        default:
          resolve({} as LocaleModule);
      }
    });
  },
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
 * Splits the given string into sentences.
 * @param text The whole text.
 * @returns A list of sentences.
 */
function splitToSentences(text: string) {
  // TODO: Use more robust way to get the sentence that the user is editing.
  const delim = /([。？！]|[.?!] ) */;
  const result = [];
  let i = 0;
  while (i < text.length) {
    const match = delim.exec(text.substring(i));
    if (!match) {
      result.push(text.substring(i));
      break;
    }
    const endIndex = i + match.index + match[0].length;
    result.push(text.substring(i, endIndex));
    i = endIndex;
  }
  return result;
}

/**
 * Splits the last sentence from the given string.
 * @param text The whole text.
 * @returns A pair of the preceeding sentences and the last sentence.
 */
function splitLastSentence(text: string) {
  const sentences = splitToSentences(text);
  if (sentences.length === 0) {
    return ['', ''];
  }
  return [
    sentences.slice(0, sentences.length - 1).join(''),
    sentences[sentences.length - 1].trimEnd(),
  ];
}

/**
 * Splits the last few sentences to avoid sending too long text to LLM.
 * @param text The whole text.
 * @returns A pair of the preceeding sentences and the last sentences.
 */
function splitLastFewSentencesForLLM(text: string) {
  const sentences = splitToSentences(text);
  if (sentences.length === 0) {
    return ['', ''];
  }
  const sentenceLengths = sentences.map(s => s.length);
  let totalLength = 0;
  for (let i = sentenceLengths.length - 1; i >= 0; i--) {
    totalLength += sentenceLengths[i];
    if (totalLength >= MAX_SENTENCE_LENGTH_NICE_TO_LLM) {
      return [sentences.slice(0, i).join(''), sentences.slice(i).join('')];
    }
  }
  return ['', text];
}

/**
 * Returns the prefix of the given string which contains only chars that can
 * be input from keyboard.
 * @param text The input string.
 * @return The prefix string.
 */
function getUserInputPrefix(text: string) {
  const match = text.match(/^[A-Za-z あ-んー]*/u);
  return match ? match[0] : '';
}

/**
 * Heuristically removes unnecessary diffs from the new string.
 * @param text The original string.
 * @param newText The new string.
 * @return The new string changed more similar to the original string.
 */
function ignoreUnnecessaryDiffs(text: string, newText: string) {
  const diffMatchPatch = new diff_match_patch();
  const diffs: [number, string][] = diffMatchPatch.diff_main(text, newText);
  diffMatchPatch.diff_cleanupSemantic(diffs);
  if (diffs.length > MAX_DIFFS || diffs.every(diff => diff[0] !== 0)) {
    return newText;
  }
  let result = '';
  for (let i = 0; i < diffs.length; i++) {
    const [op, str] = diffs[i];
    if (result.length < text.length - MODIFIABLE_TEXT_LENGTH) {
      if (op === 0 || op === -1) {
        // Accept the original text.
        result += str;
        // Skip the next diff if it is an insertion just after deletion.
        if (i < diffs.length - 1 && op === -1 && diffs[i + 1][0] === 1) {
          i++;
        }
      }
    } else {
      if (op === 0 || op === 1) {
        // Accept the new text.
        result += str;
      }
    }
  }
  // If the result is identical to the original text, return the new text.
  if (result === text) {
    return newText;
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
      if (this.state.enableEarcons) AudioManager.playClick();
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

  // Persistent speech recognition instance for always-on mode
  private speechRecognition?: SpeechRecognition;
  private isSpeechRecognitionActive = false;

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
  suggestions: SentenceSuggestion[] = [];

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

  @property({type: String, attribute: 'feature-languages'})
  languageLabels = 'japaneseWithSingleRowKeyboard,englishWithSingleRowKeyboard';

  private languageIndex = 0;
  private keyboardIndex = 0;

  @query('.language-name')
  private languageName?: HTMLElement;

  @property({type: Array})
  conversationHistory: [number, string][] = [];

  @property({type: Array})
  emotions: {emoji: string; prompt: string; label?: string}[] = [];

  @property({type: String, attribute: 'feature-storage-domain'})
  private featureStorageDomain = 'com.google.pv';

  @property({type: Boolean, attribute: 'feature-enable-speech-input'})
  private featureEnableSpeechInput = false;

  @property({type: Boolean, attribute: 'feature-enable-sentence-emotion'})
  private featureEnableSentenceEmotion = false;

  @query('pv-sentence-type-selector')
  private sentenceTypeSelector?: PvSentenceTypeSelectorElement;

  @queryAll('[emotion]')
  private sentenceEmotionButtons?: HTMLElement[];

  @query('pv-snackbar')
  snackbar?: PvSnackbar;

  static styles = pvAppStyle;

  connectedCallback() {
    super.connectedCallback();

    this.stateInternal.setStorage(
      new ConfigStorage(this.featureStorageDomain, CONFIG_DEFAULT),
    );

    setLocale(this.locale ? this.locale : 'ja');

    this.stateInternal.features = {
      languages: this.languageLabels.split(','),
      sentenceMacroId: this.sentenceMacroId,
      wordMacroId: null,
      featureEnableSpeechInput: this.featureEnableSpeechInput,
      featureEnableSentenceEmotion: this.featureEnableSentenceEmotion,
    };

    if (this.stateInternal.checkedLanguages.length === 0) {
      this.stateInternal.checkedLanguages =
        this.stateInternal.features.languages;
    }
    this.stateInternal.lang = LANGUAGES[this.stateInternal.checkedLanguages[0]];
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

    // Initialize initial phrases for the current language
    this.stateInternal.updateInitialPhrasesForCurrentLanguage();

    this.emotions = this.stateInternal.lang.emotions;
  }

  updated(changedProps: Map<string, any>) {
    super.updated?.(changedProps);
    // Always-on speech recognition effect
    if (
      this.state.enableConversationMode &&
      this.state.features.featureEnableSpeechInput &&
      this.state.isMicrophoneOn
    ) {
      this.startSpeechRecognition();
    } else {
      this.stopSpeechRecognition();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.stopSpeechRecognition();
  }

  private startSpeechRecognition() {
    if (this.isSpeechRecognitionActive) return;
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;
    this.speechRecognition = new SpeechRecognitionCtor();
    if (!this.speechRecognition) {
      return;
    }
    this.speechRecognition.lang = this.state.lang.code;
    this.speechRecognition.continuous = true;
    this.speechRecognition.interimResults = false;
    this.speechRecognition.onresult = (event: SpeechRecognitionEvent) => {
      const lastResult = event.results[event.results.length - 1];
      if (lastResult && lastResult.isFinal && lastResult[0]) {
        const recognizedText = lastResult[0].transcript.trim();
        if (recognizedText) {
          this.conversationHistory = [
            ...this.conversationHistory,
            [Date.now(), `PartnerInput: ${recognizedText}`],
          ];
          this.state.lastInputSpeech = recognizedText;
          if (this.snackbar?.labelText !== undefined) {
            this.snackbar.labelText = recognizedText;
            this.snackbar.show();
          }
        }
      }
    };
    this.speechRecognition.onerror = () => {
      // Optionally handle errors (network, no-speech, etc)
      // For robustness, try to restart on recoverable errors
      this.stopSpeechRecognition();
      if (
        this.state.enableConversationMode &&
        this.state.features.featureEnableSpeechInput &&
        this.state.isMicrophoneOn
      ) {
        setTimeout(() => this.startSpeechRecognition(), 1000);
      }
    };
    this.speechRecognition.onend = () => {
      this.isSpeechRecognitionActive = false;
      // Once the speech recognition ends, restart it if the conversation mode is enabled
      // and the microphone is on.
      // This allows the app to continuously listen for speech input, until the user
      // explicitly turns off the microphone or disables conversation mode.
      if (
        this.state.enableConversationMode &&
        this.state.features.featureEnableSpeechInput &&
        this.state.isMicrophoneOn
      ) {
        this.startSpeechRecognition();
      }
    };
    this.speechRecognition.start();
    this.isSpeechRecognitionActive = true;
  }

  private stopSpeechRecognition() {
    if (this.speechRecognition) {
      this.speechRecognition.onresult = null;
      this.speechRecognition.onerror = null;
      this.speechRecognition.onend = null;
      this.speechRecognition.stop();
      this.speechRecognition = undefined;
    }
    this.isSpeechRecognitionActive = false;
  }

  private isBlank() {
    return this.textField && this.textField.value === '';
  }

  private updateConversationHistory() {
    const newMessage = `UserOutput: ${this.state.lastOutputSpeech}`;
    this.conversationHistory = [
      ...this.conversationHistory,
      [Date.now(), newMessage],
    ];
  }

  private updateMessageHistory(sources: InputSource[]) {
    const [, currentSentence] = splitLastSentence(this.state.text);
    if (sources.length === 0 || currentSentence.length <= MIN_MESSAGE_LENGTH) {
      return;
    }
    const now = Date.now();
    let newMessageHistory = [...this.state.messageHistory];
    if (newMessageHistory.length === 0) {
      newMessageHistory.push([
        currentSentence,
        getUserInputPrefix(currentSentence),
        now,
      ]);
      this.state.messageHistory = newMessageHistory;
      return;
    }
    const [lastSentence, lastPrefix] =
      newMessageHistory[newMessageHistory.length - 1];
    const currentPrefix = getUserInputPrefix(currentSentence);
    let prefix = '';
    if (
      sources[0].kind === InputSourceKind.SENTENCE_HISTORY ||
      sources[0].kind === InputSourceKind.SUGGESTED_SENTENCE ||
      sources[0].kind === InputSourceKind.SUGGESTED_WORD ||
      lastSentence.startsWith(currentSentence) ||
      (currentSentence.startsWith(lastSentence) &&
        lastSentence.length - currentSentence.length < MAX_EDIT_DIFF_LENGTH)
    ) {
      // Update the last sentence in history because the user is still editing
      // it.
      newMessageHistory.pop();
      prefix =
        currentPrefix.length > lastPrefix.length ? currentPrefix : lastPrefix;
    } else {
      prefix = currentPrefix;
    }
    newMessageHistory.forEach(([sentence, oldPrefix]) => {
      // Keep longer prefix if exists.
      if (sentence === currentSentence && oldPrefix.startsWith(prefix)) {
        prefix = oldPrefix;
      }
    });
    newMessageHistory = newMessageHistory.filter(
      ([sentence]) => sentence !== currentSentence,
    );
    newMessageHistory.push([currentSentence, prefix, now]);
    newMessageHistory.slice(-MESSAGE_HISTORY_LIMIT);
    this.state.messageHistory = newMessageHistory;
  }

  // Experimental implementation of searching suggestions from history.
  private searchSuggestionsFromMessageHistory() {
    const [preceedingSentences, currentSentence] = splitLastSentence(
      this.state.text,
    );
    if (!currentSentence) {
      return null;
    }
    const candidates = this.state.messageHistory.filter(
      ([sentence, prefix]) => {
        return (
          sentence.length >= MIN_SUGGESTION_LENGTH &&
          sentence !== currentSentence &&
          (prefix.startsWith(currentSentence) ||
            sentence.startsWith(currentSentence))
        );
      },
    );
    if (candidates.length === 0) {
      return null;
    }
    return preceedingSentences + candidates[candidates.length - 1][0];
  }

  private updateSentences(suggestions: SentenceSuggestion[]) {
    if (!this.stateInternal.sentenceSmallMargin) {
      suggestions = suggestions.slice(0, LARGE_MARGIN_LINE_LIMIT);
    }
    this.suggestions = suggestions.map(s => {
      s.value = normalize(s.value);
      return s;
    });
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
      const [firstHalf, secondHalf] = splitLastFewSentencesForLLM(
        this.stateInternal.text,
      );
      const result = await this.apiClient.fetchSuggestions(
        secondHalf,
        this.stateInternal.lang.promptName,
        this.stateInternal.model,
        {
          sentenceMacroId:
            this.state.features.sentenceMacroId ??
            this.stateInternal.sentenceMacroId,
          wordMacroId:
            this.state.features.wordMacroId ?? this.stateInternal.wordMacroId,
          persona: this.stateInternal.persona,
          lastInputSpeech: this.state.lastInputSpeech,
          lastOutputSpeech: this.state.lastOutputSpeech,
          conversationHistory: this.conversationHistory
            .map(([, s]) => s)
            .join('\n'),
          sentenceEmotion: this.state.emotion,
        },
      );
      this.inFlightRequests--;
      if (this.inFlightRequests === 0) {
        this.isLoading = false;
      }
      if (!result) {
        return;
      }
      const [sentenceValues, words] = result;
      const sentences = sentenceValues.map(
        s =>
          new SentenceSuggestion(
            SentenceSuggestionSource.LLM,
            firstHalf + ignoreUnnecessaryDiffs(secondHalf, s),
          ),
      );
      this.updateSentences(sentences);
      this.updateWords(words);
      this.requestUpdate();
    }, this.delayBeforeFetchMs());
  }

  /**
   * Composes a sentence updated based on the incoming character.
   * @param currentSentence The current sentence to update.
   * @param incomingCharacter The character to append or a control character.
   * @returns The updated sentence after processing the incoming character.
   */
  static composeUpdatedSentence(
    currentSentence: string,
    incomingCharacter: string,
  ) {
    if (incomingCharacter === SMALL_KANA_TRIGGER) {
      const lastCharacter = currentSentence.slice(-1)[0];
      if ([...STEGANA.keys()].includes(lastCharacter)) {
        return currentSentence.slice(0, -1) + STEGANA.get(lastCharacter);
      } else if ([...STEGANA_INVERT.keys()].includes(lastCharacter)) {
        return currentSentence.slice(0, -1) + STEGANA_INVERT.get(lastCharacter);
      } else {
        return currentSentence;
      }
    }
    return currentSentence + incomingCharacter;
  }

  @playClickSound()
  private onCharacterSelect(e: CharacterSelectEvent) {
    if (!this.textField) return;
    const normalized = normalize(
      PvAppElement.composeUpdatedSentence(this.textField.value, e.detail),
      this.textField.isLastInputSuggested(),
    );
    this.textField.setTextFieldValue(normalized, [InputSource.CHARACTER]);
  }

  @playClickSound()
  private onSuggestionSelect(e: SuggestionSelectEvent) {
    const [value, index, source] = e.detail;
    const kind =
      source === SentenceSuggestionSource.HISTORY
        ? InputSourceKind.SENTENCE_HISTORY
        : InputSourceKind.SUGGESTED_SENTENCE;
    this.textField?.setTextFieldValue(value, [{kind, index}]);
  }

  @playClickSound()
  private onSuggestedWordClick(word: string) {
    const text = this.textField?.value ?? '';
    const concat = this.stateInternal.lang.appendWord(text, word);
    const normalized = normalize(concat);
    this.textField?.setTextFieldValue(normalized, [InputSource.SUGGESTED_WORD]);
  }

  @playClickSound()
  private onSentenceTypeSelected(e: Event) {
    this.state.emotion = (
      e.composedPath()[0] as PvSentenceTypeSelectorElement
    ).selected;
    this.updateSuggestions();
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
    if (this.sentenceEmotionButtons) {
      this.sentenceEmotionButtons.forEach(button => {
        button.removeAttribute('active');
      });
    }
  }

  private switchLanguage() {
    this.state.lang =
      LANGUAGES[this.state.checkedLanguages[this.languageIndex]];
    this.keyboardIndex = 0;
    this.state.keyboard = this.state.lang.keyboards[this.keyboardIndex];
    this.emotions = this.stateInternal.lang.emotions;
    this.state.emotion = '';
    if (this.sentenceTypeSelector) {
      this.sentenceTypeSelector.selected = '';
    }
    // Update initial phrases for the new language
    this.state.updateInitialPhrasesForCurrentLanguage();
    this.updateSuggestions();
    if (this.languageName) {
      this.languageName.setAttribute('active', 'true');
      setTimeout(() => {
        this.languageName?.removeAttribute('active');
      }, 750);
    }
  }

  @playClickSound()
  private onLanguageChangeClick() {
    this.languageIndex =
      (this.languageIndex + 1) % this.state.checkedLanguages.length;
    this.switchLanguage();
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

  @playClickSound()
  private onKeypadHandlerClick() {}

  onSnackbarClose() {
    // Do not clear textfield or set placeholder. Instead, add current value to inputHistory.
    if (this.textField) {
      this.textField.addToInputHistory(this.textField.value, [
        InputSource.SNACK_BAR,
      ]);
    }
  }

  // TODO: Call this event handler whenever the dialog is closed.
  private onOkClick() {
    const index = this.state.checkedLanguages.findIndex(
      label => LANGUAGES[label] === this.state.lang,
    );
    if (index === -1) {
      this.languageIndex = 0;
      this.switchLanguage();
    }
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
      const sharedOffset = getSharedPrefix([suggestion.value, text]);
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
      <div class="container">
        <pv-functions-bar
          .state=${this.stateInternal}
          @undo-click=${this.onUndoClick}
          @backspace-click=${this.onBackspaceClick}
          @delete-click=${this.onDeleteClick}
          @language-change-click=${this.onLanguageChangeClick}
          @keyboard-change-click=${this.onKeyboardChangeClick}
          @content-copy-click=${this.onContentCopyClick}
          @setting-click=${this.onSettingClick}
          @snackbar-close=${this.onSnackbarClose}
          @output-speech-click=${this.updateConversationHistory}

        ></pv-functions-bar>
        <div class="main">
          ${this.state.features.featureEnableSentenceEmotion
            ? html`
                <pv-sentence-type-selector
                  .sentenceTypes=${this.emotions}
                  @select=${this.onSentenceTypeSelected}
                ></pv-sentence-type-selector>
              `
            : ''}
          <div class="keypad">
            <pv-character-input
              .state=${this.stateInternal}
              @character-select=${this.onCharacterSelect}
              @keypad-handler-click=${this.onKeypadHandlerClick}
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
              @text-update=${(e: CustomEvent) => {
                this.updateSuggestions();
                this.updateMessageHistory(e.detail.sources);
              }}
            ></pv-textarea-wrapper>
          </div>
          <div class="language-name">${this.stateInternal.lang.render()}</div>

        </div>
        ${this.state.features.featureEnableSpeechInput &&
        this.state.enableConversationMode
          ? html`<div class="conversation-history-container">
              <pv-conversation-history
                .history=${this.conversationHistory}
              ></pv-conversation-history>
            </div>`
          : ''}
      </div>

      <pv-snackbar @closed=${this.onSnackbarClose}></pv-snackbar>
      <pv-setting-panel
        .state=${this.stateInternal}
        @ok-click=${this.onOkClick}
      ></pv-setting-panel>
    `;
  }
}

export const TEST_ONLY = {
  getSharedPrefix,
  getUserInputPrefix,
  ignoreUnnecessaryDiffs,
  normalize,
  PvAppElement,
  splitLastFewSentencesForLLM,
  splitLastSentence,
  splitToSentences,
};
