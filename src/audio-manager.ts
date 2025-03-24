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

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

let clickBuffer: AudioBuffer | null = null;
let chimeBuffer: AudioBuffer | null = null;
const ctx = new (window.AudioContext || window.webkitAudioContext)();

fetch('/static/click2.wav')
  .then(response => response.arrayBuffer())
  .then(arrayBuffer => ctx.decodeAudioData(arrayBuffer))
  .then(audioBuffer => {
    clickBuffer = audioBuffer;
  })
  .catch(error => {
    console.warn('Error loading click audio file:', error);
  });

fetch('/static/chime.wav')
  .then(response => response.arrayBuffer())
  .then(arrayBuffer => ctx.decodeAudioData(arrayBuffer))
  .then(audioBuffer => {
    chimeBuffer = audioBuffer;
  })
  .catch(error => {
    console.warn('Error loading chime audio file:', error);
  });

export class AudioManager {
  static playClick(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!clickBuffer) {
        return reject('Click audio buffer is not loaded yet.');
      }
      const source = ctx.createBufferSource();
      source.buffer = clickBuffer;
      source.connect(ctx.destination);
      source.onended = () => {
        source.disconnect();
        resolve();
      };
      source.start(ctx.currentTime);
    });
  }

  static playChime(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!chimeBuffer) {
        return reject('Chime audio buffer is not loaded yet.');
      }
      const source = ctx.createBufferSource();
      source.buffer = chimeBuffer;
      source.connect(ctx.destination);
      source.onended = () => {
        source.disconnect();
        resolve();
      };
      source.start(ctx.currentTime);
    });
  }
}
