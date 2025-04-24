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

import '../keyboards/pv-qwerty-keyboard.js';

import {Meta, StoryObj} from '@storybook/web-components';
import {html} from 'lit';

import {PvQwertyKeyboard} from '../keyboards/pv-qwerty-keyboard.js';

const meta: Meta<PvQwertyKeyboard> = {
  title: 'Components/pv-qwerty-keyboard',
  component: 'pv-qwerty-keyboard',
  argTypes: {}, // No specific arg types needed for this component
};

export default meta;
type Story = StoryObj<PvQwertyKeyboard>;

export const Default: Story = {
  render: () => html` <pv-qwerty-keyboard></pv-qwerty-keyboard> `,
};
