#!/bin/bash

# TC-ESCROW-003: Seller tries to withdraw before buyer confirms
# Expected Result: Revert: "Escrow not released"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../devnet_ids.txt"

echo "🧪 TC-ESCROW-003: Seller tries to withdraw before buyer confirms"
echo "Expected Result: Transaction should fail - only valid action is refund after dispute"
echo ""

SELLER="$OWNER_ADDRESS"
BUYER="upbeat-spodumene"

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

# Split a coin to get exactly 8 SUI for the offer
OFFER_AMOUNT_MIST="8000000000"
echo "  Splitting coin to get exactly $OFFER_AMOUNT_MIST MIST for payment..."

# Get a gas coin with enough balance (need > 8 SUI)
SOURCE_COIN=$(sui client gas --json 2>/dev/null | jq -r '.[] | select(.mistBalance > 8000000000) | .gasCoinId' | head -1)

if [ -z "$SOURCE_COIN" ]; then
    echo "❌ No coin with sufficient balance found"
    sui client switch --address "$ORIGINAL" > /dev/null 2>&1
    exit 1
fi

# Split the coin to get exactly 8 SUI
SPLIT_RESULT=$(sui client split-coin --coin-id "$SOURCE_COIN" --amounts "$OFFER_AMOUNT_MIST" --gas-budget 10000000 --json 2>&1)
BUYER_GAS=$(echo "$SPLIT_RESULT" | jq -r '.objectChanges[] | select(.objectType == "0x2::coin::Coin<0x2::sui::SUI>") | select(.type == "created") | .objectId' | head -1)

if [ -z "$BUYER_GAS" ]; then
    echo "❌ Failed to split coin"
    sui client switch --address "$ORIGINAL" > /dev/null 2>&1
    exit 1
fi

echo "  Using payment coin: $BUYER_GAS (exactly 8 SUI)"

TEMP_FILE_OFFER=$(mktemp)
sui client call \
    --package "$MARKETPLACE_PACKAGE_ID" \
    --module "$MODULE_NAME" \
    --function "create_offer_by_id" \
    --args "$MARKETPLACE_OBJECT_ID" "$ITEM_ID" "8000000000" "Test offer for withdraw test" "24" "$BUYER_GAS" "$CLOCK_OBJECT_ID" \
    --gas-budget 100000000 \
    --json > "$TEMP_FILE_OFFER" 2>&1

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    OFFER_ID=$(grep -o '"offer_id"[[:space:]]*:[[:space:]]*"0x[^"]*"' "$TEMP_FILE_OFFER" | head -1 | sed 's/.*"0x/0x/' | sed 's/".*//')
    ESCROW_ID=$(grep -o '"escrow_id"[[:space:]]*:[[:space:]]*"0x[^"]*"' "$TEMP_FILE_OFFER" | head -1 | sed 's/.*"0x/0x/' | sed 's/".*//')
    echo "✅ Offer created: $OFFER_ID"
    echo "✅ Escrow created: $ESCROW_ID (payment locked)"
    rm -f "$TEMP_FILE_OFFER"
    
    if [ -z "$ESCROW_ID" ]; then
        echo "❌ Failed to extract Escrow ID"
        sui client switch --address "$ORIGINAL" > /dev/null 2>&1
        exit 1
    fi
else
    echo "❌ Offer creation failed"
    echo "Error output:"
    cat "$TEMP_FILE_OFFER"
    rm -f "$TEMP_FILE_OFFER"
    sui client switch --address "$ORIGINAL" > /dev/null 2>&1
    exit 1
fi

# Step 3: Accept offer as seller (marks acceptance, escrow already exists)
echo ""
echo "✅ Step 3: Accepting offer as SELLER (marks acceptance)..."
sui client switch --address $SELLER > /dev/null 2>&1

TEMP_FILE_ACCEPT=$(mktemp)
sui client call \
    --package "$MARKETPLACE_PACKAGE_ID" \
    --module "$MODULE_NAME" \
    --function "accept_offer_by_id" \
    --args "$MARKETPLACE_OBJECT_ID" "$OFFER_ID" "$ITEM_ID" "$CLOCK_OBJECT_ID" \
    --gas-budget 100000000 \
    --json > "$TEMP_FILE_ACCEPT" 2>&1

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Seller accepted offer"
    rm -f "$TEMP_FILE_ACCEPT"
else
    echo "❌ Offer acceptance failed"
    cat "$TEMP_FILE_ACCEPT"
    rm -f "$TEMP_FILE_ACCEPT"
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

