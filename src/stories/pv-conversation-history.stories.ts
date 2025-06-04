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

import '../pv-conversation-history.js';

import type {Meta, StoryObj} from '@storybook/web-components';
import {html} from 'lit';

import {PvConversationHistory} from '../pv-conversation-history.js';

const meta: Meta<PvConversationHistory> = {
  title: 'Corp/PvConversationHistory',
  tags: ['autodocs'],
  component: 'pv-conversation-history', // The custom element tag
  argTypes: {
    history: {
      control: 'object',
      description:
        'Array of conversation turns. Each turn is [turnId, turnContent]. turnContent is a comma-separated string of "SpeakerTag:Utterance".',
    },
  },
  render: args =>
    html`<pv-conversation-history
      .history=${args.history}
    ></pv-conversation-history>`,
};

export default meta;
type Story = StoryObj<PvConversationHistory>;

export const Empty: Story = {
  args: {
    history: [],
  },
};

export const SingleTurn: Story = {
  args: {
    history: [[0, 'UserOutput:Hello there!']],
  },
};

export const SingleTurnMultiUtterance: Story = {
  args: {
    history: [
      [
        0,
        'UserOutput:Hello there!,PartnerOutput:Hi! How can I help you today?',
      ],
    ],
  },
};

export const LongConversation: Story = {
  args: {
    history: [
      [0, 'UserOutput:Hi, I need help with my account.'],
      [
        1,
        'PartnerOutput:Hello! I can certainly help. What seems to be the problem?',
      ],
      [
        2,
        'UserOutput:I cannot log in. It says my password is incorrect, but I am sure it is right.',
      ],
      [
        3,
        'PartnerOutput:Okay, let us try resetting it. Have you tried the "Forgot Password" link?',
      ],
      [4, 'UserOutput:Yes, but I did not receive the reset email.'],
      [
        5,
        'PartnerOutput:Hmm, let me check your account details. Can you confirm your email address?',
      ],
      [6, 'UserOutput:It is example@email.com'],
      [
        7,
        'PartnerOutput:Thanks. It looks like the email might be going to your spam folder. Could you check there?',
      ],
      [8, 'UserOutput:Ah, you are right! Found it. Thanks!'],
      [9, 'PartnerOutput:Great! Let me know if you need further assistance.'],
      [10, 'UserOutput:Will do, thanks again!'],
    ],
  },
  // Add some height to the container to demonstrate scrolling
  decorators: [story => html`<div style="height: 300px;">${story()}</div>`],
};
