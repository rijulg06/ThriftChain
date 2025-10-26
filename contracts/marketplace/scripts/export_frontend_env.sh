#!/usr/bin/env bash
# Update frontend/.env.local with the latest on-chain IDs from testnet_ids.txt.

set -euo pipefail

# Resolve repository root based on this script's location.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

TESTNET_IDS_FILE="${REPO_ROOT}/contracts/marketplace/e2e-tests/testnet_ids.txt"
FRONTEND_ENV_FILE="${REPO_ROOT}/frontend/.env.local"

if [[ ! -f "${TESTNET_IDS_FILE}" ]]; then
  echo "error: unable to locate ${TESTNET_IDS_FILE}" >&2
  exit 1
fi

mkdir -p "$(dirname "${FRONTEND_ENV_FILE}")"
touch "${FRONTEND_ENV_FILE}"

# Map Move deployment IDs to Next.js environment variables.
MOVE_KEYS=(
  MARKETPLACE_PACKAGE_ID
  MARKETPLACE_OBJECT_ID
  ITEMCAP_OBJECT_ID
  CLOCK_OBJECT_ID
  OWNER_ADDRESS
)

ENV_KEYS=(
  NEXT_PUBLIC_THRIFTCHAIN_PACKAGE_ID
  NEXT_PUBLIC_MARKETPLACE_ID
  NEXT_PUBLIC_ITEM_CAP_ID
  NEXT_PUBLIC_CLOCK_ID
  NEXT_PUBLIC_MARKETPLACE_OWNER
)

# Extract values from testnet_ids.txt.
VALUES=()
missing_keys=()
for idx in "${!MOVE_KEYS[@]}"; do
  move_key="${MOVE_KEYS[${idx}]}"
  value=$(awk -F'"' -v key="${move_key}" '$1 ~ ("^" key "=") { print $2; exit }' "${TESTNET_IDS_FILE}")
  if [[ -z "${value}" ]]; then
    missing_keys+=("${move_key}")
    continue
  fi
  VALUES[${idx}]="${value}"
done

if (( ${#missing_keys[@]} > 0 )); then
  echo "warning: the following keys were not found in ${TESTNET_IDS_FILE}: ${missing_keys[*]}" >&2
fi

timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# Comment out existing blockchain env variables if present.
# Comment out existing blockchain env variables if present.
if [[ -s "${FRONTEND_ENV_FILE}" ]]; then
  export FRONTEND_ENV_FILE
  export TIMESTAMP="${timestamp}"
  TARGET_VARS=$(printf "%s," "${ENV_KEYS[@]}" | sed 's/,$//')
  export TARGET_VARS
  python3 <<'PY'
import os
from pathlib import Path

env_path = Path(os.environ["FRONTEND_ENV_FILE"])
env_keys = [key for key in os.environ["TARGET_VARS"].split(",") if key]
timestamp = os.environ["TIMESTAMP"]

lines = env_path.read_text().splitlines()
updated = []
for line in lines:
  stripped = line.lstrip()
  if not stripped:
    updated.append(line)
    continue
  for env_key in env_keys:
    if line.startswith(f"{env_key}="):
      updated.append(f"# {timestamp} {line}")
      break
  else:
    updated.append(line)

env_path.write_text("\n".join(updated) + "\n")
PY
fi

# Append the new values with timestamp header.
{
  echo ""
  echo "# Blockchain config updated ${timestamp}"
  for idx in "${!MOVE_KEYS[@]}"; do
    env_key="${ENV_KEYS[${idx}]}"
    value="${VALUES[${idx}]:-}"
    if [[ -n "${value}" ]]; then
      echo "${env_key}=${value}"
    else
      echo "# ${env_key}=<missing from testnet_ids.txt>"
    fi
  done
} >> "${FRONTEND_ENV_FILE}"

echo "Updated ${FRONTEND_ENV_FILE} with latest blockchain identifiers."