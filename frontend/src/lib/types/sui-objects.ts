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
  fields: {
    id: { id: string }                // UID
    seller: string                    // address
    title: string                     // String
    description: string               // String
    price: string                     // u64 (as string to avoid precision loss)
    currency: string                  // String (e.g., "SUI", "USDC")
    category: string                  // String
    tags: string[]                    // vector<String>
    walrus_image_ids: string[]        // vector<String> - Walrus blob IDs
    is_for_trade: boolean             // bool
    status: number                    // u8 (0=active, 1=sold, 2=cancelled)
    created_at: string                // u64 timestamp in milliseconds
  }
}

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
    currency: string                  // String
    message: string                   // String - Optional message from buyer
    status: number                    // u8 (0=pending, 1=accepted, 2=rejected, 3=cancelled)
    expires_at: string                // u64 timestamp
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
    currency: string                  // String
    status: number                    // u8 (0=active, 1=completed, 2=refunded, 3=disputed)
    created_at: string                // u64 timestamp
    delivery_confirmed: boolean       // bool
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
  Accepted = 1,
  Rejected = 2,
  Cancelled = 3,
  Expired = 4,
}

/**
 * Escrow status enum (matches on-chain values)
 */
export enum EscrowStatus {
  Active = 0,
  Completed = 1,
  Refunded = 2,
  Disputed = 3,
}

/**
 * Walrus blob reference (stored in ThriftItem.walrus_image_ids)
 */
export interface WalrusBlobReference {
  blobId: string                      // Walrus blob identifier
  url: string                         // Public access URL
  mimeType?: string                   // Optional: image/jpeg, image/png, etc.
  size?: number                       // Optional: file size in bytes
}

/**
 * Currency types supported
 */
export type SupportedCurrency = 'SUI' | 'USDC'

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
  tags?: string[]                     // Filter by tags (items must have ALL tags)
  isForTrade?: boolean                // Filter by trade availability
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
 */
export interface CreateItemParams {
  title: string
  description: string
  price: bigint                       // In MIST (1 SUI = 1_000_000_000 MIST)
  currency: SupportedCurrency
  category: string
  tags: string[]
  walrusImageIds: string[]            // Walrus blob IDs (must upload first)
  isForTrade: boolean
  tradePreferences?: string[]
}

/**
 * Parameters for creating an offer
 */
export interface CreateOfferParams {
  itemId: string                      // Sui object ID of ThriftItem
  amount: bigint                      // Offer amount in MIST
  currency: SupportedCurrency
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
    case OfferStatus.Accepted: return 'Accepted'
    case OfferStatus.Rejected: return 'Rejected'
    case OfferStatus.Cancelled: return 'Cancelled'
    case OfferStatus.Expired: return 'Expired'
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
    case EscrowStatus.Refunded: return 'Refunded'
    case EscrowStatus.Disputed: return 'Disputed'
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
 * Format price for display (e.g., "1.5 SUI", "100 USDC")
 */
export function formatPrice(mist: string | bigint, currency: SupportedCurrency): string {
  if (currency === 'SUI') {
    return `${mistToSui(mist).toFixed(4)} SUI`
  }
  // USDC uses 6 decimals
  const mistBigInt = typeof mist === 'string' ? BigInt(mist) : mist
  const usdc = Number(mistBigInt) / 1_000_000
  return `${usdc.toFixed(2)} USDC`
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
