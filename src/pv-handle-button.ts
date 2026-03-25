/**
 * Copyright 2025 Google LLC
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

import {css, html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';

@customElement('pv-handle-button')
export class PvHandleButtonElement extends LitElement {
  @property({type: Boolean, reflect: true})
  closed = true;

  static styles = css`
    :host {
      --md-icon-size: 2rem;
    }

    button {
      align-items: center;
      background: var(--color-secondary);
      border: transparent;
      border-radius: 1rem 0 0 1rem;
      color: var(--color-on-secondary);
      cursor: pointer;
      height: 5rem;
      justify-content: center;
      width: 2.25rem;
    }
  `;

  render() {
    return html`<button>
      <md-icon>
        ${this.closed ? 'arrow_back_ios' : 'arrow_forward_ios'}
      </md-icon>
    </button>`;
  }
}
