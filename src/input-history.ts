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

export enum InputSourceKind {
  BUTTON_BACKSPACE = 'BUTTON_BACKSPACE',
  BUTTON_DELETE = 'BUTTON_DELETE',
  CHARACTER = 'CHARACTER',
  KEYBOARD = 'KEYBOARD',
  SUGGESTED_SENTENCE = 'SUGGESTED_SENTENCE',
  SUGGESTED_WORD = 'SUGGESTED_WORD',
}

export type InputSource =
  | {kind: InputSourceKind.BUTTON_BACKSPACE}
  | {kind: InputSourceKind.BUTTON_DELETE}
  | {kind: InputSourceKind.CHARACTER}
  | {kind: InputSourceKind.KEYBOARD}
  | {kind: InputSourceKind.SUGGESTED_SENTENCE; index: number}
  | {kind: InputSourceKind.SUGGESTED_WORD};

export const InputSource: Record<string, InputSource> = {
  BUTTON_BACKSPACE: {kind: InputSourceKind.BUTTON_BACKSPACE},
  BUTTON_DELETE: {kind: InputSourceKind.BUTTON_DELETE},
  CHARACTER: {kind: InputSourceKind.CHARACTER},
  KEYBOARD: {kind: InputSourceKind.KEYBOARD},
  SUGGESTED_WORD: {kind: InputSourceKind.SUGGESTED_WORD},
};

export class HistoryElement {
  constructor(
    public value: string,
    public sources: InputSource[],
  ) {}
}

export class InputHistory {
  private history = [new HistoryElement('', [])];
  private currentIndex = 0;
  static readonly SIZE = 250 as const;

  add(element: HistoryElement) {
    // Discard undone elements.
    this.history = this.history.slice(this.currentIndex);
    this.history.unshift(element);

    this.currentIndex = 0;
    this.history = this.history.slice(0, InputHistory.SIZE);
  }

  canUndo() {
    return this.currentIndex < this.history.length - 1;
  }

  undo() {
    if (this.canUndo()) {
      this.currentIndex++;
    }
  }

  /**
   * Returns the last element of the input history.
   * @returns The last element.
   */
  lastInput(): HistoryElement {
    return this.history[this.currentIndex];
  }

  isLastInputSuggested(): boolean {
    const last = this.lastInput();
    if (!last) {
      return false;
    }
    return last.sources.some(
      source =>
        source.kind === InputSourceKind.SUGGESTED_WORD ||
        source.kind === InputSourceKind.SUGGESTED_SENTENCE,
    );
  }
}
