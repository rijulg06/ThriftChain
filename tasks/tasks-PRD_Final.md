# Task List: ThriftChain MVP Implementation

**Based on:** PRD_Final.md  
**Generated:** December 2024  
**Context:** CalHacks 12 Hackathon (48-hour timeline)

## Current State Summary

### ✅ Existing Infrastructure
- Next.js 16 with TypeScript and Tailwind CSS
- Sui wallet integration via @suiet/wallet-kit
- zkLogin flow with Enoki (@mysten/enoki)
- Basic UI components (Dialog, Button) via shadcn/ui
- Retro-themed design system in place
- Basic page structure (Header, Home page, LoginModal)

### ❌ Missing Critical Components
- Supabase database integration
- Walrus decentralized storage
- Item listing and management features
- Smart contract integration (NFT minting, escrow)
- API endpoints for marketplace operations
- Personalized recommendation system
- Real-time messaging and negotiation

---

## Relevant Files

### Database & Storage
- `lib/supabase/client.ts` - Supabase client initialization for database operations
- `lib/supabase/server.ts` - Server-side Supabase client for API routes
- `lib/walrus/client.ts` - Walrus storage client for image uploads
- `src/app/api/walrus/upload/route.ts` - API endpoint for image uploads to Walrus

### Core Components
- `src/app/listings/page.tsx` - Main listings browse page with search and filters
- `src/app/list-item/page.tsx` - Page for creating new item listings
- `src/app/items/[id]/page.tsx` - Individual item detail page
- `src/components/ItemCard.tsx` - Reusable card component for displaying items
- `src/components/ItemForm.tsx` - Form component for creating/editing items
- `src/components/SearchBar.tsx` - Search component with filtering capabilities

### Database Models & Types
- `lib/types/item.ts` - TypeScript interfaces for Item, WalrusBlob, OwnershipRecord
- `lib/types/user.ts` - User profile and preferences types
- `lib/types/transaction.ts` - Transaction and escrow types

### API Routes
- `src/app/api/items/route.ts` - GET (list items), POST (create item)
- `src/app/api/items/[id]/route.ts` - GET (single item), PUT (update), DELETE (delist)
- `src/app/api/offers/route.ts` - POST (make offer)
- `src/app/api/transactions/route.ts` - GET (list transactions), POST (create transaction)

### Smart Contracts
- `contracts/marketplace/sources/thriftchain.move` - Move smart contract for NFT marketplace
- `scripts/sui-utils.ts` - Sui SDK utilities for NFT operations
- `lib/sui/nft.ts` - Client-side NFT minting and management functions

### AI & Recommendations
- `lib/ai/recommendations.ts` - Personalized recommendation algorithms
- `lib/ai/embeddings.ts` - Vector embeddings for semantic search
- `src/app/api/recommendations/route.ts` - API endpoint for personalized feed

### Transactions & Escrow
- `lib/sui/escrow.ts` - Escrow smart contract interaction
- `src/app/transactions/page.tsx` - User transaction history page
- `src/components/TransactionModal.tsx` - Modal for transaction details and confirmation

### Notes
- Unit tests should be placed alongside the code files they are testing (e.g., `ItemCard.tsx` and `ItemCard.test.tsx` in the same directory).
- Use `npm run test` or `npx jest [optional/path/to/test/file]` to run tests.

---

## Tasks

- [ ] 1.0 Setup Database and Storage Infrastructure
  - [ ] 1.1 Install and configure Supabase dependencies (`@supabase/supabase-js`, `@supabase/auth-helpers-nextjs`, `@supabase/realtime-js`)
  - [ ] 1.2 Create Supabase project and configure environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
  - [ ] 1.3 Create database schema for items, users, transactions, and offers tables in Supabase
  - [ ] 1.4 Implement Supabase client utilities (`lib/supabase/client.ts` for client-side, `lib/supabase/server.ts` for server-side)
  - [ ] 1.5 Install and configure Walrus SDK for decentralized storage
  - [ ] 1.6 Create Walrus client wrapper (`lib/walrus/client.ts`) with image upload functionality
  - [ ] 1.7 Implement API endpoint for image uploads (`src/app/api/walrus/upload/route.ts`)
  - [ ] 1.8 Set up real-time subscriptions in Supabase for live updates (negotiations, offers)

