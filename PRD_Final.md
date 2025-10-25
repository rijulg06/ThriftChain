# Product Requirements Document: ThriftChain

**Version:** 3.0.0  
**Date:** December 2024  
**Context:** CalHacks 12 Hackathon  
**Team Size:** [To be determined]  
**Timeline:** 48 hours

## Table of Contents

1. Introduction/Overview
2. Goals
3. User Stories
4. Functional Requirements
5. Non-Goals (Out of Scope)
6. Design Considerations
7. Technical Considerations
8. Success Metrics
9. Edge Cases & Error Handling
10. Implementation Priority & Timeline
11. Open Questions
12. Development Resources
13. Risk Mitigation
14. Development Setup Instructions
15. Appendices

---

## 1. Introduction/Overview

ThriftChain is a next-generation peer-to-peer resale and trade marketplace built on the Sui blockchain to empower users directly—eliminating unnecessary fees, middlemen, and control from centralized platforms. The goal is to create a **trust-first, AI-personalized trading economy** where users can buy, sell, or trade items seamlessly.

### Core Problem
Traditional marketplace platforms present significant challenges for users:
- **High Fees & Lost Earnings:** Traditional platforms take 10–30% in fees, drastically reducing user profit
- **Centralized Control:** Platforms decide who sees what, forcing users to pay to boost visibility
- **Lack of Trust Between Strangers:** Buyers fear scams; sellers fear chargebacks or non-payment
- **Poor User Experience in Discovery:** Users scroll endlessly through generic listings instead of seeing items truly relevant to them

However, users face challenges:
- Complex blockchain interactions
- Need for secure transaction mechanisms
- Requirement for personalized discovery

### Our Solution
ThriftChain creates a **peer-powered economy** where users keep what they earn, control their deals, and interact in a fair system where safety and relevance are built in—not added on.

### Blockchain/Architecture Clarification

**IMPORTANT**: ThriftChain is built on Sui blockchain for fast, low-cost transactions with built-in escrow capabilities.

We handle:
- ✅ Peer-to-peer transactions with smart contract escrow
- ✅ AI-powered item discovery and matching
- ✅ Real-time bidding and negotiation
- ✅ Low-fee economic model (minimal platform overhead)

We do NOT handle:
- ❌ Traditional payment processing (credit cards, bank transfers)
- ❌ Centralized inventory management
- ❌ Complex KYC/AML compliance (beyond basic wallet verification)

**Primary Goal:** Launch a functional MVP demonstrating core peer-to-peer trading with AI personalization within 48 hours.

---

## 2. Goals

### Primary Objectives
1. **Core Trading Functionality**
   - Implement secure peer-to-peer transactions using Sui smart contracts
   - Enable item listing, bidding, and negotiation features
   - Create escrow-like transaction flow for buyer/seller protection

2. **AI-Powered Personalization**
   - Build user preference profiles and behavioral tracking
   - Implement personalized item discovery feed
   - Create intelligent matching algorithms for relevant items

3. **User Experience Excellence**
   - Design intuitive, modern interface using Next.js and Tailwind CSS
   - Implement real-time negotiation and communication features
   - Ensure mobile-responsive design for accessibility

4. **Blockchain Integration**
   - Seamless Sui wallet connection and transaction signing
   - Gas-efficient transaction batching
   - Real-time transaction status updates

5. **Trust & Security**
   - Implement reputation system for users
   - Create dispute resolution mechanisms
   - Ensure transaction transparency and auditability

---

## 3. User Stories

### Seller Stories

**SELLER-001: Item Lister**
> As a seller, I want to list my items with photos and descriptions, so that I can attract potential buyers and set my desired price or trade preferences.

**SELLER-002: Negotiation Manager**
> As a seller, I want to receive and respond to offers in real-time, so that I can negotiate the best deal for my items.

**SELLER-003: Secure Transaction Handler**
> As a seller, I want my funds held in escrow until the buyer confirms receipt, so that I'm protected from fraudulent transactions.

### Buyer Stories

**BUYER-001: Personalized Discoverer**
> As a buyer, I want to see items that match my interests and preferences, so that I don't waste time browsing irrelevant listings.

