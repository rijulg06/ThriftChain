# Helper Scripts

## Purpose

Helper scripts provide simple, developer-friendly wrappers around Sui CLI commands. They abstract complex command-line arguments into readable, parameterized scripts.

## Script Pattern

Every helper script must follow this exact pattern:

```bash
#!/bin/bash

# 1. Load IDs from parent directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "../devnet_ids.txt"  # or "../testnet_ids.txt"

# 2. Define parameters at the top (easily customizable)
PARAMETER_1="value1"
PARAMETER_2="value2"

# 3. Display what will be executed
echo "📋 Executing: [function_name]"
echo "Package: $MARKETPLACE_PACKAGE_ID"
echo "Marketplace: $MARKETPLACE_OBJECT_ID"
echo "Parameter 1: $PARAMETER_1"
echo ""

# 4. Execute the Sui command (with --json for parsing)
sui client call \
    --package $MARKETPLACE_PACKAGE_ID \
    --module thriftchain \
    --function function_name \
    --args $PARAMETER_1 $PARAMETER_2 \
    --gas-budget 100000000 \
    --json

echo ""
echo "✅ Transaction submitted!"
```

## CRITICAL: Updating IDs File

**If your script creates ANY new objects, you MUST add them to the IDs file:**

```bash
# After executing a command that creates objects, add to devnet_ids.txt:
echo ""
echo "💾 IMPORTANT: Add these IDs to devnet_ids.txt:"
echo "NEW_OBJECT_ID=\"$(extract_id_from_output)\""
echo ""
```

## Complete Example

See `create_item.sh` for the perfect reference implementation.

## Script Checklist

- [ ] Loads IDs from parent directory
- [ ] Defines all parameters at the top
- [ ] Displays parameters and IDs before execution
- [ ] Executes the Sui command with --json
- [ ] Shows raw output (no parsing)
- [ ] Reminds user to update IDs file if objects were created
- [ ] Includes usage comments in the file header

## Available Helper Scripts

| Script | Function | Parameters | Creates Objects? |
|--------|----------|------------|------------------|
| `create_item.sh` | create_item | title, desc, price, etc. | Yes (ThriftItem) |
| TODO | update_item_price_by_id | marketplace, item_id, new_price | No |
| TODO | cancel_item_by_id | marketplace, item_id | No |
| TODO | create_offer | marketplace, item_id, amount, msg | Yes (Offer) |

## Usage Examples

### Example 1: Create an Item
```bash
cd helper
./create_item.sh
```

### Example 2: Customize Parameters
Edit the script to modify:
```bash
TITLE="Your Custom Title"
PRICE="10000000000"  # 10 SUI
```

## Next Steps

Create helper scripts for ALL remaining smart contract functions:
- update_item_price_by_id
- cancel_item_by_id  
- create_offer
- counter_offer
- accept_offer
- reject_offer
- confirm_delivery
- dispute_escrow
- refund_escrow
