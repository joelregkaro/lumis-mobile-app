#!/usr/bin/env bash
# Generates credentials.json from keystore.env for EAS Build (local credentials).
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

KEY_FILE="keystore.env"
if [[ ! -f "$KEY_FILE" ]]; then
  echo "Error: $KEY_FILE not found. Copy keystore.env.example to keystore.env and set values."
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
if [[ ! -f "$KEYSTORE_PATH" ]]; then
  echo "Error: Keystore file not found at $KEYSTORE_PATH"
  exit 1
fi

CREDENTIALS_JSON="credentials.json"
cat > "$CREDENTIALS_JSON" << EOF
{
  "android": {
    "keystore": {
      "keystorePath": "$KEYSTORE_PATH",
      "keystorePassword": "$KEYSTORE_PASSWORD",
      "keyAlias": "$KEY_ALIAS",
      "keyPassword": "$KEY_PASSWORD"
    }
  }
}
EOF

echo "Wrote $CREDENTIALS_JSON (used by EAS Build with credentialsSource: local)."