**BUYER-002: Offer Maker**
> As a buyer, I want to make offers and counteroffers on items, so that I can negotiate the best price or trade terms.

**BUYER-003: Secure Purchaser**
> As a buyer, I want my payment held in escrow until I confirm item receipt, so that I'm protected from receiving damaged or incorrect items.

### Trader Stories

**TRADER-001: Item Swapper**
> As a trader, I want to propose item-for-item trades, so that I can exchange goods without using money.

**TRADER-002: Multi-Party Negotiator**
> As a trader, I want to negotiate complex multi-item trades, so that I can maximize the value of my transactions.

---

## 4. Functional Requirements

### 4.1 User Authentication & Profiles (Priority: Critical)

**FR-001:** System MUST connect to Sui wallet (Sui Wallet, Suiet, etc.) for user authentication  
**FR-002:** System MUST create and store user preference profiles including interests, categories, and price ranges  
**FR-003:** System MUST track user behavior (views, bids, purchases) for personalization  
**FR-004:** System MUST implement basic reputation scoring based on transaction history  
**FR-005:** System MUST allow users to update their profiles and preferences

### 4.2 Item Management (Priority: Critical)

**FR-006:** System MUST enable users to mint NFTs on Sui blockchain with all item metadata (title, description, price, Walrus image IDs) stored on-chain
**FR-007:** System MUST support both fixed-price and auction-style listings with price data stored in on-chain Move structs
**FR-008:** System MUST allow users to mark NFT items as available for trade via on-chain status field
**FR-009:** System MUST implement item categorization and tagging system stored in on-chain vector fields
**FR-010:** System MUST enable users to transfer NFT ownership via Sui smart contract transactions

### 4.3 AI-Powered Discovery (Priority: High)

**FR-011:** System MUST generate personalized item feeds based on user preferences  
**FR-012:** System MUST implement collaborative filtering for item recommendations  
**FR-013:** System MUST track user interactions to improve recommendation accuracy  
**FR-014:** System MUST provide search functionality with intelligent filtering  
**FR-015:** System MUST surface trending and popular items

### 4.4 Transaction & Negotiation (Priority: Critical)

**FR-016:** System MUST implement on-chain offer/bidding system with Offer Move structs stored on Sui blockchain
**FR-017:** System MUST provide real-time offer notifications using Sui's native event subscription system (subscribeEvent)
**FR-018:** System MUST support counteroffer functionality where sellers can counter buyer offers with new prices on-chain
**FR-019:** System MUST implement escrow smart contracts that hold SUI tokens on-chain until delivery confirmation
**FR-020:** System MUST provide transaction status tracking by querying on-chain Escrow objects
**FR-021:** System MUST emit blockchain events for all negotiation actions (OfferCreated, OfferCountered, OfferAccepted, OfferRejected, OfferCancelled)

### 4.5 Payment & Escrow (Priority: Critical)

**FR-022:** System MUST execute ALL payments via Sui blockchain smart contracts (no off-chain payment processing)
**FR-023:** System MUST implement on-chain escrow with buyer/seller confirmation mechanism for transaction security
**FR-024:** System MUST support SUI token payments (USDC support as future enhancement)
**FR-025:** System MUST implement automatic refund via smart contract when escrow is disputed/cancelled
**FR-026:** System MUST provide transaction history by querying user's on-chain transaction and escrow objects

---

## 5. Non-Goals (Out of Scope)

Clear boundaries for what will NOT be included:

### Architecture Explicitly Excluded
- **Centralized Data Storage**: No marketplace data (items, offers, transactions) in traditional databases
- **Off-Chain Transaction Processing**: All transactions execute via smart contracts, no centralized backend
- **Custodial Wallets**: Users control their own keys, no platform custody of funds
- **Centralized Escrow**: Escrow handled by smart contracts, not platform-controlled accounts

