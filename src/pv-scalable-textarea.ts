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
import {customElement, property, query} from 'lit/decorators.js';

@customElement('pv-scalable-textarea')
export class PvScalableTextareaElement extends LitElement {
  @property({type: String})
  value = '';

  @property({type: Number})
  minRows = 2;

  @property({type: Number})
  maxRows = 4;

  @property({type: String, reflect: true})
  placeholder = '';

  @query('textarea.hidden')
  hiddenTextArea?: HTMLTextAreaElement;

  @query('textarea.main')
  textArea?: HTMLTextAreaElement;

  static styles = css`
    :host {
      display: block;
      position: relative;
    }

    textarea {
      background: var(--app-background-color);
      border-radius: 0.5rem;
      border: solid 1px var(--app-color);
      box-sizing: border-box;
      color: var(--app-color);
      font-family: Roboto, 'Noto Sans JP', sans-serif;
      height: 100%;
      width: 100%;
    }

    textarea.hidden {
      opacity: 0;
      pointer-events: none;
      position: absolute;
    }
  `;

  private updateLayout() {
    if (
      !(
        this.hiddenTextArea instanceof HTMLTextAreaElement &&
        this.textArea instanceof HTMLTextAreaElement
      )
    ) {
      return;
    }
    const fontSizeFactor = 0.8;
    const boundingRect = this.getBoundingClientRect();
    this.hiddenTextArea.style.lineHeight = `${Math.round(
      boundingRect.height / this.minRows,
    )}px`;
    this.hiddenTextArea.style.fontSize = `${Math.round(
      (boundingRect.height / this.minRows) * fontSizeFactor,
    )}px`;
    const contentHeight = this.hiddenTextArea.scrollHeight;
    const nRows = Math.min(
      this.maxRows,
      Math.max(
        this.minRows,
        Math.floor(contentHeight / (boundingRect.height / this.minRows)),
      ),
    );
    this.textArea.style.lineHeight = `${Math.round(
      boundingRect.height / nRows,
    )}px`;
    this.textArea.style.fontSize = `${Math.round(
      (boundingRect.height / nRows) * fontSizeFactor,
    )}px`;
    this.textArea.value = this.value;
  }

  protected firstUpdated() {
    window.addEventListener('resize', () => {
      this.updateLayout();
    });
    this.updateLayout();
  }

  protected updated() {
    if (!(this.hiddenTextArea instanceof HTMLTextAreaElement)) return;
    this.hiddenTextArea.value = this.value;
    this.updateLayout();
    this.dispatchEvent(new Event('updated'));
  }

  protected render() {
    return html`
      <textarea class="hidden"></textarea>
      <textarea
        class="main"
        placeholder="${this.placeholder}"
        @input="${(e: KeyboardEvent) => {
          if (e.isComposing) return;
          this.value = (e.composedPath()[0] as HTMLTextAreaElement).value;
        }}"
        @compositionend="${(e: KeyboardEvent) => {
          this.value = (e.composedPath()[0] as HTMLTextAreaElement).value;
        }}"
      ></textarea>
    `;
  }
}
