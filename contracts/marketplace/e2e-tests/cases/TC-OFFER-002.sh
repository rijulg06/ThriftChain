#!/bin/bash

# TC-OFFER-002: Buyer makes offer lower than minimum listing price
# Expected Result: Revert: "Offer below threshold"

# Load devnet IDs
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../devnet_ids.txt"

echo "🧪 TC-OFFER-002: Buyer makes offer lower than minimum listing price"
echo "Expected Result: Revert: \"Offer below threshold\""
echo ""

# Use the item from TC-OFFER-001
if [ -z "$ITEM_ID_TC_OFFER_001" ]; then
    echo "❌ Error: ITEM_ID_TC_OFFER_001 not found in devnet_ids.txt"
    echo "   Please run TC-OFFER-001 first and update devnet_ids.txt"
    exit 1
fi

echo "📋 Test Parameters:"
echo "  Item ID: $ITEM_ID_TC_OFFER_001"
echo "  Item Price: 10000000000 MIST (10 SUI)"
echo "  Offer Amount: 100000000 MIST (0.1 SUI - significantly below listing price)"
echo "  Expected: Transaction should revert with 'Offer below threshold'"
echo ""

OFFER_AMOUNT="100000000"  # 0.1 SUI (way below listing price of 10 SUI)
OFFER_MESSAGE="Low ball offer"
EXPIRES_IN_HOURS="24"

echo "🚀 Executing create_offer transaction with very low amount..."

OFFER_RESULT=$(sui client call \
    --package "$MARKETPLACE_PACKAGE_ID" \
    --module "$MODULE_NAME" \
    --function "create_offer" \
    --args "$MARKETPLACE_OBJECT_ID" "$ITEM_ID_TC_OFFER_001" "$OFFER_AMOUNT" "$OFFER_MESSAGE" "$EXPIRES_IN_HOURS" "$CLOCK_OBJECT_ID" \
    --gas-budget 100000000 \
    2>&1)

EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
    echo "✅ Transaction reverted as expected!"
    echo ""
    echo "📊 Test Results:"
    echo "  Transaction Status: reverted"
    echo "  Error: $OFFER_RESULT"
    echo ""
    
    # Check if it's the expected error
    if echo "$OFFER_RESULT" | grep -q "below"; then
        echo "🔍 Validation:"
        echo "  ✅ Transaction properly rejected"
        echo "  ✅ Error message contains 'below'"
        echo ""
        echo "📝 Test Summary:"
        echo "  🎉 TC-OFFER-002 PASSED: Low offer correctly rejected"
    else
        echo "🔍 Validation:"
        echo "  ⚠️  Transaction rejected but with unexpected error"
        echo ""
        echo "📝 Test Summary:"
        echo "  ⚠️  TC-OFFER-002 PARTIAL: Transaction failed but error message differs"
    fi
else
    echo "⚠️  Transaction executed successfully!"
    echo ""
    echo "📊 Test Results:"
    echo "  Transaction Status: success"
    echo "  Offer Amount: $OFFER_AMOUNT MIST (0.1 SUI)"
    echo ""
    
    OFFER_ID=$(echo "$OFFER_RESULT" | grep -o '"objectId":"0x[^"]*"' | grep -v "$ITEM_ID_TC_OFFER_001" | head -1 | cut -d'"' -f4)
    
    echo "🔍 Analysis:"
    echo "  ❌ TC-OFFER-002 FAILED: Offer was accepted despite being significantly below listing price"
    echo ""
    echo "  🚨 DESIGN LIMITATION IDENTIFIED:"
    echo "  ══════════════════════════════════════════════════════════════"
    echo "  The smart contract does NOT enforce minimum offer thresholds."
    echo ""
    echo "  Current create_offer() validation:"
    echo "    ✅ amount > 0"
    echo "    ✅ buyer != seller"
    echo "    ✅ item.status == 0 (active)"
    echo "    ✅ expires_in_hours validation"
    echo ""
    echo "  Missing validation:"
    echo "    ❌ No check for minimum offer percentage (e.g., 50% of listing)"
    echo "    ❌ No check against item.price"
    echo ""
    echo "  Impact:"
    echo "  - Buyers can make arbitrarily low offers (e.g., 0.1 SUI on 10 SUI item)"
    echo "  - Sellers must manually review and reject low offers"
    echo "  - Could lead to spam offers"
    echo ""
    echo "  Recommendation:"
    echo "  - Add minimum threshold check in create_offer()"
    echo "  - Example: assert!(amount >= (item.price * 50) / 100, ERROR_BELOW_THRESHOLD)"
    echo "  ══════════════════════════════════════════════════════════════"
    echo ""
    
    echo "💾 Unexpected Offer ID created: $OFFER_ID"
fi

echo ""
echo "🏁 TC-OFFER-002 Test completed!"