### Features Explicitly Excluded
- **Fiat Currency Integration**: No credit card or bank transfer support (blockchain-native only)
- **Free-Form Chat Messaging**: No chat system - negotiation happens via structured offers/counteroffers only
- **Complex KYC/AML**: Basic wallet verification only, no identity verification
- **International Shipping**: Focus on local/regional transactions
- **Advanced Analytics Dashboard**: Basic transaction history only (query on-chain data)
- **Multi-Party Auctions**: No live bidding wars - simple offer/counteroffer negotiation only

### Deferred to Future Versions
- **Mobile App**: Web-first approach, mobile-responsive design
- **Advanced AI Features**: Machine learning model training and optimization
- **Multi-language Support**: English-only for MVP
- **Advanced Dispute Resolution**: Basic reputation system only

### Technical Non-Goals
- **Custom Blockchain**: Using existing Sui network
- **Complex Smart Contract Logic**: Basic escrow and payment contracts only
- **Advanced Caching**: Simple in-memory caching for MVP

---

## 6. Design Considerations

### Visual Design System
- **Color Palette**: Modern, trust-focused colors (blues, greens) with accent colors for actions
- **Typography**: Clean, readable fonts (Inter, system fonts) with clear hierarchy
- **Design Style**: Modern, minimalist with glass morphism elements
- **Animation Philosophy**: Subtle, purposeful animations for feedback and transitions

### User Experience Patterns
- **Navigation Structure**: Bottom navigation for mobile, sidebar for desktop
- **Key Interactions**: Swipe gestures for item browsing, tap-to-negotiate, pull-to-refresh
- **Feedback Mechanisms**: Toast notifications, loading states, success/error animations

### Accessibility Considerations
- **Color Contrast**: WCAG AA compliance for all text and interactive elements
- **Keyboard Navigation**: Full keyboard support for desktop users
- **Screen Reader Support**: Semantic HTML and ARIA labels
- **Responsive Breakpoints**: Mobile-first design (320px+), tablet (768px+), desktop (1024px+)

### Design Resources
**Key UI Components:**
- Item cards with image carousels
- Real-time chat interface for negotiations
- Transaction status indicators
- Wallet connection modal
- Personalized feed with infinite scroll

---

## 7. Technical Considerations

### Architecture Overview (DECENTRALIZED-FIRST)

```
                    ┌──────────────────────────────┐
                    │    SUI BLOCKCHAIN            │
                    │   (SOURCE OF TRUTH)          │
                    │                              │
                    │  ┌────────────────────────┐  │
                    │  │  Smart Contracts       │  │
                    │  │  - ThriftItem NFTs     │  │
                    │  │  - Offers              │  │
                    │  │  - Escrow              │  │
                    │  │  - Transactions        │  │
                    │  └────────────────────────┘  │
                    └──────────────────────────────┘
                         ▲                    ▲
                         │                    │
                         │ Query              │ Write
                         │ (Read State)       │ (Transactions)
                         │                    │
                    ┌────┴─────────────────────┴────┐
                    │      Frontend (Next.js)        │
                    │   - Query Sui RPC directly     │
                    │   - Build & sign transactions  │
                    │   - Wallet integration         │
                    └────────────────────────────────┘
                         │                    │
                         │                    │
                         ▼                    ▼
            ┌─────────────────────┐   ┌─────────────────────┐
            │   WALRUS            │   │   SUPABASE          │
            │ (Decentralized      │   │ (AI Search ONLY)    │
            │  Image Storage)     │   │                     │
            │                     │   │ - Vector embeddings │
            │ - Image blobs       │   │ - User preferences  │
            │ - Blob IDs          │   │ - Search cache      │
            │   stored on-chain   │   │                     │
            └─────────────────────┘   └─────────────────────┘
```

**KEY PRINCIPLES:**
1. **Sui Blockchain = Source of Truth**: All marketplace data (items, offers, transactions) lives on-chain
2. **Walrus = Decentralized Storage**: Images stored on Walrus, blob IDs referenced on-chain
3. **Supabase = AI Search Layer ONLY**: Vector embeddings for semantic search, returns object IDs
4. **Frontend = Direct Blockchain Interaction**: Queries Sui RPC, builds transactions, no centralized API

