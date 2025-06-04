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

import '../pv-expand-keypad.js';

import {Meta, StoryObj} from '@storybook/web-components';
import {html} from 'lit';

import {
  CharacterSelectEvent,
  PvExpandKeypadElement,
} from '../pv-expand-keypad.js';

const meta: Meta<PvExpandKeypadElement> = {
  title: 'Components/pv-expand-keypad',
  component: 'pv-expand-keypad',
  argTypes: {
    label: {control: 'text'},
    value: {control: 'object'},
    open: {control: 'boolean'},
    expandAtOrigin: {control: 'boolean'},
  },
  render: args => html`
    <pv-expand-keypad
      .label=${args.label}
      .value=${args.value}
      ?open=${args.open}
      ?expandAtOrigin=${args.expandAtOrigin}
      @character-select=${(e: CharacterSelectEvent) => {
        console.log('character-select', e.detail);
      }}
      @keypad-handler-click=${(e: CharacterSelectEvent) => {
        console.log('keypad-handler-click', e.detail);
      }}
    ></pv-expand-keypad>
  `,
};

export default meta;
type Story = StoryObj<PvExpandKeypadElement>;

export const Default: Story = {
  args: {
    label: 'keypad',
    value: ['abc', 'def', 'ghi'],
    open: false,
    expandAtOrigin: false,
  },
};
