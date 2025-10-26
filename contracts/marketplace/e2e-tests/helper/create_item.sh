#!/bin/bash

# Load IDs from parent directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "../devnet_ids.txt"

# Function parameters (customize these values as needed)
TITLE="Vintage Leather Jacket"
DESCRIPTION="A beautiful vintage leather jacket in excellent condition. Perfect for the fall season."
PRICE="5000000000"  # 5 SUI in MIST (1 SUI = 1,000,000,000 MIST)
CATEGORY="Clothing"
TAGS='["vintage", "leather", "jacket", "fall", "fashion"]'
WALRUS_IMAGE_IDS='["image1_blob_id", "image2_blob_id"]'  # Replace with actual Walrus blob IDs
CONDITION="Excellent"
BRAND="Vintage Brand"
SIZE="Large"
COLOR="Brown"
MATERIAL="Leather"

# Debug: Show loaded variables
echo "📋 Loaded IDs from devnet_ids.txt:"
echo "  Package ID: $MARKETPLACE_PACKAGE_ID"
echo "  Marketplace Object ID: $MARKETPLACE_OBJECT_ID"
echo "  ItemCap Object ID: $ITEMCAP_OBJECT_ID"
echo "  Clock Object ID: $CLOCK_OBJECT_ID"
echo ""

echo "🚀 Executing: create_item"
echo ""
echo "📝 Parameters:"
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

# Execute the SUI command
sui client call \
    --package $MARKETPLACE_PACKAGE_ID \
    --module thriftchain \
    --function create_item \
    --args $MARKETPLACE_OBJECT_ID $ITEMCAP_OBJECT_ID "$TITLE" "$DESCRIPTION" "$PRICE" "$CATEGORY" "$TAGS" "$WALRUS_IMAGE_IDS" "$CONDITION" "$BRAND" "$SIZE" "$COLOR" "$MATERIAL" 0x6 \
    --gas-budget 100000000 \
    --json

echo ""
echo "✅ Transaction submitted!"
echo ""
echo "💾 CRITICAL: Extract the item ID from the transaction output above"
echo "   and add it to ../devnet_ids.txt in the CREATED ITEMS section."
echo "   Format: ITEM_ID_XXX=\"0x...\" # Description"
echo ""
echo "   Example:"
echo "   ITEM_ID_TC_LIST_001=\"0x123...\" # Test item for TC-LIST-001"
