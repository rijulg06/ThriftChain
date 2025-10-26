#!/bin/bash

# TC-PAYMENT-ALL: Run all payment and fund transfer test cases
# This suite tests the new SUI coin transfer functionality in the escrow system

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║      ThriftChain Payment Test Suite (TC-PAYMENT-ALL)     ║"
echo "║      Testing SUI Coin Transfer in Escrow System          ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Track test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Array to store test names and results
declare -a TEST_RESULTS

# Function to run a test and track results
run_test() {
    local test_name=$1
    local test_script=$2
    
    echo ""
    echo "═════════════════════════════════════════════════════════════"
    echo "Running: $test_name"
    echo "═════════════════════════════════════════════════════════════"
    echo ""
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Run the test and capture output
    if bash "$SCRIPT_DIR/$test_script" 2>&1 | tee /tmp/test_output_$$.log; then
        # Check if test passed based on output
        if grep -q "PASSED" /tmp/test_output_$$.log; then
            PASSED_TESTS=$((PASSED_TESTS + 1))
            TEST_RESULTS+=("✅ $test_name - PASSED")
        else
            FAILED_TESTS=$((FAILED_TESTS + 1))
            TEST_RESULTS+=("❌ $test_name - FAILED")
        fi
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        TEST_RESULTS+=("❌ $test_name - ERROR")
    fi
    
    rm -f /tmp/test_output_$$.log
    
    echo ""
    echo "─────────────────────────────────────────────────────────────"
    sleep 2  # Brief pause between tests
}

# Run all payment test cases
run_test "TC-PAYMENT-001: Accept offer with exact payment" "TC-PAYMENT-001.sh"
run_test "TC-PAYMENT-002: Reject incorrect payment amount" "TC-PAYMENT-002.sh"
run_test "TC-PAYMENT-003: Seller receives funds on delivery" "TC-PAYMENT-003.sh"
run_test "TC-PAYMENT-004: Buyer receives refund on dispute" "TC-PAYMENT-004.sh"
run_test "TC-PAYMENT-005: Verify escrow balance" "TC-PAYMENT-005.sh"

# Print summary
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                    TEST SUITE SUMMARY                     ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Test Results:"
for result in "${TEST_RESULTS[@]}"; do
    echo "  $result"
done
echo ""
echo "═════════════════════════════════════════════════════════════"
echo "Total Tests:  $TOTAL_TESTS"
echo "Passed:       $PASSED_TESTS"
echo "Failed:       $FAILED_TESTS"
echo "Pass Rate:    $(awk "BEGIN {printf \"%.1f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")%"
echo "═════════════════════════════════════════════════════════════"

if [ $FAILED_TESTS -eq 0 ]; then
    echo ""
    echo "🎉 All payment tests passed! SUI coin transfer working correctly."
    exit 0
else
    echo ""
    echo "⚠️ Some tests failed. Review the output above for details."
    exit 1
fi



