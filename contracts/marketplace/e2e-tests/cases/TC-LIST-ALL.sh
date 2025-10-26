#!/bin/bash

# ============================================================================
# TC-LIST Test Suite Runner
# ============================================================================
# This script runs all TC-LIST tests in sequence and automatically captures
# and passes item IDs from TC-LIST-001 to tests 003, 004, and 005.
#
# Test Execution Order:
# 1. TC-LIST-001: Create a new item (captures ITEM_ID)
# 2. TC-LIST-002: Test invalid item creation (standalone)
# 3. TC-LIST-003: Update item price (uses ITEM_ID from test 001)
# 4. TC-LIST-004: Test unauthorized update (uses ITEM_ID from test 001)
# 5. TC-LIST-005: Delist/cancel item (uses ITEM_ID from test 001)
# ============================================================================

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CASES_DIR="$SCRIPT_DIR/cases"
DEVNET_IDS="$SCRIPT_DIR/devnet_ids.txt"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Test results tracking
PASSED_TESTS=()
FAILED_TESTS=()
SKIPPED_TESTS=()

# Print header
print_header() {
    echo ""
    echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${CYAN}║                     TC-LIST Test Suite Runner                              ║${NC}"
    echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Print section separator
print_separator() {
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Extract item ID from test output
extract_item_id() {
    local output="$1"
    # Try multiple patterns to extract item ID
    local item_id=$(echo "$output" | grep -o "Generated Item ID: 0x[a-fA-F0-9]\+" | sed 's/Generated Item ID: //')
    if [ -z "$item_id" ]; then
        item_id=$(echo "$output" | grep -o "Item ID: 0x[a-fA-F0-9]\+" | head -1 | sed 's/Item ID: //')
    fi
    echo "$item_id"
}

# Check test result from output
check_test_result() {
    local output="$1"
    local test_name="$2"
    
    if echo "$output" | grep -q "PASSED"; then
        PASSED_TESTS+=("$test_name")
        return 0
    elif echo "$output" | grep -q "SKIPPED"; then
        SKIPPED_TESTS+=("$test_name")
        return 2
    else
        FAILED_TESTS+=("$test_name")
        return 1
    fi
}

# Run a test case
run_test() {
    local test_script="$1"
    local test_name="$2"
    local description="$3"
    
    echo -e "${BOLD}${BLUE}▶ Running $test_name${NC}"
    echo -e "${MAGENTA}  Description: $description${NC}"
    echo ""
    
    # Execute the test and capture output
    local output
    output=$(bash "$test_script" 2>&1)
    local exit_code=$?
    
    # Display the output
    echo "$output"
    
    # Check result
    check_test_result "$output" "$test_name"
    local result=$?
    
    echo ""
    
    if [ $result -eq 0 ]; then
        echo -e "${GREEN}✅ $test_name completed successfully${NC}"
    elif [ $result -eq 2 ]; then
        echo -e "${YELLOW}⏸️  $test_name was skipped${NC}"
    else
        echo -e "${RED}❌ $test_name failed${NC}"
    fi
    
    print_separator
    
    # Return both the exit code and output (return output via echo)
    echo "$output"
    return $exit_code
}

# ============================================================================
# Main Test Execution
# ============================================================================

print_header

echo -e "${BOLD}Starting TC-LIST test suite execution...${NC}"
echo -e "Script Directory: $SCRIPT_DIR"
echo -e "Test Cases Directory: $CASES_DIR"
echo -e "Devnet IDs File: $DEVNET_IDS"
print_separator

# Load devnet IDs to verify they exist
if [ ! -f "$DEVNET_IDS" ]; then
    echo -e "${RED}❌ Error: devnet_ids.txt not found at $DEVNET_IDS${NC}"
    echo "Please ensure the file exists and contains the necessary deployment IDs."
    exit 1
fi

source "$DEVNET_IDS"

echo -e "${GREEN}✅ Loaded deployment configuration:${NC}"
echo "  Package ID: $MARKETPLACE_PACKAGE_ID"
echo "  Marketplace Object ID: $MARKETPLACE_OBJECT_ID"
echo "  Owner Address: $OWNER_ADDRESS"
print_separator

# ============================================================================
# TEST 1: TC-LIST-001 - Create a valid item
# ============================================================================

echo -e "${BOLD}${CYAN}[1/5] TC-LIST-001: List an item with valid fields${NC}"
echo ""

TEST_001_OUTPUT=$(run_test "$CASES_DIR/TC-LIST-001.sh" "TC-LIST-001" "Create a valid item listing")

# Extract the item ID for use in subsequent tests
ITEM_ID_TC_LIST_001=$(extract_item_id "$TEST_001_OUTPUT")

if [ -n "$ITEM_ID_TC_LIST_001" ] && [ "$ITEM_ID_TC_LIST_001" != "null" ]; then
    echo -e "${GREEN}✅ Captured Item ID for subsequent tests: $ITEM_ID_TC_LIST_001${NC}"
    export ITEM_ID_TC_LIST_001
    
    # Optionally write to a temporary file for reference
    echo "ITEM_ID_TC_LIST_001=\"$ITEM_ID_TC_LIST_001\"" > "$SCRIPT_DIR/.temp_test_ids.txt"
    echo -e "${CYAN}💾 Item ID saved to temporary file for reference${NC}"
else
    echo -e "${YELLOW}⚠️  Warning: Could not extract Item ID from TC-LIST-001${NC}"
    echo -e "${YELLOW}   Tests 003, 004, and 005 may be skipped${NC}"
fi

print_separator

# ============================================================================
# TEST 2: TC-LIST-002 - Test invalid item creation (standalone)
# ============================================================================

echo -e "${BOLD}${CYAN}[2/5] TC-LIST-002: Attempt listing with invalid price${NC}"
echo ""

run_test "$CASES_DIR/TC-LIST-002.sh" "TC-LIST-002" "Test validation with zero price" > /dev/null

# ============================================================================
# TEST 3: TC-LIST-003 - Update item price
# ============================================================================

echo -e "${BOLD}${CYAN}[3/5] TC-LIST-003: Update listing price by owner${NC}"
echo ""

if [ -n "$ITEM_ID_TC_LIST_001" ]; then
    echo -e "${CYAN}Using Item ID: $ITEM_ID_TC_LIST_001${NC}"
    echo ""
    run_test "$CASES_DIR/TC-LIST-003.sh" "TC-LIST-003" "Update price of created item" > /dev/null
else
    echo -e "${YELLOW}⚠️  Skipping TC-LIST-003: No Item ID available from TC-LIST-001${NC}"
    SKIPPED_TESTS+=("TC-LIST-003")
    print_separator
fi

# ============================================================================
# TEST 4: TC-LIST-004 - Test unauthorized update
# ============================================================================

echo -e "${BOLD}${CYAN}[4/5] TC-LIST-004: Update listing by non-owner${NC}"
echo ""

if [ -n "$ITEM_ID_TC_LIST_001" ]; then
    echo -e "${CYAN}Using Item ID: $ITEM_ID_TC_LIST_001${NC}"
    echo -e "${YELLOW}Note: This test requires a different address than the item owner${NC}"
    echo -e "${YELLOW}      It may be skipped if you're currently the owner${NC}"
    echo ""
    run_test "$CASES_DIR/TC-LIST-004.sh" "TC-LIST-004" "Test authorization (non-owner update)" > /dev/null
else
    echo -e "${YELLOW}⚠️  Skipping TC-LIST-004: No Item ID available from TC-LIST-001${NC}"
    SKIPPED_TESTS+=("TC-LIST-004")
    print_separator
fi

# ============================================================================
# TEST 5: TC-LIST-005 - Delist/cancel item
# ============================================================================

echo -e "${BOLD}${CYAN}[5/5] TC-LIST-005: Delist an item before any offers${NC}"
echo ""

if [ -n "$ITEM_ID_TC_LIST_001" ]; then
    echo -e "${CYAN}Using Item ID: $ITEM_ID_TC_LIST_001${NC}"
    echo -e "${YELLOW}Note: This test will cancel the item created in TC-LIST-001${NC}"
    echo -e "${YELLOW}      It requires you to be the item owner${NC}"
    echo ""
    run_test "$CASES_DIR/TC-LIST-005.sh" "TC-LIST-005" "Cancel/delist the created item" > /dev/null
else
    echo -e "${YELLOW}⚠️  Skipping TC-LIST-005: No Item ID available from TC-LIST-001${NC}"
    SKIPPED_TESTS+=("TC-LIST-005")
    print_separator
fi

# ============================================================================
# Test Suite Summary
# ============================================================================

echo ""
echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║                          Test Suite Summary                                ║${NC}"
echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BOLD}Test Results:${NC}"
echo ""

# Count results
TOTAL_TESTS=5
PASSED_COUNT=${#PASSED_TESTS[@]}
FAILED_COUNT=${#FAILED_TESTS[@]}
SKIPPED_COUNT=${#SKIPPED_TESTS[@]}

# Display passed tests
if [ $PASSED_COUNT -gt 0 ]; then
    echo -e "${GREEN}✅ Passed Tests ($PASSED_COUNT):${NC}"
    for test in "${PASSED_TESTS[@]}"; do
        echo -e "   ${GREEN}✓${NC} $test"
    done
    echo ""
fi

# Display failed tests
if [ $FAILED_COUNT -gt 0 ]; then
    echo -e "${RED}❌ Failed Tests ($FAILED_COUNT):${NC}"
    for test in "${FAILED_TESTS[@]}"; do
        echo -e "   ${RED}✗${NC} $test"
    done
    echo ""
fi

# Display skipped tests
if [ $SKIPPED_COUNT -gt 0 ]; then
    echo -e "${YELLOW}⏸️  Skipped Tests ($SKIPPED_COUNT):${NC}"
    for test in "${SKIPPED_TESTS[@]}"; do
        echo -e "   ${YELLOW}○${NC} $test"
    done
    echo ""
fi

# Overall statistics
echo -e "${BOLD}Statistics:${NC}"
echo -e "  Total Tests:   $TOTAL_TESTS"
echo -e "  ${GREEN}Passed:        $PASSED_COUNT${NC}"
echo -e "  ${RED}Failed:        $FAILED_COUNT${NC}"
echo -e "  ${YELLOW}Skipped:       $SKIPPED_COUNT${NC}"
echo ""

# Calculate success rate (excluding skipped)
EXECUTED_TESTS=$((TOTAL_TESTS - SKIPPED_COUNT))
if [ $EXECUTED_TESTS -gt 0 ]; then
    SUCCESS_RATE=$((PASSED_COUNT * 100 / EXECUTED_TESTS))
    echo -e "${BOLD}Success Rate:  ${SUCCESS_RATE}% ($PASSED_COUNT/$EXECUTED_TESTS executed tests)${NC}"
else
    echo -e "${YELLOW}No tests were executed${NC}"
fi

echo ""

# Final status
if [ $FAILED_COUNT -eq 0 ] && [ $PASSED_COUNT -gt 0 ]; then
    echo -e "${GREEN}${BOLD}🎉 All executed tests passed!${NC}"
    EXIT_CODE=0
elif [ $EXECUTED_TESTS -eq 0 ]; then
    echo -e "${YELLOW}${BOLD}⚠️  All tests were skipped${NC}"
    EXIT_CODE=2
else
    echo -e "${RED}${BOLD}❌ Some tests failed${NC}"
    EXIT_CODE=1
fi

echo ""

# Cleanup
if [ -f "$SCRIPT_DIR/.temp_test_ids.txt" ]; then
    echo -e "${CYAN}💡 Temporary IDs saved in: $SCRIPT_DIR/.temp_test_ids.txt${NC}"
    echo -e "${CYAN}   You can review or update testnet_ids.txt with these values${NC}"
    echo ""
fi

echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║                     TC-LIST Test Suite Completed                           ║${NC}"
echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

exit $EXIT_CODE

