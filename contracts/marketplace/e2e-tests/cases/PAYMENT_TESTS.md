# Payment & Fund Transfer Test Cases

## Overview

This suite tests the **new SUI coin transfer functionality** implemented in the ThriftChain smart contract. These tests verify that actual SUI tokens are properly locked in escrow, transferred to sellers on delivery confirmation, and refunded to buyers on disputes.

## Test Architecture

All payment tests follow the standard test case pattern defined in `README.md`, with additional balance verification steps to confirm actual on-chain fund transfers.

## Test Cases

### TC-PAYMENT-001: Accept Offer with Exact Payment ✅

**Purpose:** Verify that the `accept_offer_by_id_with_payment` function properly locks payment in escrow.

**Flow:**
1. Seller creates item
2. Buyer makes offer (8 SUI)
3. Seller accepts offer WITH payment
4. **Verification:** Escrow created with funds locked

**Expected Result:** 
- Transaction succeeds
- Escrow object created
- `held_funds` field contains payment
- Status = 0 (Active)

**Smart Contract Function Tested:**
```move
public entry fun accept_offer_by_id_with_payment(
    marketplace: &mut Marketplace,
    offer_id: ID,
    item_id: ID,
    payment: Coin<SUI>,  // <-- Payment locked here
    clock: &Clock,
    ctx: &mut TxContext
)
```

---

### TC-PAYMENT-002: Reject Incorrect Payment Amount ❌ (Negative Test)

**Purpose:** Verify payment amount validation (security test).

**Flow:**
1. Seller creates item
2. Buyer makes offer (8 SUI)
3. Seller attempts to accept with WRONG payment amount
4. **Verification:** Transaction rejected with error code 40

**Expected Result:**
- Transaction fails (expected behavior)
- Error code 40: "Payment must match offer amount"
- No escrow created
- Funds not locked

**Security Feature Tested:**
```move
// Validate payment amount
let payment_value = coin::value(&payment);
assert!(payment_value == offer.amount, 40);  // <-- This validation
```

---

### TC-PAYMENT-003: Seller Receives Funds on Delivery 💰

**Purpose:** Verify that `confirm_delivery_by_id` transfers funds from escrow to seller.

**Flow:**
1. Seller creates item
2. Buyer makes offer (5 SUI)
3. Seller accepts offer with payment (escrow created)
4. Buyer confirms delivery
5. **Verification:** Seller's balance increases by ~5 SUI

**Expected Result:**
- Transaction succeeds
- Funds withdrawn from escrow
- Funds transferred to seller's wallet
- Seller balance increases
- Escrow status = 1 (Completed)
- Item status = 1 (Sold)

**Smart Contract Function Tested:**
```move
// Transfer held funds to seller
let payment = coin::from_balance(balance::withdraw_all(&mut escrow.held_funds), ctx);
transfer::public_transfer(payment, escrow.seller);  // <-- Fund transfer
```

---

### TC-PAYMENT-004: Buyer Receives Refund on Dispute 💸

**Purpose:** Verify that `refund_escrow_by_id` returns funds from escrow to buyer.

**Flow:**
1. Seller creates item
2. Buyer makes offer (6 SUI)
3. Seller accepts offer with payment (escrow created)
4. Buyer disputes escrow
5. Seller issues refund
6. **Verification:** Buyer receives refund back

**Expected Result:**
- Dispute transaction succeeds
- Escrow status = 2 (Disputed)
- Refund transaction succeeds
- Funds withdrawn from escrow
- Funds transferred to buyer's wallet
- Escrow status = 3 (Refunded)

**Smart Contract Function Tested:**
```move
// Refund held funds to buyer
let refund = coin::from_balance(balance::withdraw_all(&mut escrow.held_funds), ctx);
transfer::public_transfer(refund, escrow.buyer);  // <-- Refund transfer
```

---

### TC-PAYMENT-005: Verify Escrow Balance 🔍

**Purpose:** Verify that payment is correctly stored in escrow's `held_funds` field.

**Flow:**
1. Seller creates item
2. Buyer makes offer (7 SUI)
3. Seller accepts offer with payment
4. **Verification:** Query escrow object, check `held_funds` value

**Expected Result:**
- Escrow object exists on-chain
- `held_funds` field contains exactly 7000000000 MIST
- Amount matches offer amount exactly
- Funds are blockchain-verifiable

**Verification Query:**
```bash
sui client object $ESCROW_ID --json | jq '.data.content.fields.held_funds'
```

---

## Running the Tests

### Run Individual Test
```bash
cd contracts/marketplace/e2e-tests/cases
bash TC-PAYMENT-001.sh
```

### Run Complete Payment Test Suite
```bash
cd contracts/marketplace/e2e-tests/cases
bash TC-PAYMENT-ALL.sh
```