### Technology Stack

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Data Layer (Source of Truth)** | **Sui Blockchain** | **All marketplace data stored on-chain, fully decentralized** |
| Smart Contracts | Move | Sui's native language, secure by design, handles all business logic |
| Frontend | Next.js 16 | Server-side rendering, App Router, React 19 |
| Styling | Tailwind CSS 4 | Rapid development, consistent design system |
| Blockchain SDK | @mysten/sui v1.10.0 | Official TypeScript SDK for Sui, query & transaction building |
| **Image Storage** | **Walrus (Decentralized)** | **Byzantine fault-tolerant storage, Sui-integrated** |
| **AI Search** | **Supabase + pgvector** | **Vector embeddings for semantic search ONLY, not source of truth** |
| Authentication | Sui Wallet (Suiet) + Enoki (zkLogin) | Dual wallet support: browser extension + Google OAuth |
| Wallet Integration | @suiet/wallet-kit | Browser wallet connection and transaction signing |
| AI Embeddings | OpenAI text-embedding-ada-002 | 1536-dim vectors for semantic search |

### Key Technical Decisions

#### Frontend Framework Choice
- **Choice**: Next.js 14 with App Router
- **Alternatives Considered**: React with Vite, Vue.js, Svelte
- **Rationale**: Built-in API routes, excellent performance, great developer experience

#### Blockchain Integration
- **Choice**: Sui TypeScript SDK (@mysten/sui)
- **Alternatives Considered**: Direct RPC calls, custom SDK
- **Rationale**: Official SDK, comprehensive features, active maintenance

#### Data Storage Choice
- **Choice**: Sui Blockchain (on-chain) + Supabase (AI search layer)
- **Alternatives Considered**: Full centralized DB, IPFS, Arweave
- **Rationale**: True decentralization with Sui as source of truth, Supabase only for performance-critical AI search

#### Supabase Role (AI Search ONLY)
- **Vector Embeddings**: pgvector extension for semantic search (1536-dim embeddings)
- **User Preferences**: Store learned taste profiles for recommendations
- **Search Cache**: Temporary cache of search results (expires hourly)
- **NOT Used For**: Items, offers, transactions, ownership (all on-chain)
- **Benefits**: Fast vector similarity search without centralizing marketplace data
- **Risk Mitigation**: If Supabase fails, marketplace still functions (search degraded only)

#### Walrus Storage Integration
- **Decentralized Storage**: Images and content stored on decentralized network
- **Sui Integration**: Native integration with Sui blockchain for payments and coordination
- **Cost Efficient**: Advanced erasure coding reduces storage costs by ~5x
- **Byzantine Fault Tolerant**: Content remains accessible even with malicious nodes
- **Public & Discoverable**: All stored content is public and verifiable
- **Smart Contract Integration**: Storage objects represented as Sui objects

### Data Models (ON-CHAIN MOVE STRUCTS)

**All marketplace data lives in Move structs on Sui blockchain:**

```move
// Move smart contract (contracts/marketplace/sources/thriftchain.move)

module thriftchain::marketplace {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    /// Main marketplace item as NFT
    /// This is the SOURCE OF TRUTH - all item data lives here
    public struct ThriftItem has key, store {
        id: UID,
        seller: address,
        title: String,
        description: String,
        price: u64,                      // Price in MIST
        currency: String,                // "SUI" or "USDC"
        category: String,
        tags: vector<String>,
        walrus_image_ids: vector<String>, // Walrus blob IDs
        is_for_trade: bool,
        status: u8,                       // 0=active, 1=sold, 2=cancelled
        created_at: u64,                  // Timestamp in milliseconds
    }

    /// Offer/bid on an item
    public struct Offer has key {
        id: UID,
        item_id: ID,                     // References ThriftItem
        buyer: address,
        seller: address,
        amount: u64,
        currency: String,
        message: String,
        status: u8,                      // 0=pending, 1=accepted, 2=rejected
        expires_at: u64,
        created_at: u64,
    }

    /// Escrow holding funds during transaction
    public struct Escrow has key {
        id: UID,
        buyer: address,
        seller: address,
        item_id: ID,
        amount: u64,
        currency: String,
        status: u8,                      // 0=active, 1=completed, 2=refunded
        created_at: u64,
        delivery_confirmed: bool,
    }
}
```

