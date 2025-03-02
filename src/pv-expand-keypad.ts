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

import {css, html, LitElement} from 'lit';
import {customElement, property, query, queryAll} from 'lit/decorators.js';

import {State} from './state.js';

export class CharacterSelectEvent extends CustomEvent<string> {}

@customElement('pv-expand-keypad')
export class PvExpandKeypadElement extends LitElement {
  @property({type: Object})
  private state!: State;

  @property({type: String, reflect: true})
  label = '';

  @property({type: Array})
  value: string[] = [];

  @property({type: Boolean, reflect: true})
  open = false;

  @property({type: Boolean, reflect: true})
  expandAtOrigin = false;

  @query('button.handler')
  handlerButton?: HTMLButtonElement;

  @query('ul.container')
  container?: HTMLUListElement;

  @queryAll('ul.container button')
  focusibleButtons?: HTMLButtonElement[];

  @query('li button')
  firstKeypad?: HTMLButtonElement;

  @queryAll('ul.row')
  expandedKeypadRows?: HTMLUListElement[];

  private onKeydownWhileOpenWithThis = this.onKeydownWhileOpen.bind(this);

  static styles = css`
    :host {
      display: block;
      height: 100%;
    }

    button {
      aspect-ratio: 1;
      background: var(--app-background-color);
      border-radius: min(1vw, 1rem);
      border: solid 3px #81c995;
      color: var(--app-color);
      cursor: pointer;
      font-family: 'Roboto Mono', 'Noto Sans JP', monospace;
      font-size: min(2.5vw, 3rem);
      max-width: 128px;
      padding: 0;
      width: 7vw;
    }

    button:hover,
    button:focus {
      background: var(--app-highlight-background-color);
    }

    .close md-icon {
      --md-icon-size: 3vw;
      margin-top: 0.5vw;
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    ul.container {
      position: absolute;
      z-index: 1000;
      top: 0;
      left: 0;
      display: none;
    }

    :host([open]) ul.container {
      display: block;
    }

    ul.row {
      display: flex;
      gap: 0.5rem;
    }

    ul button {
      margin-bottom: 0.5rem;
    }

    .backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: none;
      z-index: 100;
    }

    :host([open]) .backdrop {
      display: block;
    }
  `;

  /**
   * Traps the focus within the expanded keypad.
   * @param e A keydown event
   */
  private onKeydownWhileOpen(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.open = false;
      return;
    }
    if (e.key === 'Tab' && this.shadowRoot && this.focusibleButtons) {
      const activeElement = this.shadowRoot.activeElement;
      if (e.shiftKey && activeElement === this.focusibleButtons[0]) {
        this.focusibleButtons[this.focusibleButtons.length - 1].focus();
        console.log('trapping! backward');
        e.preventDefault();
      } else if (
        activeElement ===
        this.focusibleButtons[this.focusibleButtons.length - 1]
      ) {
        this.focusibleButtons[0].focus();
        console.log('trapping! forward');
        e.preventDefault();
      }
    }
  }

  private onKeypadOpen() {
    if (!this.container) return;
    if (!this.expandedKeypadRows) return;
    if (!this.handlerButton) return;
    if (this.expandAtOrigin) {
      this.container.style.position = 'absolute';
      this.container.style.top = '0';
      this.container.style.left = '0';
      this.expandedKeypadRows.forEach(row => {
        row.style.transform = 'none';
      });
    } else {
      const handlerBBox = this.handlerButton.getBoundingClientRect();
      this.container.style.position = 'fixed';
      this.container.style.top = `${handlerBBox?.top}px`;
      this.container.style.left = `${handlerBBox?.left}px`;

      this.expandedKeypadRows.forEach(row => {
        const rowBBox = row.getBoundingClientRect();
        if (rowBBox.right > window.innerWidth) {
          row.style.transform = `translateX(${
            window.innerWidth - rowBBox.right - 16
          }px)`;
        }
      });
    }
    this.firstKeypad?.focus();
    this.addEventListener('keydown', this.onKeydownWhileOpenWithThis);
    this.dispatchEvent(
      new Event('keypad-open', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private onKeypadClose() {
    this.removeEventListener('keydown', this.onKeydownWhileOpenWithThis);
    this.handlerButton?.focus();
  }

  protected updated(changedProperties: Map<string, string | number | boolean>) {
    const oldOpenValue = changedProperties.get('open');
    if (oldOpenValue === true) {
      this.onKeypadClose();
    } else if (oldOpenValue === false) {
      window.requestAnimationFrame(() => {
        this.onKeypadOpen();
      });
    }
  }

  private playClickSound() {
    if (!this.state.enableEarcons) {
      return;
    }
    const audio = new Audio('/static/click2.wav');
    audio.addEventListener('canplaythrough', () => {
      audio.play();
    });
  }

  protected render() {
    return html`<button
        class="handler"
        @click="${() => {
          this.open = true;
          this.playClickSound();
        }}"
      >
        ${this.label}
      </button>
      <ul class="container">
        <button
          class="close"
          @click="${() => {
            this.open = false;
          }}"
        >
          <md-icon>close</md-icon>
        </button>
        ${this.value.map(
          row =>
            html`<li>
              <ul class="row">
                ${row.split('').map(
                  c =>
                    html`<li>
                      <button
                        @click="${() => {
                          this.open = false;
                          const characterToSend = c.replace('␣', ' ');
                          this.playClickSound();
                          this.dispatchEvent(
                            new CharacterSelectEvent('character-select', {
                              detail: characterToSend,
                              bubbles: true,
                              composed: true,
                            })
                          );
                        }}"
                      >
                        ${c}
                      </button>
                    </li>`
                )}
              </ul>
            </li>`
        )}
      </ul>
      <div
        class="backdrop"
        @click="${() => {
          this.open = false;
        }}"
      ></div>`;
  }
}
