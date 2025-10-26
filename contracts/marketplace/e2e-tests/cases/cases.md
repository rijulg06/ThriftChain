# ✅ **Test Cases by Functional Category**

## 📌 **Listing & Item Management (SELLER-001)**

| Test Case   | Description                                         | Expected Smart Contract Result                            |
| ----------- | --------------------------------------------------- | --------------------------------------------------------- |
| TC-LIST-001 | List an item with valid fields (price, description) | Listing created with unique ID, ownership bound to seller |
| TC-LIST-002 | Attempt listing with missing price or description   | Revert transaction with error “Incomplete metadata”       |
| TC-LIST-003 | Update listing price by owner                       | Listing updated, event emitted                            |
| TC-LIST-004 | Update listing by non-owner                         | Revert: “Unauthorized action”                             |
| TC-LIST-005 | Delist an item before any offers                    | Successfully removed, no escrow interaction               |

---

## 🤝 **Offers & Negotiation (SELLER-002, BUYER-002)**

| Test Case    | Description                                         | Expected Result                                                 |
| ------------ | --------------------------------------------------- | --------------------------------------------------------------- |
| TC-OFFER-001 | Buyer makes valid offer with correct escrow deposit | Offer stored + escrow locked                                    |
| TC-OFFER-002 | Buyer makes offer lower than minimum listing price  | Revert: “Offer below threshold”                                 |
| TC-OFFER-003 | Seller accepts offer                                | Escrow flagged as pending delivery                              |
| TC-OFFER-004 | Seller rejects offer                                | Funds returned to buyer via automatic refund                    |
| TC-OFFER-005 | Multiple buyers submit offers                       | All active offers stored with timestamps; seller can choose one |

---

## 🔒 **Escrow Protection (SELLER-003, BUYER-003)**

| Test Case | Description | Expected Result |
|-----------|-------------|
| TC-ESCROW-001 | Buyer confirms item received | Escrow released to seller |
| TC-ESCROW-002 | Buyer disputes item | Contract enters dispute state; funds remain locked |
| TC-ESCROW-003 | Seller tries to withdraw before buyer confirms | Revert: “Escrow not released” |
| TC-ESCROW-004 | Auto refund after timeout (buyer inactive) | Funds returned automatically to buyer |
| TC-ESCROW-005 | Escrow fee distribution test | Ensure split between platform (if any) and seller is correct |

---

## 🎯 **Personalized Discovery Logic (BUYER-001)**

*(Smart contract only handles filtering logic / tagging; AI recommendations are off-chain validation.)*

| Test Case | Description | Expected Result |
|-----------|-------------|
| TC-DISC-001 | Buyer requests items with tag filter | Contract returns only listings with matching metadata tag |
| TC-DISC-002 | No items match filter | Return empty result without error |
| TC-DISC-003 | Newly listed item appears in query | Immediate inclusion in results |

---

## 🔄 **Trading Logic (TRADER-001)**

| Test Case | Description | Expected Result |
|-----------|-------------|
| TC-TRADE-001 | Trader proposes item-for-item swap | Both items locked in escrow-like state |
| TC-TRADE-002 | Counterparty accepts swap | Ownership transferred atomically |
| TC-TRADE-003 | Counterparty declines | Items unlocked, original owners restored |
| TC-TRADE-004 | One participant tries to back out after accept | Revert: “Trade already committed” |

---

## 🔗 **Multi-Party Trades (TRADER-002)**

| Test Case | Description | Expected Result |
|-----------|-------------|
| TC-MULTI-001 | Three users propose circular trade | Contract validates dependency chain & locks all assets |
| TC-MULTI-002 | One user fails to approve | Transaction reverted entirely |
| TC-MULTI-003 | Final approval executed | All assets exchanged atomically (all-or-nothing) |
| TC-MULTI-004 | Latency timeout in multi-party trade | All assets auto-refunded to original owners |

---

# 🔥 **Edge & Security Test Cases**

| Test Case | Description | Expected Result |
|-----------|-------------|
| TC-SEC-001 | Reentrancy attack attempt on escrow withdrawal | Revert & block malicious call |
| TC-SEC-002 | Replay attack / repeated offer confirmation | Only first confirmation accepted; others revert |
| TC-SEC-003 | Force-send ETH/coins directly to contract | Contract fallback handles or rejects appropriately |
| TC-SEC-004 | Data integrity for listing IDs | Unique IDs enforced & collision-proof |

---