- [ ] 2.0 Implement Core Item Management System
  - [ ] 2.1 Create TypeScript type definitions (`lib/types/item.ts`) for Item, WalrusBlob, OwnershipRecord
  - [ ] 2.2 Build ItemCard component (`src/components/ItemCard.tsx`) with image carousel, price display, and action buttons
  - [ ] 2.3 Create listings browse page (`src/app/listings/page.tsx`) with search, filters, and grid/list view
  - [ ] 2.4 Implement SearchBar component (`src/components/SearchBar.tsx`) with real-time search and category filters
  - [ ] 2.5 Build item detail page (`src/app/items/[id]/page.tsx`) showing full item information, ownership history, and offer interface
  - [ ] 2.6 Create item listing form (`src/app/list-item/page.tsx` and `src/components/ItemForm.tsx`) with image upload, description, pricing
  - [ ] 2.7 Implement API routes for items (`src/app/api/items/route.ts` for list/create, `src/app/api/items/[id]/route.ts` for single item operations)
  - [ ] 2.8 Add image optimization and preview functionality before uploading to Walrus

- [ ] 3.0 Build Smart Contract Integration (NFT Minting & Transactions)
  - [ ] 3.1 Write Move smart contract for NFT marketplace (`contracts/marketplace/sources/thriftchain.move`)
  - [ ] 3.2 Deploy smart contracts to Sui testnet and save contract addresses
  - [ ] 3.3 Create Sui NFT utilities (`lib/sui/nft.ts`) for minting NFTs representing items
  - [ ] 3.4 Implement NFT minting function that creates NFT with item metadata and Walrus image URLs
  - [ ] 3.5 Build NFT ownership tracking system to link database items with on-chain NFTs
  - [ ] 3.6 Implement NFT transfer functionality for completed purchases
  - [ ] 3.7 Create transaction builder utilities (`scripts/sui-utils.ts`) for Programmable Transaction Blocks (PTBs)
  - [ ] 3.8 Add NFT provenance tracking on item detail pages

- [ ] 4.0 Create AI-Powered Discovery and Personalization
  - [ ] 4.1 Design user preference system for tracking interests and behavior (`lib/types/user.ts`)
  - [ ] 4.2 Implement preference collection UI on user profile/onboarding
  - [ ] 4.3 Build collaborative filtering algorithm (`lib/ai/recommendations.ts`) for item recommendations
  - [ ] 4.4 Create personalized feed API endpoint (`src/app/api/recommendations/route.ts`)
  - [ ] 4.5 Implement semantic search using vector embeddings (`lib/ai/embeddings.ts`)
  - [ ] 4.6 Build trending items algorithm based on views, bids, and recent sales
  - [ ] 4.7 Create "For You" personalized feed section on home page and listings page

- [ ] 5.0 Develop Transaction and Escrow System
  - [ ] 5.1 Design transaction flow from offer to completion with status tracking
  - [ ] 5.2 Build Offer model and API endpoints (`src/app/api/offers/route.ts`) for creating and managing offers
  - [ ] 5.3 Implement real-time offer notifications using Supabase Realtime
  - [ ] 5.4 Create Transaction model and API endpoints (`src/app/api/transactions/route.ts`)
  - [ ] 5.5 Write Move smart contract for escrow functionality (multi-signature escrow for funds)
  - [ ] 5.6 Implement escrow creation in smart contract when offer is accepted
  - [ ] 5.7 Build escrow release mechanism (release funds to seller on delivery confirmation)
  - [ ] 5.8 Implement refund functionality for disputes or failed transactions
  - [ ] 5.9 Create transaction history page (`src/app/transactions/page.tsx`) showing user's buy/sell history
  - [ ] 5.10 Build TransactionModal component (`src/components/TransactionModal.tsx`) for transaction details and confirmation
  - [ ] 5.11 Add dispute resolution interface (basic version - flag disputed transactions)
  - [ ] 5.12 Implement reputation system (update reputation scores based on completed transactions)
