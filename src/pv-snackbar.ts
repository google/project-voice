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

import {css, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';

@customElement('pv-snackbar')
export class PvSnackbar extends LitElement {
  @property({type: String})
  labelText = '';

  @property({type: Boolean, reflect: true})
  visible = false;

  private displayTimeout = 0;

  static styles = css`
    :host {
      background: rgba(32, 33, 36, 0.8);
      border-radius: 0.5rem;
      bottom: 1rem;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      color: #fff;
      font-size: 2rem;
      left: 50%;
      opacity: 0;
      padding: 0.5rem 1rem;
      position: fixed;
      transform: translateX(-50%) translateY(100%);
      transition: all 0.3s ease;
      z-index: 100;
    }

    :host([visible]) {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  `;

  show() {
    if (this.displayTimeout > 0) {
      window.clearTimeout(this.displayTimeout);
    }
    this.visible = true;
    this.displayTimeout = window.setTimeout(() => {
      this.visible = false;
      this.displayTimeout = 0;
      this.dispatchEvent(new Event('closed'));
    }, 5000);
  }

  protected render() {
    return this.labelText;
  }
}
