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

import {ConfigStorage} from './config-storage.js';
import {AI_CONFIGS, CONFIG_DEFAULT} from './constants.js';

interface Features {
  sentenceMacroId: string | null;
  wordMacroId: string | null;
}

/** A class that holds global state shared among multiple elements. */
class State {
  // The @signal decorator https://lit.dev/docs/data/signals/#decorators
  // doesn't work with experimentalDecorators = true which is currently used
  // for this app. For now, we use hand wrtten getters / setters for accessing
  // state.

  private langSignal = signal('en');

  get lang() {
    return this.langSignal.get();
  }

  set lang(newLang: string) {
    this.langSignal.set(newLang);
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
    return AI_CONFIGS[this.aiConfig]?.model;
  }

  get sentenceMacroId() {
    return AI_CONFIGS[this.aiConfig]?.sentence;
  }

  get wordMacroId() {
    return AI_CONFIGS[this.aiConfig]?.word;
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

  private voiceSpeakingRateInternal: number;
  private voicePitchInternal: number;
  private voiceNameInternal: string;

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

  // TODO: This is a little hacky... Consider a better way.
  features: Features = {
    sentenceMacroId: null,
    wordMacroId: null,
  };

  private storage: ConfigStorage;

  constructor(storage: ConfigStorage | null = null) {
    this.storage =
      storage ?? new ConfigStorage('com.google.pv', CONFIG_DEFAULT);
    this.aiConfigInternal = this.storage.read('aiConfig');
    this.enableEarconsInternal = this.storage.read('enableEarcons');
    this.expandAtOrigin = this.storage.read('expandAtOrigin');
    this.initialPhrases = this.storage.read('initialPhrases');
    this.personaInternal = this.storage.read('persona');
    this.sentenceSmallMargin = this.storage.read('sentenceSmallMargin');
    this.voiceNameInternal = this.storage.read('ttsVoice');
    this.voicePitchInternal = this.storage.read('voicePitch');
    this.voiceSpeakingRateInternal = this.storage.read('voiceSpeakingRate');
  }
}

export {Features, State};
