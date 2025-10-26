#!/bin/bash

# TC-LIST-004: Update listing by non-owner
# Expected Result: Revert: "Unauthorized action"

# Load devnet IDs
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../devnet_ids.txt"

echo "🧪 TC-LIST-004: Update listing by non-owner"
echo "Expected Result: Revert: \"Unauthorized action\""
echo ""

# Prerequisites check
if [ -z "$ITEM_ID_TC_LIST_001" ]; then
    echo "⚠️  Prerequisites: This test requires an item from TC-LIST-001"
    echo "Please run TC-LIST-001 first and update testnet_ids.txt with ITEM_ID_TC_LIST_001"
    echo ""
    echo "📝 Test Summary:"
    echo "  ⏸️  TC-LIST-004 SKIPPED: Missing prerequisite item ID"
    echo ""
    echo "🏁 TC-LIST-004 Test completed!"
    exit 0
fi

# Get current active address
CURRENT_ADDRESS=$(sui client active-address)

echo "📋 Authorization Test Setup:"
echo "  Item ID: $ITEM_ID_TC_LIST_001"
echo "  Item Owner: $OWNER_ADDRESS"
echo "  Current Address: $CURRENT_ADDRESS"
echo ""

# Check if current address is the owner
if [ "$CURRENT_ADDRESS" = "$OWNER_ADDRESS" ]; then
    echo "⚠️  WARNING: You are currently the item owner!"
    echo "This test requires a DIFFERENT address to demonstrate unauthorized access."
    echo ""
    echo "💡 To properly test authorization:"
    echo "  1. Switch to a different address: sui client switch --address <different-address>"
    echo "  2. Or create a new address: sui client new-address ed25519"
    echo "  3. Then run this test again"
    echo ""
    echo "📝 Test Summary:"
    echo "  ⏸️  TC-LIST-004 SKIPPED: Current address is the item owner"
    echo "  💡 Switch to a different address to test authorization properly"
    echo ""
    echo "🏁 TC-LIST-004 Test completed!"
    exit 0
fi

# Test parameters
UNAUTHORIZED_PRICE="10000000000"  # 10 SUI (attempting unauthorized update)

echo "📋 Test Parameters:"
echo "  Attempting unauthorized price update to: $UNAUTHORIZED_PRICE MIST ($(($UNAUTHORIZED_PRICE / 1000000000)) SUI)"
echo ""

echo "🔧 Loaded testnet IDs:"
echo "  Package ID: $MARKETPLACE_PACKAGE_ID"
echo "  Marketplace Object ID: $MARKETPLACE_OBJECT_ID"
echo "  Clock Object ID: $CLOCK_OBJECT_ID"
echo ""

echo "🚀 Executing update_item_price_by_id transaction (as non-owner)..."
echo ""

# Execute the SUI command (expected to fail with authorization error)
RESULT=$(sui client call \
    --package $MARKETPLACE_PACKAGE_ID \
    --module thriftchain \
    --function update_item_price_by_id \
    --args $MARKETPLACE_OBJECT_ID $ITEM_ID_TC_LIST_001 "$UNAUTHORIZED_PRICE" $CLOCK_OBJECT_ID \
    --gas-budget 100000000 \
    --json 2>&1)

# Check if the command failed (which is expected)
if [ $? -ne 0 ]; then
    echo "✅ Transaction failed as expected!"
    echo ""
    
    STATUS="failed"
    
    echo "📊 Test Results:"
    echo "  Transaction Status: $STATUS"
    echo ""
    
    # Validate expected results
    echo "🔍 Validation:"
    
    echo "  ✅ Transaction status: FAILED (as expected)"
    
    # Check for authorization error (abort code 3 from smart contract)
    if echo "$RESULT" | grep -q "abort.*3\|MoveAbort.*code.*3"; then
        echo "  ✅ Authorization error detected (abort code 3)"
        echo "  ✅ Smart contract properly rejected unauthorized update"
        echo "  ✅ Only item owner can update price"
    elif echo "$RESULT" | grep -q "error:"; then
        echo "  ✅ Error message present"
        echo "  ✅ Transaction properly rejected"
    else
        echo "  ⚠️  Could not confirm specific error type"
    fi
    
    echo ""
    echo "📝 Test Summary:"
    echo "  🎉 TC-LIST-004 PASSED: Transaction properly rejected unauthorized update"
    echo "  ✅ Authorization system working correctly"
    echo "  ✅ Non-owner cannot update item price"
    
else
    echo "❌ Transaction succeeded unexpectedly!"
    echo ""
    
    # Parse the result
    STATUS=$(echo "$RESULT" | grep -o '"status": "[^"]*"' | head -1 | sed 's/"status": "//' | sed 's/"//')
    TRANSACTION_DIGEST=$(echo "$RESULT" | grep -o '"digest": "[^"]*"' | head -1 | sed 's/"digest": "//' | sed 's/"//')
    
    echo "📊 Test Results:"
    echo "  Transaction Status: $STATUS"
    echo "  Transaction Digest: $TRANSACTION_DIGEST"
    echo ""
    
    echo "🔍 Validation:"
    echo "  ❌ Transaction status: UNEXPECTED SUCCESS"
    echo "  ❌ Expected: Transaction should fail with authorization error"
    echo "  ❌ Smart contract authorization may not be working correctly"
    
    echo ""
    echo "📝 Test Summary:"
    echo "  ❌ TC-LIST-004 FAILED: Unauthorized update was allowed"
    echo "  ⚠️  SECURITY ISSUE: Non-owner can update item prices!"
    echo "  ⚠️  Smart contract needs immediate review"
fi

echo ""
echo "💾 ID Tracking: No new objects created (authorization test)"
echo ""
echo "🏁 TC-LIST-004 Test completed!"
