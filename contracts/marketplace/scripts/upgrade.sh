#!/usr/bin/env bash
# Upgrade ThriftChain smart contract and update frontend environment variables
# Usage: ./upgrade.sh

set -euo pipefail

# Resolve paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MARKETPLACE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
DEVNET_IDS_FILE="${MARKETPLACE_DIR}/e2e-tests/devnet_ids.txt"
FRONTEND_ENV_FILE="${REPO_ROOT}/frontend/.env.local"

# Output file for upgrade logs
UPGRADE_LOG="${MARKETPLACE_DIR}/upgrade.log"

echo "================================================"
echo "ThriftChain Smart Contract Upgrade"
echo "================================================"
echo ""

# Verify devnet_ids.txt exists
if [[ ! -f "${DEVNET_IDS_FILE}" ]]; then
  echo "❌ Error: ${DEVNET_IDS_FILE} not found"
  echo ""
  echo "You must deploy the contract first before upgrading."
  echo "Run: ./scripts/deploy.sh"
  exit 1
fi

# Extract existing deployment IDs
echo "📋 Reading existing deployment..."

# Try both key names for backward compatibility
UPGRADE_CAP_ID=$(awk -F'"' '/^UPGRADE_CAP=/ { print $2; exit }' "${DEVNET_IDS_FILE}")
if [[ -z "${UPGRADE_CAP_ID}" ]]; then
  UPGRADE_CAP_ID=$(awk -F'"' '/^UPGRADE_CAP_OBJECT_ID=/ { print $2; exit }' "${DEVNET_IDS_FILE}")
fi

OLD_PACKAGE_ID=$(awk -F'"' '/^MARKETPLACE_PACKAGE_ID=/ { print $2; exit }' "${DEVNET_IDS_FILE}")
MARKETPLACE_ID=$(awk -F'"' '/^MARKETPLACE_OBJECT_ID=/ { print $2; exit }' "${DEVNET_IDS_FILE}")
ITEMCAP_ID=$(awk -F'"' '/^ITEMCAP_OBJECT_ID=/ { print $2; exit }' "${DEVNET_IDS_FILE}")
OWNER_ADDRESS=$(awk -F'"' '/^OWNER_ADDRESS=/ { print $2; exit }' "${DEVNET_IDS_FILE}")

# Validate required IDs
if [[ -z "${UPGRADE_CAP_ID}" ]]; then
  echo "❌ Error: UPGRADE_CAP not found in ${DEVNET_IDS_FILE}"
  echo ""
  echo "The UpgradeCap is required to upgrade the contract."
  echo "Make sure you deployed with a version that saves the UpgradeCap ID."
  exit 1
fi

if [[ -z "${OLD_PACKAGE_ID}" ]]; then
  echo "❌ Error: MARKETPLACE_PACKAGE_ID not found in ${DEVNET_IDS_FILE}"
  exit 1
fi

echo "   Current Package ID: ${OLD_PACKAGE_ID}"
echo "   UpgradeCap ID: ${UPGRADE_CAP_ID}"
echo ""

# Change to marketplace directory
cd "${MARKETPLACE_DIR}"

# Step 1: Build the contract
echo "📦 Building contract..."
echo ""
if ! sui move build 2>&1 | tee "${UPGRADE_LOG}"; then
  echo "❌ Build failed. Check ${UPGRADE_LOG} for details."
  exit 1
fi
echo ""
echo "✅ Build successful"
echo ""

# Step 2: Upgrade the contract
echo "🚀 Upgrading contract on Sui network..."
echo "   Using UpgradeCap: ${UPGRADE_CAP_ID}"
echo "   Gas budget: 100000000 MIST"
echo ""

if ! sui client upgrade --upgrade-capability "${UPGRADE_CAP_ID}" --gas-budget 100000000 2>&1 | tee -a "${UPGRADE_LOG}"; then
  echo "❌ Upgrade failed. Check ${UPGRADE_LOG} for details."
  exit 1
fi

echo ""
echo "✅ Contract upgraded successfully"
echo ""

# Step 3: Parse the upgrade output
echo "📝 Parsing upgrade output..."

# Extract new Package ID from upgrade output
NEW_PACKAGE_ID=$(grep "PackageID:" "${UPGRADE_LOG}" | sed 's/.*PackageID: //' | sed 's/ .*//' | tail -1)

# Validate extracted values
if [[ -z "${NEW_PACKAGE_ID}" ]]; then
  echo "❌ Failed to extract new PACKAGE_ID from upgrade output"
  echo "Please check ${UPGRADE_LOG} and manually update the package ID"
  exit 1
fi

if [[ "${NEW_PACKAGE_ID}" == "${OLD_PACKAGE_ID}" ]]; then
  echo "⚠️  Warning: New package ID is the same as old package ID"
  echo "   This might indicate the upgrade didn't work as expected"
fi

echo "   ✅ Old Package ID: ${OLD_PACKAGE_ID}"
echo "   ✅ New Package ID: ${NEW_PACKAGE_ID}"
echo ""
echo "   ℹ️  Shared objects remain unchanged:"
echo "      Marketplace ID: ${MARKETPLACE_ID}"
echo "      ItemCap ID: ${ITEMCAP_ID}"
echo ""

# Step 4: Update devnet_ids.txt
echo "💾 Updating devnet_ids.txt..."

