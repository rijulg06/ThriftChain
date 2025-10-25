# Task List: ThriftChain MVP Implementation (BLOCKCHAIN-FIRST)

**Based on:** PRD_Final.md (Updated for Decentralized Architecture)
**Generated:** December 2024
**Context:** CalHacks 12 Hackathon (48-hour timeline)

## 🎯 ARCHITECTURE PRINCIPLES

**This is a BLOCKCHAIN-FIRST marketplace:**
1. ✅ **Sui Blockchain** = Source of truth for ALL marketplace data
2. ✅ **Walrus** = Decentralized image storage (blob IDs stored on-chain)
3. ✅ **Supabase** = AI search layer ONLY (vector embeddings, not marketplace data)
4. ✅ **Frontend** = Queries blockchain directly, builds transactions client-side

---

## 📊 CURRENT STATE SUMMARY

### ✅ COMPLETED Infrastructure
- [x] Next.js 16 workspace with TypeScript and Tailwind CSS 4
- [x] Sui wallet integration (@suiet/wallet-kit + Enoki zkLogin)
- [x] Supabase client setup (client.ts, server.ts)
- [x] Walrus client wrapper with upload functions
- [x] Basic UI components (Header, LoginModal, Home page)
- [x] Retro-themed design system
- [x] **NEW:** Supabase schema redesigned for AI-only (3 tables, not 6)
- [x] **NEW:** TypeScript types for on-chain objects (sui-objects.ts)
- [x] **NEW:** Blockchain query utilities (sui/queries.ts)
- [x] **NEW:** Transaction builder utilities (sui/transactions.ts)

### ❌ CRITICAL GAPS
- [ ] **NO Move smart contracts written** (sources/ directory empty)
- [ ] **NO contracts deployed** (THRIFTCHAIN_PACKAGE_ID not set)
- [ ] **NO item listing pages** (/listings, /list-item give 404)
- [ ] **NO AI search implementation** (embeddings, indexing, search APIs)
- [ ] **NO API routes** (only placeholder hello and zklogin)
- [ ] **.env.local not configured** (will crash on startup)

---

## 📋 REVISED TASK LIST (BLOCKCHAIN-FIRST)

### 🔥 PHASE 0: Critical Blockers (MUST DO FIRST)

- [ ] **0.1** Create `.env.local` with Supabase credentials
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - Test: Can import supabaseClient without errors

- [ ] **0.2** Deploy NEW Supabase schema (AI-only, 3 tables)
  - Run `frontend/supabase-schema.sql` in Supabase SQL Editor
  - Verify tables: `item_search_index`, `user_ai_preferences`, `search_cache`
  - Test: Can query tables without errors

- [ ] **0.3** Install Sui CLI and configure testnet wallet
  - `brew install sui` or download from sui.io
  - `sui client new-env --alias testnet --rpc https://fullnode.testnet.sui.io:443`
  - `sui client new-address ed25519`
  - Get test SUI tokens from faucet
  - Test: `sui client gas` shows balance

---

### 🏗️ PHASE 1: Smart Contracts (FOUNDATION - DO SECOND)

**Priority:** CRITICAL - Nothing works without these!

- [ ] **1.1** Create Move contract directory structure
  - `mkdir -p contracts/marketplace/sources`
  - Verify Move.toml exists with correct Sui framework dependency
  - Test: `cd contracts/marketplace && sui move build` succeeds (will fail until contract exists)

- [ ] **1.2** Write `thriftchain.move` - ThriftItem struct & create_item function
  - Define `ThriftItem` Move struct with all fields (title, description, price, walrus_image_ids, etc.)
  - Implement `create_item()` entry function to mint item NFT
  - Add events: `ItemCreated`
  - Test: `sui move build` compiles without errors
  - **File:** `contracts/marketplace/sources/thriftchain.move`

- [ ] **1.3** Write Offer system in Move contract with counter-offer negotiation
  - Define `Offer` Move struct (item_id, buyer, seller, amount, message, status, expires_at, is_counter)
  - Define event structs: `OfferCreated`, `OfferCountered`, `OfferCancelled`, `OfferRejected` (all with copy + drop abilities)
  - Implement `create_offer()` entry function - buyer makes initial offer
  - Implement `counter_offer()` entry function - seller counters with new price
  - Implement `accept_counter_offer()` entry function - buyer accepts counter
  - Implement `cancel_offer()` entry function - buyer cancels own offer
  - Implement `reject_offer()` entry function - seller rejects offer
  - Emit appropriate events in each function using `sui::event::emit()`
  - Test: `sui move build` compiles without errors

