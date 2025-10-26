#!/usr/bin/env bash
# Deploy ThriftChain smart contract and update frontend environment variables
# Usage: ./deploy.sh

set -euo pipefail

# Resolve paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MARKETPLACE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
DEVNET_IDS_FILE="${MARKETPLACE_DIR}/e2e-tests/devnet_ids.txt"
FRONTEND_ENV_FILE="${REPO_ROOT}/frontend/.env.local"

# Output file for deployment logs
DEPLOY_LOG="${MARKETPLACE_DIR}/deploy.log"

echo "================================================"
echo "ThriftChain Smart Contract Deployment"
echo "================================================"
echo ""

# Change to marketplace directory
cd "${MARKETPLACE_DIR}"

# Step 1: Build the contract
echo "📦 Building contract..."
echo ""
if ! sui move build 2>&1 | tee "${DEPLOY_LOG}"; then
  echo "❌ Build failed. Check ${DEPLOY_LOG} for details."
  exit 1
fi
echo ""
echo "✅ Build successful"
echo ""

# Step 2: Publish the contract
echo "🚀 Publishing contract to Sui network..."
echo "   Gas budget: 100000000 MIST"
echo ""

if ! sui client publish --gas-budget 100000000 2>&1 | tee -a "${DEPLOY_LOG}"; then
  echo "❌ Publish failed. Check ${DEPLOY_LOG} for details."
  exit 1
fi

echo ""
echo "✅ Contract published successfully"
echo ""

# Step 3: Parse the deployment output
echo "📝 Parsing deployment output..."

# Extract Package ID
PACKAGE_ID=$(grep "PackageID:" "${DEPLOY_LOG}" | sed 's/.*PackageID: //' | sed 's/ .*//')

# Extract Marketplace ID (Shared object with thriftchain::Marketplace)
MARKETPLACE_ID=$(grep -B 3 "thriftchain::Marketplace" "${DEPLOY_LOG}" | grep "ObjectID:" | sed 's/.*ObjectID: //' | sed 's/ .*//')

# Extract ItemCap ID (Account owned object with thriftchain::ItemCap)
ITEMCAP_ID=$(grep -B 3 "thriftchain::ItemCap" "${DEPLOY_LOG}" | grep "ObjectID:" | sed 's/.*ObjectID: //' | sed 's/ .*//')

# Extract UpgradeCap ID (optional, for future upgrades)
UPGRADE_CAP_ID=$(grep -B 3 "package::UpgradeCap" "${DEPLOY_LOG}" | grep "ObjectID:" | sed 's/.*ObjectID: //' | sed 's/ .*//')

# Extract sender address (marketplace owner)
OWNER_ADDRESS=$(grep "Sender:" "${DEPLOY_LOG}" | head -1 | sed 's/.*Sender: //' | sed 's/ .*//')

# Clock object ID (standard Sui clock)
CLOCK_OBJECT_ID="0x6"

# Validate extracted values
if [[ -z "${PACKAGE_ID}" ]]; then
  echo "❌ Failed to extract PACKAGE_ID"
  exit 1
fi

if [[ -z "${MARKETPLACE_ID}" ]]; then
  echo "❌ Failed to extract MARKETPLACE_ID"
  exit 1
fi

if [[ -z "${ITEMCAP_ID}" ]]; then
  echo "❌ Failed to extract ITEMCAP_ID"
  exit 1
fi

if [[ -z "${OWNER_ADDRESS}" ]]; then
  echo "❌ Failed to extract OWNER_ADDRESS"
  exit 1
fi

echo "   ✅ Package ID: ${PACKAGE_ID}"
echo "   ✅ Marketplace ID: ${MARKETPLACE_ID}"
echo "   ✅ ItemCap ID: ${ITEMCAP_ID}"
echo "   ✅ Owner Address: ${OWNER_ADDRESS}"
if [[ -n "${UPGRADE_CAP_ID}" ]]; then
  echo "   ✅ UpgradeCap ID: ${UPGRADE_CAP_ID}"
fi
echo ""

# Step 4: Create/update devnet_ids.txt
echo "💾 Updating devnet_ids.txt..."

mkdir -p "$(dirname "${DEVNET_IDS_FILE}")"

