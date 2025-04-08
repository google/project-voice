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
import {customElement, property, query, queryAll} from 'lit/decorators.js';

export class CharacterSelectEvent extends CustomEvent<string> {}

@customElement('pv-expand-keypad')
export class PvExpandKeypadElement extends LitElement {
  /**
   * A label for the handler button.
   */
  @property({type: String, reflect: true})
  label = '';

  /**
   * A list of characters to select. Each list item corresponds to a row, and
   * each character in a list item corresponds to a keypad.
   *
   * e.g. `['abc', 'def']` becomes:
   * ```
   * [a] [b] [c]
   * [d] [e] [f]
   * ```
   */
  @property({type: Array})
  value: string[] = [];

  /**
   * Whether the keypad is open.
   */
  @property({type: Boolean, reflect: true})
  open = false;

  /**
   * Whether to expand the keypad from the left edge of the container.
   */
  @property({type: Boolean, reflect: true})
  expandAtOrigin = false;

  /**
   * Approximate number of characters to show on the handler.
   *
   * This value is used to scale the font size of the button label.
   */
  @property({type: Number})
  numCharsOnHandler = 3;

  @queryAll('button')
  allButtons?: HTMLButtonElement[];

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
  private resizeObserver?: ResizeObserver;

  static styles = css`
    button {
      align-items: center;
      aspect-ratio: 1;
      background: var(--app-background-color, white);
      border-radius: 20%;
      border: solid 3px #81c995;
      color: var(--app-color);
      cursor: pointer;
      display: flex;
      font-family: 'Roboto Mono', 'Noto Sans JP', monospace;
      justify-content: center;
      max-width: 8rem;
      min-width: 2rem;
      padding: 0;
      width: 100%;
    }

    button:hover,
    button:focus {
      background: var(--app-highlight-background-color, yellow);
    }

    .close {
      font-family: 'Material Symbols Outlined';
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    ul.container {
      display: none;
      left: 0;
      position: absolute;
      top: 0;
      z-index: 1000;
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
      background: rgba(0, 0, 0, 0.5);
      display: none;
      height: 100%;
      left: 0;
      position: fixed;
      top: 0;
      width: 100%;
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
        e.preventDefault();
      } else if (
        !e.shiftKey &&
        activeElement ===
          this.focusibleButtons[this.focusibleButtons.length - 1]
      ) {
        this.focusibleButtons[0].focus();
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

      // Shift the keypad to the left if it overflows the right edge of the screen.
      this.expandedKeypadRows.forEach(row => {
        row.style.transform = '';
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
      }),
    );
  }

  private onKeypadClose() {
    this.removeEventListener('keydown', this.onKeydownWhileOpenWithThis);
    this.handlerButton?.focus();
  }

  protected firstUpdated() {
    this.resizeObserver = new ResizeObserver(() => {
      if (!this.handlerButton) return;
      const width = this.handlerButton.getBoundingClientRect().width;
      this.allButtons?.forEach(button => {
        if (button !== this.handlerButton) button.style.width = `${width}px`;
        button.style.fontSize = `${width / this.numCharsOnHandler}px`;
      });
    });
    this.resizeObserver.observe(this.handlerButton!);
  }

  protected updated(changedProperties: Map<string, string | number | boolean>) {
    const oldOpenValue = changedProperties.get('open');
    if (oldOpenValue === true) {
      this.onKeypadClose();
    } else if (oldOpenValue === false) {
      this.onKeypadOpen();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.resizeObserver?.disconnect();
  }

  protected render() {
    return html`<button
        class="handler"
        @click="${() => {
          this.open = true;
          this.dispatchEvent(
            new CharacterSelectEvent('keypad-handler-click', {
              detail: 'open',
              bubbles: true,
              composed: true,
            }),
          );
        }}"
      >
        ${this.label}
      </button>
      <ul class="container">
        <button
          class="close"
          @click="${() => {
            this.open = false;
            this.dispatchEvent(
              new CharacterSelectEvent('keypad-handler-click', {
                detail: 'close',
                bubbles: true,
                composed: true,
              }),
            );
          }}"
        >
          close
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
                          this.dispatchEvent(
                            new CharacterSelectEvent('character-select', {
                              detail: characterToSend,
                              bubbles: true,
                              composed: true,
                            }),
                          );
                        }}"
                      >
                        ${c}
                      </button>
                    </li>`,
                )}
              </ul>
            </li>`,
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
