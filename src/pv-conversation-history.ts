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

import {msg} from '@lit/localize';
import {css, html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';

@customElement('pv-conversation-history')
export class PvConversationHistory extends LitElement {
  @property({type: Array})
  history: [number, string][] = [];

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      overflow-y: scroll;
      padding-left: 0.5rem;
    }

    .turn {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    p {
      line-height: 1.2rem;
      margin: 0;
      max-width: 80%;
      padding: 0.5rem;
      width: fit-content;
    }

    .user {
      align-self: flex-end;
      background: var(--color-primary);
      border-bottom-left-radius: 1rem;
      border-bottom-right-radius: 1rem;
      border-top-left-radius: 1rem;
      border-top-right-radius: 0.25rem;
      color: var(--color-on-parimary);
    }

    .partner {
      align-self: flex-start;
      background: var(--color-secondary);
      border-bottom-left-radius: 1rem;
      border-bottom-right-radius: 1rem;
      border-top-left-radius: 0.25rem;
      border-top-right-radius: 1rem;
      color: var(--color-on-secondary);
    }

    header {
      align-items: center;
      display: flex;
      font-size: 1.2rem;
      font-weight: 500;
      gap: 0.5rem;
    }

    .icon {
      font-family: 'Material Symbols Outlined';
    }

    header .icon {
      font-size: 2rem;
    }
  `;

  protected render() {
    return html`<header>
        <span class="icon">communication</span>${msg('Conversation')}
      </header>
      ${this.history.map(
        turn =>
          html`<div class="turn">
            ${turn[1].split(',').map(item => {
              const [speakerTag, content] = item.split(':');
              const speaker = speakerTag.startsWith('UserOutput')
                ? 'user'
                : 'partner';
              return html`<p class=${speaker}>${content}</p>`;
            })}
          </div>`,
      )}`;
  }
}