**TypeScript interfaces (mirror on-chain data for frontend):**

```typescript
// These are READ-ONLY representations of on-chain Move structs
// Located in: frontend/src/lib/types/sui-objects.ts

interface ThriftItemObject {
  objectId: string              // Sui object ID (primary key)
  fields: {
    seller: string
    title: string
    description: string
    price: string               // u64 as string
    walrus_image_ids: string[]  // Walrus blob IDs
    status: number              // 0=active, 1=sold, 2=cancelled
    // ... other fields from Move struct
  }
}
```

**Supabase schema (AI search index ONLY):**

```sql
-- This is NOT the source of truth, just a search accelerator
-- Located in: frontend/supabase-schema.sql

CREATE TABLE item_search_index (
    sui_object_id TEXT PRIMARY KEY,     -- References on-chain object
    title_embedding VECTOR(1536),       -- For semantic search
    description_embedding VECTOR(1536),
    combined_embedding VECTOR(1536),

    -- Cached fields for filtering (synced from blockchain)
    title TEXT,
    category TEXT,
    tags TEXT[],
    price_mist BIGINT,
    status TEXT,

    last_indexed_at TIMESTAMP
);
```

### API Endpoints (MINIMAL - Most ops happen on-chain)

**Blockchain Operations (handled client-side via Sui SDK):**
- Create item → Build transaction client-side → Sign with wallet → Execute on-chain
- Make offer → Build transaction client-side → Sign with wallet → Execute on-chain
- Accept offer → Build transaction client-side → Sign with wallet → Execute on-chain
- Query items → Direct Sui RPC query (suiClient.getOwnedObjects)

**API Routes (only for AI search & indexing):**

| Method | Endpoint | Purpose | Source |
|--------|----------|---------|--------|
| POST | /api/ai/index-item | Index on-chain item for search | Sui → Supabase |
| POST | /api/ai/search | Semantic search (returns object IDs) | Supabase vectors |
| GET | /api/ai/recommendations/:wallet | Get personalized recommendations | Supabase vectors |
| POST | /api/ai/track-interaction | Track user view/like for learning | Supabase |
| POST | /api/walrus/upload | Upload image to Walrus | Walrus |

**Data Flow:**
1. User creates item → Upload images to Walrus → Get blob IDs
2. Build Sui transaction with blob IDs → Sign → Execute on-chain
3. Backend listens to blockchain events → Index item in Supabase for search
4. User searches → Query Supabase vectors → Get object IDs
5. Frontend fetches full item data from Sui blockchain using object IDs

**Negotiation Flow (Event-Driven):**
1. Buyer makes offer → Execute on-chain → Emit `OfferCreated` event
2. Seller's frontend subscribed to events → Receives real-time notification
3. Seller counters → Execute on-chain → Emit `OfferCountered` event
4. Buyer's frontend receives counter → Can accept or counter again
5. Seller accepts → Execute on-chain → Emit `OfferAccepted` event → Create escrow
6. Both parties notified in real-time via event subscriptions

### Real-Time Event Subscriptions

**Architecture:** Sui's native WebSocket event system (`suiClient.subscribeEvent`)

**Event Types Emitted:**
```typescript
// All events emitted from Move contracts
OfferCreated      // When buyer makes initial offer
OfferCountered    // When seller counters with new price
OfferAccepted     // When seller accepts offer (creates escrow)
OfferRejected     // When seller rejects offer
OfferCancelled    // When buyer cancels their offer
ItemSold          // When escrow completes and item transfers
```

**Frontend Subscription Pattern:**
```typescript
// Subscribe to events for real-time UI updates
const unsubscribe = await suiClient.subscribeEvent({
    filter: {
        MoveEventType: `${PACKAGE_ID}::marketplace::OfferCreated`
    },
    onMessage: (event) => {
        // Real-time notification when offer is made
        showNotification(event.parsedJson)
        refetchOffers()
    }
})
```

**Benefits:**
- ✅ Fully decentralized (no Supabase Realtime needed for offers)
- ✅ Native to Sui blockchain
- ✅ Events are permanent and queryable
- ✅ No additional infrastructure required
- ✅ Direct blockchain integration

