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

export const InputSource = {
  BUTTON_BACKSPACE: 'BUTTON_BACKSPACE',
  BUTTON_DELETE: 'BUTTON_DELETE',
  CHARACTER: 'CHARACTER',
  KEYBOARD: 'KEYBOARD',
  SUGGESTED_SENTENCE: 'SUGGESTED_SENTENCE',
  SUGGESTED_WORD: 'SUGGESTED_WORD',
} as const;

export type InputSource = (typeof InputSource)[keyof typeof InputSource];

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

  /**
   * Returns true if any of the source of the last input is a member of the
   * given input sources. If the history is empty, returns false.
   * @param sources Input sources
   * @returns True if any of the sources of the last input is a member of the
   *   given input sources.
   */
  private isLastInputFrom(sources: InputSource[]): boolean {
    const last = this.lastInput();
    return last ? last.sources.some(source => sources.includes(source)) : false;
  }

  isLastInputSuggested(): boolean {
    const suggestions = [
      InputSource.SUGGESTED_WORD,
      InputSource.SUGGESTED_SENTENCE,
    ];
    return this.isLastInputFrom(suggestions);
  }
}
