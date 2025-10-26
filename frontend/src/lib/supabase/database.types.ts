/**
 * Database type definitions
 * 
 * NOTE: This is a placeholder file. In a production environment, you would generate
 * these types from your Supabase schema using the Supabase CLI:
 * 
 *   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > database.types.ts
 * 
 * Or use the types generated in the Supabase dashboard under Settings > API > TypeScript types
 */

export type Database = {
  public: {
    Tables: {
      users: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      items: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      offers: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      transactions: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      ownership_history: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      walrus_blobs: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

