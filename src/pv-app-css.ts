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

import {css} from 'lit';

export const pvAppStyle = css`
  :host {
    display: flex;
  }

  .container {
    box-sizing: border-box;
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem;
    width: 100%;
  }

  .main {
    column-gap: 0.5rem;
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
  }

  .main textarea {
    width: 100%;
  }

  .keypad {
    flex: 1;
    min-height: 50vh;
  }

  .loader {
    align-items: center;
    background: color-mix(
      in srgb,
      var(--color-background) 80%,
      transparent 20%
    );
    display: flex;
    height: 100%;
    justify-content: center;
    left: 0;
    opacity: 0;
    pointer-events: none;
    position: absolute;
    top: 0;
    transition: 0.3s ease;
    width: 100%;
  }

  .loader.loading {
    opacity: 1;
  }

  /* Optimized only for iPad. May need to improve. */
  #form-id {
    height: 380px;
    width: 500px;
  }

  .form-section {
    margin: 1rem 0;
  }

  .suggestions {
    position: relative;
  }

  ul.word-suggestions,
  ul.sentence-suggestions {
    list-style: none;
    margin: 0.25rem 0;
    padding: 0;
  }

  ul.word-suggestions li {
    display: inline-block;
  }

  ul.word-suggestions li,
  ul.sentence-suggestions li {
    margin: 0.25rem 0.25rem 0.25rem 0;
  }

  @media screen and (min-height: 30rem) {
    ul.word-suggestions li {
      margin: 0.5rem 0.5rem 0.5rem 0;
    }

    ul.sentence-suggestions li {
      margin: 1rem 0.5rem 2rem 0;
    }

    ul.sentence-suggestions li.tight {
      margin: 0.5rem 0.5rem 0.5rem 0;
    }
  }

  @media screen and (min-height: 45rem) {
    ul.word-suggestions li {
      margin: 1rem 1rem 1rem 0;
    }
  }

  .stats {
    background-color: rgba(1, 1, 1, 0.0);
    border: solid rgba(96, 96, 96, 0.5);
    bottom: 4px;
    color: rgba(96, 96, 96, 0.5);
    cursor: pointer;"
    padding: 4px;
    position: absolute;
    right: 4px;
  }

  @media (prefers-color-scheme: dark) {
    .stats {
      background-color: rgba(1, 1, 1, 0.0);
      border: solid rgba(255, 255, 255, 0.5);
      color: rgba(255, 255, 255, 0.5);
    }
  }

  .language-name {
    background: var(--color-on-background);
    border-radius: 1rem;
    color: var(--color-background);
    display: none;
    font-size: 2rem;
    left: 50%;
    padding: 1rem;
    pointer-events: none;
    position: fixed;
    opacity: 0.8;
    top: 50%;
    transform: translate(-50%, -50%);
  }

  .language-name[active] {
    display: block;
  }

  .conversation-history-container {
    background: var(--color-surface);
    border-radius: 0.5rem;
    max-width: 30vw;
    overflow: scroll;
    padding: 0.5rem;
    width: 360px;
  }

  pv-sentence-type-selector {
    margin-bottom: 1rem;
  }
`;