- [ ] **1.4** Write Escrow system in Move contract
  - Define `Escrow` Move struct (buyer, seller, item_id, amount, status)
  - Implement `accept_offer()` - creates escrow, locks item
  - Implement `confirm_delivery()` - releases funds to seller, transfers item to buyer
  - Implement `dispute_escrow()` - marks escrow as disputed
  - Implement `refund_escrow()` - returns funds to buyer
  - Add events: `OfferAccepted`, `ItemSold`, `EscrowDisputed`, `EscrowRefunded`
  - Test: `sui move build` compiles

- [ ] **1.5** Write item management functions in Move contract
  - Implement `update_item_price()` - seller can change price
  - Implement `cancel_item()` - seller can cancel listing
  - Implement `mark_as_sold()` - automatically called when escrow completes
  - Add events: `ItemPriceUpdated`, `ItemCancelled`, `ItemMarkedAsSold`
  - Emit events in each function using `sui::event::emit()`
  - Test: `sui move build` compiles, all functions present

- [ ] **1.6** Deploy contracts to Sui testnet
  - `cd contracts/marketplace && sui client publish --gas-budget 100000000`
  - Save Package ID from output
  - Save all created object IDs
  - Test: Can see package on Sui Explorer (https://suiexplorer.com/?network=testnet)

- [ ] **1.7** Update frontend config with deployed contract address
  - Add `NEXT_PUBLIC_THRIFTCHAIN_PACKAGE_ID=0x...` to `.env.local`
  - Update `frontend/src/lib/sui/queries.ts` to use env variable
  - Test: Import `THRIFTCHAIN_PACKAGE_ID` in frontend without errors

- [ ] **1.8** Test contract functions end-to-end on testnet
  - Use Sui CLI to call `create_item` and verify item NFT minted
  - Use Sui CLI to call `create_offer` and verify offer created
  - Use Sui CLI to call `accept_offer` and verify escrow created
  - Test: Can query created objects with `sui client object <id>`

---

### 🎨 PHASE 2: Frontend - Item Listing Flow (DO THIRD)

**Priority:** HIGH - Users need to list items to populate marketplace

- [ ] **2.1** Create TypeScript types for API responses
  - Create `frontend/src/lib/types/api.ts`
  - Define types for API request/response bodies
  - Define error response types
  - Test: Can import types without errors

- [ ] **2.2** Create Walrus upload API route
  - `frontend/src/app/api/walrus/upload/route.ts`
  - POST endpoint: accepts File, returns Walrus blob ID
  - Use `uploadToWalrus()` from `lib/walrus/client.ts`
  - Return JSON: `{ blobId: string, url: string }`
  - Test: Can POST image file and get blob ID back

- [ ] **2.3** Build ItemForm component for creating listings
  - `frontend/src/components/ItemForm.tsx`
  - Form fields: title, description, price, category, tags, images (multi-upload)
  - Image upload: POST to `/api/walrus/upload`, store blob IDs
  - On submit: Build Sui transaction using `buildCreateItemTransaction()`
  - Connect to wallet, sign transaction, execute on-chain
  - Test: Can fill form, upload images, see transaction succeed

- [ ] **2.4** Create /list-item page
  - `frontend/src/app/list-item/page.tsx`
  - Render ItemForm component
  - Show wallet connection requirement
  - After successful listing, redirect to item detail page
  - Test: Navigate to /list-item, see form, can create listing

- [ ] **2.5** Build ItemCard component for displaying items
  - `frontend/src/components/ItemCard.tsx`
  - Display: image (from Walrus), title, price, category, seller (shortened)
  - Click → navigate to `/items/[objectId]`
  - Test: Can render item card with mock data

- [ ] **2.6** Create /listings browse page
  - `frontend/src/app/listings/page.tsx`
  - Query items from blockchain using `getAllItems()`
  - Display grid of ItemCard components
  - Add loading state, empty state
  - Test: Can see listed items, click to view details

- [ ] **2.7** Create /items/[id] detail page
  - `frontend/src/app/items/[id]/page.tsx`
  - Query single item from blockchain using `getItemById(objectId)`
  - Display: full images, description, price, seller info
  - Show "Make Offer" button if not owner
  - Show "Cancel Listing" button if owner
  - Test: Can view item details, images load from Walrus

- [ ] **2.8** Implement Make Offer functionality
  - Build offer transaction using `buildCreateOfferTransaction()`
  - Modal for entering offer amount and message
  - Sign and execute transaction
  - Show success/error feedback
  - Test: Can make offer on item, see transaction succeed

---

### 🤖 PHASE 3: AI Search Layer (DO FOURTH)

**Priority:** MEDIUM - Nice-to-have for better UX

- [ ] **3.1** Create embeddings utility
  - Create `frontend/src/lib/ai/embeddings.ts` (use basic implementation or OpenAI API)
  - Implement `embedText(text: string): Promise<number[]>`
  - Implement `generateItemEmbeddings(item): Promise<{titleEmbedding, descriptionEmbedding, combinedEmbedding}>`
  - Test: Can generate 1536-dim vector from text

- [ ] **3.2** Create indexing API route
  - `frontend/src/app/api/ai/index-item/route.ts`
  - POST endpoint: accepts Sui object ID
  - Fetch item data from blockchain using `getItemById()`
  - Generate embeddings for title, description, combined
  - Insert into Supabase `item_search_index` table
  - Test: Can POST object ID, see row in Supabase

- [ ] **3.3** Create event listener for auto-indexing (optional)
  - Listen to blockchain events (`ItemCreated`)
  - Automatically call `/api/ai/index-item` when new item minted
  - OR: Manual indexing button on item detail page
  - Test: New items automatically appear in search index

- [ ] **3.4** Create semantic search API route
  - `frontend/src/app/api/ai/search/route.ts`
  - POST endpoint: accepts search query text
  - Generate embedding for query
  - Call Supabase function `search_items_by_embedding()`
  - Return array of Sui object IDs with similarity scores
  - Test: Can search "vintage jacket", get relevant object IDs

- [ ] **3.5** Integrate search into /listings page
  - Add search bar component
  - On search submit: Call `/api/ai/search`
  - Fetch full item data from blockchain using returned object IDs
  - Display results
  - Test: Search works, shows relevant items

- [ ] **3.6** Implement user preferences tracking
  - Track when user views item (POST to `/api/ai/track-interaction`)
  - Store in Supabase `user_ai_preferences` table
  - Generate user preference vector from viewed items
  - Test: Viewing items updates preferences

- [ ] **3.7** Create recommendations API route
  - `frontend/src/app/api/ai/recommendations/[wallet]/route.ts`
  - Call Supabase function `get_user_recommendations(wallet)`
  - Return recommended Sui object IDs
  - Test: Can get personalized recommendations

- [ ] **3.8** Add "For You" section to home page
  - Query recommendations API
  - Fetch items from blockchain
  - Display as carousel or grid
  - Test: See personalized recommendations on home page

---

### 💰 PHASE 4: Offers & Escrow Flow (DO FIFTH)

**Priority:** CRITICAL - Core marketplace functionality

- [ ] **4.1** Create OffersList component
  - `frontend/src/components/OffersList.tsx`
  - Display offers for an item
  - Show: buyer address, amount, message, status, timestamp
  - If seller: Show "Accept" / "Reject" buttons
  - If buyer: Show "Cancel" button
  - Test: Can display mock offers

- [ ] **4.2** Create React hooks for Sui event subscriptions
  - Create `frontend/src/hooks/useOfferEvents.ts`
  - Implement `useOfferEvents(itemId)` hook that subscribes to offer events
  - Use `suiClient.subscribeEvent()` to listen for events
  - Filter events by item ID
  - Return state with offers array and loading/error states
  - Clean up subscription on unmount
  - Test: Hook receives events when offers are made/countered/cancelled

- [ ] **4.3** Integrate offers into item detail page
  - Add OffersList component to `/items/[id]` page
  - Use `useOfferEvents(itemId)` hook for real-time updates
  - Query initial offers using `getOffersByItem(itemId)`
  - Merge real-time events with initial query results
  - Update UI when events received
  - Test: Can see all offers on item, updates in real-time when new offer made

- [ ] **4.4** Implement Counter Offer functionality (seller side)
  - Add "Counter Offer" button on each pending offer
  - Build transaction using `buildCounterOfferTransaction()` (add to transactions.ts)
  - Modal for entering counter offer amount
  - Sign and execute transaction
  - Show success feedback, UI updates via event
  - Test: Seller can counter an offer, buyer sees counter in real-time

- [ ] **4.5** Implement Accept Counter Offer functionality (buyer side)
  - Show counter offer details in OffersList
  - Add "Accept Counter" button for buyer
  - Build transaction using `buildAcceptCounterOfferTransaction()` (add to transactions.ts)
  - Creates escrow with counter offer amount
  - Sign and execute transaction
  - Test: Buyer can accept counter offer, escrow created

- [ ] **4.6** Implement Reject Offer functionality (seller side)
  - Add "Reject" button on each pending offer
  - Build transaction using `buildRejectOfferTransaction()` (already exists)
  - Show confirmation modal
  - Sign and execute transaction
  - Offer status changes, buyer notified via event
  - Test: Seller can reject offer, UI updates in real-time

- [ ] **4.7** Implement Accept Offer functionality
  - Build transaction using `buildAcceptOfferTransaction()`
  - Show confirmation modal with escrow details
  - Sign and execute transaction
  - Navigate to escrow/transaction page
  - Test: Seller can accept offer, escrow created

- [ ] **4.8** Create /transactions page
  - `frontend/src/app/transactions/page.tsx`
  - Show tabs: "Buying" and "Selling"
  - Query escrows using `getEscrowsByBuyer()` and offers by seller
  - Display escrow status, item, amount, delivery confirmation
  - Test: Can see active transactions

- [ ] **4.9** Create React hook for transaction event subscriptions
  - Create `frontend/src/hooks/useTransactionEvents.ts`
  - Implement `useTransactionEvents(userAddress)` hook
  - Subscribe to escrow events: `OfferAccepted`, `ItemSold`, `EscrowDisputed`, `EscrowRefunded`
  - Filter events by buyer or seller address
  - Return state with transactions array and updates
  - Test: Hook receives real-time transaction updates

- [ ] **4.10** Implement Confirm Delivery functionality
  - On /transactions page, show "Confirm Delivery" button for buyers
  - Build transaction using `buildConfirmDeliveryTransaction()`
  - Sign and execute
  - Show success: funds released, item transferred
  - UI updates in real-time via `ItemSold` event
  - Test: Buyer can confirm delivery, escrow completes

- [ ] **4.11** Implement Dispute functionality
  - Add "Dispute" button on escrow page
  - Build transaction using `buildDisputeEscrowTransaction()`
  - Add reason field
  - Sign and execute
  - UI updates via `EscrowDisputed` event
  - Test: Can dispute escrow, status changes

- [ ] **4.12** Implement Refund functionality (admin/seller)
  - For disputed escrows, admin/seller can refund
  - Build transaction using `buildRefundEscrowTransaction()`
  - Sign and execute
  - Funds returned to buyer
  - UI updates via `EscrowRefunded` event
  - Test: Disputed escrow can be refunded

---

### 🎨 PHASE 5: Polish & UX (DO LAST)

**Priority:** LOW - Nice-to-have improvements

- [ ] **5.1** Add loading states to all pages
  - Skeleton loaders for ItemCard
  - Spinner for transaction execution
  - Loading overlay for image uploads

- [ ] **5.2** Add error handling and user feedback
  - Toast notifications for success/errors
  - Graceful error messages for failed transactions
  - Retry buttons for failed operations

- [ ] **5.3** Optimize performance
  - Lazy load images from Walrus
  - Pagination for item listings
  - Cache blockchain queries (short TTL)

- [ ] **5.4** Mobile responsive design
  - Test on mobile breakpoints
  - Adjust layout for small screens
  - Touch-friendly buttons

- [ ] **5.5** Add user profile page
  - `/profile/[wallet]` page
  - Show: items listed, items purchased, reputation
  - Query blockchain for user's items and transactions

- [ ] **5.6** Implement search filters
  - Category filter
  - Price range filter
  - Tags filter
  - Sort by: newest, price low-high, price high-low

- [ ] **5.7** Add notification center with Sui event aggregation
  - Create notification center component
  - Aggregate events from `useOfferEvents` and `useTransactionEvents` hooks
  - Show notifications for: new offers, counter offers, accepted offers, delivery confirmations
  - Show badge count of unread notifications
  - Persist notification read status in localStorage
  - Test: See real-time notifications when blockchain events occur

---

## 🧪 TESTING WORKFLOW

**After Each Phase:**
1. ✅ Complete all tasks in phase
2. 🧪 Test end-to-end flow for that phase
3. 📋 Document any bugs/issues
4. ✅ Fix critical bugs before moving to next phase
5. ➡️ Proceed to next phase

**Testing Checklist:**
- [ ] Can connect wallet (Suiet or zkLogin)
- [ ] Can upload images to Walrus
- [ ] Can mint item NFT on Sui
- [ ] Can browse items from blockchain
- [ ] Can make offer on item
- [ ] Can see offers in real-time (event subscription)
- [ ] Seller can counter offer with new price
- [ ] Buyer can accept counter offer
- [ ] Seller can reject offer
- [ ] Seller can accept offer (creates escrow)
- [ ] Can confirm delivery (completes transaction)
- [ ] Notifications update in real-time via Sui events
- [ ] Can search items (AI search)
- [ ] Can see recommendations
- [ ] Mobile responsive

---

## 📁 KEY FILES REFERENCE

### Blockchain Layer
- `contracts/marketplace/sources/thriftchain.move` - Move smart contracts
- `contracts/marketplace/Move.toml` - Package manifest
- `frontend/src/lib/sui/queries.ts` - Query blockchain (read)
- `frontend/src/lib/sui/transactions.ts` - Build transactions (write)
- `frontend/src/lib/types/sui-objects.ts` - TypeScript types for on-chain objects

### Storage Layer
- `frontend/src/lib/walrus/client.ts` - Walrus upload/download
- `frontend/src/app/api/walrus/upload/route.ts` - Upload API

### AI Search Layer
- `frontend/supabase-schema.sql` - AI-only schema (3 tables)
- `frontend/src/lib/ai/embeddings.ts` - Generate vectors
- `frontend/src/app/api/ai/index-item/route.ts` - Index items
- `frontend/src/app/api/ai/search/route.ts` - Semantic search

### Frontend Pages
- `frontend/src/app/page.tsx` - Home page
- `frontend/src/app/list-item/page.tsx` - Create listing
- `frontend/src/app/listings/page.tsx` - Browse items
- `frontend/src/app/items/[id]/page.tsx` - Item details
- `frontend/src/app/transactions/page.tsx` - User transactions

### Components
- `frontend/src/components/Header.tsx` - Nav header
- `frontend/src/components/ItemForm.tsx` - Create/edit item form
- `frontend/src/components/ItemCard.tsx` - Display item card
- `frontend/src/components/OffersList.tsx` - Display offers

### React Hooks
- `frontend/src/hooks/useOfferEvents.ts` - Real-time offer event subscriptions
- `frontend/src/hooks/useTransactionEvents.ts` - Real-time transaction event subscriptions

---

## 🎯 CRITICAL PATH (MUST COMPLETE FOR MVP)

```
Phase 0 (Blockers) → Phase 1 (Smart Contracts) → Phase 2.1-2.7 (Item Listing) → Phase 4.1-4.10 (Offers & Escrow)
```

**Minimum Viable Demo:**
1. User can list item (upload to Walrus, mint NFT on Sui)
2. Another user can browse items (query blockchain)
3. User can make offer (create on-chain Offer)
4. **NEW:** Seller can counter offer with new price
5. **NEW:** Buyer can accept counter offer
6. **NEW:** Real-time negotiation updates via Sui events
7. Seller can accept offer (create on-chain Escrow)
8. Buyer can confirm delivery (release escrow, transfer item)

**AI Search (Phase 3) is optional** - can demo without it if time runs out.

**Counter-offer negotiation demonstrates:**
- Blockchain-native messaging (no centralized chat)
- Event-driven real-time updates
- Trust-minimized peer-to-peer negotiation

---

## ⏱️ TIME ESTIMATES (48-hour hackathon)

- Phase 0: 1-2 hours
- Phase 1: 10-14 hours (smart contracts + events + counter-offers are complex!)
- Phase 2: 8-10 hours
- Phase 3: 6-8 hours (optional)
- Phase 4: 8-10 hours (includes event subscriptions + counter-offer UI)
- Phase 5: 2-4 hours (optional)

**Total Core (0+1+2+4): 27-36 hours** - Leaves 12-21 hours for debugging, testing, demo prep.

**Note:** Event-driven negotiation adds ~2-3 hours to Phases 1 & 4, but significantly enhances demo value by showcasing blockchain-native real-time communication.

---

## 📝 NOTES

- **ALWAYS query blockchain for source of truth** - Supabase is just for AI search
- **Use Sui events for real-time updates** - No centralized messaging/Supabase Realtime needed
- **Test on Sui testnet** - Use testnet tokens, don't deploy to mainnet
- **Keep Move contracts simple** - Focus on working functionality over advanced features
- **Emit events in every Move function** - Required for frontend real-time updates
- **Blockchain writes are expensive** - Design to minimize transactions
- **Image optimization** - Compress images before Walrus upload to save storage costs
- **Event subscriptions require cleanup** - Always unsubscribe in React hooks to prevent memory leaks

---

_Last Updated: After adding Sui event-driven counter-offer negotiation system_
