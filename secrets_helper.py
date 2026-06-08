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
"""Project Voice Secrets Helper Module.

This module manages secret retrieval.
"""

import os
import logging
import google.auth
from google.cloud import secretmanager

logger = logging.getLogger(__name__)


def get_secret(key_name: str) -> str | None:
  """Gets a secret from environment variables or Secret Manager.

    Args:
        key_name: The name of the secret key.

    Returns:
        The secret value as a string, or None if not found.
    """
  # 1. Try environment variable first
  val = os.environ.get(key_name)
  if val:
    logger.info(f"Retrieved secret {key_name} from environment variables.")
    return val

  # 2. Fall back to Secret Manager
  try:
    _, project_id = google.auth.default()
    if project_id:
      client = secretmanager.SecretManagerServiceClient()
      name = f"projects/{project_id}/secrets/{key_name}/versions/latest"
      response = client.access_secret_version(request={"name": name})
      secret_value = response.payload.data.decode("UTF-8")
      logger.info(f"Retrieved secret {key_name} from Secret Manager.")
      return secret_value
    else:
      logger.warning("Could not determine project ID for Secret Manager.")
  except Exception as e:
    logger.warning(f"Failed to get secret {key_name} from Secret Manager: {e}")

  return None
