#!/bin/bash

# TC-ESCROW-001: Buyer confirms item received
# Expected Result: Escrow released to seller, item marked as sold

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../devnet_ids.txt"

echo "🧪 TC-ESCROW-001: Buyer confirms item received"
echo "Expected Result: Escrow released to seller"
echo ""

# This test requires:
# 1. An existing item (from seller)
# 2. An active offer from buyer
# 3. An active escrow (offer accepted by seller)

SELLER="upbeat-spodumene"
BUYER="nostalgic-ruby"

echo "📋 Test Setup:"
echo "  Seller: $SELLER"
echo "  Buyer:  $BUYER"
echo ""

# Save original address
ORIGINAL=$(sui client active-address 2>/dev/null)

# Step 1: Create item as seller
echo "📝 Step 1: Creating item as SELLER..."
sui client switch --address $SELLER > /dev/null 2>&1

ITEM_RESULT=$(sui client call \
    --package "$MARKETPLACE_PACKAGE_ID" \
    --module "$MODULE_NAME" \
    --function "create_item" \
    --args "$MARKETPLACE_OBJECT_ID" \
           "$ITEMCAP_OBJECT_ID" \
           "Test Item for Escrow Confirm" \
           "A test item for escrow confirmation testing" \
           "10000000000" \
           "Electronics" \
           '["test", "escrow", "electronics"]' \
           '["test_image_escrow"]' \
           "Good" \
           "Test Brand" \
           "Medium" \
           "Black" \
           "Plastic" \
           "$CLOCK_OBJECT_ID" \
    --gas-budget 100000000 \
    2>&1)

if echo "$ITEM_RESULT" | grep -q "Status: Success"; then
    ITEM_ID=$(echo "$ITEM_RESULT" | grep "item_id" | grep -o '0x[a-f0-9]\{64\}' | head -1)
    echo "✅ Item created: $ITEM_ID"
else
    echo "❌ Failed to create item"
    sui client switch --address "$ORIGINAL" > /dev/null 2>&1
    exit 1
fi

# Step 2: Create offer as buyer
echo ""
echo "💰 Step 2: Making offer as BUYER..."
sui client switch --address $BUYER > /dev/null 2>&1

OFFER_RESULT=$(sui client call \
    --package "$MARKETPLACE_PACKAGE_ID" \
    --module "$MODULE_NAME" \
    --function "create_offer_by_id" \
    --args "$MARKETPLACE_OBJECT_ID" \
           "$ITEM_ID" \
           "8000000000" \
           "Test offer for escrow" \
           "24" \
           "$CLOCK_OBJECT_ID" \
    --gas-budget 100000000 \
    2>&1)

if echo "$OFFER_RESULT" | grep -q "Status: Success"; then
    OFFER_ID=$(echo "$OFFER_RESULT" | grep "offer_id" | grep -o '0x[a-f0-9]\{64\}' | head -1)
    echo "✅ Offer created: $OFFER_ID"
else
    echo "❌ Offer creation failed"
    sui client switch --address "$ORIGINAL" > /dev/null 2>&1
    exit 1
fi

# Step 3: Accept offer as seller (creates escrow)
echo ""
echo "✅ Step 3: Accepting offer as SELLER (creates escrow)..."
sui client switch --address $SELLER > /dev/null 2>&1

ACCEPT_RESULT=$(sui client call \
    --package "$MARKETPLACE_PACKAGE_ID" \
    --module "$MODULE_NAME" \
    --function "accept_offer_by_id" \
    --args "$MARKETPLACE_OBJECT_ID" \
           "$OFFER_ID" \
           "$ITEM_ID" \
           "$CLOCK_OBJECT_ID" \
    --gas-budget 100000000 \
    2>&1)

if echo "$ACCEPT_RESULT" | grep -q "Status: Success"; then
    ESCROW_ID=$(echo "$ACCEPT_RESULT" | grep "escrow_id" | grep -o '0x[a-f0-9]\{64\}' | head -1)
    echo "✅ Escrow created: $ESCROW_ID"
else
    echo "❌ Offer acceptance failed"
    sui client switch --address "$ORIGINAL" > /dev/null 2>&1
    exit 1
fi

# Step 4: Buyer confirms delivery (THE ACTUAL TEST)
echo ""
echo "📦 Step 4: BUYER confirms delivery (releases escrow)..."
sui client switch --address $BUYER > /dev/null 2>&1

CONFIRM_RESULT=$(sui client call \
    --package "$MARKETPLACE_PACKAGE_ID" \
    --module "$MODULE_NAME" \
    --function "confirm_delivery_by_id" \
    --args "$MARKETPLACE_OBJECT_ID" \
           "$ESCROW_ID" \
           "$ITEM_ID" \
           "$CLOCK_OBJECT_ID" \
    --gas-budget 100000000 \
    2>&1)

echo ""
if echo "$CONFIRM_RESULT" | grep -q "Status: Success"; then
    echo "✅ TC-ESCROW-001 PASSED: Buyer confirmed delivery, escrow released to seller"
    echo ""
    echo "📋 Summary:"
    echo "  - Item ID:   $ITEM_ID"
    echo "  - Offer ID:  $OFFER_ID"
    echo "  - Escrow ID: $ESCROW_ID"
    echo "  - Status:    Completed (escrow released)"
    echo ""
    echo "💾 IDs for reference:"
    echo "ITEM_ID_TC_ESCROW_001=\"$ITEM_ID\""
    echo "ESCROW_ID_TC_ESCROW_001=\"$ESCROW_ID\""
else
    echo "❌ TC-ESCROW-001 FAILED: Buyer confirmation failed"
    echo ""
    echo "Error output:"
    echo "$CONFIRM_RESULT" | tail -20
fi

# Restore original address
sui client switch --address "$ORIGINAL" > /dev/null 2>&1

echo ""
echo "🏁 TC-ESCROW-001 completed!"

