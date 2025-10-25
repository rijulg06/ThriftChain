import { createBrowserClient } from '@supabase/ssr'

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
}

/**
 * Client-side Supabase client for use in React components and client-side code.
 * This client is used for browser-based operations and maintains the user session.
 * 
 * Usage:
 * ```ts
 * import { supabaseClient } from '@/lib/supabase/client'
 * 
 * const { data, error } = await supabaseClient
 *   .from('items')
 *   .select('*')
 * ```
 */
export const supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
