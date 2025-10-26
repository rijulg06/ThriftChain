# ThriftChain API Integration Guide

Complete guide for integrating ThriftChain marketplace smart contract functions into your application.

## Table of Contents

- [Setup](#setup)
- [Item Management](#item-management)
- [Offer System](#offer-system)
- [Escrow & Payment](#escrow--payment)
- [Complete User Flows](#complete-user-flows)
- [Error Handling](#error-handling)

---

## Setup

### Contract Information

```typescript
const CONTRACT_CONFIG = {
  packageId: "0xdd07446c53cdaefea08a3af3a36bde890b88a6754c9a7ab8f945e042feccedc1",
  marketplaceId: "0x5b00c49f8a53b5eab0b6aae72f40954386c10b6d586efe3b07704f5314b1bb8d",
  itemCapId: "0xb499bef6d5c106c7735e44b975c6cfc9c14fb1d4ca2c40c098a8357d944b7642",
  clockId: "0x6", // Standard Sui clock
  module: "thriftchain"
};
```

### Initialize Sui Client

```typescript
import { SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';

const client = new SuiClient({ url: 'https://fullnode.devnet.sui.io' });
const keypair = Ed25519Keypair.deriveKeypair(MNEMONIC);
```

---

## Item Management

### 1. Create Item (Seller)

**Function:** `create_item`

**Requirements:**
- Caller must own ItemCap
- All fields must be provided
- Price must be > 0

**TypeScript Implementation:**

```typescript
async function createItem(params: {
  title: string;
  description: string;
  price: number; // in MIST (1 SUI = 1,000,000,000 MIST)
  category: string;
  tags: string[];
  walrusImageIds: string[];
  condition: string;
  brand: string;
  size: string;
  color: string;
  material: string;
}) {
  const tx = new TransactionBlock();
  
  tx.moveCall({
    target: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.module}::create_item`,
    arguments: [
      tx.object(CONTRACT_CONFIG.marketplaceId),
      tx.object(CONTRACT_CONFIG.itemCapId),
      tx.pure(params.title),
      tx.pure(params.description),
      tx.pure(params.price.toString()),
      tx.pure(params.category),
      tx.pure(params.tags),
      tx.pure(params.walrusImageIds),
      tx.pure(params.condition),
      tx.pure(params.brand),
      tx.pure(params.size),
      tx.pure(params.color),
      tx.pure(params.material),
      tx.object(CONTRACT_CONFIG.clockId),
    ],
  });

  const result = await client.signAndExecuteTransactionBlock({
    signer: keypair,
    transactionBlock: tx,
    options: {
      showEffects: true,
      showEvents: true,
    },
  });

  // Extract item_id from events
  const itemCreatedEvent = result.events?.find(
    e => e.type.includes('ItemCreated')
  );
  const itemId = itemCreatedEvent?.parsedJson?.item_id;
  
  return { itemId, digest: result.digest };
}
```

**CLI Example:**

```bash
sui client call \
  --package $MARKETPLACE_PACKAGE_ID \
  --module thriftchain \
  --function create_item \
  --args \
    $MARKETPLACE_OBJECT_ID \
    $ITEMCAP_OBJECT_ID \
    "Vintage Leather Jacket" \
    "Authentic 1980s leather jacket in excellent condition" \
    "10000000000" \
    "Clothing" \
    '["vintage", "leather", "jacket"]' \
    '["walrus_image_1", "walrus_image_2"]' \
    "Excellent" \
    "Schott NYC" \
    "L" \
    "Black" \
    "Leather" \
    0x6 \
  --gas-budget 100000000
```

**Test Reference:** `TC-LIST-001.sh`

---

### 2. Update Item Price (Seller)

**Function:** `update_item_price_by_id`

**Requirements:**
- Caller must be item seller
- Item must be active (status = 0)
- New price must be > 0

**TypeScript Implementation:**

```typescript
async function updateItemPrice(
  itemId: string,
  newPrice: number
) {
  const tx = new TransactionBlock();
  
  tx.moveCall({
    target: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.module}::update_item_price_by_id`,
    arguments: [
      tx.object(CONTRACT_CONFIG.marketplaceId),
      tx.pure(itemId),
      tx.pure(newPrice.toString()),
      tx.object(CONTRACT_CONFIG.clockId),
    ],
  });

  return await client.signAndExecuteTransactionBlock({
    signer: keypair,
    transactionBlock: tx,
  });
}
```

**CLI Example:**

```bash
sui client call \
  --package $MARKETPLACE_PACKAGE_ID \
  --module thriftchain \
  --function update_item_price_by_id \
  --args \
    $MARKETPLACE_OBJECT_ID \
    $ITEM_ID \
    "12000000000" \
    0x6 \
  --gas-budget 50000000
```

**Test Reference:** `TC-LIST-003.sh`

---

### 3. Cancel Item Listing (Seller)

**Function:** `cancel_item_by_id`

**Requirements:**
- Caller must be item seller
- Item must be active

**TypeScript Implementation:**

```typescript
async function cancelItem(itemId: string) {
  const tx = new TransactionBlock();
  
  tx.moveCall({
    target: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.module}::cancel_item_by_id`,
    arguments: [
      tx.object(CONTRACT_CONFIG.marketplaceId),
      tx.pure(itemId),
      tx.object(CONTRACT_CONFIG.clockId),
    ],
  });

  return await client.signAndExecuteTransactionBlock({
    signer: keypair,
    transactionBlock: tx,
  });
}
```

**Test Reference:** `TC-LIST-005.sh`

---

## Offer System

### 4. Create Offer with Payment (Buyer)

**Function:** `create_offer_by_id`

**Requirements:**
- Buyer ≠ Seller
- Item must be active
- Payment must EXACTLY match offer amount
- Offer expires in 1-168 hours

**⚠️ CRITICAL: Payment Coin Handling**

You MUST split coins to create an exact payment amount:

**TypeScript Implementation:**

```typescript
async function createOffer(params: {
  itemId: string;
  amount: number; // in MIST
  message: string;
  expiresInHours: number;
}) {
  const tx = new TransactionBlock();
  
  // 🔑 CRITICAL: Split coin to get EXACT payment amount
  const [payment] = tx.splitCoins(tx.gas, [tx.pure(params.amount)]);
  
  tx.moveCall({
    target: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.module}::create_offer_by_id`,
    arguments: [
      tx.object(CONTRACT_CONFIG.marketplaceId),
      tx.pure(params.itemId),
      tx.pure(params.amount.toString()),
      tx.pure(params.message),
      tx.pure(params.expiresInHours.toString()),
      payment, // ← Exact amount coin
      tx.object(CONTRACT_CONFIG.clockId),
    ],
  });

  const result = await client.signAndExecuteTransactionBlock({
    signer: keypair,
    transactionBlock: tx,
    options: {
      showEffects: true,
      showEvents: true,
    },
  });

  // Extract IDs from events
  const offerEvent = result.events?.find(e => e.type.includes('OfferCreated'));
  const escrowEvent = result.events?.find(e => e.type.includes('OfferAccepted'));
  
  return {
    offerId: offerEvent?.parsedJson?.offer_id,
    escrowId: escrowEvent?.parsedJson?.escrow_id,
    digest: result.digest
  };
}
```

**Payment Flow:**

```
User Balance: 100 SUI
↓
Split 8 SUI for payment → Locked in escrow
Gas fee: ~0.05 SUI → Paid to validators
↓
User Balance: ~91.95 SUI
Escrow Balance: 8 SUI (locked)
```

**CLI Example (Requires coin splitting):**

```bash
# Step 1: Split coin to get exact amount
SPLIT_RESULT=$(sui client split-coin \
  --coin-id $SOURCE_COIN \
  --amounts 8000000000 \
  --gas-budget 10000000)

# Step 2: Extract new coin ID
PAYMENT_COIN=$(echo $SPLIT_RESULT | grep -o '0x[a-f0-9]\{64\}' | head -1)

# Step 3: Create offer with exact payment
sui client call \
  --package $MARKETPLACE_PACKAGE_ID \
  --module thriftchain \
  --function create_offer_by_id \
  --args \
    $MARKETPLACE_OBJECT_ID \
    $ITEM_ID \
    "8000000000" \
    "I'd like to buy this item" \
    "24" \
    $PAYMENT_COIN \
    0x6 \
  --gas-budget 100000000
```

**Test Reference:** `TC-PAYMENT-001.sh`, `TC-OFFER-001.sh`

---

### 5. Accept Offer (Seller)

**Function:** `accept_offer_by_id`

**Requirements:**
- Caller must be seller
- Offer must be pending or countered
- Item must be active
- Offer not expired

**Note:** Escrow already exists from step 4 with funds locked.

**TypeScript Implementation:**

```typescript
async function acceptOffer(
  offerId: string,
  itemId: string
) {
  const tx = new TransactionBlock();
  
  tx.moveCall({
    target: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.module}::accept_offer_by_id`,
    arguments: [
      tx.object(CONTRACT_CONFIG.marketplaceId),
      tx.pure(offerId),
      tx.pure(itemId),
      tx.object(CONTRACT_CONFIG.clockId),
    ],
  });

  return await client.signAndExecuteTransactionBlock({
    signer: keypair,
    transactionBlock: tx,
  });
}
```

**Test Reference:** `TC-OFFER-003.sh`

---

### 6. Reject Offer (Seller)

**Function:** `reject_offer_by_id`

**TypeScript Implementation:**

```typescript
async function rejectOffer(offerId: string) {
  const tx = new TransactionBlock();
  
  tx.moveCall({
    target: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.module}::reject_offer_by_id`,
    arguments: [
      tx.object(CONTRACT_CONFIG.marketplaceId),
      tx.pure(offerId),
      tx.object(CONTRACT_CONFIG.clockId),
    ],
  });

  return await client.signAndExecuteTransactionBlock({
    signer: keypair,
    transactionBlock: tx,
  });
}
```

**Test Reference:** `TC-OFFER-004.sh`

---

### 7. Cancel Offer (Buyer)

**Function:** `cancel_offer_by_id`

**Requirements:**
- Caller must be buyer
- Offer must be pending or countered
- Not expired

**TypeScript Implementation:**

```typescript
async function cancelOffer(offerId: string) {
  const tx = new TransactionBlock();
  
  tx.moveCall({
    target: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.module}::cancel_offer_by_id`,
    arguments: [
      tx.object(CONTRACT_CONFIG.marketplaceId),
      tx.pure(offerId),
      tx.object(CONTRACT_CONFIG.clockId),
    ],
  });

  return await client.signAndExecuteTransactionBlock({
    signer: keypair,
    transactionBlock: tx,
  });
}
```

---

## Escrow & Payment

### 8. Confirm Delivery (Buyer)

**Function:** `confirm_delivery_by_id`

**Requirements:**
- Caller must be buyer
- Escrow must be active
- Item must be active

**Effect:** Funds transfer from escrow to seller

**TypeScript Implementation:**

```typescript
async function confirmDelivery(
  escrowId: string,
  itemId: string
) {
  const tx = new TransactionBlock();
  
  tx.moveCall({
    target: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.module}::confirm_delivery_by_id`,
    arguments: [
      tx.object(CONTRACT_CONFIG.marketplaceId),
      tx.pure(escrowId),
      tx.pure(itemId),
      tx.object(CONTRACT_CONFIG.clockId),
    ],
  });

  return await client.signAndExecuteTransactionBlock({
    signer: keypair,
    transactionBlock: tx,
  });
}
```

**Payment Flow:**

```
Before:
Escrow: 8 SUI (locked)
Seller Balance: 50 SUI

After confirmDelivery():
Escrow: 0 SUI
Seller Balance: 58 SUI ✅
```

**Test Reference:** `TC-PAYMENT-003.sh`, `TC-ESCROW-001.sh`

---

### 9. Dispute Escrow (Buyer)

**Function:** `dispute_escrow_by_id`

**Requirements:**
- Caller must be buyer
- Escrow must be active

**TypeScript Implementation:**

```typescript
async function disputeEscrow(escrowId: string) {
  const tx = new TransactionBlock();
  
  tx.moveCall({
    target: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.module}::dispute_escrow_by_id`,
    arguments: [
      tx.object(CONTRACT_CONFIG.marketplaceId),
      tx.pure(escrowId),
      tx.object(CONTRACT_CONFIG.clockId),
    ],
  });

  return await client.signAndExecuteTransactionBlock({
    signer: keypair,
    transactionBlock: tx,
  });
}
```

**Test Reference:** `TC-ESCROW-002.sh`

---

### 10. Refund Escrow (Seller)

**Function:** `refund_escrow_by_id`

**Requirements:**
- Caller must be seller
- Escrow must be disputed

**Effect:** Funds transfer from escrow back to buyer

**TypeScript Implementation:**

```typescript
async function refundEscrow(escrowId: string) {
  const tx = new TransactionBlock();
  
  tx.moveCall({
    target: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.module}::refund_escrow_by_id`,
    arguments: [
      tx.object(CONTRACT_CONFIG.marketplaceId),
      tx.pure(escrowId),
      tx.object(CONTRACT_CONFIG.clockId),
    ],
  });

  return await client.signAndExecuteTransactionBlock({
    signer: keypair,
    transactionBlock: tx,
  });
}
```

**Payment Flow:**

```
Before:
Escrow: 8 SUI (locked, disputed)
Buyer Balance: 42 SUI

After refundEscrow():
Escrow: 0 SUI
Buyer Balance: 50 SUI ✅ (refunded)
```

**Test Reference:** `TC-PAYMENT-004.sh`

---

## Complete User Flows

### Flow 1: Successful Purchase

```typescript
// 1. Seller creates item
const { itemId } = await createItem({
  title: "Vintage Jacket",
  price: 10_000_000_000, // 10 SUI
  // ... other fields
});

// 2. Buyer makes offer with payment (payment locked immediately)
const { offerId, escrowId } = await createOffer({
  itemId,
  amount: 8_000_000_000, // 8 SUI offer
  message: "I'd like to buy this",
  expiresInHours: 24
});
// Buyer's 8 SUI now locked in escrow

// 3. Seller accepts offer
await acceptOffer(offerId, itemId);

// 4. Buyer receives item and confirms delivery
await confirmDelivery(escrowId, itemId);
// Seller receives 8 SUI from escrow ✅
```

### Flow 2: Dispute & Refund

```typescript
// 1-3. Same as above (item created, offer made & accepted)

// 4. Buyer disputes (item damaged/not as described)
await disputeEscrow(escrowId);

// 5. Seller issues refund
await refundEscrow(escrowId);
// Buyer receives 8 SUI back ✅
```

### Flow 3: Offer Rejection

```typescript
// 1. Seller creates item
const { itemId } = await createItem({...});

// 2. Buyer makes low offer
const { offerId } = await createOffer({
  itemId,
  amount: 5_000_000_000, // 5 SUI (too low)
  //...
});

// 3. Seller rejects offer
await rejectOffer(offerId);
// Offer marked as rejected
```

---

## Error Handling

### Common Error Codes

```typescript
const ERROR_CODES = {
  0: "Price must be positive",
  3: "Only seller can update price",
  6: "Only seller can cancel",
  9: "Amount must be positive",
  10: "Cannot make offer on own item",
  11: "Item must be active",
  29: "Only seller can accept",
  33: "Only buyer can confirm delivery",
  36: "Only buyer can dispute",
  38: "Only seller can refund",
  39: "Escrow must be disputed",
  40: "Payment must match offer amount" // Most common in tests
};
```

### Error Handling Example

```typescript
async function createOfferWithErrorHandling(params) {
  try {
    const result = await createOffer(params);
    return { success: true, data: result };
  } catch (error) {
    // Parse error code from Sui error message
    const errorCode = extractErrorCode(error.message);
    
    switch(errorCode) {
      case 40:
        return {
          success: false,
          error: "Payment amount doesn't match offer. Please try again.",
          code: 40
        };
      case 10:
        return {
          success: false,
          error: "You cannot make an offer on your own item.",
          code: 10
        };
      default:
        return {
          success: false,
          error: error.message,
          code: errorCode
        };
    }
  }
}

function extractErrorCode(errorMessage: string): number | null {
  const match = errorMessage.match(/code (\d+)/);
  return match ? parseInt(match[1]) : null;
}
```

---

## Query Functions

### Get Item Details

```typescript
async function getItem(itemId: string) {
  const item = await client.getObject({
    id: CONTRACT_CONFIG.marketplaceId,
    options: { showContent: true }
  });
  
  // Parse marketplace content to find item
  // Items are stored in table, query via events or RPC
}
```

### Get User's Items

```typescript
async function getUserItems(userAddress: string) {
  const events = await client.queryEvents({
    query: {
      MoveEventType: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.module}::ItemCreated`
    },
  });
  
  return events.data
    .filter(e => e.parsedJson.seller === userAddress)
    .map(e => ({
      itemId: e.parsedJson.item_id,
      title: e.parsedJson.title,
      price: e.parsedJson.price,
      createdAt: e.parsedJson.created_at
    }));
}
```

---

## Best Practices

### 1. Always Split Coins for Payments

```typescript
// ✅ CORRECT
const [payment] = tx.splitCoins(tx.gas, [tx.pure(exactAmount)]);

