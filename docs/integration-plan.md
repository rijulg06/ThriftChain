# ThriftChain On-Chain Integration Plan

## 1. Contract Deployment Readiness
- Run `sui move test` inside `contracts/marketplace` to ensure Move unit tests and e2e helpers pass.
- Execute shell e2e scripts under `contracts/marketplace/e2e-tests` (start with `helper/create_item.sh`) to validate CLI flows.
- Publish the package to the chosen network and capture:
  - `THRIFTCHAIN_PACKAGE_ID`
  - shared `Marketplace` object ID
  - `ItemCap` object ID issued to admin
- Store these values as environment variables (e.g., `NEXT_PUBLIC_THRIFTCHAIN_PACKAGE_ID`, `NEXT_PUBLIC_MARKETPLACE_ID`, `NEXT_PUBLIC_ITEM_CAP_ID`), documenting the exact export steps in `contracts/README.md`.

## 2. TypeScript Alignment
- Update `frontend/src/lib/types/sui-objects.ts` so `ThriftItemObject`, `OfferObject`, and `EscrowObject` mirror `thriftchain.move` (remove unused fields like `currency`/`is_for_trade`, add `condition`, `brand`, `size`, `color`, `material`, `completed_at`, etc.).
- Refresh enum values (`OfferStatus` → Pending, Countered, Accepted, Rejected, Cancelled; `EscrowStatus` → Active, Completed, Disputed, Refunded).
- Propagate the shape changes through components (e.g., `ItemCard`, item detail page) and mock data used during development.

## 3. Query Layer Rewrite
- Replace `getOwnedObjects` usage in `frontend/src/lib/sui/queries.ts` with dynamic field reads against the shared `Marketplace` object (e.g., `getDynamicFieldObject` for items, offers, escrows; add pagination helpers).
- Leverage new on-chain view helpers (`get_item_details_by_id`, `get_marketplace_stats`, `get_item_metadata`) for lightweight queries.
- Centralize configuration of shared IDs/package ID in the query layer with sensible fallbacks and clear error messaging when env vars are missing.

## 4. Transaction Builders
- Convert stubs in `frontend/src/lib/sui/transactions.ts` into real PTBs:
  - `create_item` must accept the `Marketplace`, `ItemCap`, Walrus vectors, and `Clock` object IDs, serializing vectors via `tx.pure.vector()`.
  - Update entry points to use the `*_by_id` variants where appropriate (`update_item_price_by_id`, `cancel_item_by_id`, `mark_as_sold_by_id`).
  - Implement offer lifecycle calls (`create_offer`, `counter_offer`, `accept_counter_offer`, `cancel_offer`, `reject_offer`).
  - Wire escrow flows (`accept_offer`, `confirm_delivery`, `dispute_escrow`, `refund_escrow`) and ensure the correct shared object arguments are added to each transaction.
- Surface helper utilities for callers to fetch and pass the required shared object IDs and `Clock` reference.

## 5. Frontend UX Updates
- Extend listing forms to collect condition, brand, size, color, material, and Walrus blob IDs; validate price and expiration inputs client-side.
- Show full item metadata and offer/escrow status on item detail pages, including counter-offer messaging and timestamps from Move events.
- Gate seller actions (price update, counter, accept) and buyer actions (offer, accept counter, confirm delivery, dispute) based on connected wallet address and status enums.
- Provide Walrus image previews using `walrus_image_ids` vectors and gracefully handle missing/placeholder IDs.

## 6. Testing & Tooling
- Add PTB dry-run utilities or integration tests (Jest + mocked signer) that exercise each transaction builder end-to-end.
- Automate deployment/testing steps via npm scripts or a Makefile for reproducible flows.
- Expand repository documentation: update `contracts/README.md` with deployment + admin setup, add a frontend section (`frontend/SETUP.md`) covering required env vars and wallet configuration.
- Once live, hook the Next.js app into observability: log failed transactions, expose a simple dashboard for marketplace stats using the view calls.
