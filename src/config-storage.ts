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

/**
 * ConfigStorage class provides methods to read and write configurations to
 * local storage.
 */

export interface Config {
  aiConfig: string;
  checkedLanguages: string[];
  enableEarcons: boolean;
  expandAtOrigin: boolean;
  initialPhrases: string[];
  persona: string;
  sentenceSmallMargin: boolean;
  ttsVoice: string;
  voicePitch: number;
  voiceSpeakingRate: number;
}

export class ConfigStorage {
  private domainHead: string;
  private defaultValues: Config;

  /**
   * Creates an instance of ConfigStorage.
   * @param domainHead The prefix for keys in the storage.
   * @param defaultValues A default Config value.
   */
  constructor(domainHead: string, defaultValues: Config) {
    this.domainHead = domainHead;
    this.defaultValues = defaultValues;
  }

  /**
   * Reads a value from storage or default.
   * @param key - The key to read.
   * @returns The value associated with the key.
   */
  read<K extends keyof Config>(key: K): Config[K] {
    const fullKey = `${this.domainHead}.${key}`;
    const retPair = localStorage.getItem(fullKey);
    if (retPair === null) {
      return this.defaultValues[key];
    }
    try {
      const {value} = JSON.parse(retPair);
      return value;
    } catch (e) {
      // Returns the default value if the stored value is broken.
      return this.defaultValues[key];
    }
  }

  /**
   * Writes a value to storage.
   * @param key The key to write.
   * @param value The value to value.
   */
  write<K extends keyof Config>(key: K, value: Config[K]) {
    const fullKey = `${this.domainHead}.${key}`;
    // Write in a compatible format with the exiting version.
    const str = JSON.stringify({value});
    localStorage.setItem(fullKey, str);
  }
}
