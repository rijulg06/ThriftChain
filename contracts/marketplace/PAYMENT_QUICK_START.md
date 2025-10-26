# Quick Start: Using Payment-Enabled Escrow

## TL;DR

Your smart contract now handles **actual SUI coin transfers**. Use these functions for real money transactions:

### New Function (with payment)
```bash
sui client call \
  --function accept_offer_by_id_with_payment \
  --args $MARKETPLACE $OFFER $ITEM $PAYMENT_COIN $CLOCK
```

### Updated Functions (now transfer funds)
- `confirm_delivery_by_id` → transfers funds to **seller**
- `refund_escrow_by_id` → transfers funds to **buyer**

---

## CLI Usage Examples

### 1. Accept Offer WITH Payment (NEW WAY)

```bash
# Step 1: Get a coin object with exact amount
COIN_OBJECT=$(sui client gas --json | jq -r '.[0].gasCoinId')

# Step 2: Accept offer with payment
sui client call \
  --package $PACKAGE_ID \
  --module thriftchain \
  --function accept_offer_by_id_with_payment \
  --args $MARKETPLACE_ID $OFFER_ID $ITEM_ID $COIN_OBJECT $CLOCK \
  --gas-budget 100000000
```

**Note:** Payment amount must EXACTLY match the offer amount, or transaction fails with error code 40.

### 2. Confirm Delivery (transfers funds to seller)

```bash
sui client call \
  --package $PACKAGE_ID \
  --module thriftchain \
  --function confirm_delivery_by_id \
  --args $MARKETPLACE_ID $ESCROW_ID $ITEM_ID $CLOCK \
  --gas-budget 100000000
```

**What happens:**
- Buyer confirms item received ✅
- Smart contract transfers ALL escrowed funds to seller 💰
- Item marked as sold
- Escrow marked as completed

### 3. Refund on Dispute (transfers funds to buyer)

```bash
# Step 1: Buyer disputes
sui client call \
  --package $PACKAGE_ID \
  --module thriftchain \
  --function dispute_escrow_by_id \
  --args $MARKETPLACE_ID $ESCROW_ID $CLOCK \
  --gas-budget 100000000

# Step 2: Seller issues refund
sui client call \
  --package $PACKAGE_ID \
  --module thriftchain \
  --function refund_escrow_by_id \
  --args $MARKETPLACE_ID $ESCROW_ID $CLOCK \
  --gas-budget 100000000
```

**What happens:**
- Seller approves refund ✅
- Smart contract transfers ALL escrowed funds to buyer 💰
- Escrow marked as refunded

---

## Frontend/TypeScript Usage

### Accept Offer with Payment

```typescript
import { TransactionBlock } from '@mysten/sui.js/transactions';

async function acceptOfferWithPayment(
  offerId: string,
  itemId: string,
  offerAmount: number  // in MIST (1 SUI = 1,000,000,000 MIST)
) {
  const tx = new TransactionBlock();
  
  // Split exact payment amount from gas coin
  const [paymentCoin] = tx.splitCoins(tx.gas, [tx.pure(offerAmount)]);
  
  // Call the payment-enabled function
  tx.moveCall({
    target: `${PACKAGE_ID}::thriftchain::accept_offer_by_id_with_payment`,
    arguments: [
      tx.object(MARKETPLACE_ID),
      tx.pure(offerId, 'address'),
      tx.pure(itemId, 'address'),
      paymentCoin,                    // The payment coin
      tx.object('0x6'),               // Clock object (always 0x6)
    ],
  });
  
  // Sign and execute
  const result = await signAndExecuteTransactionBlock({
    transactionBlock: tx,
  });
  
  return result;
}
```

### Confirm Delivery

```typescript
async function confirmDelivery(escrowId: string, itemId: string) {
  const tx = new TransactionBlock();
  
  tx.moveCall({
    target: `${PACKAGE_ID}::thriftchain::confirm_delivery_by_id`,
    arguments: [
      tx.object(MARKETPLACE_ID),
      tx.pure(escrowId, 'address'),
      tx.pure(itemId, 'address'),
      tx.object('0x6'),
    ],
  });
  
  const result = await signAndExecuteTransactionBlock({
    transactionBlock: tx,
  });
  
  // Funds have been transferred to seller! 🎉
  return result;
}
```

### Issue Refund

```typescript
async function issueRefund(escrowId: string) {
  const tx = new TransactionBlock();
  
  tx.moveCall({
    target: `${PACKAGE_ID}::thriftchain::refund_escrow_by_id`,
    arguments: [
      tx.object(MARKETPLACE_ID),
      tx.pure(escrowId, 'address'),
      tx.object('0x6'),
    ],
  });
  
  const result = await signAndExecuteTransactionBlock({
    transactionBlock: tx,
  });
  
  // Funds have been refunded to buyer! 🎉
  return result;
}
```

---

## Key Changes Summary

| Function | Old Behavior | New Behavior |
|----------|--------------|--------------|
| `accept_offer_by_id` | Creates empty escrow | Still works (backward compat) |
| `accept_offer_by_id_with_payment` | ❌ Didn't exist | ✅ Creates escrow WITH funds |
| `confirm_delivery_by_id` | Just updates state | ✅ Transfers funds to seller |
| `refund_escrow_by_id` | Just updates state | ✅ Transfers funds to buyer |

---

## Common Errors

### Error Code 40: Payment Mismatch
```
Offer amount: 1000000000 MIST (1 SUI)
Payment sent:  500000000 MIST (0.5 SUI)
Result: ❌ Transaction fails with error code 40
```

**Solution:** Always send EXACT payment amount that matches the offer.

### Error Code 33: Not Buyer
```
Buyer address:  0xabc...
Caller address: 0xdef...
Result: ❌ Only buyer can confirm delivery
```

**Solution:** Make sure the transaction is signed by the buyer's wallet.

### Error Code 39: Escrow Not Disputed
```
Escrow status: 0 (Active)
Action: Try to refund
Result: ❌ Can only refund disputed escrows
```

**Solution:** Buyer must call `dispute_escrow_by_id` first before seller can refund.

---

## Verification

### Check Escrow Balance (for debugging)

```bash
sui client object $ESCROW_ID --json | jq '.data.content.fields.held_funds'
```

This shows how much SUI is currently held in the escrow.

### Check Transaction Success

```bash
sui client transaction-block $TX_DIGEST --json | jq '.effects.status'
```

Should show `"status": "success"` if everything worked.

---

## Migration Checklist

- [ ] Update CLI scripts to use `accept_offer_by_id_with_payment`
- [ ] Add coin object handling to payment flow
- [ ] Update frontend to split coins for exact payment
- [ ] Add balance checks before accepting offers
- [ ] Update error handling for error code 40
- [ ] Test complete flow: offer → payment → confirm → verify seller received funds
- [ ] Test dispute flow: offer → payment → dispute → refund → verify buyer received funds

---

## Questions?

See `COIN_TRANSFER_IMPLEMENTATION.md` for comprehensive documentation including:
- Architecture details
- Security features
- Complete flow diagrams
- Testing recommendations
- Best practices



