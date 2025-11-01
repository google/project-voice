# Copyright 2024 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""The main page of Project VOICE app.
"""

import json
import os

import flask
from flask_cors import CORS
from flask_seasurf import SeaSurf

import macro

app = flask.Flask(__name__)
CORS(app)
csrf = SeaSurf(app)
app.secret_key = os.environ.get('SECRET_KEY') or 'localkey'


@app.route('/')
def Root():
  return flask.make_response(flask.render_template('index.jinja'))


@app.route('/run-macro', methods=['POST'])
@csrf.exempt  # Exempt from CSRF protection for iOS app access
def RunMacro():
  request = flask.request
  macro_id = request.form.get('id')
  user_inputs = json.loads(request.form.get('userInputs'))
  temperature = float(request.form.get('temperature'))
  model_id = request.form.get('model_id')

  # Debug logging
  print(f"[DEBUG] RunMacro called: macro_id={macro_id}, model_id={model_id}")
  print(f"[DEBUG] Text input: {user_inputs.get('text', '')[:50]}...")  # First 50 chars

  result = macro.RunMacro(macro_id, user_inputs, temperature, model_id)
  print(f"[DEBUG] Response length: {len(result)}")

  return result


if __name__ == '__main__':
  app.run(debug=True, host=os.environ.get('FLASK_HOST', '127.0.0.1'))