### Expected Output (All Tests)
```
╔═══════════════════════════════════════════════════════════╗
║      ThriftChain Payment Test Suite (TC-PAYMENT-ALL)     ║
║      Testing SUI Coin Transfer in Escrow System          ║
╚═══════════════════════════════════════════════════════════╝

Running: TC-PAYMENT-001: Accept offer with exact payment
✅ TC-PAYMENT-001 PASSED

Running: TC-PAYMENT-002: Reject incorrect payment amount
✅ TC-PAYMENT-002 PASSED

Running: TC-PAYMENT-003: Seller receives funds on delivery
✅ TC-PAYMENT-003 PASSED

Running: TC-PAYMENT-004: Buyer receives refund on dispute
✅ TC-PAYMENT-004 PASSED

Running: TC-PAYMENT-005: Verify escrow balance
✅ TC-PAYMENT-005 PASSED

╔═══════════════════════════════════════════════════════════╗
║                    TEST SUITE SUMMARY                     ║
╚═══════════════════════════════════════════════════════════╝

Total Tests:  5
Passed:       5
Failed:       0
Pass Rate:    100.0%

🎉 All payment tests passed! SUI coin transfer working correctly.
```

---

## Prerequisites

### 1. Contract Deployed
The smart contract must be deployed with the new payment functions:
- `accept_offer_by_id_with_payment`
- Updated `confirm_delivery_by_id` (with fund transfer)
- Updated `refund_escrow_by_id` (with fund transfer)

### 2. Environment Variables
File `../devnet_ids.txt` must contain:
```bash
MARKETPLACE_PACKAGE_ID="0x..."
MODULE_NAME="thriftchain"
MARKETPLACE_OBJECT_ID="0x..."
ITEMCAP_OBJECT_ID="0x..."
CLOCK_OBJECT_ID="0x6"
```

### 3. Test Wallets
Two wallets configured in `sui client`:
- `upbeat-spodumene` (Seller)
- `nostalgic-ruby` (Buyer)

Both wallets must have sufficient SUI for:
- Gas fees (~0.1 SUI per transaction)
- Test payments (5-10 SUI per test)

### 4. Dependencies
- `sui` CLI installed and configured
- `jq` for JSON parsing
- `bash` 4.0+

---

## Important Notes

### Balance Verification
Tests verify that funds are transferred by checking wallet balances before and after transactions. Due to gas costs, exact balance comparisons account for:
- Gas used for offer creation
- Gas used for accepting offers
- Gas used for confirming delivery
- Gas used for disputes/refunds

### Gas Coin Handling
Tests use gas coins as payment sources. In production:
- Frontend should split coins for exact payment amounts
- Use `TransactionBlock.splitCoins()` for precision
- Avoid using gas coin directly

### Timing
Tests include 2-second delays after transactions to allow blockchain state updates to propagate before querying balances.

---

## Troubleshooting

### Test Fails: "Payment must match offer amount"
**Cause:** Gas coin used has different value than offer amount.

**Solution:** 
- Tests automatically handle this by using available gas coins
- If persistent, ensure wallets have multiple coins of various sizes

### Test Passes but Balance Unchanged
**Cause:** Gas costs exceeded payment amount.

**Solution:**
- Normal for small payments
- Tests check transaction success via events, not just balance
- Use larger payment amounts (5-10 SUI) for clearer verification

### Error Code 40 Not Detected (TC-PAYMENT-002)
**Cause:** Different error format than expected.

**Solution:**
- Check transaction output for "abort" or "error"
- Test still valid if transaction rejected
- Update grep pattern if needed

---

## Alignment with PRD

These tests verify compliance with PRD requirements:

- ✅ **FR-022:** ALL payments via Sui blockchain smart contracts
- ✅ **FR-023:** On-chain escrow with buyer/seller confirmation
- ✅ **FR-024:** SUI token payments
- ✅ **FR-025:** Automatic refund via smart contract on dispute
- ✅ **FR-026:** Transaction history queryable on-chain

---

## Related Documentation

- `../../COIN_TRANSFER_IMPLEMENTATION.md` - Technical implementation details
- `../../PAYMENT_QUICK_START.md` - Quick reference for using payment functions
- `README.md` - General test case pattern and conventions
- `cases.md` - Complete test catalog with all categories

---

## Test Maintenance

### Adding New Payment Tests
Follow the standard pattern from `TC-PAYMENT-001.sh`:
1. Load environment variables
2. Create prerequisites (item, offer)
3. Execute payment-related function
4. Verify on-chain state changes
5. Check wallet balances
6. Report results

### Updating for Contract Changes
If smart contract payment logic changes:
1. Update function names in test scripts
2. Adjust error codes if changed
3. Update balance verification logic
4. Retest entire suite

---

## Success Criteria

Payment test suite is considered successful when:
- ✅ All 5 tests pass
- ✅ Funds properly locked in escrow (TC-PAYMENT-001)
- ✅ Invalid payments rejected (TC-PAYMENT-002)
- ✅ Seller receives payment on delivery (TC-PAYMENT-003)
- ✅ Buyer receives refund on dispute (TC-PAYMENT-004)
- ✅ Escrow balance verifiable on-chain (TC-PAYMENT-005)

---

**Last Updated:** $(date)  
**Test Suite Version:** 1.0.0  
**Smart Contract Version:** With SUI coin transfer support



