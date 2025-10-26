/**
 * Sui Blockchain Query Utilities
 *
 * This module provides functions to query on-chain data from Sui blockchain.
 * All marketplace data lives on-chain - this is NOT querying a centralized database.
 *
 * Architecture:
 * - Source of Truth: Sui blockchain (item metadata, prices, ownership)
 * - Supabase: Walrus blob IDs (images) to avoid BCS serialization issues
 * - This file: Read-only queries that merge blockchain + Supabase data
 * - For search: Use AI search layer which returns object IDs, then fetch here
 */

import type { SuiObjectResponse } from '@mysten/sui/client'
import { suiClient } from './client'
import type {
  ThriftItemObject,
  ThriftItemWithImages,
  OfferObject,
  EscrowObject,
  PaginatedObjectsResponse,
  ItemQueryFilters,
} from '../types/sui-objects'
import { ItemStatus } from '../types/sui-objects'
// Blob IDs now fetched from blockchain, not Supabase

// ============================================
// CONTRACT CONFIGURATION
// ============================================

/**
 * Package ID for deployed ThriftChain contracts
 * This will be set after deploying contracts to testnet
 *
 * TODO: Update this after running `sui client publish`
 */
export const THRIFTCHAIN_PACKAGE_ID = process.env.NEXT_PUBLIC_THRIFTCHAIN_PACKAGE_ID || ''

if (!THRIFTCHAIN_PACKAGE_ID && process.env.NODE_ENV === 'production') {
  console.warn('WARNING: THRIFTCHAIN_PACKAGE_ID not set. Smart contract queries will fail.')
}

/**
 * Full struct type identifiers for filtering
 */
export const STRUCT_TYPES = {
  THRIFT_ITEM: `${THRIFTCHAIN_PACKAGE_ID}::marketplace::ThriftItem`,
  OFFER: `${THRIFTCHAIN_PACKAGE_ID}::marketplace::Offer`,
  ESCROW: `${THRIFTCHAIN_PACKAGE_ID}::marketplace::Escrow`,
} as const

export const MARKETPLACE_OBJECT_ID = process.env.NEXT_PUBLIC_MARKETPLACE_ID || ''

if (!MARKETPLACE_OBJECT_ID && process.env.NODE_ENV === 'production') {
  console.warn('WARNING: NEXT_PUBLIC_MARKETPLACE_ID not set. Marketplace queries will fail.')
}

type MarketplaceTables = {
  itemsTableId: string
  offersTableId: string
  escrowsTableId: string
}

let marketplaceTablesCache: MarketplaceTables | null = null

type TableHandle = {
  fields?: {
    id?: {
      id?: string
    }
  }
}

type MarketplaceObjectFields = {
  items?: TableHandle
  offers?: TableHandle
  escrows?: TableHandle
}

function extractTableId(handle?: TableHandle): string | null {
  return handle?.fields?.id?.id ?? null
}

async function getMarketplaceTables(): Promise<MarketplaceTables> {
  if (marketplaceTablesCache) {
    return marketplaceTablesCache
  }

  if (!MARKETPLACE_OBJECT_ID) {
    throw new Error('Marketplace object ID is not configured. Set NEXT_PUBLIC_MARKETPLACE_ID in the environment.')
  }

  const response = await suiClient.getObject({
    id: MARKETPLACE_OBJECT_ID,
    options: {
      showContent: true,
      showType: true,
    },
  })

  const content = response.data?.content
  if (!content || content.dataType !== 'moveObject') {
    throw new Error('Failed to load marketplace object content from blockchain.')
  }

  const fields = content.fields as MarketplaceObjectFields
  const itemsTableId = extractTableId(fields.items)
  const offersTableId = extractTableId(fields.offers)
  const escrowsTableId = extractTableId(fields.escrows)

  if (!itemsTableId || !offersTableId || !escrowsTableId) {
    throw new Error('Marketplace tables are missing expected IDs (items/offers/escrows).')
  }

  marketplaceTablesCache = {
    itemsTableId,
    offersTableId,
    escrowsTableId,
  }

  return marketplaceTablesCache
}

type ParseFn<T> = (response: SuiObjectResponse) => T | null