### Performance Considerations
- **Target Response Time**: < 200ms for API calls, < 2s for page loads
- **Concurrency**: Support 100+ concurrent users
- **Caching Strategy**: Redis for session data, CDN for static assets
- **Optimization Priorities**: Database queries, image optimization, bundle size

### Security Considerations
- **Authentication**: Sui wallet signature verification
- **Authorization**: Wallet-based access control
- **Data Encryption**: HTTPS for all communications
- **Key Management**: User-controlled private keys, no server-side key storage

---

## 8. Success Metrics

### Demo/Launch Criteria

Must-have criteria for launch:

| # | Criterion | Target | Status |
|---|-----------|--------|--------|
| 1 | User can connect Sui wallet | 100% success rate | [ ] |
| 2 | User can list item with photos | Complete flow works | [ ] |
| 3 | User can make and receive offers | Real-time functionality | [ ] |
| 4 | Transaction completes with escrow | Smart contract integration | [ ] |
| 5 | Personalized feed shows relevant items | AI recommendations work | [ ] |

**Total Target: 5/5**

### Technical Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Page Load Time | < 2 seconds | Lighthouse audit |
| API Response Time | < 200ms | Application monitoring |
| Transaction Success Rate | > 95% | Blockchain transaction tracking |
| Wallet Connection Success | > 90% | User interaction tracking |

### User Experience Metrics
- **User Onboarding Completion**: > 80% complete profile setup
- **Item Discovery Engagement**: > 60% click-through rate on recommendations
- **Transaction Completion**: > 70% of initiated transactions complete successfully

### Business Metrics
- **Active Users**: 50+ users during demo
- **Items Listed**: 100+ items in marketplace
- **Transactions Completed**: 20+ successful transactions

---

## 9. Edge Cases & Error Handling

### Critical Path Protection

The transaction flow MUST work flawlessly. All error handling focuses on this path:

```typescript
// Transaction flow with comprehensive error handling
class TransactionFlow {
  private readonly criticalPath = [
    'walletConnection', 'offerCreation', 'escrowSetup', 'transactionExecution'
  ];
  
  async executeTransaction(offer: Offer): Promise<TransactionResult> {
    try {
      await this.validateWalletConnection();
      await this.createEscrowContract(offer);
      await this.executePayment(offer);
      return { success: true, transactionId: offer.id };
    } catch (error) {
      await this.handleTransactionError(error, offer);
      throw error;
    }
  }
}
```

### Blockchain Errors

#### Network Connection Issues
```typescript
enum BlockchainError {
  NETWORK_UNAVAILABLE = 'NETWORK_UNAVAILABLE',
  INSUFFICIENT_GAS = 'INSUFFICIENT_GAS',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED'
}

const blockchainErrorHandlers: Record<BlockchainError, () => void> = {
  [BlockchainError.NETWORK_UNAVAILABLE]: () => {
    showError('Network connection lost. Please check your internet connection.');
  },
  [BlockchainError.INSUFFICIENT_GAS]: () => {
    showError('Insufficient gas for transaction. Please add more SUI to your wallet.');
  },
  [BlockchainError.TRANSACTION_FAILED]: () => {
    showError('Transaction failed. Please try again.');
  }
};
```

### Wallet Connection Issues

```typescript
class WalletService {
  async connectWallet(): Promise<WalletConnection> {
    // Retry strategy with exponential backoff
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const wallet = await this.detectWallet();
        return await wallet.connect();
      } catch (err) {
        if (attempt === 3) throw new WalletConnectionError(err);
        await sleep(attempt * 1000);
      }
    }
  }
}
```

### User-Facing Error Messages

| Error Code | User Message | Technical Cause | Recovery Action |
|------------|--------------|-----------------|-----------------|
| WALLET_NOT_FOUND | "Please install a Sui wallet to continue" | No wallet detected | Install wallet |
| INSUFFICIENT_FUNDS | "Insufficient SUI for transaction" | Low wallet balance | Add funds to wallet |
| TRANSACTION_TIMEOUT | "Transaction is taking longer than expected" | Network congestion | Wait or retry |
| ESCROW_FAILED | "Unable to create secure transaction" | Smart contract error | Contact support |

