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
    this.storage.write('initialPhrases', newInitialPhrases);
    this.initialPhrasesSignal.set(newInitialPhrases);
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

  lastInputSpeech = '';
  lastOutputSpeech = '';

  private messageHistoryInternal: [string, number][] = [];

  get messageHistory() {
    return this.messageHistoryInternal;
  }

  set messageHistory(newMessageHistory: [string, number][]) {
    this.messageHistoryInternal = newMessageHistory;
    this.storage.write('messageHistory', newMessageHistory);
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
    this.enableEarconsInternal = this.storage.read('enableEarcons');
    this.expandAtOrigin = this.storage.read('expandAtOrigin');
    this.initialPhrases = this.storage.read('initialPhrases');
    this.messageHistoryInternal = this.storage.read('messageHistory');
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
  }
}

export {Features, State};
