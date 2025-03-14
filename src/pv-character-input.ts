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

import './pv-expand-keypad.js';

import {SignalWatcher} from '@lit-labs/signals';
import {css, html, LitElement} from 'lit';
import {customElement, property, queryAll} from 'lit/decorators.js';

import {Key} from './keyboard.js';
import type {PvExpandKeypadElement} from './pv-expand-keypad.js';
import {State} from './state.js';

@customElement('pv-character-input')
export class PvCharacterInputElement extends SignalWatcher(LitElement) {
  @property({type: Object})
  private state!: State;

  @queryAll('pv-expand-keypad')
  keypads?: PvExpandKeypadElement[];

  static styles = css`
    :host {
      position: relative;
    }

    ul {
      display: flex;
      gap: 0.5rem;
      list-style: none;
      margin: 0;
      padding: 0;
    }
  `;

  protected firstUpdated() {
    this.addEventListener('keypad-open', (e: Event) => {
      const target = e.composedPath()[0];
      this.keypads?.forEach(keypad => {
        keypad.open = keypad === target;
      });
    });
  }

  render() {
    const keypadsTemplate = (keys: Key[]) => html`
      <ul>
        ${keys.map(
          keypad => html`
            <li>
              <pv-expand-keypad
                .label=${keypad.label}
                .value=${keypad.value}
                .state=${this.state}
                ?expandAtOrigin=${this.state.expandAtOrigin}
              ></pv-expand-keypad>
            </li>
          `,
        )}
      </ul>
    `;
    return keypadsTemplate(this.state.keyboard.keys[0]);
  }
}
