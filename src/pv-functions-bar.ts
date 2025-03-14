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

import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/icon/icon.js';
import './pv-setting-panel.js';

import {localized, msg} from '@lit/localize';
import {SignalWatcher} from '@lit-labs/signals';
import {css, html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {State} from './state.js';

const EVENT_KEY = {
  backspaceClick: 'backspace-click',
  contentCopyClick: 'content-copy-click',
  deleteClick: 'delete-click',
  firstUpdated: 'first-updated',
  keyboardChangeClick: 'keyboard-change-click',
  languageChangeClick: 'language-change-click',
  settingClick: 'setting-click',
  undoClick: 'undo-click',
} as const;

type EventKey = (typeof EVENT_KEY)[keyof typeof EVENT_KEY];

@localized()
@customElement('pv-functions-bar')
export class PvFunctionsBar extends SignalWatcher(LitElement) {
  @property({type: Object})
  private state!: State;

  static styles = css`
    :host {
      background: var(--app-background-color);
      display: flex;
      --md-icon-size: 1.5rem;
    }

    .functions {
      align-items: center;
      display: flex;
      justify-content: center;
    }

    .functions-bar {
      background: #edf2fa;
      border-radius: 10rem;
      display: flex;
      flex-direction: column;
      padding: 0.5rem;
    }

    .functions-bar md-icon {
      font-weight: 300;
    }

    .functions-bar button {
      align-items: center;
      background: none;
      border: none;
      color: black;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      font-family: inherit;
      margin: 0.25rem 0;
      padding: 0;
    }

    .functions-bar button md-icon img {
      height: 2rem;
      width: 2rem;
    }

    .functions-bar button span {
      display: none;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .functions-bar button:hover md-icon {
      background: rgba(0, 0, 0, 0.1);
    }

    .functions-bar button[disabled] {
      cursor: default;
      opacity: 0.4;
    }

    .functions-bar button[disabled]:hover md-icon {
      background: inherit;
    }

    /* Optimized only for iPad. May need to improve. */
    #form-id {
      height: 380px;
      width: 500px;
    }

    .form-section {
      margin: 1rem 0;
    }

    .pv-persona-text-field,
    .pv-initial-phrase-text-field {
      width: 100%;
    }

    hr {
      border: 0;
      margin: 0;
    }

    md-icon {
      border-radius: 100px;
      padding: 0.25rem;
    }

    @media screen and (min-height: 33rem) {
      :host {
        --md-icon-size: 2rem;
      }

      md-icon {
        padding: 0.5rem;
      }
    }

    @media screen and (min-height: 45rem) {
      .functions-bar {
        padding: 1rem 0.25rem;
      }

      .functions-bar button span {
        display: inline;
      }

      md-icon {
        padding: 0.125rem 0.5rem;
      }

      hr {
        margin: 0.5rem 0;
      }
    }
  `;

  @property({type: Boolean, reflect: true})
  isTtsReading = false;

  fireEvent(key: EventKey) {
    this.dispatchEvent(
      new CustomEvent(key, {
        detail: {callee: this},
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    const isTextEmpty = this.state.text === '';
    const isKeyboardSwitchable = this.state.lang.keyboards.length > 1;
    const isLanguageSwitchable = this.state.features.languages.length > 1;
    return html`
      <div class="functions">
        <div class="functions-bar">
          <button
            @click="${() => {
              this.fireEvent(EVENT_KEY.undoClick);
            }}"
          >
            <md-icon>undo</md-icon>
            <span>${msg('Undo')}</span>
          </button>
          <button
            @click="${() => {
              this.fireEvent(EVENT_KEY.backspaceClick);
            }}"
            ?disabled=${isTextEmpty}
          >
            <md-icon>backspace</md-icon>
            <span>${msg('Backspace')}</span>
          </button>
          <button
            @click="${() => {
              this.fireEvent(EVENT_KEY.deleteClick);
            }}"
            ?disabled=${isTextEmpty}
          >
            <md-icon>delete</md-icon>
            <span>${msg('Clear')}</span>
          </button>
          <hr />
          ${isLanguageSwitchable
            ? html`
                <button
                  @click="${() => {
                    this.fireEvent(EVENT_KEY.languageChangeClick);
                  }}"
                >
                  <md-icon>language</md-icon>
                  <span>${msg('Language')}</span>
                </button>
              `
            : ''}
          ${isKeyboardSwitchable
            ? html`
                <button
                  @click="${() => {
                    this.fireEvent(EVENT_KEY.keyboardChangeClick);
                  }}"
                >
                  <md-icon>language_japanese_kana</md-icon>
                  <span>${msg('Keyboard')}</span>
                </button>
              `
            : ''}
          <hr />
          <button
            @click="${() => {
              this.fireEvent(EVENT_KEY.contentCopyClick);
            }}"
            ?disabled=${isTextEmpty}
          >
            <md-icon>content_copy</md-icon>
            <span>${msg('Copy')}</span>
          </button>
          <button
            @click="${this.onTtsButtonClick}"
            ?disabled=${this.isTtsReading || isTextEmpty}
          >
            <md-icon>text_to_speech</md-icon>
            <span>${msg('Read aloud')}</span>
          </button>
          <hr />
          <button
            @click="${() => {
              this.fireEvent(EVENT_KEY.settingClick);
            }}"
          >
            <md-icon>settings</md-icon>
            <span>${msg('Settings')}</span>
          </button>
        </div>
      </div>
    `;
  }

  private async onTtsButtonClick() {
    const tts = window.speechSynthesis;
    tts.cancel();

    if (this.state.enableEarcons) {
      const audio = new Audio('/static/chime.wav');
      audio.addEventListener('canplaythrough', () => {
        audio.play();
      });
      audio.addEventListener('ended', () => {
        this.startTts();
      });
    } else {
      this.startTts();
    }
  }

  private startTts() {
    const utterance = new SpeechSynthesisUtterance(this.state.text);
    utterance.lang = this.state.lang.code;
    utterance.rate = Math.pow(2, this.state.voiceSpeakingRate / 10);
    utterance.pitch = (this.state.voicePitch + 20) / 20;
    const tts = window.speechSynthesis;
    const voice = tts
      .getVoices()
      .find(voice => voice.name === this.state.voiceName);
    if (voice) {
      utterance.voice = voice;
    }
    utterance.addEventListener('end', () => {
      this.onTtsEnd();
    });
    tts.speak(utterance);
    this.isTtsReading = true;
  }

  private onTtsEnd() {
    this.isTtsReading = false;
  }
}