async function fetchTableEntries<T>(
  tableId: string,
  parseFn: ParseFn<T>,
  options?: { cursor?: string; limit?: number }
): Promise<PaginatedObjectsResponse<T>> {
  const dynamicFields = await suiClient.getDynamicFields({
    parentId: tableId,
    cursor: options?.cursor,
    limit: options?.limit ?? 50,
  })

  if (dynamicFields.data.length === 0) {
    return {
      data: [],
      nextCursor: dynamicFields.nextCursor ?? null,
      hasNextPage: dynamicFields.hasNextPage,
    }
  }

  const objects = await Promise.all(
    dynamicFields.data.map(field =>
      suiClient.getObject({
        id: field.objectId,
        options: {
          showContent: true,
          showType: true,
        },
      })
    )
  )

  const parsed = objects
    .map(obj => parseFn(obj))
    .filter((item): item is T => item !== null)

  return {
    data: parsed,
    nextCursor: dynamicFields.nextCursor ?? null,
    hasNextPage: dynamicFields.hasNextPage,
  }
}

async function fetchAllTableObjects<T>(
  tableId: string,
  parseFn: ParseFn<T>
): Promise<T[]> {
  const results: T[] = []
  let cursor: string | undefined
  let hasNext = true

  while (hasNext) {
    const page = await fetchTableEntries(tableId, parseFn, { cursor, limit: 50 })
    results.push(...page.data)
    cursor = page.nextCursor ?? undefined
    hasNext = Boolean(page.hasNextPage && cursor)
  }

  return results
}

// ============================================
// ITEM QUERIES
// ============================================

/**
 * Get all active items from blockchain
 *
 * @param filters - Optional filters for category, price range, etc.
 * @param options - Pagination options
 * @returns Paginated list of items
 */
