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

import '../keyboards/pv-single-row-keyboard.js';

import {Meta, StoryObj} from '@storybook/web-components';
import {html} from 'lit';

import {PvSingleRowKeyboard} from '../keyboards/pv-single-row-keyboard.js';

const meta: Meta<PvSingleRowKeyboard> = {
  title: 'Components/pv-single-row-keyboard',
  component: 'pv-single-row-keyboard',
  argTypes: {
    keygrid: {control: 'object'},
  },
};

export default meta;
type Story = StoryObj<PvSingleRowKeyboard>;

export const Alphanumeric: Story = {
  render: () => html`
    <pv-alphanumeric-single-row-keyboard></pv-alphanumeric-single-row-keyboard>
  `,
};

export const Hiragana: Story = {
  render: () => html`
    <pv-hiragana-single-row-keyboard></pv-hiragana-single-row-keyboard>
  `,
};
