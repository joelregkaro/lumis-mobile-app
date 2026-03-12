#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

KEY_FILE="keystore.env"
if [[ ! -f "$KEY_FILE" ]]; then
  echo "Error: $KEY_FILE not found."
  echo "Copy keystore.env.example to keystore.env and set KEYSTORE_PASSWORD, KEY_PASSWORD, KEY_ALIAS (and optionally KEYSTORE_PATH)."
  exit 1
fi

# shellcheck source=/dev/null
set -a
source "$KEY_FILE"
set +a

for var in KEYSTORE_PASSWORD KEY_PASSWORD KEY_ALIAS; do
  if [[ -z "${!var}" ]]; then
    echo "Error: $var is not set in $KEY_FILE"
    exit 1
  fi
done

KEYSTORE_PATH="${KEYSTORE_PATH:-./release.keystore}"

echo "Generating JKS at: $KEYSTORE_PATH"
keytool -genkey -v \
  -storetype JKS \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass "$KEYSTORE_PASSWORD" \
  -keypass "$KEY_PASSWORD" \
  -alias "$KEY_ALIAS" \
  -keystore "$KEYSTORE_PATH" \
  -dname "CN=com.lumis.app, OU=, O=, L=, S=, C=US"

echo "Done. Keystore saved to $KEYSTORE_PATH (do not commit this file)."
