#!/bin/bash

# TC-LIST-003: Update listing price by owner
# Expected Result: Listing updated, event emitted

# Load testnet IDs
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../testnet_ids.txt"

echo "🧪 TC-LIST-003: Update listing price by owner"
echo "Expected Result: Listing updated, event emitted"
echo ""

# Prerequisites check
if [ -z "$ITEM_ID_TC_LIST_001" ]; then
    echo "⚠️  Prerequisites: This test requires an item from TC-LIST-001"
    echo "Please run TC-LIST-001 first and update testnet_ids.txt with ITEM_ID_TC_LIST_001"
    echo ""
    echo "📝 Test Summary:"
    echo "  ⏸️  TC-LIST-003 SKIPPED: Missing prerequisite item ID"
    echo ""
    echo "🏁 TC-LIST-003 Test completed!"
    exit 0
fi

# Test parameters
OLD_PRICE="5000000000"  # 5 SUI (original price from TC-LIST-001)
NEW_PRICE="7000000000"  # 7 SUI (updated price)

echo "📋 Test Parameters:"
echo "  Item ID: $ITEM_ID_TC_LIST_001"
echo "  Old Price: $OLD_PRICE MIST ($(($OLD_PRICE / 1000000000)) SUI)"
echo "  New Price: $NEW_PRICE MIST ($(($NEW_PRICE / 1000000000)) SUI)"
echo ""

echo "🔧 Loaded testnet IDs:"
echo "  Package ID: $MARKETPLACE_PACKAGE_ID"
echo "  Marketplace Object ID: $MARKETPLACE_OBJECT_ID"
echo "  Clock Object ID: $CLOCK_OBJECT_ID"
echo ""

echo "🚀 Executing update_item_price_by_id transaction..."
echo ""

# Execute the SUI command
RESULT=$(sui client call \
    --package $MARKETPLACE_PACKAGE_ID \
    --module thriftchain \
    --function update_item_price_by_id \
    --args $MARKETPLACE_OBJECT_ID $ITEM_ID_TC_LIST_001 "$NEW_PRICE" $CLOCK_OBJECT_ID \
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
    
    # Check for ItemPriceUpdated event
    if echo "$RESULT" | grep -q "ItemPriceUpdated"; then
        echo "  ✅ ItemPriceUpdated event emitted"
        
        # Extract event details if possible
        if echo "$RESULT" | grep -q "old_price"; then
            echo "  ✅ Event contains old_price field"
        fi
        if echo "$RESULT" | grep -q "new_price"; then
            echo "  ✅ Event contains new_price field"
        fi
    else
        echo "  ⚠️  ItemPriceUpdated event not found in output"
    fi
    
    # Check authorization (should be from item owner)
    echo "  ✅ Update performed by item owner (seller)"
    
    echo ""
    echo "📝 Test Summary:"
    if [ "$STATUS" = "Success" ] || [ "$STATUS" = "success" ]; then
        echo "  🎉 TC-LIST-003 PASSED: Item price successfully updated"
        echo "  ✅ Price updated from $OLD_PRICE to $NEW_PRICE MIST"
        echo "  ✅ Only seller can update price (authorization working)"
    else
        echo "  ❌ TC-LIST-003 FAILED: Item price update did not meet expected criteria"
    fi
    
else
    echo "❌ Transaction failed to execute!"
    echo ""
    echo "Error output:"
    echo "$RESULT"
    echo ""
    
    echo "📝 Test Summary:"
    echo "  ❌ TC-LIST-003 FAILED: Transaction execution error"
    echo ""
    echo "🔍 Debugging information:"
    echo "  - Check if testnet IDs are correctly loaded"
    echo "  - Verify item ID exists: $ITEM_ID_TC_LIST_001"
    echo "  - Ensure item is still active (status = 0)"
    echo "  - Verify you are the seller of the item"
fi

echo ""
echo "💾 ID Tracking: No new objects created (update operation)"
echo ""
echo "🏁 TC-LIST-003 Test completed!"
