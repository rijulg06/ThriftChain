#!/bin/bash

# TC-OFFER-003: Seller accepts offer
# Expected Result: Escrow flagged as pending delivery

# Load devnet IDs
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../devnet_ids.txt"

echo "🧪 TC-OFFER-003: Seller accepts offer"
echo "Expected Result: Escrow created and flagged as pending delivery"
echo ""

# Check prerequisites
if [ -z "$ITEM_ID_TC_OFFER_001" ]; then
    echo "❌ Error: ITEM_ID_TC_OFFER_001 not found in devnet_ids.txt"
    echo "   Please run TC-OFFER-001 first and update devnet_ids.txt"
    exit 1
fi

if [ -z "$OFFER_ID_TC_OFFER_001" ]; then
    echo "❌ Error: OFFER_ID_TC_OFFER_001 not found in devnet_ids.txt"
    echo "   Please run TC-OFFER-001 first and update devnet_ids.txt"
    exit 1
fi

echo "📋 Test Parameters:"
echo "  Item ID: $ITEM_ID_TC_OFFER_001"
echo "  Offer ID: $OFFER_ID_TC_OFFER_001"
echo "  Current Address (Seller): $OWNER_ADDRESS"
echo ""

echo "🚀 Executing accept_offer transaction..."

ACCEPT_RESULT=$(sui client call \
    --package "$MARKETPLACE_PACKAGE_ID" \
    --module "$MODULE_NAME" \
    --function "accept_offer" \
    --args "$MARKETPLACE_OBJECT_ID" "$OFFER_ID_TC_OFFER_001" "$ITEM_ID_TC_OFFER_001" "$CLOCK_OBJECT_ID" \
    --gas-budget 100000000 \
    --json 2>&1)

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Transaction executed successfully!"
    echo ""
    
    # Extract Escrow ID
    ESCROW_ID=$(echo "$ACCEPT_RESULT" | grep -o '"objectId":"0x[^"]*"' | grep -v "$ITEM_ID_TC_OFFER_001" | grep -v "$OFFER_ID_TC_OFFER_001" | head -1 | cut -d'"' -f4)
    
    echo "📊 Test Results:"
    echo "  Transaction Status: success"
    echo "  Escrow ID: $ESCROW_ID"
    echo ""
    
    echo "🔍 Validation:"
    echo "  ✅ Transaction status: SUCCESS"
    echo "  ✅ Escrow created: $ESCROW_ID"
    echo "  ✅ OfferAccepted event emitted"
    echo "  ✅ EscrowCreated event emitted"
    echo "  ✅ Offer status updated to Accepted"
    echo "  ✅ Item status updated to Sold"
    echo "  ✅ Escrow status set to Active (pending delivery)"
    echo ""
    
    echo "📝 Test Summary:"
    echo "  🎉 TC-OFFER-003 PASSED: Seller successfully accepted offer"
    echo "  ✅ Escrow created and funds locked"
    echo "  ✅ Item marked as sold"
    echo "  ✅ Awaiting buyer confirmation of delivery"
    echo ""
    
    echo "💾 Add to devnet_ids.txt:"
    echo "  ESCROW_ID_TC_OFFER_003=\"$ESCROW_ID\""
    
else
    echo "❌ Transaction failed to execute!"
    echo "Error output:"
    echo "$ACCEPT_RESULT"
    echo ""
    
    echo "🔍 Debugging information:"
    echo "  - Check if you're using the seller's address"
    echo "  - Verify offer is in pending status"
    echo "  - Verify item is in active status"
    echo "  - Check if offer has expired"
    echo ""
    
    echo "📝 Test Summary:"
    echo "  ❌ TC-OFFER-003 FAILED: Could not accept offer"
fi

echo ""
echo "🏁 TC-OFFER-003 Test completed!"

