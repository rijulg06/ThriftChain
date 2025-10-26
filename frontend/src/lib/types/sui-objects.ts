/**
 * TypeScript type definitions for on-chain Sui objects
 * These types mirror the Move struct definitions in contracts/marketplace/sources/
 *
 * IMPORTANT: These are READ-ONLY representations of on-chain data
 * The source of truth is the blockchain, not our frontend types
 */

// ============================================
// CORE MARKETPLACE OBJECTS
// ============================================

/**
 * ThriftItem - Main marketplace item NFT
 * Corresponds to: thriftchain::marketplace::ThriftItem
 */
export interface ThriftItemObject {
  // Object metadata
  objectId: string                    // Sui object ID (primary key)
  version: string                     // Object version
  digest: string                      // Object digest

  // Item data (from Move struct fields)
  // Walrus blob IDs stored on-chain for decentralized image storage
  fields: {
    id: { id: string }                // UID
    seller: string                    // address
    title: string                     // String
    description: string               // String
    price: string                     // u64 (as string to avoid precision loss)
    category: string                  // String
    status: number                    // u8 (0=active, 1=sold, 2=cancelled)
    created_at: string                // u64 timestamp in milliseconds
    condition: string                 // String
    brand: string                     // String
    size: string                      // String
    color: string                     // String
    material: string                  // String
    walrus_image_ids: string[]        // vector<String> - Walrus blob IDs
  }
}

// ThriftItemWithImages no longer needed - images stored on-chain

/**
 * Offer - Bid/offer on an item
 * Corresponds to: thriftchain::marketplace::Offer
 */
export interface OfferObject {
  objectId: string
  version: string
  digest: string

  fields: {
    id: { id: string }
    item_id: string                   // ID - References ThriftItem
    buyer: string                     // address
    seller: string                    // address
    amount: string                    // u64
    message: string                   // String - Optional message from buyer
    status: number                    // u8 (0=pending, 1=countered, 2=accepted, 3=rejected, 4=cancelled)
    expires_at: string                // u64 timestamp
    is_counter: boolean               // bool
    created_at: string                // u64 timestamp
  }
}

/**
 * Escrow - Holds funds during transaction
 * Corresponds to: thriftchain::marketplace::Escrow
 */
export interface EscrowObject {
  objectId: string
  version: string
  digest: string

  fields: {
    id: { id: string }
    buyer: string                     // address
    seller: string                    // address
    item_id: string                   // ID - References ThriftItem
    amount: string                    // u64 - Amount in escrow
    status: number                    // u8 (0=active, 1=completed, 2=disputed, 3=refunded)
    created_at: string                // u64 timestamp
    completed_at: string              // u64 timestamp
  }
}

// ============================================
// HELPER TYPES
// ============================================

/**
 * Item status enum (matches on-chain values)
 */
export enum ItemStatus {
  Active = 0,
  Sold = 1,
  Cancelled = 2,
}

/**
 * Offer status enum (matches on-chain values)
 */
export enum OfferStatus {
  Pending = 0,
  Countered = 1,
  Accepted = 2,
  Rejected = 3,
  Cancelled = 4,
}

/**
 * Escrow status enum (matches on-chain values)
 */
export enum EscrowStatus {
  Active = 0,
  Completed = 1,
  Disputed = 2,
  Refunded = 3,
}

/**
 * Walrus blob reference (stored in Supabase, NOT on-chain)
 * Blob IDs are stored in Supabase to avoid BCS serialization issues
 */
export interface WalrusBlobReference {
  blobId: string                      // Walrus blob identifier
  url: string                         // Public access URL
  mimeType?: string                   // Optional: image/jpeg, image/png, etc.
  size?: number                       // Optional: file size in bytes
}

// ============================================
// QUERY RESULT TYPES
// ============================================

/**
 * Paginated result from querying multiple objects
 */
export interface PaginatedObjectsResponse<T> {
  data: T[]
  nextCursor: string | null
  hasNextPage: boolean
}

/**
 * Filter options for querying items
 */
export interface ItemQueryFilters {
  seller?: string                     // Filter by seller address
  category?: string                   // Filter by category
  minPrice?: bigint                   // Minimum price in MIST
  maxPrice?: bigint                   // Maximum price in MIST
  status?: ItemStatus                 // Filter by status
}

/**
 * Filter options for querying offers
 */
export interface OfferQueryFilters {
  itemId?: string                     // Filter by item
  buyer?: string                      // Filter by buyer
  seller?: string                     // Filter by seller
  status?: OfferStatus                // Filter by status
  minAmount?: bigint                  // Minimum offer amount
}

/**
 * Search result from AI-powered search
 * Includes Sui object ID and similarity score
 */
