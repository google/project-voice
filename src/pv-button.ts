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

import {css, html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';

@customElement('pv-button')
export class PvButtonElement extends LitElement {
  @property({type: String})
  label = '';

  @property({type: Boolean})
  active = false;

  static styles = css`
    :host {
      display: inline-block;
    }

    :host([active]) button,
    button:focus,
    button:hover {
      background: var(--app-highlight-background-color);
    }

    :host([rounded]) button {
      border-color: #f28b82;
      border-radius: 5vh;
    }

    button {
      background: var(--app-background-color);
      border-radius: 0.5vh;
      border: solid 3px #8ab4f8;
      color: var(--app-color);
      cursor: pointer;
      font-family: 'Roboto Mono', 'Noto Sans JP', monospace;
      font-size: min(5vh, 3rem);
      padding: 0 1rem;
    }
  `;
  render() {
    return html`<button>${this.label}</button>`;
  }
}
