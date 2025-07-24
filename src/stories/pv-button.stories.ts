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

import '../pv-button.js';

import type {Meta, StoryObj} from '@storybook/web-components-vite';
import {html} from 'lit';

const meta = {
  title: 'Components/pv-button',
  component: 'pv-button',
  tags: ['autodocs'],
  argTypes: {
    label: {control: 'text'},
    active: {control: 'boolean'},
    rounded: {control: 'boolean'},
  },
  render: args => {
    return html`<pv-button
      label=${args.label}
      ?active=${args.active}
      ?rounded=${args.rounded}
    ></pv-button>`;
  },
} satisfies Meta;

export default meta;

export const Default = {
  args: {
    label: 'Button',
    active: false,
    rounded: false,
  },
} satisfies StoryObj;

export const Active = {
  args: {
    label: 'Active',
    active: true,
    rounded: false,
  },
} satisfies StoryObj;

export const Rounded = {
  args: {
    label: 'Rounded',
    active: false,
    rounded: true,
  },
} satisfies StoryObj;