---

## 10. Implementation Priority & Timeline

### 48-Hour Hackathon Plan

**Phase 0: Setup & Infrastructure (2 hours)**
- Project initialization with Next.js and Tailwind
- Sui SDK integration and wallet connection
- Supabase project creation and setup (no database configuration needed!)
- Basic UI component library

**Phase 1: Core Features (22 hours)**
- User authentication with Sui wallet + Supabase session management
- NFT minting for item listings with Sui smart contracts
- Image upload and storage using Walrus decentralized storage
- NFT ownership tracking and provenance
- Basic search and filtering
- Real-time messaging system using Supabase Realtime
- Transaction creation and NFT transfer tracking

**Phase 2: Advanced Features (16 hours)**
- AI-powered recommendation system
- Escrow smart contract integration
- Personalized feed implementation
- Mobile-responsive design optimization
- Error handling and edge cases

**Final 8 hours: Polish & Demo**
- UI/UX refinements
- Performance optimization
- Demo preparation and testing
- Documentation and presentation

### Parallel Workstreams

| Team Member | Hours 1-8 | Hours 9-24 | Hours 25-40 | Hours 41-48 |
|-------------|------------|------------|-------------|-------------|
| Frontend Dev | Setup, Components | UI Implementation | AI Integration | Polish, Demo |
| Backend Dev | Database, API | Smart Contracts | Escrow Logic | Testing, Docs |
| Blockchain Dev | SDK Integration | Contract Development | Transaction Flow | Optimization |

---

## 11. Open Questions

1. Which Sui wallet should we prioritize for the demo? (Sui Wallet vs Suiet vs others)
2. How should we handle image optimization before uploading to Walrus?
3. What's the optimal gas fee structure for our escrow contracts?
4. How can we implement real-time features without WebSocket infrastructure?
5. What level of AI personalization is feasible within the time constraint?
6. Should we use Walrus CLI or SDK for image uploads in the web app?

---

## 12. Development Resources

### Useful Links
- Sui TypeScript SDK: https://sdk.mystenlabs.com/typescript
- Next.js Documentation: https://nextjs.org/docs
- Tailwind CSS: https://tailwindcss.com/docs
- Supabase Documentation: https://supabase.com/docs
- Supabase Auth: https://supabase.com/docs/guides/auth
- Walrus Documentation: https://docs.wal.app/
- Walrus Getting Started: https://docs.wal.app/getting-started
- Sui Wallet Integration: https://docs.sui.io/guides/developer/getting-started/connect-to-sui

### Demo/Test Data
- Sample user profiles with varied preferences
- Diverse item listings across multiple categories
- Mock transaction data for testing flows
- Test wallet addresses with SUI tokens

### External Dependencies
- **@mysten/sui**: ^1.0.0 - Sui blockchain integration
- **@mysten/sui/keypairs**: ^1.0.0 - Wallet key management
- **@mysten/sui/transactions**: ^1.0.0 - Transaction building
- **@supabase/supabase-js**: ^2.0.0 - Supabase client for database and auth
- **@supabase/auth-helpers-nextjs**: ^0.8.0 - Next.js auth helpers
- **@supabase/realtime-js**: ^2.0.0 - Real-time subscriptions
- **walrus-client**: ^1.0.0 - Walrus decentralized storage client

---

## 13. Risk Mitigation

| Risk | Impact | Likelihood | Mitigation Strategy |
|------|--------|------------|---------------------|
| Sui network congestion | High | Medium | Implement retry logic, fallback to testnet |
| Wallet connection failures | High | Medium | Multiple wallet support, clear error messages |
| Smart contract bugs | High | Low | Extensive testing, simple contract logic |
| Database performance | Medium | Medium | Query optimization, connection pooling |
| AI recommendation accuracy | Medium | High | Start with simple algorithms, improve iteratively |

### Contingency Plans
- **If Sui mainnet is unstable**: Switch to testnet for demo
- **If wallet integration fails**: Implement mock wallet for demo purposes
- **If smart contracts are too complex**: Use simple escrow logic with manual oversight