# Create backup of existing file if it exists
if [[ -f "${DEVNET_IDS_FILE}" ]]; then
  BACKUP_FILE="${DEVNET_IDS_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
  cp "${DEVNET_IDS_FILE}" "${BACKUP_FILE}"
  echo "   📋 Backup created: ${BACKUP_FILE}"
fi

# Write new devnet_ids.txt
cat > "${DEVNET_IDS_FILE}" <<EOF
#!/bin/bash

# Devnet Deployment IDs for ThriftChain Marketplace
# Generated on: $(date)
# Network: Devnet
# Transaction Digest: $(grep "Digest:" "${DEPLOY_LOG}" | head -1 | awk '{print $2}')

# Package and Object IDs
MARKETPLACE_PACKAGE_ID="${PACKAGE_ID}"
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

EOF

echo "   ✅ Updated: ${DEVNET_IDS_FILE}"
echo ""

# Step 5: Update frontend .env.local
echo "🔧 Updating frontend/.env.local..."

# Check if publish_thriftchain.sh exists
PUBLISH_SCRIPT="${SCRIPT_DIR}/publish_thriftchain.sh"
if [[ -f "${PUBLISH_SCRIPT}" ]]; then
  # Use existing script to update env
  bash "${PUBLISH_SCRIPT}"
else
  # Fallback: Update env directly
  mkdir -p "$(dirname "${FRONTEND_ENV_FILE}")"
  touch "${FRONTEND_ENV_FILE}"
  
  timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  
  # Comment out existing blockchain vars
  if [[ -s "${FRONTEND_ENV_FILE}" ]]; then
    # Create temporary file
    TMP_FILE="${FRONTEND_ENV_FILE}.tmp"
    while IFS= read -r line; do
      if [[ "${line}" =~ ^NEXT_PUBLIC_THRIFTCHAIN_ ]] || \
         [[ "${line}" =~ ^NEXT_PUBLIC_MARKETPLACE_ ]] || \
         [[ "${line}" =~ ^NEXT_PUBLIC_ITEM_CAP_ ]] || \
         [[ "${line}" =~ ^NEXT_PUBLIC_CLOCK_ ]]; then
        echo "# ${timestamp} ${line}" >> "${TMP_FILE}"
      else
        echo "${line}" >> "${TMP_FILE}"
      fi
    done < "${FRONTEND_ENV_FILE}"
    mv "${TMP_FILE}" "${FRONTEND_ENV_FILE}"
  fi
  
  # Append new values
  {
    echo ""
    echo "# Blockchain config updated ${timestamp}"
    echo "NEXT_PUBLIC_THRIFTCHAIN_PACKAGE_ID=${PACKAGE_ID}"
    echo "NEXT_PUBLIC_MARKETPLACE_ID=${MARKETPLACE_ID}"
    echo "NEXT_PUBLIC_ITEM_CAP_ID=${ITEMCAP_ID}"
    echo "NEXT_PUBLIC_CLOCK_ID=${CLOCK_OBJECT_ID}"
    echo "NEXT_PUBLIC_MARKETPLACE_OWNER=${OWNER_ADDRESS}"
  } >> "${FRONTEND_ENV_FILE}"
  
  echo "   ✅ Updated: ${FRONTEND_ENV_FILE}"
fi

echo ""
echo "================================================"
echo "✅ Deployment Complete!"
echo "================================================"
echo ""
echo "📋 Summary:"
echo "   Package ID:     ${PACKAGE_ID}"
echo "   Marketplace ID: ${MARKETPLACE_ID}"
echo "   ItemCap ID:     ${ITEMCAP_ID}"
echo "   Owner Address:  ${OWNER_ADDRESS}"
echo ""
echo "📁 Files Updated:"
echo "   - ${DEVNET_IDS_FILE}"
echo "   - ${FRONTEND_ENV_FILE}"
echo "   - ${DEPLOY_LOG}"
echo ""
echo "🎯 Next Steps:"
echo "   1. Verify the contract on Sui Explorer:"
echo "      https://suiscan.xyz/testnet/object/${PACKAGE_ID}"
echo "   2. Test the marketplace:"
echo "      https://suiscan.xyz/testnet/object/${MARKETPLACE_ID}"
echo "   3. Restart your frontend dev server to load new env vars"
echo ""

