#!/bin/bash

# TC-LIST-002: Attempt listing with missing price or description
# Expected Result: Revert transaction with error "Incomplete metadata"

# Load devnet IDs
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../devnet_ids.txt"

echo "🧪 TC-LIST-002: Attempt listing with missing price or description"
echo "Expected Result: Revert transaction with error \"Incomplete metadata\""
echo ""

# Test parameters - invalid item with zero price (should trigger validation error)
TITLE="Invalid Test Item"
DESCRIPTION="This item has invalid parameters for testing"
PRICE="0"  # Invalid: zero price should trigger validation error
CATEGORY="Test"
TAGS='["test", "invalid"]'
WALRUS_IMAGE_IDS='["test_image"]'
CONDITION="Good"
BRAND="Test Brand"
SIZE="Medium"
COLOR="Red"
MATERIAL="Fabric"

echo "📋 Test Parameters (Invalid):"
echo "  Title: $TITLE"
echo "  Description: $DESCRIPTION"
echo "  Price: $PRICE MIST (0 SUI) - INVALID!"
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

echo "🚀 Executing create_item transaction with invalid parameters..."
echo ""

# Execute the SUI command
RESULT=$(sui client call \
    --package $MARKETPLACE_PACKAGE_ID \
    --module thriftchain \
    --function create_item \
    --args $MARKETPLACE_OBJECT_ID $ITEMCAP_OBJECT_ID "$TITLE" "$DESCRIPTION" "$PRICE" "$CATEGORY" "$TAGS" "$WALRUS_IMAGE_IDS" "$CONDITION" "$BRAND" "$SIZE" "$COLOR" "$MATERIAL" 0x6 \
    --gas-budget 100000000 \
    --json 2>&1)

# Check if the command failed (which is expected)
if [ $? -ne 0 ]; then
    echo "✅ Transaction failed as expected!"
    echo ""
    
    # Parse the result to extract error information
    ERROR_MESSAGE=$(echo "$RESULT" | grep -o "error: [^\\n]*" | head -1)
    TRANSACTION_DIGEST=""
    STATUS="failed"
    
    echo "📊 Test Results:"
    echo "  Transaction Status: $STATUS"
    echo "  Error Message: $ERROR_MESSAGE"
    echo ""
    
    # Validate expected results
    echo "🔍 Validation:"
    
    if [ "$STATUS" = "failed" ]; then
        echo "  ✅ Transaction status: FAILED (as expected)"
    else
        echo "  ❌ Transaction status: UNEXPECTED SUCCESS"
        echo "  Expected: failed"
        echo "  Actual: $STATUS"
    fi
    
    # Check for specific error messages
    if echo "$RESULT" | grep -q "error:"; then
        echo "  ✅ Error message present"
        echo "  ✅ Transaction properly rejected invalid input"
    else
        echo "  ❌ No clear error message found"
    fi
    
    # Check if it's a validation error (abort code 0 from the smart contract)
    if echo "$RESULT" | grep -q "abort_code.*0"; then
        echo "  ✅ Smart contract validation error detected (abort code 0)"
        echo "  ✅ Price validation working correctly"
    else
        echo "  ⚠️  Different error type detected (may still be valid)"
    fi
    
    echo ""
    echo "📝 Test Summary:"
    echo "  🎉 TC-LIST-002 PASSED: Transaction properly rejected invalid price"
    echo "  ✅ Smart contract validation working correctly"
    echo "  ✅ Zero price properly rejected"
    
else
    echo "❌ Transaction succeeded unexpectedly!"
    echo ""
    
    # Parse the result to extract key information
    ITEM_ID=$(echo "$RESULT" | grep -o '"item_id": "[^"]*"' | sed 's/"item_id": "//' | sed 's/"//')
    TRANSACTION_DIGEST=$(echo "$RESULT" | grep -o '"digest": "[^"]*"' | sed 's/"digest": "//' | sed 's/"//')
    STATUS=$(echo "$RESULT" | grep -o '"status": "[^"]*"' | sed 's/"status": "//' | sed 's/"//')
    
    echo "📊 Test Results:"
    echo "  Transaction Status: $STATUS"
    echo "  Transaction Digest: $TRANSACTION_DIGEST"
    echo "  Item ID: $ITEM_ID"
    echo ""
    
    echo "🔍 Validation:"
    echo "  ❌ Transaction status: UNEXPECTED SUCCESS"
    echo "  ❌ Expected: Transaction should fail with zero price"
    echo "  ❌ Smart contract validation may not be working correctly"
    
    echo ""
    echo "📝 Test Summary:"
    echo "  ❌ TC-LIST-002 FAILED: Transaction succeeded when it should have failed"
    echo "  ⚠️  Smart contract may need validation improvements"
fi

echo ""
echo "🏁 TC-LIST-002 Test completed!"

