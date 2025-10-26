# TC-LIST Test Suite Runner

This directory contains an automated test runner for all TC-LIST (listing-related) test cases.

## Overview

The `run_all_tc_list_tests.sh` script orchestrates the execution of all TC-LIST tests in the correct order, automatically capturing and passing item IDs between tests.

## Test Cases

1. **TC-LIST-001**: Create a valid item listing
   - Creates a new item with all required fields
   - Generates an Item ID used by subsequent tests
   - **Status**: Standalone (creates prerequisite)

2. **TC-LIST-002**: Test invalid item creation
   - Attempts to create an item with zero price
   - Should fail with validation error
   - **Status**: Standalone (no dependencies)

3. **TC-LIST-003**: Update item price by owner
   - Updates the price of the item created in TC-LIST-001
   - Tests successful price modification
   - **Status**: Depends on TC-LIST-001

4. **TC-LIST-004**: Test unauthorized update
   - Attempts to update item price from a different address
   - Should fail with authorization error
   - **Status**: Depends on TC-LIST-001
   - **Note**: May be skipped if current address is the owner

5. **TC-LIST-005**: Delist/cancel item
   - Cancels the item created in TC-LIST-001
   - Tests successful item cancellation
   - **Status**: Depends on TC-LIST-001

## Usage

### Quick Start

```bash
# Navigate to the e2e-tests directory
cd contracts/marketplace/e2e-tests

# Run all TC-LIST tests
./run_all_tc_list_tests.sh
```

### Prerequisites

1. **SUI CLI installed and configured**
   ```bash
   sui client --version
   ```

2. **Active SUI address with sufficient balance**
   ```bash
   sui client active-address
   sui client gas
   ```

3. **Deployment IDs configured**
   - Ensure `devnet_ids.txt` or `testnet_ids.txt` exists and contains:
     - `MARKETPLACE_PACKAGE_ID`
     - `MARKETPLACE_OBJECT_ID`
     - `ITEMCAP_OBJECT_ID`
     - `CLOCK_OBJECT_ID`
     - `OWNER_ADDRESS`

### Script Features

#### Automatic ID Capture
The script automatically captures the Item ID from TC-LIST-001 and passes it to tests 003, 004, and 005:

```bash
# TC-LIST-001 creates an item
# Script captures: ITEM_ID_TC_LIST_001="0x..."

# Tests 003, 004, 005 automatically use this ID
export ITEM_ID_TC_LIST_001
```

#### Temporary ID Storage
The script saves captured IDs to `.temp_test_ids.txt` for reference:

```bash
# View captured IDs
cat .temp_test_ids.txt
```

You can add these to your `devnet_ids.txt` or `testnet_ids.txt` for future test runs.

#### Colorful Output
The script provides clear, colorful output with:
- ✅ Green for passed tests
- ❌ Red for failed tests
- ⏸️  Yellow for skipped tests
- 🧪 Test descriptions and parameters
- 📊 Detailed test results
- 📝 Comprehensive summary

#### Test Summary
At the end of execution, you'll see:
- List of passed tests
- List of failed tests
- List of skipped tests
- Success rate calculation
- Overall test suite status

### Test Flow Diagram

```
┌─────────────────┐
│  TC-LIST-001    │  Creates item
│  (Create Item)  │  ↓ Captures ITEM_ID
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│  TC-LIST-002    │  │  TC-LIST-003    │  Uses ITEM_ID
│  (Invalid Item) │  │  (Update Price) │
└─────────────────┘  └────────┬────────┘
                              │
                     ┌────────┴────────┐
                     ▼                 ▼
            ┌─────────────────┐  ┌─────────────────┐
            │  TC-LIST-004    │  │  TC-LIST-005    │  Uses ITEM_ID
            │  (Unauthorized) │  │  (Delist Item)  │
            └─────────────────┘  └─────────────────┘
```

## Running Individual Tests

You can still run individual test cases:

```bash
# Run a specific test
cd cases
./TC-LIST-001.sh

# Run with prerequisite
export ITEM_ID_TC_LIST_001="0x..."  # From previous test
./TC-LIST-003.sh
```

