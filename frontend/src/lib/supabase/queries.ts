import { supabaseClient } from './client'
import type { Database } from './database.types'

/**
 * Helper functions for common database queries
 * These functions wrap the Supabase client to provide type-safe queries
 */

// Users
export async function getUserByWallet(walletAddress: string) {
  const { data, error } = await supabaseClient
    .from('users')
    .select('*')
    .eq('wallet_address', walletAddress)
    .single()
  
  return { data, error }
}

export async function createUser(walletAddress: string, username?: string) {
  const { data, error } = await supabaseClient
    .from('users')
    .insert({ wallet_address: walletAddress, username })
    .select()
    .single()
  
  return { data, error }
}

// Items
export async function getItems(filters?: {
  status?: string
  category?: string
  seller?: string
  limit?: number
  offset?: number
}) {
  let query = supabaseClient.from('items').select('*')
  
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.category) {
    query = query.eq('category', filters.category)
  }
  if (filters?.seller) {
    query = query.eq('seller_wallet', filters.seller)
  }
  
  query = query.order('created_at', { ascending: false })
  
  if (filters?.limit) {
    query = query.limit(filters.limit)
  }
  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
  }
  
  const { data, error } = await query
  
  return { data, error }
}

export async function getItemById(itemId: string) {
  const { data, error } = await supabaseClient
    .from('items')
    .select('*')
    .eq('id', itemId)
    .single()
  
  return { data, error }
}

// Offers
export async function getOffers(filters?: {
  itemId?: string
  buyer?: string
  seller?: string
  status?: string
}) {
  let query = supabaseClient.from('offers').select('*')
  
  if (filters?.itemId) {
    query = query.eq('item_id', filters.itemId)
  }
  if (filters?.buyer) {
    query = query.eq('buyer_wallet', filters.buyer)
  }
  if (filters?.seller) {
    query = query.eq('seller_wallet', filters.seller)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  
  query = query.order('created_at', { ascending: false })
  
  const { data, error } = await query
  
  return { data, error }
}

// Transactions
export async function getTransactions(filters?: {
  buyer?: string
  seller?: string
  status?: string
}) {
  let query = supabaseClient.from('transactions').select('*')
  
  if (filters?.buyer) {
    query = query.eq('buyer_wallet', filters.buyer)
  }
  if (filters?.seller) {
    query = query.eq('seller_wallet', filters.seller)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  
  query = query.order('created_at', { ascending: false })
  
  const { data, error } = await query
  
  return { data, error }
}
