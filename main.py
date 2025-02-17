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
  return flask.make_response(flask.render_template('index.html'))


@app.route('/run-macro', methods=['POST'])
def RunMacro():
  request = flask.request
  macro_id = request.form.get('id')
  user_inputs = json.loads(request.form.get('userInputs'))
  temperature = float(request.form.get('temperature'))
  model_id = request.form.get('model_id')

  return macro.RunMacro(macro_id, user_inputs, temperature, model_id)


if __name__ == '__main__':
  app.run(debug=True, host='127.0.0.1')
