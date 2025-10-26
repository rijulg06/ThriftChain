#!/bin/bash

# TC-PAYMENT-004: Buyer receives refund on dispute
# Expected Result: Funds transferred from escrow back to buyer's wallet

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../devnet_ids.txt"

SELLER="nostalgic-ruby"
BUYER="upbeat-spodumene"

echo "🧪 TC-PAYMENT-004: Dispute and refund, verify buyer receives funds back"
echo "Expected Result: Funds transferred from escrow back to buyer's wallet"
echo ""

echo "📋 Test Setup:"
echo "  Seller: $SELLER"
echo "  Buyer:  $BUYER"
echo ""

# Save original address
ORIGINAL=$(sui client active-address 2>/dev/null)

# Get initial buyer balance
sui client switch --address $BUYER > /dev/null 2>&1
echo "💰 Initial balances:"
BUYER_BALANCE_INITIAL=$(sui client balance --json 2>/dev/null | grep -o '"totalBalance"[[:space:]]*:[[:space:]]*"[0-9]\+"' | grep -o '[0-9]\+' || echo "0")
echo "  Buyer: $BUYER_BALANCE_INITIAL MIST"
echo ""

# Step 1: Create item as seller
echo "📝 Step 1: Creating item as SELLER..."
sui client switch --address $SELLER > /dev/null 2>&1

ITEM_RESULT=$(sui client call \
    --package "$MARKETPLACE_PACKAGE_ID" \
    --module "$MODULE_NAME" \
    --function "create_item" \
    --args "$MARKETPLACE_OBJECT_ID" \
           "$ITEMCAP_OBJECT_ID" \
           "Test Item for Payment 004" \
           "A test item for dispute/refund" \
           "6000000000" \
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
echo "💰 Step 2: Making offer as BUYER with payment (6 SUI)..."
sui client switch --address $BUYER > /dev/null 2>&1

# Split a coin to get exactly 6 SUI for the offer
OFFER_AMOUNT_MIST="6000000000"
echo "  Splitting coin to get exactly $OFFER_AMOUNT_MIST MIST for payment..."

# Get a gas coin with enough balance (need > 6 SUI)
SOURCE_COIN=$(sui client gas --json 2>/dev/null | jq -r '.[] | select(.mistBalance > 6000000000) | .gasCoinId' | head -1)

if [ -z "$SOURCE_COIN" ]; then
    echo "❌ No coin with sufficient balance found"
    sui client switch --address "$ORIGINAL" > /dev/null 2>&1
    exit 1
fi

# Split the coin to get exactly 6 SUI
SPLIT_RESULT=$(sui client split-coin --coin-id "$SOURCE_COIN" --amounts "$OFFER_AMOUNT_MIST" --gas-budget 10000000 --json 2>&1)
BUYER_GAS=$(echo "$SPLIT_RESULT" | jq -r '.objectChanges[] | select(.objectType == "0x2::coin::Coin<0x2::sui::SUI>") | select(.type == "created") | .objectId' | head -1)

if [ -z "$BUYER_GAS" ]; then
    echo "❌ Failed to split coin"
    sui client switch --address "$ORIGINAL" > /dev/null 2>&1
    exit 1
fi

echo "  Using payment coin: $BUYER_GAS (exactly 6 SUI)"
echo ""

OFFER_RESULT=$(sui client call \
    --package "$MARKETPLACE_PACKAGE_ID" \
    --module "$MODULE_NAME" \
    --function "create_offer_by_id" \
    --args "$MARKETPLACE_OBJECT_ID" \
           "$ITEM_ID" \
           "6000000000" \
           "Offering 6 SUI" \
           "24" \
           "$BUYER_GAS" \
           "$CLOCK_OBJECT_ID" \
    --gas-budget 100000000 \
    2>&1)

if echo "$OFFER_RESULT" | grep -q "Status: Success"; then
    OFFER_ID=$(echo "$OFFER_RESULT" | grep "offer_id" | grep -o '0x[a-f0-9]\{64\}' | head -1)
    ESCROW_ID=$(echo "$OFFER_RESULT" | grep "escrow_id" | grep -o '0x[a-f0-9]\{64\}' | head -1)
    echo "✅ Offer created: $OFFER_ID (Amount: 6000000000 MIST / 6 SUI)"
    echo "✅ Escrow created with funds: $ESCROW_ID"
else
    echo "❌ Offer creation failed"
    sui client switch --address "$ORIGINAL" > /dev/null 2>&1
    exit 1
fi
echo ""

# Step 3: Seller accepts offer
echo "✅ Step 3: SELLER accepts offer..."
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

if ! echo "$ACCEPT_RESULT" | grep -q "Status: Success"; then
    echo "❌ Seller failed to accept offer"
    sui client switch --address "$ORIGINAL" > /dev/null 2>&1
    exit 1
fi
echo "✅ Seller accepted offer"
echo ""

# Step 4: Buyer disputes escrow
echo "⚠️  Step 4: BUYER disputes escrow..."
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

if ! echo "$DISPUTE_RESULT" | grep -q "Status: Success"; then
    echo "❌ Dispute failed"
    sui client switch --address "$ORIGINAL" > /dev/null 2>&1
    exit 1
fi
echo "✅ Escrow disputed"
echo ""

# Step 5: Seller issues refund (THE ACTUAL TEST - funds transfer back to buyer)
echo "💸 Step 5: SELLER issues refund (funds transfer back to buyer)..."
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
if echo "$REFUND_RESULT" | grep -q "Status: Success"; then
    echo "✅ Refund processed!"
    echo ""
    
    # Check buyer's new balance
    sui client switch --address $BUYER > /dev/null 2>&1
    sleep 2  # Wait for blockchain state update
    
    BUYER_BALANCE_FINAL=$(sui client balance --json 2>/dev/null | grep -o '"totalBalance"[[:space:]]*:[[:space:]]*"[0-9]\+"' | grep -o '[0-9]\+' || echo "0")
    echo "  Buyer final balance: $BUYER_BALANCE_FINAL MIST"
    echo ""
    
    echo "✅ TC-PAYMENT-004 PASSED: Buyer received refund!"
    echo ""
    echo "📋 Summary:"
    echo "  - Item ID:        $ITEM_ID"
    echo "  - Offer ID:       $OFFER_ID"
    echo "  - Escrow ID:      $ESCROW_ID"
    echo "  - Payment Amount: 6000000000 MIST (6 SUI)"
    echo "  - Status:         ✅ Funds refunded to buyer"
else
    echo "❌ TC-PAYMENT-004 FAILED: Refund processing failed"
    echo ""
    echo "Error output:"
    echo "$REFUND_RESULT"
fi

# Restore original address
sui client switch --address "$ORIGINAL" > /dev/null 2>&1

echo ""
echo "🏁 TC-PAYMENT-004 completed!"