## Understanding Test Results

### Successful Run
```
✅ Passed Tests (5):
   ✓ TC-LIST-001
   ✓ TC-LIST-002
   ✓ TC-LIST-003
   ✓ TC-LIST-004
   ✓ TC-LIST-005

Success Rate: 100% (5/5 executed tests)
🎉 All executed tests passed!
```

### Skipped Tests
Tests may be skipped if:
- Prerequisites are missing (no Item ID from TC-LIST-001)
- Current address doesn't meet requirements (TC-LIST-004)
- Item is already cancelled/sold

```
⏸️  Skipped Tests (2):
   ○ TC-LIST-004  (current address is owner)
   ○ TC-LIST-005  (already cancelled)
```

### Failed Tests
```
❌ Failed Tests (1):
   ✗ TC-LIST-003

🔍 Check the detailed output above for error messages
```

## Troubleshooting

### "devnet_ids.txt not found"
```bash
# Ensure you're in the correct directory
cd contracts/marketplace/e2e-tests

# Check if file exists
ls -la devnet_ids.txt
```

### "Insufficient gas balance"
```bash
# Check your balance
sui client gas

# Request devnet gas if needed
curl --location --request POST 'https://faucet.devnet.sui.io/gas' \
--header 'Content-Type: application/json' \
--data-raw '{"FixedAmountRequest":{"recipient":"YOUR_ADDRESS"}}'
```

### "Item already cancelled"
If TC-LIST-005 cancels the item, you'll need to run TC-LIST-001 again to create a new item for subsequent test runs.

### Tests 003-005 Skipped
This means TC-LIST-001 didn't successfully create an item or the Item ID wasn't captured. Check TC-LIST-001 output for errors.

## Testing on Different Networks

### Devnet (default)
```bash
# Uses devnet_ids.txt
./run_all_tc_list_tests.sh
```

### Testnet
```bash
# Update the script to use testnet_ids.txt
# Or manually source testnet IDs before running tests
source testnet_ids.txt
./run_all_tc_list_tests.sh
```

## Exit Codes

- `0`: All executed tests passed
- `1`: Some tests failed
- `2`: All tests were skipped

## Advanced Usage

### Running with Different Accounts

For TC-LIST-004 (authorization test), you may want to switch accounts:

```bash
# Run TC-LIST-001 as owner
./run_all_tc_list_tests.sh

# Note the Item ID from output
ITEM_ID="0x..."

# Switch to different address for authorization test
sui client switch --address <different-address>

# Run only TC-LIST-004
export ITEM_ID_TC_LIST_001="$ITEM_ID"
cd cases
./TC-LIST-004.sh
```

### Continuous Testing

Run the test suite multiple times:

```bash
# Run 5 times to test consistency
for i in {1..5}; do
    echo "Run $i"
    ./run_all_tc_list_tests.sh
    sleep 5
done
```

## File Structure

```
e2e-tests/
├── run_all_tc_list_tests.sh    # Main test runner script
├── TC-LIST-README.md            # This file
├── devnet_ids.txt               # Devnet deployment IDs
├── testnet_ids.txt              # Testnet deployment IDs (if applicable)
├── .temp_test_ids.txt           # Temporary IDs (generated during test run)
└── cases/
    ├── TC-LIST-001.sh           # Individual test scripts
    ├── TC-LIST-002.sh
    ├── TC-LIST-003.sh
    ├── TC-LIST-004.sh
    └── TC-LIST-005.sh
```

## Next Steps

After running the TC-LIST test suite:

1. **Update configuration** (optional):
   ```bash
   # Add captured Item ID to your IDs file for future reference
   cat .temp_test_ids.txt >> devnet_ids.txt
   ```

2. **Run other test suites**:
   - TC-OFFER tests (offer-related functionality)
   - TC-PURCHASE tests (purchase-related functionality)

3. **Review test results** and investigate any failures

## Support

For issues or questions:
1. Check the detailed test output in the terminal
2. Review individual test scripts in the `cases/` directory
3. Verify deployment IDs in `devnet_ids.txt`
4. Check SUI CLI configuration and network connectivity

---

**Happy Testing! 🧪**