---

## 14. Development Setup Instructions

1. **Project Initialization**
```bash
npx create-next-app@latest thriftchain --typescript --tailwind --eslint
cd thriftchain
npm install @mysten/sui @mysten/sui/keypairs @mysten/sui/transactions
```

2. **Supabase & Walrus Setup**
```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install walrus-client
# Create Supabase project at https://supabase.com
# No database setup needed - Supabase handles everything!
# Walrus is integrated with Sui - no additional setup needed!
```

3. **Environment Configuration**
```bash
# Create .env.local
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
NEXT_PUBLIC_SUI_NETWORK="testnet"
NEXT_PUBLIC_RPC_URL="https://fullnode.testnet.sui.io:443"
```

4. **Development Server**
```bash
npm run dev
```

### Verification
```bash
# Test that everything is working
npm run build
npm run start
# Visit http://localhost:3000
```

---

## 15. Appendices

### Appendix A: Sui Smart Contract Schema

```move
module thriftchain::marketplace {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::nft::{Self, NFT};
    
    // NFT-based Item
    struct ThriftItem has key, store {
        id: UID,
        seller: address,
        title: String,
        description: String,
        price: u64,
        currency: String,
        category: String,
        tags: vector<String>,
        is_for_trade: bool,
        images: vector<String>, // Walrus blob URLs
        ownership_history: vector<OwnershipRecord>,
        created_at: u64,
    }
    
    // Ownership tracking
    struct OwnershipRecord has store {
        owner: address,
        timestamp: u64,
        transaction_id: String,
        price: Option<u64>,
    }
    
    // Escrow for NFT transfers
    struct Escrow has key {
        id: UID,
        buyer: address,
        seller: address,
        nft_id: ID,
        amount: u64,
        status: u8, // 0: pending, 1: confirmed, 2: disputed
    }
}
```

### Appendix B: API Interface

```typescript
interface ThriftChainAPI {
  // Items
  createItem(item: CreateItemRequest): Promise<Item>;
  getItems(filters: ItemFilters): Promise<Item[]>;
  updateItem(id: string, updates: Partial<Item>): Promise<Item>;
  
  // Transactions
  createTransaction(offer: Offer): Promise<Transaction>;
  getTransactions(userAddress: string): Promise<Transaction[]>;
  updateTransactionStatus(id: string, status: TransactionStatus): Promise<Transaction>;
  
  // Recommendations
  getPersonalizedFeed(userAddress: string): Promise<Item[]>;
  updateUserPreferences(address: string, preferences: UserPreferences): Promise<void>;
}
```

### Appendix C: Demo Checklist

1. [ ] Wallet connection works with multiple wallet types
2. [ ] User can create profile and set preferences
3. [ ] Item listing with photos and descriptions works
4. [ ] Personalized feed shows relevant items
5. [ ] Real-time messaging between users functions
6. [ ] Offer creation and negotiation works
7. [ ] Escrow transaction completes successfully
8. [ ] Mobile responsive design works on all devices
9. [ ] Error handling provides clear user feedback
10. [ ] Demo presentation is polished and engaging

### Appendix D: Glossary

| Term | Definition |
|------|------------|
| Escrow | Smart contract that holds funds until transaction completion |
| SUI | Native token of the Sui blockchain |
| Move | Programming language for Sui smart contracts |
| Object | Sui's data model - everything is an object with unique ID |
| Gas | Fee paid for blockchain transactions |

**Next Review:** End of hackathon (48 hours)

---

## Template Usage Notes

**Section Technical Depth:**
- **Non-Technical**: Introduction, Goals, User Stories, Design Considerations
- **Technical**: Functional Requirements, Technical Considerations, Edge Cases & Error Handling, Development Setup
- **Mixed**: Success Metrics (uses both UX and technical metrics)

**Key Patterns:**
- Use numbered FR-XXX format for functional requirements
- Use MUST/SHOULD/MAY for requirement priority
- Include code examples in technical sections
- Use tables for structured comparison data
- Include checkboxes for completion tracking
