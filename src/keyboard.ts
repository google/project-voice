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

export type Key = {label: string; value: string[]};

export class Keyboard {
  constructor(public keys: Key[][]) {}
}

export const ALPHANUMERIC_SINGLE_ROW = new Keyboard([
  [
    {label: 'abc', value: ['abc']},
    {label: 'def', value: ['def']},
    {label: 'ghi', value: ['ghi']},
    {label: 'jkl', value: ['jkl']},
    {label: 'mno', value: ['mno']},
    {label: 'pqrs', value: ['pqrs']},
    {label: 'tuv', value: ['tuv']},
    {label: 'wxyz', value: ['wxyz']},
    {label: '0~9', value: ['01234', '56789']},
    {label: '.,!?', value: ['␣.,!?']},
  ],
]);

export const HIRAGANA_SINGLE_ROW = new Keyboard([
  [
    {label: 'あ', value: ['あいうえお', 'ぁぃぅぇぉ']},
    {label: 'か', value: ['かきくけこ', 'がぎぐげご']},
    {label: 'さ', value: ['さしすせそ', 'ざじずぜぞ']},
    {label: 'た', value: ['たちつてとっ', 'だぢづでど']},
    {label: 'な', value: ['なにぬねの']},
    {label: 'は', value: ['はひふへほ', 'ばびぶべぼ', 'ぱぴぷぺぽ']},
    {label: 'ま', value: ['まみむめも']},
    {label: 'や', value: ['やゆよ', 'ゃゅょ']},
    {label: 'ら', value: ['らりるれろ']},
    {label: 'わ', value: ['わをん']},
    {label: '゛゜', value: ['。、ー？！', '␣゛゜']},
  ],
]);
