/**
 * Supabase Item Operations
 *
 * Handles storage and retrieval of AI embeddings for marketplace items.
 * Walrus blob IDs are stored on-chain for full decentralization.
 *
 * Architecture:
 * - Blockchain (Sui): Item metadata, pricing, ownership, Walrus blob IDs (source of truth)
 * - Supabase: AI embeddings for semantic search only
 * - Flow: Create on-chain → Index in Supabase for search
 */

import { supabaseClient } from './client'

// ============================================
// TYPES
// ============================================

export interface ItemRecord {
  sui_object_id: string
  title_embedding: number[] | null
  description_embedding: number[] | null
  image_embedding: number[] | null
  combined_embedding: number[] | null
  time: string
}

export interface CreateItemRecordParams {
  sui_object_id: string // Real Sui object ID from blockchain
  // Embeddings are optional - can be added later via AI processing
  title_embedding?: number[]
  description_embedding?: number[]
  image_embedding?: number[]
  combined_embedding?: number[]
}

// ============================================
// CREATE OPERATIONS
// ============================================

/**
 * Create item record AFTER blockchain transaction
 *
 * Use this after successfully creating the item on-chain.
 * Store the sui_object_id for indexing and search.
 * Embeddings can be added later via AI processing (optional).
 *
 * @param params - Item data with real sui_object_id from blockchain
 * @returns Created record or null if error
 */
export async function createItemRecord(
  params: CreateItemRecordParams
): Promise<ItemRecord | null> {
  try {
    const { data, error} = await supabaseClient
      .from('item_search_index')
      .insert({
        sui_object_id: params.sui_object_id,
        title_embedding: params.title_embedding || null,
        description_embedding: params.description_embedding || null,
        image_embedding: params.image_embedding || null,
        combined_embedding: params.combined_embedding || null,
        time: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating item record:', error)
      return null
    }

    return data as ItemRecord
  } catch (error) {
    console.error('Exception creating item record:', error)
    return null
  }
}

// updateItemWithSuiId removed - no longer needed since we create after blockchain

// ============================================
// READ OPERATIONS
// ============================================

// getBlobIdsBySuiId removed - blob IDs now stored on-chain, fetch from blockchain
// getItemsWithImages removed - blob IDs now stored on-chain, fetch from blockchain

/**
 * Get full item record (embeddings only)
 *
 * @param suiObjectId - Sui blockchain object ID
 * @returns Item record or null if not found
 */
export async function getItemRecord(suiObjectId: string): Promise<ItemRecord | null> {
  try {
    const { data, error } = await supabaseClient
      .from('item_search_index')
      .select('*')
      .eq('sui_object_id', suiObjectId)
      .single()

    if (error || !data) {
      return null
    }

    return data as ItemRecord
  } catch (error) {
    console.error('Exception fetching item record:', error)
    return null
  }
}

// ============================================
// UPDATE OPERATIONS
// ============================================

// updateBlobIds removed - blob IDs now immutable on-chain

/**
 * Update item status (active, sold, cancelled)
 *
 * @param suiObjectId - Sui blockchain object ID
 * @param status - New status
 * @returns Updated record or null if error
 */
export async function updateItemStatus(
  suiObjectId: string,
  status: 'active' | 'sold' | 'cancelled'
): Promise<ItemRecord | null> {
  try {
    const { data, error } = await supabaseClient
      .from('item_search_index')
      .update({
        status,
        last_indexed_at: new Date().toISOString(),
      })
      .eq('sui_object_id', suiObjectId)
      .select()
      .single()

    if (error) {
      console.error('Error updating item status:', error)
      return null
    }

    return data as ItemRecord
  } catch (error) {
    console.error('Exception updating item status:', error)
    return null
  }
}

// ============================================
// DELETE OPERATIONS
// ============================================

/**
 * Delete item record from Supabase
 *
 * Note: This should rarely be used. Prefer updating status to 'cancelled'
 * to maintain data integrity and search history.
 *
 * @param suiObjectId - Sui blockchain object ID
 * @returns true if deleted, false if error
 */
export async function deleteItemRecord(suiObjectId: string): Promise<boolean> {
  try {
    const { error } = await supabaseClient
      .from('item_search_index')
      .delete()
      .eq('sui_object_id', suiObjectId)

    if (error) {
      console.error('Error deleting item record:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Exception deleting item record:', error)
    return false
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate temporary ID for item before blockchain creation
 *
 * @param walletAddress - User's wallet address
 * @returns Temporary ID string (e.g., "temp_0x1234_1234567890")
 */
export function generateTempId(walletAddress: string): string {
  const timestamp = Date.now()
  const shortAddress = walletAddress.slice(0, 10)
  return `temp_${shortAddress}_${timestamp}`
}

/**
 * Check if an ID is a temporary ID
 *
 * @param id - ID to check
 * @returns true if temporary, false if real sui_object_id
 */
export function isTempId(id: string): boolean {
  return id.startsWith('temp_')
}

/**
 * Update embeddings for an existing item
 *
 * Use this to add or update AI embeddings after item creation.
 * This is typically done by a background job that processes item content.
 *
 * @param suiObjectId - Sui blockchain object ID
 * @param embeddings - AI-generated embeddings
 * @returns Updated record or null if error
 */
export async function updateItemEmbeddings(
  suiObjectId: string,
  embeddings: {
    title_embedding?: number[]
    description_embedding?: number[]
    image_embedding?: number[]
    combined_embedding?: number[]
  }
): Promise<ItemRecord | null> {
  try {
    const { data, error } = await supabaseClient
      .from('item_search_index')
      .update(embeddings)
      .eq('sui_object_id', suiObjectId)
      .select()
      .single()

    if (error) {
      console.error('Error updating item embeddings:', error)
      return null
    }

    return data as ItemRecord
  } catch (error) {
    console.error('Exception updating item embeddings:', error)
    return null
  }
}
