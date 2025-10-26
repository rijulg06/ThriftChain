#!/bin/bash

# TC-ESCROW-002: Buyer disputes item
# Expected Result: Contract enters dispute state; funds remain locked

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../devnet_ids.txt"

echo "🧪 TC-ESCROW-002: Buyer disputes item"
echo "Expected Result: Contract enters dispute state; funds remain locked"
echo ""

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
           "Test Item for Dispute" \
           "A test item for dispute testing" \
           "10000000000" \
           "Electronics" \
           '["test", "dispute", "electronics"]' \
           '["test_image_dispute"]' \
           "Good" \
           "Test Brand" \
           "Medium" \
           "Red" \
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
           "Test offer for dispute" \
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

# Step 4: Buyer disputes escrow (THE ACTUAL TEST)
echo ""
echo "⚠️  Step 4: BUYER disputes escrow (funds remain locked)..."
sui client switch --address $BUYER > /dev/null 2>&1

DISPUTE_RESULT=$(sui client call \
    --package "$MARKETPLACE_PACKAGE_ID" \
    --module "$MODULE_NAME" \
    --function "dispute_escrow_by_id" \
    --args "$MARKETPLACE_OBJECT_ID" \
           "$ESCROW_ID" \
           "$CLOCK_OBJECT_ID" \
    --gas-budget 100000000 \
    2>&1)

echo ""
if echo "$DISPUTE_RESULT" | grep -q "Status: Success"; then
    echo "✅ TC-ESCROW-002 PASSED: Buyer raised dispute, escrow locked"
    echo ""
    echo "📋 Summary:"
    echo "  - Item ID:   $ITEM_ID"
    echo "  - Offer ID:  $OFFER_ID"
    echo "  - Escrow ID: $ESCROW_ID"
    echo "  - Status:    Disputed (funds locked)"
    echo ""
    echo "💾 IDs for reference:"
    echo "ITEM_ID_TC_ESCROW_002=\"$ITEM_ID\""
    echo "ESCROW_ID_TC_ESCROW_002=\"$ESCROW_ID\""
else
    echo "❌ TC-ESCROW-002 FAILED: Dispute failed"
    echo ""
    echo "Error output:"
    echo "$DISPUTE_RESULT" | tail -20
fi

# Restore original address
sui client switch --address "$ORIGINAL" > /dev/null 2>&1

echo ""
echo "🏁 TC-ESCROW-002 completed!"

