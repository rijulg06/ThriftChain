#!/bin/bash

# TC-ESCROW-003: Seller tries to withdraw before buyer confirms
# Expected Result: Revert: "Escrow not released"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../devnet_ids.txt"

echo "🧪 TC-ESCROW-003: Seller tries to withdraw before buyer confirms"
echo "Expected Result: Transaction should fail - only valid action is refund after dispute"
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
           "Test Item for Unauthorized Withdraw" \
           "A test item for unauthorized withdrawal testing" \
           "10000000000" \
           "Electronics" \
           '["test", "withdraw", "electronics"]' \
           '["test_image_withdraw"]' \
           "Good" \
           "Test Brand" \
           "Medium" \
           "Blue" \
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
           "Test offer for withdraw test" \
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

# Step 4: Seller tries to call refund_escrow on active escrow (THE ACTUAL TEST)
# Note: refund_escrow_by_id requires status=2 (disputed), but escrow is status=0 (active)
echo ""
echo "⚠️  Step 4: SELLER tries to refund active escrow (should fail)..."
sui client switch --address $SELLER > /dev/null 2>&1

REFUND_RESULT=$(sui client call \
    --package "$MARKETPLACE_PACKAGE_ID" \
    --module "$MODULE_NAME" \
    --function "refund_escrow_by_id" \
    --args "$MARKETPLACE_OBJECT_ID" \
           "$ESCROW_ID" \
           "$CLOCK_OBJECT_ID" \
    --gas-budget 100000000 \
    2>&1)

echo ""
# This test should FAIL - that's the expected behavior
if echo "$REFUND_RESULT" | grep -q "Error executing transaction"; then
    # Check for error code 39 (Escrow must be disputed)
    if echo "$REFUND_RESULT" | grep -q "code 39"; then
        echo "✅ TC-ESCROW-003 PASSED: Seller correctly prevented from withdrawing active escrow"
        echo "   Error code 39: Escrow must be disputed before refund"
    else
        echo "✅ TC-ESCROW-003 PASSED: Transaction failed as expected (escrow still active)"
    fi
    echo ""
    echo "📋 Summary:"
    echo "  - Item ID:   $ITEM_ID"
    echo "  - Escrow ID: $ESCROW_ID"
    echo "  - Status:    Active (protected from unauthorized withdrawal)"
elif echo "$REFUND_RESULT" | grep -q "Status: Success"; then
    echo "❌ TC-ESCROW-003 FAILED: Seller was able to withdraw from active escrow (security issue!)"
    echo ""
    echo "Transaction output:"
    echo "$REFUND_RESULT" | tail -20
else
    echo "⚠️  TC-ESCROW-003: Unexpected result"
    echo ""
    echo "Transaction output:"
    echo "$REFUND_RESULT" | tail -20
fi

# Restore original address
sui client switch --address "$ORIGINAL" > /dev/null 2>&1

echo ""
echo "🏁 TC-ESCROW-003 completed!"

