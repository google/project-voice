import '../pv-button.js';

import type {Meta, StoryObj} from '@storybook/web-components';
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
