import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
}

/**
 * Server-side Supabase client for use in API routes and Server Components.
 * This client handles server-side authentication and cookie management.
 * 
 * Usage in API Routes:
 * ```ts
 * import { getSupabaseServerClient } from '@/lib/supabase/server'
 * 
 * export async function GET() {
 *   const supabase = getSupabaseServerClient()
 *   const { data, error } = await supabase.from('items').select('*')
 *   return Response.json({ data, error })
 * }
 * ```
 * 
 * Usage in Server Components:
 * ```ts
 * import { getSupabaseServerClient } from '@/lib/supabase/server'
 * 
 * export default async function Page() {
 *   const supabase = getSupabaseServerClient()
 *   const { data } = await supabase.from('items').select('*')
 *   return <div>{data}</div>
 * }
 * ```
 */
export function getSupabaseServerClient() {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      async getAll() {
        const store = await cookies()
        return store.getAll()
      },
      async setAll(cookiesToSet) {
        try {
          const store = await cookies()
          cookiesToSet.forEach(({ name, value, options }) =>
            store.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}

/**
 * Admin Supabase client using service role key for elevated permissions.
 * Use this ONLY in secure server-side contexts (API routes, server actions).
 * 
 * WARNING: This client bypasses Row Level Security (RLS) policies.
 * 
 * Usage:
 * ```ts
 * import { getSupabaseAdminClient } from '@/lib/supabase/server'
 * 
 * // In API route
 * const supabase = getSupabaseAdminClient()
 * const { data } = await supabase.from('users').select('*')
 * ```
 */
export function getSupabaseAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