// ❌ WRONG - will fail with error 40
const payment = tx.gas; // Wrong amount!
```

### 2. Handle Transaction Failures Gracefully

```typescript
const maxRetries = 3;
let attempt = 0;

while (attempt < maxRetries) {
  try {
    return await createOffer(params);
  } catch (error) {
    attempt++;
    if (attempt === maxRetries) throw error;
    await delay(1000 * attempt);
  }
}
```

### 3. Verify Transaction Success

```typescript
const result = await client.signAndExecuteTransactionBlock({
  signer: keypair,
  transactionBlock: tx,
  options: {
    showEffects: true,
    showEvents: true,
  },
});

if (result.effects?.status?.status !== 'success') {
  throw new Error(`Transaction failed: ${result.effects?.status?.error}`);
}
```

### 4. Cache Expensive Queries

```typescript
const itemCache = new Map<string, Item>();

async function getItemCached(itemId: string) {
  if (itemCache.has(itemId)) {
    return itemCache.get(itemId);
  }
  
  const item = await getItem(itemId);
  itemCache.set(itemId, item);
  return item;
}
```

---

## Testing Your Integration

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';

describe('ThriftChain Integration', () => {
  it('should create offer with correct payment', async () => {
    const result = await createOffer({
      itemId: TEST_ITEM_ID,
      amount: 8_000_000_000,
      message: "Test offer",
      expiresInHours: 24
    });
    
    expect(result.offerId).toBeDefined();
    expect(result.escrowId).toBeDefined();
  });
  
  it('should reject mismatched payment', async () => {
    // This should fail with error 40
    await expect(
      createOfferWithWrongAmount()
    ).rejects.toThrow(/code 40/);
  });
});
```

---

## Additional Resources

- [E2E Test Scripts](./cases/) - Complete test examples
- [README.md](./README.md) - Testing guide and troubleshooting
- [Sui TypeScript SDK](https://sdk.mystenlabs.com/typescript) - Official SDK docs
- [Move Language Guide](https://docs.sui.io/build/move) - Smart contract reference

---

**Last Updated:** 2025-10-26  
**Contract Version:** 1.0.0 (with SUI coin transfer support)  
**Network:** Devnet