# Create backup of existing file
BACKUP_FILE="${DEVNET_IDS_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
cp "${DEVNET_IDS_FILE}" "${BACKUP_FILE}"
echo "   📋 Backup created: ${BACKUP_FILE}"

# Read all existing values
CLOCK_OBJECT_ID=$(awk -F'"' '/^CLOCK_OBJECT_ID=/ { print $2; exit }' "${DEVNET_IDS_FILE}")

# Write updated devnet_ids.txt
cat > "${DEVNET_IDS_FILE}" <<EOF
#!/bin/bash

# Devnet Deployment IDs for ThriftChain Marketplace
# Generated on: $(date)
# Network: Devnet
# Last Upgraded: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
# Previous Package ID: ${OLD_PACKAGE_ID}
# Transaction Digest: $(grep "Digest:" "${UPGRADE_LOG}" | head -1 | awk '{print $2}')

# Package and Object IDs
MARKETPLACE_PACKAGE_ID="${NEW_PACKAGE_ID}"
MARKETPLACE_OBJECT_ID="${MARKETPLACE_ID}"
ITEMCAP_OBJECT_ID="${ITEMCAP_ID}"
CLOCK_OBJECT_ID="${CLOCK_OBJECT_ID}"
UPGRADE_CAP="${UPGRADE_CAP_ID}"
OWNER_ADDRESS="${OWNER_ADDRESS}"

# Module name
MODULE_NAME="thriftchain"

# Export for use in other scripts
export MARKETPLACE_PACKAGE_ID
export MARKETPLACE_OBJECT_ID
export ITEMCAP_OBJECT_ID
export CLOCK_OBJECT_ID
export UPGRADE_CAP
export OWNER_ADDRESS
export MODULE_NAME

# Usage notes:
# - Source this file in your test scripts: source devnet_ids.txt
# - These IDs are specific to the devnet deployment
# - If you upgrade the package, update MARKETPLACE_PACKAGE_ID and UPGRADE_CAP
# - CLOCK_OBJECT_ID (0x6) is standard across all Sui networks

# Upgrade History
# - ${OLD_PACKAGE_ID} -> ${NEW_PACKAGE_ID} on $(date -u +"%Y-%m-%d %H:%M:%S UTC")

EOF

echo "   ✅ Updated: ${DEVNET_IDS_FILE}"
echo ""

# Step 5: Update frontend .env.local
echo "🔧 Updating frontend/.env.local..."

mkdir -p "$(dirname "${FRONTEND_ENV_FILE}")"
touch "${FRONTEND_ENV_FILE}"

timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# Comment out existing NEXT_PUBLIC_THRIFTCHAIN_PACKAGE_ID
if [[ -s "${FRONTEND_ENV_FILE}" ]]; then
  TMP_FILE="${FRONTEND_ENV_FILE}.tmp"
  while IFS= read -r line; do
    if [[ "${line}" =~ ^NEXT_PUBLIC_THRIFTCHAIN_PACKAGE_ID= ]]; then
      echo "# ${timestamp} [UPGRADED] ${line}" >> "${TMP_FILE}"
    else
      echo "${line}" >> "${TMP_FILE}"
    fi
  done < "${FRONTEND_ENV_FILE}"
  mv "${TMP_FILE}" "${FRONTEND_ENV_FILE}"
fi

# Append new package ID
{
  echo ""
  echo "# Contract upgraded ${timestamp}"
  echo "# Previous: ${OLD_PACKAGE_ID}"
  echo "NEXT_PUBLIC_THRIFTCHAIN_PACKAGE_ID=${NEW_PACKAGE_ID}"
} >> "${FRONTEND_ENV_FILE}"

echo "   ✅ Updated: ${FRONTEND_ENV_FILE}"
echo ""

# Step 6: Display upgrade summary
echo "================================================"
echo "✅ Upgrade Complete!"
echo "================================================"
echo ""
echo "📋 Summary:"
echo "   Old Package ID: ${OLD_PACKAGE_ID}"
echo "   New Package ID: ${NEW_PACKAGE_ID}"
echo ""
echo "   Unchanged Objects:"
echo "   - Marketplace ID: ${MARKETPLACE_ID}"
echo "   - ItemCap ID:     ${ITEMCAP_ID}"
echo "   - UpgradeCap ID:  ${UPGRADE_CAP_ID}"
echo "   - Owner Address:  ${OWNER_ADDRESS}"
echo ""
echo "📁 Files Updated:"
echo "   - ${DEVNET_IDS_FILE}"
echo "   - ${FRONTEND_ENV_FILE}"
echo "   - ${UPGRADE_LOG}"
echo ""
echo "📁 Backup Created:"
echo "   - ${BACKUP_FILE}"
echo ""
echo "🎯 Next Steps:"
echo "   1. Verify the upgraded contract on Sui Explorer:"
echo "      https://suiscan.xyz/testnet/object/${NEW_PACKAGE_ID}"
echo "   2. Test the marketplace (should still work with same ID):"
echo "      https://suiscan.xyz/testnet/object/${MARKETPLACE_ID}"
echo "   3. Restart your frontend dev server to load new package ID"
echo "   4. Run e2e tests to verify functionality:"
echo "      cd e2e-tests && ./run_all_tests.sh"
echo ""
echo "⚠️  Important Notes:"
echo "   - All existing items, offers, and escrows are preserved"
echo "   - The marketplace shared object remains at the same address"
echo "   - Users don't need to do anything - the upgrade is seamless"
echo "   - Test thoroughly before using in production!"
echo ""

