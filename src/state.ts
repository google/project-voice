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

import {signal} from '@lit-labs/signals';
import {literal} from 'lit/static-html.js';

import {ConfigStorage} from './config-storage.js';
import {CONFIG_DEFAULT} from './constants.js';
import {Language, LANGUAGES} from './language.js';

interface Features {
  languages: string[];
  sentenceMacroId: string | null;
  wordMacroId: string | null;

  featureEnableSpeechInput: boolean;
  featureEnableSentenceEmotion: boolean;
}

/** A class that holds global state shared among multiple elements. */
class State {
  // The @signal decorator https://lit.dev/docs/data/signals/#decorators
  // doesn't work with experimentalDecorators = true which is currently used
  // for this app. For now, we use hand wrtten getters / setters for accessing
  // state.

  private langSignal = signal(LANGUAGES['japaneseWithSingleRowKeyboard']);

  get lang() {
    return this.langSignal.get();
  }

  set lang(newLang: Language) {
    this.langSignal.set(newLang);
  }

  private checkedLanguagesSignal = signal([] as string[]);

  get checkedLanguages() {
    return this.checkedLanguagesSignal.get();
  }

  set checkedLanguages(newCheckedLanguages: string[]) {
    this.storage.write('checkedLanguages', newCheckedLanguages);
    this.checkedLanguagesSignal.set(newCheckedLanguages);
  }

  private keyboardSignal = signal(literal`pv-alphanumeric-single-row-keyboard`);

  get keyboard() {
    return this.keyboardSignal.get();
  }

  set keyboard(newKeyboard) {
    this.keyboardSignal.set(newKeyboard);
  }

  private emotionSignal = signal('');

  get emotion() {
    return this.emotionSignal.get();
  }

  set emotion(newEmotion: string) {
    this.emotionSignal.set(newEmotion);
  }

  private textSignal = signal('');

  get text() {
    return this.textSignal.get();
  }

  set text(newText: string) {
    this.textSignal.set(newText);
  }

  private aiConfigInternal = 'smart';

  get aiConfig() {
    return this.aiConfigInternal;
  }

  set aiConfig(newAiConfig: string) {
    this.storage.write('aiConfig', newAiConfig);
    this.aiConfigInternal = newAiConfig;
  }

  get model() {
    return this.lang.aiConfigs[this.aiConfig]?.model;
  }

  get sentenceMacroId() {
    return this.lang.aiConfigs[this.aiConfig]?.sentence;
  }

  get wordMacroId() {
    return this.lang.aiConfigs[this.aiConfig]?.word;
  }

  private expandAtOriginSignal = signal(false);

  get expandAtOrigin() {
    return this.expandAtOriginSignal.get();
  }

  set expandAtOrigin(newExpandAtOrigin: boolean) {
    this.storage.write('expandAtOrigin', newExpandAtOrigin);
    this.expandAtOriginSignal.set(newExpandAtOrigin);
  }

  private sentenceSmallMarginSignal = signal(false);

  get sentenceSmallMargin() {
    return this.sentenceSmallMarginSignal.get();
  }

  set sentenceSmallMargin(newSentenceSmallMargin: boolean) {
    this.storage.write('sentenceSmallMargin', newSentenceSmallMargin);
    this.sentenceSmallMarginSignal.set(newSentenceSmallMargin);
  }

  private personaInternal = '';

  get persona() {
    return this.personaInternal;
  }

  set persona(newPersona: string) {
    this.storage.write('persona', newPersona);
    this.personaInternal = newPersona;
  }

  private initialPhrasesSignal = signal([] as string[]);

  get initialPhrases() {
    return this.initialPhrasesSignal.get();
  }

  set initialPhrases(newInitialPhrases: string[]) {
    // Store for the current language
    const currentLanguageKey = this.getCurrentLanguageKey();
    if (currentLanguageKey) {
      const perLanguagePhrases = this.storage.read('initialPhrasesPerLanguage');
      perLanguagePhrases[currentLanguageKey] = newInitialPhrases;
      this.storage.write('initialPhrasesPerLanguage', perLanguagePhrases);
    }
    this.initialPhrasesSignal.set(newInitialPhrases);
  }

  /**
   * Gets initial phrases for a specific language.
   * @param languageKey The language key (e.g., 'japaneseWithSingleRowKeyboard')
   * @returns The initial phrases for the language
   */
  getInitialPhrasesForLanguage(languageKey: string): string[] {
    const perLanguagePhrases = this.storage.read('initialPhrasesPerLanguage');
    return perLanguagePhrases[languageKey] || [];
  }

  /**
   * Sets initial phrases for a specific language.
   * @param languageKey The language key (e.g., 'japaneseWithSingleRowKeyboard')
   * @param phrases The initial phrases to set
   */
  setInitialPhrasesForLanguage(languageKey: string, phrases: string[]) {
    const perLanguagePhrases = this.storage.read('initialPhrasesPerLanguage');
    perLanguagePhrases[languageKey] = phrases;
    this.storage.write('initialPhrasesPerLanguage', perLanguagePhrases);

    // Update the signal if this is the current language
    if (this.getCurrentLanguageKey() === languageKey) {
      this.initialPhrasesSignal.set(phrases);
    }
  }

  /**
   * Gets the current language key based on the current language object.
   * @returns The language key or null if not found
   */
  getCurrentLanguageKey(): string | null {
    for (const [key, language] of Object.entries(LANGUAGES)) {
      if (language === this.lang) {
        return key;
      }
    }
    return null;
  }

