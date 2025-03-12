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

import {Config} from './config-storage.js';

export const RUN_MACRO_ENDPOINT_URL = '/run-macro';

export const INITIAL_PHRASES: {[key: string]: string[]} = {
  en: [
    'I',
    'You',
    'They',
    'What',
    'Why',
    'When',
    'Where',
    'How',
    'Who',
    'Can',
    'Could you',
    'Would you',
    'Do you',
  ],
  ja: [
    'はい',
    'いいえ',
    'ありがとう',
    'すみません',
    'お願いします',
    '私',
    'あなた',
    '彼',
    '彼女',
    '今日',
    '昨日',
    '明日',
  ],
};

export const CONFIG_DEFAULT: Config = {
  aiConfig: 'smart',
  enableEarcons: false,
  expandAtOrigin: false,
  initialPhrases: [],
  persona: '',
  sentenceSmallMargin: false,
  ttsVoice: '',
  voicePitch: 0.0,
  voiceSpeakingRate: 0.0,
};

export const AI_CONFIGS: {
  [key: string]: {
    model: string;
    sentence: string;
    word: string;
  };
} = {
  classic: {
    model: 'gemini-1.5-flash-001',
    sentence: 'SentenceJapanese20240628',
    word: 'WordGeneric20240628',
  },
  fast: {
    model: 'gemini-1.5-flash-002',
    sentence: 'SentenceJapanese20240628',
    word: 'WordGeneric20240628',
  },
  smart: {
    model: 'gemini-1.5-pro-002',
    sentence: 'SentenceJapaneseLong20241002',
    word: 'WordGeneric20240628',
  },
};

export const LARGE_MARGIN_LINE_LIMIT = 4;
