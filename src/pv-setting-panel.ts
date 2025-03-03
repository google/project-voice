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

import '@material/web/select/select-option.js';
import '@material/web/button/text-button.js';
import '@material/web/switch/switch.js';
import '@material/web/tabs/primary-tab.js';
import '@material/web/tabs/tabs.js';
import '@material/web/textfield/filled-text-field.js';
import '@material/web/select/outlined-select.js';
import '@material/web/dialog/dialog.js';
import '@material/web/slider/slider.js';

import {localized, msg} from '@lit/localize';
import {SignalWatcher} from '@lit-labs/signals';
import {MdTabs} from '@material/web/tabs/tabs.js';
import {css, html, LitElement} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';

import {State} from './state.js';

const EVENT_KEY = {
  okClick: 'ok-click',
} as const;

type EventKey = (typeof EVENT_KEY)[keyof typeof EVENT_KEY];

@localized()
@customElement('pv-setting-panel')
export class PvSettingPanel extends SignalWatcher(LitElement) {
  @property({type: Object})
  private state!: State;

  static styles = css`
    :host {
      background: var(--app-background-color);
      display: flex;

      --md-icon-button-icon-size: 3rem;
      --md-icon-button-state-layer-width: 4rem;
      --md-icon-button-state-layer-height: 4rem;

      --mdc-typography-body2-font-size: 3rem;
      --mdc-typography-body2-line-height: 3.5rem;
    }

    /* Optimized only for iPad. May need to improve. */
    #form-id {
      height: 440px;
      width: 500px;
    }

    .voice-config-slider {
      display: inline-block;
      width: 350px;
    }

    .form-section {
      margin: 1rem 0;
    }

    .pv-persona-text-field,
    .pv-initial-phrase-text-field {
      width: 100%;
    }
  `;

  @property({type: Number, reflect: true})
  private activeSettingsTabIndex = 0;

  @query('md-dialog')
  private settingsDialog?: HTMLDialogElement;

  show() {
    this.settingsDialog?.show();
  }

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
    // The text field is not re-rendered even when initialPhrases are updated.
    // TODO: Re-render the text field when initialPhrases are updated.
    const profileSettingsPanelTemplate = html`
      <div class="form-section">
        <label>
          ${msg('Persona')}
          <p>
            <md-filled-text-field
              class="pv-persona-text-field"
              type="textarea"
              rows="5"
              @input=${(e: Event) => {
                this.state.persona = (e.target as HTMLTextAreaElement).value;
              }}
              value="${this.state.persona}"
            >
            </md-filled-text-field>
          </p>
        </label>
      </div>
      <div class="form-section">
        <label>
          ${msg('Initial phrases')}
          <p>
            <md-filled-text-field
              class="pv-initial-phrase-text-field"
              type="textarea"
              rows="3"
              value="${this.state.initialPhrases.join('\n')}"
              @input=${(e: Event) => {
                this.state.initialPhrases = (e.target as HTMLInputElement).value
                  .split('\n')
                  .filter(str => str);
              }}
            >
            </md-filled-text-field>
          </p>
        </label>
      </div>
    `;

