#!/bin/bash

# TC-OFFER-ALL: Multi-Address Offer Test Suite
# Tests the complete offer flow with two different addresses

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../devnet_ids.txt"

SELLER="nostalgic-ruby"
BUYER="upbeat-spodumene"

echo "🧪 Multi-Address Offer Test Suite"
echo "=================================="
echo "Seller: $SELLER"
echo "Buyer:  $BUYER"
echo ""

# Save original address
ORIGINAL=$(sui client active-address 2>/dev/null)

# Step 1: Create item as seller
echo "📝 Step 1: Creating item as SELLER ($SELLER)..."
sui client switch --address $SELLER > /dev/null 2>&1

# Create a new item with all required parameters
ITEM_RESULT=$(sui client call \
    --package "$MARKETPLACE_PACKAGE_ID" \
    --module "$MODULE_NAME" \
    --function "create_item" \
    --args "$MARKETPLACE_OBJECT_ID" \
           "$ITEMCAP_OBJECT_ID" \
           "Test Item for Offer Suite" \
           "A test item created for offer testing suite" \
           "10000000000" \
           "Electronics" \
           '["test", "offer", "electronics"]' \
           '["test_image_offer"]' \
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
    
    if [ -z "$ITEM_ID" ]; then
        echo "❌ Failed to extract Item ID from transaction"
        sui client switch --address "$ORIGINAL" > /dev/null 2>&1
        exit 1
    fi
    
    echo "✅ Item created: $ITEM_ID"
else
    echo "❌ Failed to create item"
    echo "$ITEM_RESULT"
    sui client switch --address "$ORIGINAL" > /dev/null 2>&1
    exit 1
fi
echo ""

# Step 2: Make offer as buyer
echo "💰 Step 2: Making offer as BUYER ($BUYER)..."
sui client switch --address $BUYER > /dev/null 2>&1

# Check if buyer has SUI
BALANCE=$(sui client balance 2>/dev/null | grep -o '[0-9]*[[:space:]]*SUI' | head -1 | awk '{print $1}')
if [ -z "$BALANCE" ] || [ "$BALANCE" -lt 100000000 ]; then
    echo "⚠️  Buyer needs SUI, requesting from faucet..."
    sui client faucet
    echo "Waiting 10 seconds for faucet..."
    sleep 10
fi

# Get a gas coin to split
BUYER_GAS=$(sui client gas --json 2>/dev/null | grep -o '"gasCoinId"[[:space:]]*:[[:space:]]*"0x[a-f0-9]\{64\}"' | head -1 | grep -o '0x[a-f0-9]\{64\}')

if [ -z "$BUYER_GAS" ]; then
    echo "❌ No gas coins available for buyer"
    sui client switch --address "$ORIGINAL" > /dev/null 2>&1
    exit 1
fi

# Split coin to get exact payment amount (8 SUI = 8000000000 MIST)
SPLIT_RESULT=$(sui client split-coin \
    --coin-id "$BUYER_GAS" \
    --amounts 8000000000 \
    --gas-budget 10000000 \
    2>&1)

if echo "$SPLIT_RESULT" | grep -q "Status: Success"; then
    # Extract the new coin ID from the split result - it's in the Created Objects section
    PAYMENT_COIN=$(echo "$SPLIT_RESULT" | grep -A 50 "Created Objects" | grep "0x" | grep -o '0x[a-f0-9]\{64\}' | head -1)
    if [ -z "$PAYMENT_COIN" ]; then
        echo "❌ Failed to extract payment coin ID from split result"
        sui client switch --address "$ORIGINAL" > /dev/null 2>&1
        exit 1
    fi
    echo "✅ Split coin for payment: $PAYMENT_COIN"
else
    echo "❌ Failed to split coin for payment"
    echo "$SPLIT_RESULT"
    sui client switch --address "$ORIGINAL" > /dev/null 2>&1
    exit 1
fi

OFFER_RESULT=$(sui client call \
    --package "$MARKETPLACE_PACKAGE_ID" \
    --module "$MODULE_NAME" \
    --function "create_offer_by_id" \
    --args "$MARKETPLACE_OBJECT_ID" \
           "$ITEM_ID" \
           "8000000000" \
           "Test offer for 8 SUI" \
           "24" \
           "$PAYMENT_COIN" \
           "$CLOCK_OBJECT_ID" \
    --gas-budget 100000000 \
    2>&1)

if echo "$OFFER_RESULT" | grep -q "Status: Success"; then
    OFFER_ID=$(echo "$OFFER_RESULT" | grep "offer_id" | grep -o '0x[a-f0-9]\{64\}' | head -1)
    
    if [ -z "$OFFER_ID" ]; then
        echo "❌ Failed to extract Offer ID from transaction"
        sui client switch --address "$ORIGINAL" > /dev/null 2>&1
        exit 1
    fi
    
    echo "✅ Offer created: $OFFER_ID"
else
    echo "❌ Offer creation failed:"
    echo "$OFFER_RESULT" | tail -20
    sui client switch --address "$ORIGINAL" > /dev/null 2>&1
    exit 1
fi
echo ""

# Step 3: Accept offer as seller
echo "✅ Step 3: Accepting offer as SELLER ($SELLER)..."
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
    echo "✅ Offer accepted! Escrow created: $ESCROW_ID"
    echo ""
    echo "📋 Summary:"
    echo "  - Item ID:   $ITEM_ID"
    echo "  - Offer ID:  $OFFER_ID"
    echo "  - Escrow ID: $ESCROW_ID"
else
    echo "❌ Offer acceptance failed:"
    echo "$ACCEPT_RESULT" | tail -20
    sui client switch --address "$ORIGINAL" > /dev/null 2>&1
    exit 1
fi

# Restore original address
sui client switch --address "$ORIGINAL" > /dev/null 2>&1

echo ""
echo "🎉 All offer tests PASSED!"
echo ""