export async function getAllItems(
  filters?: ItemQueryFilters,
  options?: {
    cursor?: string
    limit?: number
  }
): Promise<PaginatedObjectsResponse<ThriftItemObject>> {
  try {
    const { itemsTableId } = await getMarketplaceTables()
    const tableResponse = await fetchTableEntries(itemsTableId, parseThriftItemObject, options)

    const filtered = tableResponse.data.filter(item => applyItemFilters(item, filters))

    return {
      data: filtered,
      nextCursor: tableResponse.nextCursor,
      hasNextPage: tableResponse.hasNextPage,
    }
  } catch (error) {
    console.error('Error fetching items from blockchain:', error)
    throw new Error(`Failed to fetch items: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get a single item by its Sui object ID
 *
 * @param objectId - Sui object ID of the item
 * @returns Item data or null if not found
 */
export async function getItemById(objectId: string): Promise<ThriftItemObject | null> {
  try {
    const response = await suiClient.getObject({
      id: objectId,
      options: {
        showContent: true,
        showType: true,
      },
    })

    if (!response.data) {
      return null
    }

    return parseThriftItemObject(response)
  } catch (error) {
    console.error(`Error fetching item ${objectId}:`, error)
    return null
  }
}

/**
 * Get items by multiple object IDs (useful after AI search)
 *
 * @param objectIds - Array of Sui object IDs
 * @returns Array of items (nulls filtered out)
 */
export async function getItemsByIds(objectIds: string[]): Promise<ThriftItemObject[]> {
  try {
    const items = await Promise.all(
      objectIds.map(id => getItemById(id))
    )

    // Filter out nulls and return valid items
    return items.filter(item => item !== null) as ThriftItemObject[]
  } catch (error) {
    console.error('Error fetching items by IDs:', error)
    return []
  }
}

/**
 * Get items listed by a specific seller
 *
 * @param sellerAddress - Wallet address of the seller
 * @param filters - Additional filters
 * @returns List of seller's items
 */
export async function getItemsBySeller(
  sellerAddress: string,
  filters?: Omit<ItemQueryFilters, 'seller'>
): Promise<ThriftItemObject[]> {
  const result = await getAllItems({
    ...filters,
    seller: sellerAddress,
  })

  return result.data
}

/**
 * Get items in a specific category
 *
 * @param category - Category name
 * @param filters - Additional filters
 * @returns List of items in category
 */
export async function getItemsByCategory(
  category: string,
  filters?: Omit<ItemQueryFilters, 'category'>
): Promise<ThriftItemObject[]> {
  const result = await getAllItems({
    ...filters,
    category,
  })

  return result.data
}

// ============================================
// OFFER QUERIES
// ============================================

/**
 * Get all offers for a specific item
 *
 * @param itemId - Sui object ID of the item
 * @returns List of offers on the item
 */
export async function getOffersByItem(itemId: string): Promise<OfferObject[]> {
  try {
    const { offersTableId } = await getMarketplaceTables()
    const offers = await fetchAllTableObjects(offersTableId, parseOfferObject)
    return offers.filter(offer => offer.fields.item_id === itemId)
  } catch (error) {
    console.error(`Error fetching offers for item ${itemId}:`, error)
    return []
  }
}

/**
 * Get offers made by a specific buyer
 *
 * @param buyerAddress - Wallet address of the buyer
 * @returns List of buyer's offers
 */
export async function getOffersByBuyer(buyerAddress: string): Promise<OfferObject[]> {
  try {
    const { offersTableId } = await getMarketplaceTables()
    const offers = await fetchAllTableObjects(offersTableId, parseOfferObject)
    return offers.filter(offer => offer.fields.buyer === buyerAddress)
  } catch (error) {
    console.error(`Error fetching offers by buyer ${buyerAddress}:`, error)
    return []
  }
}

/**
 * Get offers received by a specific seller
 *
 * @param sellerAddress - Wallet address of the seller
 * @returns List of offers on seller's items
 */
export async function getOffersBySeller(sellerAddress: string): Promise<OfferObject[]> {
  try {
    // First get all seller's items
    const items = await getItemsBySeller(sellerAddress)

    // Then get offers for each item
    const offerPromises = items.map(item => getOffersByItem(item.objectId))
    const offerArrays = await Promise.all(offerPromises)

    // Flatten into single array
    return offerArrays.flat()
  } catch (error) {
    console.error(`Error fetching offers for seller ${sellerAddress}:`, error)
    return []
  }
}

/**
 * Get a single offer by its object ID
 *
 * @param offerId - Sui object ID of the offer
 * @returns Offer data or null if not found
 */
export async function getOfferById(offerId: string): Promise<OfferObject | null> {
  try {
    const response = await suiClient.getObject({
      id: offerId,
      options: {
        showContent: true,
        showType: true,
      },
    })

    if (!response.data) {
      return null
    }

    return parseOfferObject(response)
  } catch (error) {
    console.error(`Error fetching offer ${offerId}:`, error)
    return null
  }
}

// ============================================
// ESCROW QUERIES
// ============================================

/**
 * Get active escrows for a buyer
 *
 * @param buyerAddress - Wallet address of the buyer
 * @returns List of buyer's escrows
 */
export async function getEscrowsByBuyer(buyerAddress: string): Promise<EscrowObject[]> {
  try {
    const { escrowsTableId } = await getMarketplaceTables()
    const escrows = await fetchAllTableObjects(escrowsTableId, parseEscrowObject)
    return escrows.filter(escrow => escrow.fields.buyer === buyerAddress)
  } catch (error) {
    console.error(`Error fetching escrows for buyer ${buyerAddress}:`, error)
    return []
  }
}

/**
 * Get a single escrow by its object ID
 *
 * @param escrowId - Sui object ID of the escrow
 * @returns Escrow data or null if not found
 */
export async function getEscrowById(escrowId: string): Promise<EscrowObject | null> {
  try {
    const response = await suiClient.getObject({
      id: escrowId,
      options: {
        showContent: true,
        showType: true,
      },
    })

    if (!response.data) {
      return null
    }

    return parseEscrowObject(response)
  } catch (error) {
    console.error(`Error fetching escrow ${escrowId}:`, error)
    return null
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Parse raw Sui object response into ThriftItemObject
 */
function parseThriftItemObject(response: SuiObjectResponse): ThriftItemObject | null {
  try {
    const data = response.data

    if (!data?.content || data.content.dataType !== 'moveObject') {
      return null
    }

    const fields = data.content.fields as ThriftItemObject['fields']

    return {
      objectId: data.objectId,
      version: data.version,
      digest: data.digest,
      fields,
    }
  } catch (error) {
    console.error('Error parsing ThriftItem:', error)
    return null
  }
}

/**
 * Parse raw Sui object response into OfferObject
 */
function parseOfferObject(response: SuiObjectResponse): OfferObject | null {
  try {
    const data = response.data

    if (!data?.content || data.content.dataType !== 'moveObject') {
      return null
    }

    const fields = data.content.fields as OfferObject['fields']

    return {
      objectId: data.objectId,
      version: data.version,
      digest: data.digest,
      fields,
    }
  } catch (error) {
    console.error('Error parsing Offer:', error)
    return null
  }
}

/**
 * Parse raw Sui object response into EscrowObject
 */
function parseEscrowObject(response: SuiObjectResponse): EscrowObject | null {
  try {
    const data = response.data

    if (!data?.content || data.content.dataType !== 'moveObject') {
      return null
    }

    const fields = data.content.fields as EscrowObject['fields']

    return {
      objectId: data.objectId,
      version: data.version,
      digest: data.digest,
      fields,
    }
  } catch (error) {
    console.error('Error parsing Escrow:', error)
    return null
  }
}

/**
 * Apply filters to an item
 */
function applyItemFilters(item: ThriftItemObject, filters?: ItemQueryFilters): boolean {
  if (!filters) return true

  // Filter by seller
  if (filters.seller && item.fields.seller !== filters.seller) {
    return false
  }

  // Filter by category
  if (filters.category && item.fields.category !== filters.category) {
    return false
  }

  // Filter by status
  if (filters.status !== undefined && item.fields.status !== filters.status) {
    return false
  }


  // Filter by price range
  if (filters.minPrice !== undefined) {
    const itemPrice = BigInt(item.fields.price)
    if (itemPrice < filters.minPrice) {
      return false
    }
  }

  if (filters.maxPrice !== undefined) {
    const itemPrice = BigInt(item.fields.price)
    if (itemPrice > filters.maxPrice) {
      return false
    }
  }

  // Filter by tags (item must have ALL specified tags)
  if (filters.tags && filters.tags.length > 0) {
    const itemTags = new Set(item.fields.tags)
    const hasAllTags = filters.tags.every(tag => itemTags.has(tag))
    if (!hasAllTags) {
      return false
    }
  }

  return true
}

// ============================================
// IMAGE ENRICHMENT HELPERS
// ============================================

// enrichItemWithImages removed - blob IDs now stored on-chain in item.fields.walrus_image_ids
// enrichItemsWithImages removed - blob IDs now stored on-chain in item.fields.walrus_image_ids

// ============================================
// ITEM QUERIES WITH IMAGES
// ============================================

/**
 * Get all items WITH images (blockchain + Supabase merged)
 *
 * @param filters - Optional filters for category, price range, etc.
 * @param options - Pagination options
 * @returns Paginated list of items with images
 */
export async function getAllItemsWithImages(
  filters?: ItemQueryFilters,
  options?: {
    cursor?: string
    limit?: number
  }
): Promise<PaginatedObjectsResponse<ThriftItemObject>> {
  // Blob IDs now included in blockchain data - no enrichment needed
  return getAllItems(filters, options)
}

/**
 * Get a single item by ID (blob IDs included in blockchain data)
 *
 * @param objectId - Sui object ID of the item
 * @returns Item or null if not found
 */
export async function getItemByIdWithImages(
  objectId: string
): Promise<ThriftItemObject | null> {
  // Blob IDs now included in blockchain data - no enrichment needed
  return getItemById(objectId)
}

/**
 * Get items by multiple IDs (blob IDs included in blockchain data)
 *
 * @param objectIds - Array of Sui object IDs
 * @returns Array of items
 */
export async function getItemsByIdsWithImages(
  objectIds: string[]
): Promise<ThriftItemObject[]> {
  // Blob IDs now included in blockchain data - no enrichment needed
  return getItemsByIds(objectIds)
}

/**
 * Get seller's items (blob IDs included in blockchain data)
 *
 * @param sellerAddress - Wallet address of the seller
 * @param filters - Additional filters
 * @returns List of seller's items
 */
export async function getItemsBySellerWithImages(
  sellerAddress: string,
  filters?: Omit<ItemQueryFilters, 'seller'>
): Promise<ThriftItemObject[]> {
  // Blob IDs now included in blockchain data - no enrichment needed
  return getItemsBySeller(sellerAddress, filters)
}

/**
 * Get category items (blob IDs included in blockchain data)
 *
 * @param category - Category name
 * @param filters - Additional filters
 * @returns List of items in category
 */
export async function getItemsByCategoryWithImages(
  category: string,
  filters?: Omit<ItemQueryFilters, 'category'>
): Promise<ThriftItemObject[]> {
  // Blob IDs now included in blockchain data - no enrichment needed
  return getItemsByCategory(category, filters)
}

// ============================================
// STATISTICS & ANALYTICS
// ============================================

/**
 * Get marketplace statistics
 *
 * @returns Basic marketplace stats
 */
export async function getMarketplaceStats() {
  try {
    const allItems = await getAllItems()

    const activeItems = allItems.data.filter(item => item.fields.status === ItemStatus.Active)
    const soldItems = allItems.data.filter(item => item.fields.status === ItemStatus.Sold)

    // Calculate total value
    const totalValue = allItems.data.reduce((sum, item) => {
      return sum + BigInt(item.fields.price)
    }, BigInt(0))

    return {
      totalItems: allItems.data.length,
      activeListings: activeItems.length,
      soldItems: soldItems.length,
      totalValueMist: totalValue.toString(),
    }
  } catch (error) {
    console.error('Error fetching marketplace stats:', error)
    return {
      totalItems: 0,
      activeListings: 0,
      soldItems: 0,
      totalValueMist: '0',
    }
  }
}
