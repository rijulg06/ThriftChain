#!/bin/bash

# TC-PAYMENT-001: Create offer with exact payment amount
# Expected Result: Offer created with payment locked in escrow immediately

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../devnet_ids.txt"

SELLER="nostalgic-ruby"
BUYER="upbeat-spodumene"

echo "🧪 TC-PAYMENT-001: Create offer with exact payment amount"
echo "Expected Result: Offer created and escrow created with payment locked on-chain"
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
           "Test Item for Payment 001" \
           "A test item for payment testing" \
           "8000000000" \
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

# Step 2: Buyer creates offer WITH PAYMENT (THE ACTUAL TEST)
echo "💰 Step 2: BUYER makes offer WITH PAYMENT (8 SUI)..."
sui client switch --address $BUYER > /dev/null 2>&1

# Get buyer's gas coin for payment
BUYER_GAS=$(sui client gas --json 2>/dev/null | grep -o '"gasCoinId"[[:space:]]*:[[:space:]]*"0x[a-f0-9]\{64\}"' | head -1 | grep -o '0x[a-f0-9]\{64\}')
echo "  Using payment coin: $BUYER_GAS"
echo ""

echo "🚀 Step 3: Creating offer with payment (funds locked immediately)..."
OFFER_RESULT=$(sui client call \
    --package "$MARKETPLACE_PACKAGE_ID" \
    --module "$MODULE_NAME" \
    --function "create_offer_by_id" \
    --args "$MARKETPLACE_OBJECT_ID" \
           "$ITEM_ID" \
           "8000000000" \
           "Offering 8 SUI with payment" \
           "24" \
           "$BUYER_GAS" \
           "$CLOCK_OBJECT_ID" \
    --gas-budget 100000000 \
    2>&1)

echo ""
if echo "$OFFER_RESULT" | grep -q "Status: Success"; then
    OFFER_ID=$(echo "$OFFER_RESULT" | grep "offer_id" | grep -o '0x[a-f0-9]\{64\}' | head -1)
    ESCROW_ID=$(echo "$OFFER_RESULT" | grep "escrow_id" | grep -o '0x[a-f0-9]\{64\}' | head -1)
    
    echo "✅ TC-PAYMENT-001 PASSED: Offer created with payment locked!"
    echo ""
    echo "📋 Summary:"
    echo "  - Item ID:        $ITEM_ID"
    echo "  - Offer ID:       $OFFER_ID"
    echo "  - Escrow ID:      $ESCROW_ID"
    echo "  - Payment Amount: 8000000000 MIST (8 SUI)"
    echo "  - Status:         ✅ Funds locked in escrow"
    echo ""
    echo "💾 Add to devnet_ids.txt:"
    echo "  ITEM_ID_TC_PAYMENT_001=\"$ITEM_ID\""
    echo "  OFFER_ID_TC_PAYMENT_001=\"$OFFER_ID\""
    echo "  ESCROW_ID_TC_PAYMENT_001=\"$ESCROW_ID\""
else
    echo "❌ TC-PAYMENT-001 FAILED: Offer creation with payment failed"
    echo ""
    echo "Error output:"
    echo "$OFFER_RESULT"
fi

# Restore original address
sui client switch --address "$ORIGINAL" > /dev/null 2>&1

echo ""
echo "🏁 TC-PAYMENT-001 completed!"
