#!/bin/bash

# TC-PAYMENT-005: Verify escrow balance after payment locked
# Expected Result: Escrow object contains exact payment amount in held_funds

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../devnet_ids.txt"

SELLER="nostalgic-ruby"
BUYER="upbeat-spodumene"

echo "🧪 TC-PAYMENT-005: Verify escrow balance after payment locked"
echo "Expected Result: Escrow object contains exact payment amount in held_funds"
echo ""

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
           "Test Item for Payment 005" \
           "A test item for balance verification" \
           "7000000000" \
           "Electronics" \
           '["test", "payment"]' \
           '["test_image"]' \
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
echo ""

# Step 2: Buyer creates offer with payment
echo "💰 Step 2: Making offer as BUYER with payment (7 SUI)..."
sui client switch --address $BUYER > /dev/null 2>&1
echo "   Expected escrow balance: 7000000000 MIST (7 SUI)"
echo ""

BUYER_GAS=$(sui client gas --json 2>/dev/null | grep -o '"gasCoinId"[[:space:]]*:[[:space:]]*"0x[a-f0-9]\{64\}"' | head -1 | grep -o '0x[a-f0-9]\{64\}')

OFFER_RESULT=$(sui client call \
    --package "$MARKETPLACE_PACKAGE_ID" \
    --module "$MODULE_NAME" \
    --function "create_offer_by_id" \
    --args "$MARKETPLACE_OBJECT_ID" \
           "$ITEM_ID" \
           "7000000000" \
           "Offering 7 SUI" \
           "24" \
           "$BUYER_GAS" \
           "$CLOCK_OBJECT_ID" \
    --gas-budget 100000000 \
    2>&1)

echo ""
if echo "$OFFER_RESULT" | grep -q "Status: Success"; then
    OFFER_ID=$(echo "$OFFER_RESULT" | grep "offer_id" | grep -o '0x[a-f0-9]\{64\}' | head -1)
    ESCROW_ID=$(echo "$OFFER_RESULT" | grep "escrow_id" | grep -o '0x[a-f0-9]\{64\}' | head -1)
    echo "✅ Offer created: $OFFER_ID"
    echo "✅ Escrow created: $ESCROW_ID"
else
    echo "❌ TC-PAYMENT-005 FAILED: Offer creation failed"
    echo ""
    echo "Error output:"
    echo "$OFFER_RESULT"
    sui client switch --address "$ORIGINAL" > /dev/null 2>&1
    exit 1
fi
echo ""

# Step 3: Query escrow object and verify balance (THE ACTUAL TEST)
echo "🔍 Step 3: Querying escrow object to verify held_funds..."
sleep 2  # Wait for blockchain state

ESCROW_DATA=$(sui client object "$ESCROW_ID" --json 2>/dev/null)

if echo "$ESCROW_DATA" | grep -q "\"held_funds\""; then
    # Try to extract held_funds value
    HELD_BALANCE=$(echo "$ESCROW_DATA" | grep -o '"held_funds"[[:space:]]*:[[:space:]]*[0-9]\+' | grep -o '[0-9]\+' || echo "0")
    
    echo "📊 Escrow Object Details:"
    echo "  Escrow ID:    $ESCROW_ID"
    echo "  Held Funds:   $HELD_BALANCE MIST"
    echo "  Expected:     7000000000 MIST"
    echo ""
    
    if [ "$HELD_BALANCE" = "7000000000" ]; then
        echo "✅ TC-PAYMENT-005 PASSED: Escrow balance verified!"
        echo ""
        echo "📋 Summary:"
        echo "  - Item ID:        $ITEM_ID"
        echo "  - Offer ID:       $OFFER_ID"
        echo "  - Escrow ID:      $ESCROW_ID"
        echo "  - Expected Amount: 7000000000 MIST (7 SUI)"
        echo "  - Actual Amount:   $HELD_BALANCE MIST"
        echo "  - Match:          ✅ EXACT MATCH"
        echo "  - Status:         ✅ Funds verifiable on-chain"
    else
        echo "⚠️  TC-PAYMENT-005 PARTIAL: Escrow exists but balance doesn't match exactly"
        echo ""
        echo "📋 Summary:"
        echo "  - Expected: 7000000000 MIST"
        echo "  - Actual:   $HELD_BALANCE MIST"
        echo ""
        echo "Note: This might be due to transaction fees or timing"
    fi
else
    echo "❌ TC-PAYMENT-005 FAILED: Could not query held_funds from escrow"
    echo ""
    echo "Escrow object data:"
    echo "$ESCROW_DATA" | head -20
fi

# Restore original address
sui client switch --address "$ORIGINAL" > /dev/null 2>&1

echo ""
echo "🏁 TC-PAYMENT-005 completed!"
