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

import './pv-scalable-textarea.js';

import {localized} from '@lit/localize';
import {css, html, LitElement} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';

import {HistoryElement, InputHistory, InputSource} from './input-history.js';
import {PvScalableTextareaElement} from './pv-scalable-textarea.js';
import {State} from './state.js';

const EVENT_KEY = {
  textUpdate: 'text-update',
} as const;

@customElement('pv-textarea-wrapper')
@localized()
export class PvTextareaWrapper extends LitElement {
  @property({type: Object})
  private state!: State;

  @query('pv-scalable-textarea')
  private textArea?: HTMLTextAreaElement;

  private inputHistory = new InputHistory();

  static styles = css`
    pv-scalable-textarea {
      box-sizing: border-box;
      height: 20svh;
    }
  `;

  get value() {
    return this.textArea?.value || '';
  }

  isBlank() {
    return this.textArea && this.textArea.value === '';
  }

  canUndo() {
    return this.inputHistory.canUndo();
  }

  isLastInputSuggested() {
    return this.inputHistory.isLastInputSuggested();
  }

  setPlaceholder(str: string) {
    this.textArea!.placeholder = str;
  }

  setTextFieldValue(value: string, source: InputSource[]) {
    if (!this.textArea) return;
    const element = new HistoryElement(value, source);
    this.inputHistory.add(element);
    this.textArea.value = value;
    this.textArea.placeholder = '';
  }

  textUndo() {
    if (!this.textArea || !this.inputHistory) return;
    this.inputHistory.undo();
    const element = this.inputHistory.lastInput();
    this.textArea.value = element.value;
    this.textArea.placeholder = '';
  }

  textDelete() {
    this.setTextFieldValue('', [InputSource.BUTTON_DELETE]);
  }

  textBackspace() {
    if (!this.textArea) return;
    const fieldText = this.value;
    const len = fieldText.length;
    this.setTextFieldValue(fieldText.substring(0, len - 1), [
      InputSource.BUTTON_BACKSPACE,
    ]);
  }

  contentCopy() {
    if (!this.textArea) return;
    navigator.clipboard.writeText(this.value);
  }

  protected override render() {
    const onTextFieldUpdate = (event: Event) => {
      const value = (event.target as PvScalableTextareaElement).value;
      this.state.text = value;
      const last = this.inputHistory.lastInput();
      const prev = last?.value || '';

      if (value !== prev) {
        const element = new HistoryElement(value, [InputSource.KEYBOARD]);
        this.inputHistory.add(element);
      }
      this.fireEvent();
    };

    return html`
      <pv-scalable-textarea @updated="${onTextFieldUpdate}">
      </pv-scalable-textarea>
    `;
  }

  private fireEvent() {
    this.dispatchEvent(
      new CustomEvent(EVENT_KEY.textUpdate, {
        detail: {callee: this},
        bubbles: true,
        composed: true,
      })
    );
  }
}