  /**
   * Updates initial phrases to match the current language.
   * This should be called when switching languages.
   */
  updateInitialPhrasesForCurrentLanguage() {
    const currentLanguageKey = this.getCurrentLanguageKey();
    if (currentLanguageKey) {
      const storedPhrases =
        this.getInitialPhrasesForLanguage(currentLanguageKey);
      if (storedPhrases.length > 0) {
        // Use stored phrases for this language
        this.initialPhrasesSignal.set(storedPhrases);
      } else {
        // Use default phrases from the language definition
        this.initialPhrasesSignal.set(this.lang.initialPhrases);
        // Store the default phrases for future use
        this.setInitialPhrasesForLanguage(
          currentLanguageKey,
          this.lang.initialPhrases,
        );
      }
    }
  }

  private voiceSpeakingRateInternal!: number;
  private voicePitchInternal!: number;
  private voiceNameInternal!: string;

  get voiceSpeakingRate() {
    return this.voiceSpeakingRateInternal;
  }

  set voiceSpeakingRate(newVoiceSpeakingRate: number) {
    this.voiceSpeakingRateInternal = newVoiceSpeakingRate;
    this.storage.write('voiceSpeakingRate', newVoiceSpeakingRate);
  }

  get voicePitch() {
    return this.voicePitchInternal;
  }

  set voicePitch(newVoicePitch: number) {
    this.voicePitchInternal = newVoicePitch;
    this.storage.write('voicePitch', newVoicePitch);
  }

  get voiceName() {
    return this.voiceNameInternal;
  }

  set voiceName(newVoiceName: string) {
    this.voiceNameInternal = newVoiceName;
    this.storage.write('ttsVoice', newVoiceName);
  }

  private enableEarconsInternal = false;

  get enableEarcons() {
    return this.enableEarconsInternal;
  }

  set enableEarcons(newEnableEarcons: boolean) {
    this.storage.write('enableEarcons', newEnableEarcons);
    this.enableEarconsInternal = newEnableEarcons;
  }

  private enableConversationModeSignal = signal(false);

  get enableConversationMode() {
    return this.enableConversationModeSignal.get();
  }

  set enableConversationMode(newEnableConversationMode: boolean) {
    this.storage.write('enableConversationMode', newEnableConversationMode);
    this.enableConversationModeSignal.set(newEnableConversationMode);
  }

  private isMicrophoneOnSignal = signal(false);

  get isMicrophoneOn() {
    return this.isMicrophoneOnSignal.get();
  }

  set isMicrophoneOn(newIsMicrophoneOn: boolean) {
    this.isMicrophoneOnSignal.set(newIsMicrophoneOn);
  }

  lastInputSpeech = '';
  lastOutputSpeech = '';

  private messageHistoryInternal: [string, string, number][] = [];

  get messageHistory() {
    return this.messageHistoryInternal;
  }

  set messageHistory(newMessageHistory: [string, string, number][]) {
    this.messageHistoryInternal = newMessageHistory;
    this.storage.write('messageHistoryWithPrefix', newMessageHistory);
  }

  // TODO: This is a little hacky... Consider a better way.
  features: Features = {
    languages: [],
    sentenceMacroId: null,
    wordMacroId: null,
    featureEnableSpeechInput: false,
    featureEnableSentenceEmotion: false,
  };

  private storage: ConfigStorage;

  loadState() {
    this.aiConfigInternal = this.storage.read('aiConfig');
    this.checkedLanguages = this.storage.read('checkedLanguages');
    this.enableConversationMode = this.storage.read('enableConversationMode');
    this.enableEarconsInternal = this.storage.read('enableEarcons');
    this.expandAtOrigin = this.storage.read('expandAtOrigin');

    // Handle backward compatibility for initial phrases
    const globalInitialPhrases = this.storage.read('initialPhrases');
    const perLanguagePhrases = this.storage.read('initialPhrasesPerLanguage');

    // If we have global initial phrases but no per-language phrases, migrate them
    if (
      globalInitialPhrases &&
      globalInitialPhrases.length > 0 &&
      (!perLanguagePhrases || Object.keys(perLanguagePhrases).length === 0)
    ) {
      // Migrate global phrases to the default language
      const defaultLanguageKey = this.checkedLanguages[0];
      const migratedPhrases = {
        ...perLanguagePhrases,
        [defaultLanguageKey]: globalInitialPhrases,
      };
      this.storage.write('initialPhrasesPerLanguage', migratedPhrases);
    }

    this.messageHistoryInternal = this.storage.read('messageHistoryWithPrefix');
    this.personaInternal = this.storage.read('persona');
    this.sentenceSmallMargin = this.storage.read('sentenceSmallMargin');
    this.voiceNameInternal = this.storage.read('ttsVoice');
    this.voicePitchInternal = this.storage.read('voicePitch');
    this.voiceSpeakingRateInternal = this.storage.read('voiceSpeakingRate');
  }

  /**
   * Sets the storage to a new instance, and reloads the state. The new storage
   * needs to have a different domainHead.
   */
  setStorage(storage: ConfigStorage) {
    if (this.storage.domainHead === storage.domainHead) {
      return;
    }
    this.storage = storage;
    this.loadState();
  }

  constructor(storage: ConfigStorage | null = null) {
    this.storage =
      storage ?? new ConfigStorage('com.google.pv', CONFIG_DEFAULT);
    this.loadState();
    // Load initial phrases for the current language
    this.updateInitialPhrasesForCurrentLanguage();
  }
}

export {Features, State};
