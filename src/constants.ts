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

export const CONFIG_DEFAULT: Config = {
  aiConfig: 'smart',
  checkedLanguages: [],
  enableConversationMode: false,
  enableEarcons: false,
  expandAtOrigin: false,
  initialPhrases: [],
  messageHistoryWithPrefix: [],
  persona: '',
  sentenceSmallMargin: false,
  ttsVoice: '',
  voicePitch: 0.0,
  voiceSpeakingRate: 0.0,
};

export const LARGE_MARGIN_LINE_LIMIT = 4;
