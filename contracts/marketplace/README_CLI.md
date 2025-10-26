# ThriftChain Marketplace - Sui CLI Guide

## Setup

The .env file has been created in contracts/marketplace/

## Current Status

The Marketplace contract has been published (Package ID: 0xf2750e04e2f827f761ed29248a868e66aa76c37e2a0828e6b9087b71be3ed7fa), but the Marketplace shared object has NOT been initialized yet.

## Next Steps

1. **Initialize the Marketplace** - The init() function creates the shared Marketplace object
2. **Find the Marketplace Object ID** - After initialization, you'll get the Marketplace object ID
3. **Create items** - Use create_item() to add items to the marketplace
4. **Query items** - Use get_item_by_id() to fetch item details

## Calling get_item_by_id

Once you have the Marketplace object ID and an Item ID:

```bash
source .env
sui client call \
  --package $MARKETPLACE_PACKAGE_ID \
  --module thriftchain \
  --function get_item_by_id \
  --args $MARKETPLACE_OBJECT_ID $ITEM_ID
```

Or use the view function:

```bash
sui client call \
  --package $MARKETPLACE_PACKAGE_ID \
  --module thriftchain \
  --function get_item_details_by_id \
  --args $MARKETPLACE_OBJECT_ID $ITEM_ID
```

## Functions Available

- get_item_by_id - Returns reference to ThriftItem
- get_item_details_by_id - Returns (title, description, price, category, seller, status)
- item_exists - Check if item exists
- get_marketplace_stats - Get marketplace statistics

