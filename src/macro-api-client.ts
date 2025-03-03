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

import {RUN_MACRO_ENDPOINT_URL} from './constants.js';

/**
 * Extracts suggestions from a response from LLM.
 * @param response A response from LLM
 * @returns A list of suggestions
 */
function parseResponse(response: string) {
  // Quick fix to remove '\n' in a suggestion.
  // In theory, this fix doesn't work when a suggestion actually ends with '\\\n'.
  // But we have yet to encounter such a situation.
  response = response.replaceAll('\\\n', '');
  return response
    .split('\n')
    .map(text => text.trim())
    .filter(text => text.match(/^[0-9]+\./))
    .map(text => text.replace(/^\d+\.\s?/, ''));
}

export class MacroApiClient {
  private fetchAbortController: AbortController | null = null;

  /**
   * Aborts fetching results from the endpoint.
   */
  abortFetch() {
    this.fetchAbortController?.abort();
  }

  /**
   * Fetches suggestions for the given input.
   * @param textValue Input text
   * @param language Input text's language
   * @param model Language model to use
   * @param context Context data
   * @returns A promise for a set of lists of result strings or null if the request is aborted / failed
   */
  async fetchSuggestions(
    textValue: string,
    language: string,
    model: string,
    // TODO: look into if we can make this optional.
    context: {
      sentenceMacroId: string;
      wordMacroId: string;
      persona: string;
    },
  ) {
    this.fetchAbortController?.abort();
    this.fetchAbortController = new AbortController();
    const abortSignal = this.fetchAbortController.signal;

    const wordMacroId = context.wordMacroId;

    const num = '5';

    const userInputs = {
      language, // [[language]]
      num, // [[num]]
      text: textValue, // [[text]]
      persona: context.persona,
    };

    const wordsFetch = MacroApiClient.fetchSuggestion(
      userInputs,
      abortSignal,
      wordMacroId,
      model,
    );

    const sentenceMacroId = context.sentenceMacroId;

    const sentencesFetch = MacroApiClient.fetchSuggestion(
      userInputs,
      abortSignal,
      sentenceMacroId,
      model,
    );

    const result = Promise.all([sentencesFetch, wordsFetch]).catch(err => {
      if (err instanceof DOMException) {
        console.log('Request was aborted by user:', userInputs);
      } else {
        alert(`Failed to access Gemini server or ${err || 'something'}.`);
      }
      return null;
    });

    return result;
  }

  private static async fetchSuggestion(
    userInputs: {[key: string]: string},
    abortSignal: AbortSignal,
    macroId: string,
    model: string,
    temperature = 0.0,
  ): Promise<string[]> {
    const text = await MacroApiClient.fetchMacro(
      userInputs,
      abortSignal,
      macroId,
      model,
      temperature,
    );
    return parseResponse(text);
  }

  /**
   * Fetches a response text for the given input and macro.
   * @param userInputs Input text
   * @param abortSignal Abort signal for the request
   * @param macroId Macro ID
   * @param model Language model to use
   * @param temperature Temperature parameter
   * @returns A promise for a response text
   */
  public static async fetchMacro(
    userInputs: {[key: string]: string},
    abortSignal: AbortSignal | null,
    macroId: string,
    model: string,
    temperature: number,
  ): Promise<string> {
    // TODO: Remove the following debug logging.
    console.log(`macroId: ${macroId}, model: ${model}`);
    const formData = new FormData();
    formData.append('id', macroId);
    formData.append('userInputs', JSON.stringify(userInputs));
    formData.append('temperature', `${temperature}`);
    formData.append('model_id', model);
    formData.append('_csrf_token', document.body.dataset.csrfToken || '');

    const extractText = (data: unknown): string => {
      if (!(data instanceof Object && 'messages' in data)) {
        throw new Error("API response doesn't have messages");
      }
      if (!Array.isArray(data.messages) || data.messages.length === 0) {
        return '';
      }
      return data.messages[0].text;
    };

    const text = fetch(RUN_MACRO_ENDPOINT_URL, {
      method: 'POST',
      body: formData,
      signal: abortSignal,
    })
      .then(res => res.json())
      .then(extractText);
    return text;
  }
}

export const TEST_ONLY = {parseResponse};
