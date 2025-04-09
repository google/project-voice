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
    background: var(--app-background-color);
    display: flex;
    padding: 0.5rem;
  }

  .main {
    column-gap: 0.5rem;
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
    padding-left: 1rem;
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
      var(--app-background-color) 80%,
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
    min-height: 5rem;
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

  .language-name {
    background: var(--app-color);
    border-radius: 1rem;
    color: var(--app-background-color);
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
`;
