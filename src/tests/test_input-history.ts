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

import {HistoryElement, InputHistory, InputSource} from '../input-history.js';

describe('Input History', () => {
  describe('undo', () => {
    it('should restore the previous state', () => {
      const inputHistory = new InputHistory();
      inputHistory.add(new HistoryElement('a', [InputSource.SUGGESTED_WORD]));
      inputHistory.add(new HistoryElement('ab', [InputSource.SUGGESTED_WORD]));
      inputHistory.undo();

      const result = inputHistory.lastInput();

      expect(result.value).toBe('a');
    });

    it('should be safe when the history is empty', () => {
      const inputHistory = new InputHistory();
      inputHistory.undo();

      const result = inputHistory.lastInput();

      expect(result.value).toBe('');
    });
  });

  describe('canUndo', () => {
    it('should return false when history is empty', () => {
      const inputHistory = new InputHistory();

      const result = inputHistory.canUndo();

      expect(result).toBeFalse();
    });

    it('should return true when history is not empty', () => {
      const inputHistory = new InputHistory();
      inputHistory.add(new HistoryElement('a', [InputSource.SUGGESTED_WORD]));

      const result = inputHistory.canUndo();

      expect(result).toBeTrue();
    });

    it('should return false when when there is no more undoable element', () => {
      const inputHistory = new InputHistory();
      inputHistory.add(new HistoryElement('a', [InputSource.SUGGESTED_WORD]));
      inputHistory.undo();

      const result = inputHistory.canUndo();

      expect(result).toBeFalse();
    });
  });

  describe('lastInput', () => {
    it('should return an empty value at initial state', () => {
      const inputHistory = new InputHistory();

      const result = inputHistory.lastInput();

      expect(result.value).toBe('');
    });

    it('should return the last element', () => {
      const inputHistory = new InputHistory();
      const element = new HistoryElement('a', [InputSource.SUGGESTED_WORD]);
      inputHistory.add(element);

      const result = inputHistory.lastInput();

      expect(result).toBe(element);
    });

    it('should return the last not undone element', () => {
      const inputHistory = new InputHistory();
      const element = new HistoryElement('a', [InputSource.SUGGESTED_WORD]);
      inputHistory.add(element);
      inputHistory.add(new HistoryElement('ab', [InputSource.SUGGESTED_WORD]));
      inputHistory.undo();

      const result = inputHistory.lastInput();

      expect(result).toBe(element);
    });

    it('should return an empty value when all elements are undone', () => {
      const inputHistory = new InputHistory();
      inputHistory.add(new HistoryElement('a', [InputSource.SUGGESTED_WORD]));
      inputHistory.add(new HistoryElement('ab', [InputSource.SUGGESTED_WORD]));
      inputHistory.undo();
      inputHistory.undo();

      const result = inputHistory.lastInput();

      expect(result.value).toBe('');
    });
  });

  describe('isLastInputSuggested', () => {
    it('should return true if the last input is from suggestion', () => {
      const inputHistory = new InputHistory();
      inputHistory.add(new HistoryElement('a', [InputSource.SUGGESTED_WORD]));

      const result = inputHistory.isLastInputSuggested();

      expect(result).toBeTrue();
    });

    it('should return false if the last input is not from suggestion', () => {
      const inputHistory = new InputHistory();
      inputHistory.add(new HistoryElement('a', [InputSource.CHARACTER]));

      const result = inputHistory.isLastInputSuggested();

      expect(result).toBeFalse();
    });
  });

  describe('add', () => {
    it('should not record more than size limit (250)', () => {
      const inputHistory = new InputHistory();
      let value = '';
      for (let i = 0; i < 250; i++) {
        value += 'a';
        inputHistory.add(
          new HistoryElement(value, [InputSource.SUGGESTED_WORD]),
        );
      }
      for (let i = 0; i < 250; i++) {
        inputHistory.undo();
      }

      const result = inputHistory.lastInput();

      // The initial value should be discarded.
      expect(result.value).toBe('a');
    });
  });
});
