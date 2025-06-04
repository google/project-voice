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

import {ConfigStorage} from '../config-storage.js';
import {LANGUAGES} from '../language.js';
import {State} from '../state.js';
import {TEST_CONFIG} from './test_config-storage.js';

describe('State', () => {
  let storage: ConfigStorage;
  let state: State;

  beforeEach(() => {
    window.localStorage.clear();
    storage = new ConfigStorage('test', TEST_CONFIG);
    state = new State(storage);
  });

  afterAll(() => {
    window.localStorage.clear();
  });

  it('initializes with default values', () => {
    expect(state.lang.code).toEqual('ja-JP');
    expect(state.text).toEqual('');
    expect(state.aiConfig).toEqual(TEST_CONFIG.aiConfig);
    const aiConfigs = state.lang.aiConfigs;
    expect(state.model).toEqual(aiConfigs[TEST_CONFIG.aiConfig].model);
    expect(state.sentenceMacroId).toEqual(
      aiConfigs[TEST_CONFIG.aiConfig].sentence,
    );
    expect(state.wordMacroId).toEqual(aiConfigs[TEST_CONFIG.aiConfig].word);
    expect(state.expandAtOrigin).toEqual(TEST_CONFIG.expandAtOrigin);
    expect(state.sentenceSmallMargin).toEqual(TEST_CONFIG.sentenceSmallMargin);
    expect(state.persona).toEqual(TEST_CONFIG.persona);
    expect(state.initialPhrases).toEqual(TEST_CONFIG.initialPhrases);
    expect(state.voiceSpeakingRate).toEqual(TEST_CONFIG.voiceSpeakingRate);
    expect(state.voicePitch).toEqual(TEST_CONFIG.voicePitch);
    expect(state.voiceName).toEqual(TEST_CONFIG.ttsVoice);
  });

  it('updates language correctly', () => {
    const newLang = LANGUAGES['englishWithSingleRowKeyboard'];
    state.lang = newLang;
    expect(state.lang).toEqual(newLang);
  });

  it('updates text correctly', () => {
    const newText = 'Hello World';
    state.text = newText;
    expect(state.text).toEqual(newText);
  });

  it('handles AI config changes', () => {
    const newConfig = 'fast';
    state.aiConfig = newConfig;
    const aiConfigs = state.lang.aiConfigs;
    expect(state.aiConfig).toEqual(newConfig);
    expect(state.model).toEqual(aiConfigs[newConfig].model);
    expect(state.sentenceMacroId).toEqual(aiConfigs[newConfig].sentence);
    expect(state.wordMacroId).toEqual(aiConfigs[newConfig].word);
    expect(storage.read('aiConfig')).toEqual(newConfig);
  });

  it('updates expandAtOrigin correctly', () => {
    const newValue = false;
    state.expandAtOrigin = newValue;
    expect(state.expandAtOrigin).toEqual(newValue);
    expect(storage.read('expandAtOrigin')).toEqual(newValue);
  });

  it('updates sentenceSmallMargin correctly', () => {
    const newValue = true;
    state.sentenceSmallMargin = newValue;
    expect(state.sentenceSmallMargin).toEqual(newValue);
    expect(storage.read('sentenceSmallMargin')).toEqual(newValue);
  });

  it('updates persona correctly', () => {
    const newPersona = 'Test Persona';
    state.persona = newPersona;
    expect(state.persona).toEqual(newPersona);
    expect(storage.read('persona')).toEqual(newPersona);
  });

  it('updates initial phrases correctly', () => {
    const newPhrases = ['Test', 'Phrase'];
    state.initialPhrases = newPhrases;
    expect(state.initialPhrases).toEqual(newPhrases);
    expect(storage.read('initialPhrases')).toEqual(newPhrases);
  });

  it('updates voice settings correctly', () => {
    const newVoice = 'TestVoice';
    const newPitch = 1.5;
    const newRate = 1.2;

    state.voiceName = newVoice;
    state.voicePitch = newPitch;
    state.voiceSpeakingRate = newRate;

    expect(state.voiceName).toEqual(newVoice);
    expect(state.voicePitch).toEqual(newPitch);
    expect(state.voiceSpeakingRate).toEqual(newRate);
    expect(storage.read('ttsVoice')).toEqual(newVoice);
    expect(storage.read('voicePitch')).toEqual(newPitch);
    expect(storage.read('voiceSpeakingRate')).toEqual(newRate);
  });
});