    const generalSettingsPanelTemplate = html`
      <div class="form-section">
        <md-outlined-select
          label="${msg('AI')}"
          @change=${(e: Event) => {
            const selected = e.composedPath()[0];
            this.state.aiConfig = (selected as HTMLSelectElement).value;
          }}
        >
          <md-select-option
            ?selected="${this.state.aiConfig === 'fast'}"
            value="fast"
          >
            <div slot="headline">${msg('Fast')}</div>
          </md-select-option>
          <md-select-option
            ?selected="${this.state.aiConfig === 'smart'}"
            value="smart"
          >
            <div slot="headline">${msg('Smart')}</div>
          </md-select-option>
          <md-select-option
            ?selected="${this.state.aiConfig === 'classic'}"
            value="classic"
          >
            <div slot="headline">${msg('Classic')}</div>
          </md-select-option>
        </md-outlined-select>
      </div>
      <div class="form-section">
        <label>
          ${msg('Always expand at origin')}
          <md-switch
            ?selected=${this.state.expandAtOrigin}
            @change=${() => {
              this.state.expandAtOrigin = !this.state.expandAtOrigin;
            }}
          ></md-switch>
        </label>
      </div>
      <div class="form-section">
        <label>
          ${msg('Use smaller sentence margin')}
          <md-switch
            ?selected=${this.state.sentenceSmallMargin}
            @change=${() => {
              this.state.sentenceSmallMargin = !this.state.sentenceSmallMargin;
            }}
          ></md-switch>
        </label>
      </div>
      <div class="form-section">
        <label>
          ${msg('Enable earcons')}
          <md-switch
            ?selected=${this.state.enableEarcons}
            @change=${() => {
              this.state.enableEarcons = !this.state.enableEarcons;
            }}
          ></md-switch>
        </label>
      </div>
    `;

    const ttsSettingsPanelTemplate = html`
      <div class="form-section">
        <md-outlined-select
          label="${msg('TTS Voice')}"
          @change=${(e: Event) => {
            const selected = e.target;
            this.state.voiceName = (selected as HTMLSelectElement).value;
          }}
        >
          <md-select-option
            value="Default"
            ?selected="${this.state.voiceName === ''}"
          >
            <div slot="headline">Default</div>
          </md-select-option>
          ${window.speechSynthesis
            .getVoices()
            .filter(voice => voice.lang.startsWith(this.state.lang))
            .map(
              voice =>
                html`<md-select-option
                  value="${voice.name}"
                  ?selected="${this.state.voiceName === voice.name}"
                >
                  <div slot="headline">${voice.name}</div>
                </md-select-option>`,
            )}
        </md-outlined-select>
      </div>
      <div class="form-section">
        <label>
          ${msg('Speaking rate')}
          <md-slider
            class="voice-config-slider"
            min="-10"
            max="10"
            value="${this.state.voiceSpeakingRate}"
            @change=${(e: Event) => {
              this.state.voiceSpeakingRate = Number(
                (e.target as HTMLInputElement).value,
              );
            }}
          >
          </md-slider>
        </label>
      </div>
      <div class="form-section">
        <label>
          ${msg('Pitch')}
          <md-slider
            class="voice-config-slider"
            min="-10"
            max="10"
            value="${this.state.voicePitch}"
            @change=${(e: Event) => {
              this.state.voicePitch = Number(
                (e.target as HTMLInputElement).value,
              );
            }}
          >
          </md-slider>
        </label>
      </div>
    `;

    const settingsPanels = [
      generalSettingsPanelTemplate,
      profileSettingsPanelTemplate,
      ttsSettingsPanelTemplate,
    ];

    return html`
      <md-dialog>
        <form slot="content" id="form-id" method="dialog">
          <md-tabs
            @change="${(e: Event) => {
              if (e.target instanceof MdTabs) {
                this.activeSettingsTabIndex = e.target.activeTabIndex;
              }
            }}"
          >
            <md-primary-tab ?active="${this.activeSettingsTabIndex === 0}">
              ${msg('General')}
            </md-primary-tab>
            <md-primary-tab ?active="${this.activeSettingsTabIndex === 1}">
              ${msg('Profile')}
            </md-primary-tab>
            <md-primary-tab ?active="${this.activeSettingsTabIndex === 2}">
              ${msg('VOICE')}
            </md-primary-tab>
          </md-tabs>
          ${settingsPanels[this.activeSettingsTabIndex]}
        </form>
        <div slot="actions">
          <md-text-button
            form="form-id"
            @click="${() => {
              // TODO: Revert the change when cancelled.
              this.settingsDialog?.close();
              this.fireEvent(EVENT_KEY.okClick);
            }}"
            >OK</md-text-button
          >
        </div>
      </md-dialog>
    `;
  }
}
