#!/bin/bash

# Run All TC-ESCROW Tests
# This script executes all escrow protection test cases in sequence

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     TC-ESCROW Test Suite - Escrow Protection Tests        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
TOTAL=0
PASSED=0
FAILED=0
SKIPPED=0

# Test list
TESTS=(
    "TC-ESCROW-001"
    "TC-ESCROW-002"
    "TC-ESCROW-003"
    "TC-ESCROW-004"
    "TC-ESCROW-005"
)

# Run each test
for TEST in "${TESTS[@]}"; do
    TOTAL=$((TOTAL + 1))
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Running $TEST..."
    echo ""
    
    OUTPUT=$(./${TEST}.sh 2>&1)
    EXIT_CODE=$?
    
    echo "$OUTPUT"
    
    if echo "$OUTPUT" | grep -q "SKIPPING\|skipped due to design limitation"; then
        SKIPPED=$((SKIPPED + 1))
        echo -e "${YELLOW}⏭️  $TEST SKIPPED (Design Limitation)${NC}"
    elif echo "$OUTPUT" | grep -q "PASSED"; then
        PASSED=$((PASSED + 1))
        echo -e "${GREEN}✅ $TEST PASSED${NC}"
    else
        FAILED=$((FAILED + 1))
        echo -e "${RED}❌ $TEST FAILED${NC}"
    fi
    
    echo ""
    sleep 1
done

# Summary
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    TEST SUITE SUMMARY                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Total Tests:   $TOTAL"
echo -e "${GREEN}Passed:        $PASSED${NC}"
echo -e "${RED}Failed:        $FAILED${NC}"
echo -e "${YELLOW}Skipped:       $SKIPPED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All implemented tests passed successfully!${NC}"
    if [ $SKIPPED -gt 0 ]; then
        echo -e "${YELLOW}⚠️  $SKIPPED test(s) skipped due to design limitations${NC}"
        echo "   (See TC-ESCROW-SUMMARY.md for details)"
    fi
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please review the output above.${NC}"
    exit 1
fi

