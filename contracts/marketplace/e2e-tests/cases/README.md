# Test Case Scripts

## Purpose

Test case scripts execute full test scenarios with validation, reporting, and tracking. They are named after test cases in `cases.md`.

## Script Pattern

Every test case script must follow this pattern:

```bash
#!/bin/bash

# 1. Load IDs
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "../devnet_ids.txt"

echo "🧪 TC-TEST-XXX: [Test Name]"
echo "Expected Result: [What should happen]"
echo ""

# 2. Setup: Create prerequisite objects if needed
echo "📋 Test Parameters:"
echo "  Marketplace: $MARKETPLACE_OBJECT_ID"
# ... other params

# 3. Execute the test
echo "🚀 Executing transaction..."
RESULT=$(sui client call ... --json 2>&1)

# 4. Validate and report
if [ $? -eq 0 ]; then
    echo "✅ Test PASSED"
    # Extract new IDs and remind to update
    NEW_ID=$(echo "$RESULT" | grep "item_id" | ...)
    echo "💾 Add to devnet_ids.txt: NEW_ID=\"$NEW_ID\""
else
    echo "❌ Test FAILED"
fi

echo ""
echo "🏁 TC-TEST-XXX completed!"
```

## CRITICAL: Always Update IDs File

**Test cases MUST update the IDs file when creating new objects:**

```bash
# After successful execution:
if [ -n "$NEW_OBJECT_ID" ]; then
    echo "💾 Add to devnet_ids.txt:"
    echo "ITEM_ID_TC_XXX=\"$NEW_OBJECT_ID\""
    # Optionally auto-append:
    # echo "ITEM_ID_TC_XXX=\"$NEW_OBJECT_ID\"" >> ../devnet_ids.txt
fi
```

## Test Case Structure

### TC-LIST-001: Create Item Success
- **Setup**: None required
- **Action**: Create item with valid parameters
- **Validate**: Transaction succeeds, event emitted, item ID generated
- **Update IDs**: Add new item ID to file

### TC-LIST-002: Create Item with Invalid Price
- **Setup**: None required
- **Action**: Create item with price=0
- **Validate**: Transaction fails with expected error code
- **Update IDs**: No new objects

### TC-LIST-003: Update Item Price
- **Setup**: Requires existing item (from TC-LIST-001)
- **Action**: Update price using update_item_price_by_id
- **Validate**: Transaction succeeds, event emitted, price updated
- **Update IDs**: No new objects

## Available Test Cases

See `cases.md` for complete test catalog. Current scripts:

- `TC-LIST-001.sh` - Create valid item
- `TC-LIST-002.sh` - Invalid price validation
- `TC-LIST-003.sh` - Update item price
- `TC-LIST-004.sh` - Unauthorized price update
- `TC-LIST-005.sh` - Cancel item

## Running Tests

### Run Individual Test
```bash
cd cases
bash TC-LIST-001.sh
```

### Run All Tests
```bash
cd cases
bash run_listing_tests.sh
```

## Test Output Format

```
🧪 TC-LIST-001: Create item with valid fields
Expected Result: Item created successfully

📋 Test Parameters:
  Marketplace: 0x1234...
  ItemCap: 0x5678...
  Title: Vintage Leather Jacket
  Price: 5 SUI

🚀 Executing transaction...

📊 Test Results:
  ✅ Transaction: SUCCESS
  ✅ Item ID: 0xabcd...
  ✅ Event: ItemCreated

📝 Test Summary:
  🎉 TC-LIST-001 PASSED

💾 Add to devnet_ids.txt:
  ITEM_ID_TC_LIST_001="0xabcd..."

🏁 TC-LIST-001 completed!
```

## Checklist for New Test Cases

- [ ] Loads IDs from parent directory
- [ ] Displays test name and expected result
- [ ] Shows all parameters and IDs used
- [ ] Executes with proper error handling
- [ ] Validates transaction success/failure
- [ ] Extracts and reports new object IDs
- [ ] **Reminds to update IDs file** (CRITICAL)
- [ ] Provides clear PASS/FAIL result
