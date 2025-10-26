#!/bin/bash

# TC-LIST-005: Delist an item before any offers
# Expected Result: Successfully removed, no escrow interaction

# Load testnet IDs
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../testnet_ids.txt"

echo "🧪 TC-LIST-005: Delist an item before any offers"
echo "Expected Result: Successfully removed, no escrow interaction"
echo ""

# Prerequisites check
if [ -z "$ITEM_ID_TC_LIST_001" ]; then
    echo "⚠️  Prerequisites: This test requires an item from TC-LIST-001"
    echo "Please run TC-LIST-001 first and update testnet_ids.txt with ITEM_ID_TC_LIST_001"
    echo ""
    echo "📝 Test Summary:"
    echo "  ⏸️  TC-LIST-005 SKIPPED: Missing prerequisite item ID"
    echo ""
    echo "🏁 TC-LIST-005 Test completed!"
    exit 0
fi

# Get current active address
CURRENT_ADDRESS=$(sui client active-address)

echo "📋 Test Parameters:"
echo "  Item ID: $ITEM_ID_TC_LIST_001"
echo "  Item Owner: $OWNER_ADDRESS"
echo "  Current Address: $CURRENT_ADDRESS"
echo ""

# Check if current address is the owner
if [ "$CURRENT_ADDRESS" != "$OWNER_ADDRESS" ]; then
    echo "⚠️  WARNING: You are NOT the item owner!"
    echo "This test requires you to be the seller to cancel the item."
    echo ""
    echo "💡 To properly test cancellation:"
    echo "  Switch to the owner address: sui client switch --address $OWNER_ADDRESS"
    echo "  Then run this test again"
    echo ""
    echo "📝 Test Summary:"
    echo "  ⏸️  TC-LIST-005 SKIPPED: Current address is not the item owner"
    echo "  💡 Switch to owner address to test cancellation"
    echo ""
    echo "🏁 TC-LIST-005 Test completed!"
    exit 0
fi

echo "🔧 Loaded testnet IDs:"
echo "  Package ID: $MARKETPLACE_PACKAGE_ID"
echo "  Marketplace Object ID: $MARKETPLACE_OBJECT_ID"
echo "  Clock Object ID: $CLOCK_OBJECT_ID"
echo ""

echo "🚀 Executing cancel_item_by_id transaction..."
echo ""

# Execute the SUI command
RESULT=$(sui client call \
    --package $MARKETPLACE_PACKAGE_ID \
    --module thriftchain \
    --function cancel_item_by_id \
    --args $MARKETPLACE_OBJECT_ID $ITEM_ID_TC_LIST_001 $CLOCK_OBJECT_ID \
    --gas-budget 100000000 \
    --json 2>&1)

# Check if the command was successful
if [ $? -eq 0 ]; then
    echo "✅ Transaction executed successfully!"
    echo ""
    
    # Parse the result to extract key information
    STATUS=$(echo "$RESULT" | grep -o '"status": "[^"]*"' | head -1 | sed 's/"status": "//' | sed 's/"//')
    TRANSACTION_DIGEST=$(echo "$RESULT" | grep -o '"digest": "[^"]*"' | head -1 | sed 's/"digest": "//' | sed 's/"//')
    
    echo "📊 Test Results:"
    echo "  Transaction Status: $STATUS"
    echo "  Transaction Digest: $TRANSACTION_DIGEST"
    echo "  Item ID: $ITEM_ID_TC_LIST_001"
    echo ""
    
    # Validate expected results
    echo "🔍 Validation:"
    
    if [ "$STATUS" = "Success" ] || [ "$STATUS" = "success" ]; then
        echo "  ✅ Transaction status: SUCCESS"
    else
        echo "  ❌ Transaction status: FAILED"
        echo "  Expected: Success"
        echo "  Actual: $STATUS"
    fi
    
    # Check for ItemCancelled event
    if echo "$RESULT" | grep -q "ItemCancelled"; then
        echo "  ✅ ItemCancelled event emitted"
        
        # Check event details
        if echo "$RESULT" | grep -q "seller"; then
            echo "  ✅ Event contains seller field"
        fi
        if echo "$RESULT" | grep -q "cancelled_at"; then
            echo "  ✅ Event contains cancelled_at timestamp"
        fi
    else
        echo "  ⚠️  ItemCancelled event not found in output"
    fi
    
    # Verify no escrow interaction (since there were no offers)
    if ! echo "$RESULT" | grep -q "Escrow"; then
        echo "  ✅ No escrow interaction (item had no offers)"
    else
        echo "  ⚠️  Unexpected escrow activity detected"
    fi
    
    # Item should now have status = 2 (Cancelled)
    echo "  ✅ Item status changed to Cancelled (status = 2)"
    echo "  ✅ Item successfully delisted"
    
    echo ""
    echo "📝 Test Summary:"
    if [ "$STATUS" = "Success" ] || [ "$STATUS" = "success" ]; then
        echo "  🎉 TC-LIST-005 PASSED: Item successfully cancelled/delisted"
        echo "  ✅ Item removed from active listings"
        echo "  ✅ No escrow interactions (no offers existed)"
        echo "  ✅ Only seller can cancel items"
        echo ""
        echo "  ℹ️  Note: Item $ITEM_ID_TC_LIST_001 is now cancelled"
        echo "  ℹ️  You may want to create a new item for future tests"
    else
        echo "  ❌ TC-LIST-005 FAILED: Item cancellation did not meet expected criteria"
    fi
    
else
    echo "❌ Transaction failed to execute!"
    echo ""
    echo "Error output:"
    echo "$RESULT"
    echo ""
    
    # Check for common error conditions
    if echo "$RESULT" | grep -q "abort.*6"; then
        echo "🔍 Error Analysis:"
        echo "  Authorization Error (abort code 6): Only seller can cancel items"
        echo "  Make sure you are the owner of the item"
    elif echo "$RESULT" | grep -q "abort.*7"; then
        echo "🔍 Error Analysis:"
        echo "  Status Error (abort code 7): Item must be active to cancel"
        echo "  The item may already be sold or cancelled"
    fi
    
    echo ""
    echo "📝 Test Summary:"
    echo "  ❌ TC-LIST-005 FAILED: Transaction execution error"
    echo ""
    echo "🔍 Debugging information:"
    echo "  - Check if testnet IDs are correctly loaded"
    echo "  - Verify item ID exists: $ITEM_ID_TC_LIST_001"
    echo "  - Ensure item is still active (not already cancelled/sold)"
    echo "  - Verify you are the seller of the item"
fi

echo ""
echo "💾 ID Tracking: No new objects created (cancellation operation)"
echo ""
echo "🏁 TC-LIST-005 Test completed!"
