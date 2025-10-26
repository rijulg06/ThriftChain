# ThriftChain Test Case Documentation

Complete documentation for all E2E test cases in the ThriftChain marketplace smart contract.

## Table of Contents

- [Overview](#overview)
- [Listing Tests (TC-LIST)](#listing-tests-tc-list)
- [Offer Tests (TC-OFFER)](#offer-tests-tc-offer)
- [Escrow Tests (TC-ESCROW)](#escrow-tests-tc-escrow)
- [Payment Tests (TC-PAYMENT)](#payment-tests-tc-payment)
- [Test Dependencies](#test-dependencies)
- [Common Patterns](#common-patterns)

---

## Overview

ThriftChain's E2E test suite covers four main functional categories:

1. **Listing Management**: Creating, updating, and managing item listings
2. **Offer System**: Buyer offers, seller acceptance/rejection, and multiple offers
3. **Escrow Protection**: Secure fund holding, delivery confirmation, and dispute handling
4. **Payment Processing**: SUI token transfers, validation, and on-chain verification

All tests interact directly with the Sui blockchain using the `sui` CLI and validate on-chain state changes.

---

## Listing Tests (TC-LIST)

### TC-LIST-001: Create Valid Item Listing

**Purpose:** Verify that sellers can create item listings with all required fields.

**Test Flow:**
1. Seller calls `create_item()` with valid parameters
2. Transaction executes successfully
3. Item ID is generated and returned
4. `ItemCreated` event is emitted with seller address
5. Item is stored in marketplace with status=0 (Active)

**Parameters:**
- Title: "Vintage Leather Jacket - Test Item"
- Description: Full item description
- Price: 5000000000 MIST (5 SUI)
- Category: "Clothing"
- Tags: `["vintage", "leather", "jacket", "fall", "fashion", "test"]`
- Walrus Image IDs: `["test_image1", "test_image2"]`
- Condition: "Excellent"
- Brand: "Vintage Brand"
- Size: "Large"
- Color: "Brown"
- Material: "Leather"
- Clock: 0x6 (system clock)

**Expected Result:**
- ✅ Transaction status: Success
- ✅ Unique Item ID generated
- ✅ ItemCreated event emitted
- ✅ Ownership bound to seller address

**Smart Contract Function:**
```move
public entry fun create_item(
    marketplace: &mut Marketplace,
    item_cap: &ItemCap,
    title: String,
    description: String,
    price: u64,
    category: String,
    tags: vector<String>,
    walrus_image_ids: vector<String>,
    condition: String,
    brand: String,
    size: String,
    color: String,
    material: String,
    clock: &Clock,
    ctx: &mut TxContext
)
```

**Validation Checks:**
- Title and description not empty
- Price > 0 (validated by smart contract)
- All metadata fields populated
- Clock timestamp recorded

---

### TC-LIST-002: Invalid Price Validation

**Purpose:** Verify that the smart contract rejects items with invalid price (zero or negative).

**Test Flow:**
1. Attempt to create item with price=0
2. Smart contract validation triggers
3. Transaction reverts with error

**Parameters:**
- Price: 0 MIST (invalid)
- All other fields valid

**Expected Result:**
- ❌ Transaction fails (expected)
- ❌ Error: Validation error (abort code 0)
- ✅ No item created
- ✅ Price validation working correctly

**Smart Contract Validation:**
```move
assert!(price > 0, ERROR_INVALID_PRICE);
```

---

### TC-LIST-003: Update Item Price (Authorized)

**Purpose:** Verify that only the item owner (seller) can update the listing price.

**Test Flow:**
1. Use existing item from TC-LIST-001
2. Seller calls `update_item_price_by_id()` with new price
3. Transaction succeeds
4. `ItemPriceUpdated` event emitted
5. Item price updated on-chain

**Parameters:**
- Item ID: From TC-LIST-001
- Old Price: 5000000000 MIST (5 SUI)
- New Price: 7000000000 MIST (7 SUI)

**Expected Result:**
- ✅ Transaction status: Success
- ✅ ItemPriceUpdated event emitted
- ✅ Price updated on-chain
- ✅ Only seller can update

**Smart Contract Function:**
```move
public entry fun update_item_price_by_id(
    marketplace: &mut Marketplace,
    item_id: ID,
    new_price: u64,
    clock: &Clock,
    ctx: &mut TxContext
)
```

**Authorization Check:**
```move
assert!(item.seller == tx_context::sender(ctx), ERROR_UNAUTHORIZED);
```

---

### TC-LIST-004: Unauthorized Price Update (Negative Test)

**Purpose:** Verify that non-owners cannot update item prices (security test).

**Test Flow:**
1. Use existing item from TC-LIST-001
2. Switch to different address (not the owner)
3. Attempt to call `update_item_price_by_id()`
4. Transaction rejected with authorization error

**Expected Result:**
- ❌ Transaction fails (expected)
- ❌ Error: Unauthorized action (abort code 3)
- ✅ Authorization system working
- ✅ Item price unchanged

**Security Validation:**
This test ensures that the smart contract enforces ownership checks and prevents unauthorized modifications.

---

### TC-LIST-005: Cancel Item Listing

**Purpose:** Verify that sellers can cancel (delist) items that have no active offers.

**Test Flow:**
1. Use existing item with no offers
2. Seller calls `cancel_item_by_id()`
3. Transaction succeeds
4. `ItemCancelled` event emitted
5. Item status changed to Cancelled (status=2)

**Expected Result:**
- ✅ Transaction status: Success
- ✅ ItemCancelled event emitted
- ✅ Item status = 2 (Cancelled)
- ✅ No escrow interaction (no offers existed)
- ✅ Only seller can cancel

**Smart Contract Function:**
```move
public entry fun cancel_item_by_id(
    marketplace: &mut Marketplace,
    item_id: ID,
    clock: &Clock,
    ctx: &mut TxContext
)
```

**Validation Checks:**
- Must be item owner
- Item must be active (status=0)
- No active escrow transactions

---

## Offer Tests (TC-OFFER)

### TC-OFFER-001: Create Valid Offer

**Purpose:** Verify that buyers can make offers on active listings.

**Test Flow:**
1. Buyer selects an active item (from different seller)
2. Buyer calls `create_offer_by_id()` with offer amount and payment
3. Transaction succeeds
4. Offer ID generated
5. Escrow created immediately with payment locked
6. `OfferCreated` event emitted

**Parameters:**
- Item ID: Active item from another seller
- Offer Amount: 8000000000 MIST (8 SUI)
- Message: "I would like to purchase this item for 8 SUI"
- Expires In: 24 hours
- Payment Coin: Buyer's SUI coin (exact amount)

**Expected Result:**
- ✅ Transaction status: Success
- ✅ Offer created with unique ID
- ✅ Escrow created immediately
- ✅ Payment locked in escrow (8 SUI)
- ✅ OfferCreated event emitted
- ✅ Offer status = 0 (Pending)

**Smart Contract Function:**
```move
public entry fun create_offer_by_id(
    marketplace: &mut Marketplace,
    item_id: ID,
    amount: u64,
    message: String,
    expires_in_hours: u64,
    payment: Coin<SUI>,
    clock: &Clock,
    ctx: &mut TxContext
)
```

**Key Features:**
- Payment locked immediately (not when seller accepts)
- Buyer cannot make offer on own items
- Offer expires after specified hours

---

### TC-OFFER-002: Low Offer Threshold Test

**Purpose:** Test whether the smart contract enforces minimum offer thresholds.

**Test Flow:**
1. Attempt to create offer significantly below listing price
2. Offer Amount: 100000000 MIST (0.1 SUI) on 10 SUI item

**Current Behavior:**
- ⚠️ Transaction succeeds (design limitation identified)
- ⚠️ No minimum threshold enforced
- ✅ Seller must manually review and reject

**Design Note:**
The smart contract currently validates:
- ✅ amount > 0
- ✅ buyer ≠ seller
- ✅ item.status == 0 (active)
- ✅ expires_in_hours validation

**Missing Validation:**
- ❌ No check for minimum offer percentage (e.g., 50% of listing)
- ❌ No check against item.price

**Recommendation:**
```move
assert!(amount >= (item.price * 50) / 100, ERROR_BELOW_THRESHOLD);
```

---

### TC-OFFER-003: Accept Offer

**Purpose:** Verify that sellers can accept offers, finalizing the escrow.

**Test Flow:**
1. Seller has received offer from buyer
2. Seller calls `accept_offer_by_id()`
3. Transaction succeeds
4. Offer status changed to Accepted
5. Item status changed to Sold
6. Escrow status remains Active (awaiting delivery confirmation)

**Expected Result:**
- ✅ Transaction status: Success
- ✅ OfferAccepted event emitted
- ✅ Offer status = 1 (Accepted)
- ✅ Item status = 1 (Sold)
- ✅ Escrow status = 0 (Active, awaiting delivery)

**Smart Contract Function:**
```move
public entry fun accept_offer_by_id(
    marketplace: &mut Marketplace,
    offer_id: ID,
    item_id: ID,
    clock: &Clock,
    ctx: &mut TxContext
)
```

**State Transitions:**
- Offer: Pending → Accepted
- Item: Active → Sold
- Escrow: Active → Active (awaiting buyer confirmation)

---

### TC-OFFER-004: Reject Offer

**Purpose:** Verify that sellers can reject offers.

**Test Flow:**
1. Seller receives offer
2. Seller calls `reject_offer()`
3. Transaction succeeds
4. Offer status changed to Rejected
5. Funds remain in escrow (buyer must manually withdraw or wait for auto-refund)

**Expected Result:**
- ✅ Transaction status: Success
- ✅ OfferRejected event emitted
- ✅ Offer status = 3 (Rejected)
- ✅ Item remains active (available for other offers)

**Design Note:**
Current implementation:
- Offers do NOT lock funds at creation (design changed)
- Escrow created when offer accepted
- Rejecting offer simply marks it as rejected
- No funds to refund since escrow not yet created

**Smart Contract Function:**
```move
public entry fun reject_offer(
    offer_id: ID,
    clock: &Clock,
    ctx: &mut TxContext
)
```

---

### TC-OFFER-005: Multiple Offers on Same Item

**Purpose:** Verify that multiple buyers can submit offers on the same item.

**Test Flow:**
1. Create popular item (15 SUI)
2. Buyer creates Offer 1: 14 SUI
3. Buyer creates Offer 2: 12 SUI  
4. Buyer creates Offer 3: 10 SUI
5. All offers stored with unique IDs and timestamps

**Expected Result:**
- ✅ All offers created successfully
- ✅ Each offer has unique ID
- ✅ All offers stored in marketplace.offers table
- ✅ All offers status = 0 (Pending)
- ✅ Seller can review and choose any offer
- ✅ Timestamps recorded for each offer

**Use Case:**
- Seller can compare multiple offers
- Seller can accept highest or most favorable offer
- Seller can reject all and wait for better offers

---

## Escrow Tests (TC-ESCROW)

### TC-ESCROW-001: Buyer Confirms Delivery

**Purpose:** Verify that buyers can confirm item receipt, releasing funds to seller.

**Test Flow:**
1. Complete item listing and offer acceptance
2. Escrow created with payment locked (8 SUI)
3. Buyer receives item in real world
4. Buyer calls `confirm_delivery_by_id()`
5. Funds transferred from escrow to seller
6. Item and escrow marked as completed

**Expected Result:**
- ✅ Transaction status: Success
- ✅ Escrow status = 1 (Completed)
- ✅ Item status = 1 (Sold)
- ✅ Funds transferred to seller wallet
- ✅ Seller balance increases by payment amount
- ✅ DeliveryConfirmed event emitted

**Smart Contract Function:**
```move
public entry fun confirm_delivery_by_id(
    marketplace: &mut Marketplace,
    escrow_id: ID,
    item_id: ID,
    clock: &Clock,
    ctx: &mut TxContext
)
```

**Fund Transfer Logic:**
```move
let payment = coin::from_balance(
    balance::withdraw_all(&mut escrow.held_funds), 
    ctx
);
transfer::public_transfer(payment, escrow.seller);
```

**Security:**
- Only buyer can confirm delivery
- Escrow must be in Active status
- One-time operation (cannot double-confirm)

---

### TC-ESCROW-002: Buyer Disputes Item

**Purpose:** Verify that buyers can raise disputes if item not as described.

**Test Flow:**
1. Complete item listing and offer acceptance
2. Escrow created with payment locked
3. Buyer receives item but it's not as described
4. Buyer calls `dispute_escrow_by_id()`
5. Escrow enters disputed state
6. Funds remain locked pending resolution

**Expected Result:**
- ✅ Transaction status: Success
- ✅ Escrow status = 2 (Disputed)
- ✅ Funds remain locked in escrow
- ✅ EscrowDisputed event emitted
- ✅ Requires manual resolution or refund

**Smart Contract Function:**
```move
public entry fun dispute_escrow_by_id(
    marketplace: &mut Marketplace,
    escrow_id: ID,
    clock: &Clock,
    ctx: &mut TxContext
)
```

**Dispute Flow:**
1. Buyer raises dispute
2. Funds locked in escrow (status=2)
3. Admin or seller can issue refund via `refund_escrow_by_id()`
4. Funds returned to buyer if refund approved

**Use Cases:**
- Item not as described
- Item damaged during shipping
- Item never received
- Wrong item sent

---

### TC-ESCROW-003: Unauthorized Withdrawal Attempt

**Purpose:** Security test to verify sellers cannot withdraw funds before buyer confirmation.

**Test Flow:**
1. Complete item listing and offer acceptance
2. Escrow created with payment locked (status=0, Active)
3. Seller attempts to call `refund_escrow_by_id()` on active escrow
4. Transaction rejected with error

**Expected Result:**
- ❌ Transaction fails (expected, security working)
- ❌ Error: Escrow must be disputed (abort code 39)
- ✅ Funds remain locked in escrow
- ✅ Security validation working correctly

**Smart Contract Validation:**
```move
public entry fun refund_escrow_by_id(
    marketplace: &mut Marketplace,
    escrow_id: ID,
    clock: &Clock,
    ctx: &mut TxContext
) {
    let escrow = /* get escrow */;
    
    // CRITICAL: Escrow must be disputed before refund
    assert!(escrow.status == 2, ERROR_ESCROW_NOT_DISPUTED);
    
    // Transfer funds back to buyer
    let refund = coin::from_balance(
        balance::withdraw_all(&mut escrow.held_funds),
        ctx
    );
    transfer::public_transfer(refund, escrow.buyer);
}
```

**Security Features:**
- Seller cannot withdraw from active escrow
- Only disputed escrows can be refunded
- Only buyer can confirm delivery (releasing to seller)
- Prevents seller from unilaterally taking funds

---

## Payment Tests (TC-PAYMENT)

### TC-PAYMENT-001: Create Offer with Payment

**Purpose:** Verify that offers properly lock payment in escrow immediately.

**Test Flow:**
1. Seller creates item (8 SUI)
2. Buyer splits coin to get exactly 8 SUI
3. Buyer calls `create_offer_by_id()` with payment coin
4. Escrow created immediately
5. Payment locked on-chain in escrow.held_funds

**Expected Result:**
- ✅ Transaction status: Success
- ✅ Offer ID generated
- ✅ Escrow ID generated
- ✅ Payment locked in escrow (8 SUI)
- ✅ Escrow status = 0 (Active)
- ✅ Funds verifiable on-chain

**Payment Locking:**
```move
public entry fun create_offer_by_id(
    marketplace: &mut Marketplace,
    item_id: ID,
    amount: u64,
    message: String,
    expires_in_hours: u64,
    payment: Coin<SUI>,  // <-- Payment locked here
    clock: &Clock,
    ctx: &mut TxContext
) {
    // Validate payment matches offer amount
    let payment_value = coin::value(&payment);
    assert!(payment_value == amount, ERROR_PAYMENT_MISMATCH);
    
    // Create escrow and lock payment
    let escrow = Escrow {
        id: object::new(ctx),
        buyer: tx_context::sender(ctx),
        seller: item.seller,
        amount,
        held_funds: coin::into_balance(payment), // <-- Locked
        status: 0, // Active
        created_at: clock::timestamp_ms(clock)
    };
}
```

---

### TC-PAYMENT-002: Reject Incorrect Payment Amount

**Purpose:** Security test to verify payment amount validation.

**Test Flow:**
1. Seller creates item (8 SUI)
2. Buyer attempts offer with wrong payment amount
3. Buyer calls `create_offer_by_id()` with mismatched coin
4. Transaction rejected with error code 40

**Expected Result:**
- ❌ Transaction fails (expected, security working)
- ❌ Error code 40: "Payment must match offer amount"
- ✅ No escrow created
- ✅ Funds not locked
- ✅ Payment validation working

**Security Validation:**
```move
// Validate payment amount
let payment_value = coin::value(&payment);
assert!(payment_value == amount, 40); // ERROR_PAYMENT_MISMATCH
```

**Security Implications:**
- Prevents buyer from locking wrong amount
- Ensures escrow always has correct funds
- Protects both buyer and seller

---

### TC-PAYMENT-003: Seller Receives Funds on Delivery

**Purpose:** Verify that funds are transferred from escrow to seller on delivery confirmation.

**Test Flow:**
1. Seller creates item (5 SUI)
2. Buyer creates offer with payment (5 SUI locked in escrow)
3. Seller accepts offer
4. Buyer confirms delivery
5. Funds transferred from escrow to seller wallet
6. Seller balance increases by ~5 SUI

**Expected Result:**
- ✅ Transaction status: Success
- ✅ Funds withdrawn from escrow
- ✅ Funds transferred to seller address
- ✅ Seller balance increases (minus gas costs)
- ✅ Escrow status = 1 (Completed)
- ✅ Item status = 1 (Sold)

**Fund Transfer Code:**
```move
public entry fun confirm_delivery_by_id(...) {
    // ... validation ...
    
    // Transfer held funds to seller
    let payment = coin::from_balance(
        balance::withdraw_all(&mut escrow.held_funds),
        ctx
    );
    transfer::public_transfer(payment, escrow.seller); // <-- Transfer
    
    // Update statuses
    escrow.status = 1; // Completed
    item.status = 1;   // Sold
}
```

**Balance Verification:**
Test tracks seller balance before and after to verify transfer.

---

### TC-PAYMENT-004: Buyer Receives Refund on Dispute

**Purpose:** Verify that disputed transactions result in buyer refunds.

**Test Flow:**
1. Seller creates item (6 SUI)
2. Buyer creates offer with payment (6 SUI locked)
3. Seller accepts offer
4. Buyer disputes escrow (`dispute_escrow_by_id`)
5. Seller issues refund (`refund_escrow_by_id`)
6. Funds transferred back to buyer wallet

**Expected Result:**
- ✅ Dispute transaction succeeds
- ✅ Escrow status = 2 (Disputed)
- ✅ Refund transaction succeeds
- ✅ Funds withdrawn from escrow
- ✅ Funds transferred to buyer address
- ✅ Buyer receives refund
- ✅ Escrow status = 3 (Refunded)

**Refund Flow:**
```move
// Step 1: Buyer disputes
public entry fun dispute_escrow_by_id(...) {
    assert!(escrow.buyer == tx_context::sender(ctx), ERROR_UNAUTHORIZED);
    escrow.status = 2; // Disputed
}

// Step 2: Seller/Admin refunds
public entry fun refund_escrow_by_id(...) {
    assert!(escrow.status == 2, ERROR_ESCROW_NOT_DISPUTED);
    
    // Refund held funds to buyer
    let refund = coin::from_balance(
        balance::withdraw_all(&mut escrow.held_funds),
        ctx
    );
    transfer::public_transfer(refund, escrow.buyer); // <-- Refund
    
    escrow.status = 3; // Refunded
}
```

---

### TC-PAYMENT-005: Verify Escrow Balance On-Chain

**Purpose:** Verify that payment amounts are correctly stored and queryable on-chain.

**Test Flow:**
1. Seller creates item (7 SUI)
2. Buyer creates offer with payment (7 SUI)
3. Escrow created with payment locked
4. Query escrow object using `sui client object`
5. Verify `held_funds` field contains exactly 7000000000 MIST

**Expected Result:**
- ✅ Escrow object exists on-chain
- ✅ `held_funds` field = 7000000000 MIST (7 SUI)
- ✅ Amount matches offer amount exactly
- ✅ Funds blockchain-verifiable

**Verification Query:**
```bash
sui client object $ESCROW_ID --json | jq '.data.content.fields.held_funds'
```

**On-Chain Structure:**
```json
{
  "data": {
    "content": {
      "fields": {
        "buyer": "0x...",
        "seller": "0x...",
        "amount": "7000000000",
        "held_funds": "7000000000",  // <-- Verified
        "status": 0,
        "created_at": "..."
      }
    }
  }
}
```

---

## Test Dependencies

### Prerequisite Chain

Some tests depend on objects created by previous tests:

```
TC-LIST-001 (Create Item)
    ↓
TC-LIST-003 (Update Price) - requires ITEM_ID_TC_LIST_001
TC-LIST-004 (Unauthorized Update) - requires ITEM_ID_TC_LIST_001
TC-LIST-005 (Cancel Item) - requires ITEM_ID_TC_LIST_001

TC-OFFER-001 (Create Offer)
    ↓
TC-OFFER-003 (Accept Offer) - requires ITEM_ID and OFFER_ID
```

### Environment Variables

All tests require `devnet_ids.txt` with:
```bash
MARKETPLACE_PACKAGE_ID="0x..."
MODULE_NAME="thriftchain"
MARKETPLACE_OBJECT_ID="0x..."
ITEMCAP_OBJECT_ID="0x..."
CLOCK_OBJECT_ID="0x6"
```

### Multi-Address Tests

Some tests require two addresses:
- **Seller Address**: Creates items
- **Buyer Address**: Makes offers

Tests that require multiple addresses:
- TC-OFFER-001 (cannot offer on own items)
- TC-ESCROW-001, TC-ESCROW-002, TC-ESCROW-003
- TC-PAYMENT-001 through TC-PAYMENT-005

---

## Common Patterns

### 1. Transaction Execution Pattern

```bash
RESULT=$(sui client call \
    --package $PACKAGE_ID \
    --module $MODULE_NAME \
    --function $FUNCTION_NAME \
    --args $ARG1 $ARG2 ... \
    --gas-budget 100000000 \
    --json 2>&1)
```

### 2. ID Extraction Pattern

```bash
ITEM_ID=$(echo "$RESULT" | grep -o '"item_id"[[:space:]]*:[[:space:]]*"0x[^"]*"' \
    | head -1 | sed 's/.*"0x/0x/' | sed 's/".*//')
```

### 3. Success Validation Pattern

```bash
if [ $? -eq 0 ]; then
    echo "✅ Transaction succeeded"
else
    echo "❌ Transaction failed"
fi
```

### 4. Event Checking Pattern

```bash
if echo "$RESULT" | grep -q "ItemCreated"; then
    echo "✅ Event emitted"
fi
```

### 5. Balance Tracking Pattern

```bash
BALANCE_BEFORE=$(sui client balance --json | grep -o '"totalBalance"...' )
# Execute transaction
sleep 2
BALANCE_AFTER=$(sui client balance --json | grep -o '"totalBalance"...')
```

---

## Test Execution Order

### Recommended Order

1. **Setup Phase**
   - Deploy contract
   - Initialize marketplace
   - Create item capabilities

2. **Listing Tests**
   - TC-LIST-001 → TC-LIST-002 → TC-LIST-003 → TC-LIST-004 → TC-LIST-005

3. **Offer Tests**  
   - TC-OFFER-001 → TC-OFFER-002 → TC-OFFER-003 → TC-OFFER-004 → TC-OFFER-005

4. **Escrow Tests**
   - TC-ESCROW-001 → TC-ESCROW-002 → TC-ESCROW-003

5. **Payment Tests**
   - TC-PAYMENT-001 → TC-PAYMENT-002 → TC-PAYMENT-003 → TC-PAYMENT-004 → TC-PAYMENT-005

### Full Suite Runners

```bash
# Run all listing tests
bash TC-LIST-ALL.sh

# Run all offer tests
bash TC-OFFER-ALL.sh

# Run all escrow tests
bash TC-ESCRO-ALL.sh

# Run all payment tests
bash TC-PAYMENT-ALL.sh
```

---

## Troubleshooting

### Common Issues

1. **Missing Prerequisites**
   - Ensure `devnet_ids.txt` is populated
   - Run prerequisite tests first
   - Check wallet gas balance

2. **Address Mismatch**
   - Use correct address for role (seller vs buyer)
   - Switch addresses using `sui client switch --address`

3. **Gas Insufficient**
   - Ensure wallet has enough SUI for gas
   - Gas budget: 100000000 MIST (0.1 SUI) per test

4. **Timing Issues**
   - Add `sleep 2` after transactions
   - Wait for blockchain state propagation

5. **Coin Splitting Errors**
   - Ensure source coin has sufficient balance
   - Use `sui client gas` to check available coins

---

## Alignment with PRD

These tests verify compliance with Product Requirements Document:

- ✅ **FR-022**: ALL payments via Sui blockchain smart contracts
- ✅ **FR-023**: On-chain escrow with buyer/seller confirmation
- ✅ **FR-024**: SUI token payments  
- ✅ **FR-025**: Automatic refund via smart contract on dispute
- ✅ **FR-026**: Transaction history queryable on-chain
- ✅ **SELLER-001**: List items with metadata
- ✅ **SELLER-002**: Review and accept/reject offers
- ✅ **SELLER-003**: Funds released on buyer confirmation
- ✅ **BUYER-002**: Make offers on items
- ✅ **BUYER-003**: Confirm delivery to release funds

---

**Last Updated:** 2025-10-26
**Test Suite Version:** 1.0.0
**Smart Contract:** ThriftChain Marketplace with SUI payment support

