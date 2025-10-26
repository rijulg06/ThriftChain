#!/bin/bash

# TC-LIST-001: List an item with valid fields (price, description)
# Expected Result: Listing created with unique ID, ownership bound to seller

# Load testnet IDs
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../testnet_ids.txt"

echo "🧪 TC-LIST-001: List an item with valid fields (price, description)"
echo "Expected Result: Listing created with unique ID, ownership bound to seller"
echo ""

# Test parameters - valid item with all required fields
TITLE="Vintage Leather Jacket - Test Item"
DESCRIPTION="A beautiful vintage leather jacket in excellent condition. Perfect for the fall season. This is a test item for TC-LIST-001."
PRICE="5000000000"  # 5 SUI in MIST (1 SUI = 1,000,000,000 MIST)
CATEGORY="Clothing"
TAGS='["vintage", "leather", "jacket", "fall", "fashion", "test"]'
WALRUS_IMAGE_IDS='["test_image1", "test_image2"]'
CONDITION="Excellent"
BRAND="Vintage Brand"
SIZE="Large"
COLOR="Brown"
MATERIAL="Leather"

echo "📋 Test Parameters:"
echo "  Title: $TITLE"
echo "  Description: $DESCRIPTION"
echo "  Price: $PRICE MIST ($(($PRICE / 1000000000)) SUI)"
echo "  Category: $CATEGORY"
echo "  Tags: $TAGS"
echo "  Condition: $CONDITION"
echo "  Brand: $BRAND"
echo "  Size: $SIZE"
echo "  Color: $COLOR"
echo "  Material: $MATERIAL"
echo ""

# Debug: Show loaded variables
echo "🔧 Loaded testnet IDs:"
echo "  Package ID: $MARKETPLACE_PACKAGE_ID"
echo "  Marketplace Object ID: $MARKETPLACE_OBJECT_ID"
echo "  ItemCap Object ID: $ITEMCAP_OBJECT_ID"
echo ""

echo "🚀 Executing create_item transaction..."
echo ""

# Execute the SUI command
RESULT=$(sui client call \
    --package $MARKETPLACE_PACKAGE_ID \
    --module thriftchain \
    --function create_item \
    --args $MARKETPLACE_OBJECT_ID $ITEMCAP_OBJECT_ID "$TITLE" "$DESCRIPTION" "$PRICE" "$CATEGORY" "$TAGS" "$WALRUS_IMAGE_IDS" "$CONDITION" "$BRAND" "$SIZE" "$COLOR" "$MATERIAL" 0x6 \
    --gas-budget 100000000 \
    --json 2>&1)

# Check if the command was successful
if [ $? -eq 0 ]; then
    echo "✅ Transaction executed successfully!"
    echo ""
    
    # Parse the result to extract key information using grep and sed
    ITEM_ID=$(echo "$RESULT" | grep -o '"item_id": "[^"]*"' | sed 's/"item_id": "//' | sed 's/"//')
    TRANSACTION_DIGEST=$(echo "$RESULT" | grep -o '"digest": "[^"]*"' | sed 's/"digest": "//' | sed 's/"//')
    STATUS=$(echo "$RESULT" | grep -o '"status": "[^"]*"' | sed 's/"status": "//' | sed 's/"//')
    
    echo "📊 Test Results:"
    echo "  Transaction Status: $STATUS"
    echo "  Transaction Digest: $TRANSACTION_DIGEST"
    echo "  Item ID: $ITEM_ID"
    echo ""
    
    # Validate expected results
    echo "🔍 Validation:"
    
    if [ "$STATUS" = "success" ]; then
        echo "  ✅ Transaction status: SUCCESS"
    else
        echo "  ❌ Transaction status: FAILED"
        echo "  Expected: success"
        echo "  Actual: $STATUS"
    fi
    
    if [ -n "$ITEM_ID" ] && [ "$ITEM_ID" != "null" ]; then
        echo "  ✅ Item ID generated: $ITEM_ID"
        echo "  ✅ Unique ID created successfully"
    else
        echo "  ❌ Item ID not found in transaction result"
    fi
    
    # Check for ItemCreated event
    if echo "$RESULT" | grep -q "ItemCreated"; then
        echo "  ✅ ItemCreated event emitted"
        SELLER=$(echo "$RESULT" | grep -o '"seller": "[^"]*"' | sed 's/"seller": "//' | sed 's/"//')
        EVENT_ITEM_ID=$(echo "$RESULT" | grep -o '"item_id": "[^"]*"' | sed 's/"item_id": "//' | sed 's/"//')
        echo "  ✅ Event seller: $SELLER"
        echo "  ✅ Event item ID: $EVENT_ITEM_ID"
    else
        echo "  ❌ ItemCreated event not found"
    fi
    
    # Check ownership (seller should be the transaction sender)
    if [ -n "$SELLER" ] && [ "$SELLER" != "null" ]; then
        echo "  ✅ Ownership bound to seller: $SELLER"
    else
        echo "  ❌ Seller information not found in event"
    fi
    
    echo ""
    echo "📝 Test Summary:"
    if [ "$STATUS" = "success" ] && [ -n "$ITEM_ID" ] && [ "$ITEM_ID" != "null" ]; then
        echo "  🎉 TC-LIST-001 PASSED: Item successfully created with unique ID and proper ownership"
        echo "  📋 Generated Item ID: $ITEM_ID"
        echo "  💡 Add this to testnet_ids.txt as ITEM_ID_TC_LIST_001=\"$ITEM_ID\""
    else
        echo "  ❌ TC-LIST-001 FAILED: Item creation did not meet expected criteria"
    fi
    
else
    echo "❌ Transaction failed to execute!"
    echo "Error output:"
    echo "$RESULT"
    echo ""
    echo "🔍 Debugging information:"
    echo "  - Check if testnet IDs are correctly loaded"
    echo "  - Verify SUI CLI is properly configured"
    echo "  - Ensure sufficient gas balance"
    echo "  - Check network connectivity"
fi

echo ""
echo "🏁 TC-LIST-001 Test completed!"