export interface SearchResult {
  suiObjectId: string                 // The on-chain object to fetch
  title: string                       // Cached title for preview
  similarity: number                  // Similarity score (0-1)
}

// ============================================
// TRANSACTION BUILDER TYPES
// ============================================

/**
 * Parameters for creating a new item listing
 * Walrus blob IDs are stored on-chain for decentralized image storage
 */
export interface CreateItemParams {
  title: string
  description: string
  price: bigint                       // In MIST (1 SUI = 1_000_000_000 MIST)
  category: string
  condition: string
  brand: string
  size: string
  color: string
  material: string
  walrusImageIds: string[]            // Walrus blob IDs stored on-chain
}

/**
 * Parameters for creating an offer
 */
export interface CreateOfferParams {
  itemId: string                      // Sui object ID of ThriftItem
  amount: bigint                      // Offer amount in MIST
  message?: string                    // Optional message to seller
  expiresInDays?: number              // Default: 7 days
}

/**
 * Parameters for accepting an offer
 */
export interface AcceptOfferParams {
  offerId: string                     // Sui object ID of Offer
  itemId: string                      // Sui object ID of ThriftItem
}

/**
 * Parameters for confirming delivery
 */
export interface ConfirmDeliveryParams {
  escrowId: string                    // Sui object ID of Escrow
}

// ============================================
// EVENT TYPES
// ============================================

/**
 * Event emitted when item is created
 * Corresponds to: thriftchain::marketplace::ItemCreated
 */
export interface ItemCreatedEvent {
  itemId: string
  seller: string
  price: string
  category: string
  timestamp: string
}

/**
 * Event emitted when offer is created
 * Corresponds to: thriftchain::marketplace::OfferCreated
 */
export interface OfferCreatedEvent {
  offerId: string
  itemId: string
  buyer: string
  amount: string
  timestamp: string
}

/**
 * Event emitted when offer is accepted
 * Corresponds to: thriftchain::marketplace::OfferAccepted
 */
export interface OfferAcceptedEvent {
  offerId: string
  escrowId: string
  buyer: string
  seller: string
  amount: string
  timestamp: string
}

/**
 * Event emitted when item is sold
 * Corresponds to: thriftchain::marketplace::ItemSold
 */
export interface ItemSoldEvent {
  itemId: string
  buyer: string
  seller: string
  price: string
  timestamp: string
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Convert item status number to human-readable string
 */
export function itemStatusToString(status: number): string {
  switch (status) {
    case ItemStatus.Active: return 'Active'
    case ItemStatus.Sold: return 'Sold'
    case ItemStatus.Cancelled: return 'Cancelled'
    default: return 'Unknown'
  }
}

/**
 * Convert offer status number to human-readable string
 */
export function offerStatusToString(status: number): string {
  switch (status) {
    case OfferStatus.Pending: return 'Pending'
    case OfferStatus.Countered: return 'Countered'
    case OfferStatus.Accepted: return 'Accepted'
    case OfferStatus.Rejected: return 'Rejected'
    case OfferStatus.Cancelled: return 'Cancelled'
    default: return 'Unknown'
  }
}

/**
 * Convert escrow status number to human-readable string
 */
export function escrowStatusToString(status: number): string {
  switch (status) {
    case EscrowStatus.Active: return 'Active'
    case EscrowStatus.Completed: return 'Completed'
    case EscrowStatus.Disputed: return 'Disputed'
    case EscrowStatus.Refunded: return 'Refunded'
    default: return 'Unknown'
  }
}

/**
 * Convert SUI to MIST (1 SUI = 1,000,000,000 MIST)
 */
export function suiToMist(sui: number): bigint {
  return BigInt(Math.floor(sui * 1_000_000_000))
}

/**
 * Convert MIST to SUI for display
 */
export function mistToSui(mist: string | bigint): number {
  const mistBigInt = typeof mist === 'string' ? BigInt(mist) : mist
  return Number(mistBigInt) / 1_000_000_000
}

/**
 * Format price for display in SUI (defaults to 4 decimal places)
 */
export function formatPrice(mist: string | bigint, decimals = 4): string {
  return `${mistToSui(mist).toFixed(decimals)} SUI`
}

/**
 * Get Walrus public URL from blob ID
 */
export function getWalrusUrl(blobId: string): string {
  // TODO: Update with actual Walrus aggregator URL
  return `https://aggregator.walrus-testnet.walrus.space/v1/${blobId}`
}

/**
 * Validate Sui address format
 */
export function isValidSuiAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(address)
}

/**
 * Shorten Sui address for display (0x1234...5678)
 */
export function shortenAddress(address: string, prefixLength = 6, suffixLength = 4): string {
  if (!address || address.length < prefixLength + suffixLength) {
    return address
  }
  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`
}
