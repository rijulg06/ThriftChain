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
        Row: Record<string, any>
        Insert: Record<string, any>
        Update: Record<string, any>
      }
      items: {
        Row: Record<string, any>
        Insert: Record<string, any>
        Update: Record<string, any>
      }
      offers: {
        Row: Record<string, any>
        Insert: Record<string, any>
        Update: Record<string, any>
      }
      transactions: {
        Row: Record<string, any>
        Insert: Record<string, any>
        Update: Record<string, any>
      }
      ownership_history: {
        Row: Record<string, any>
        Insert: Record<string, any>
        Update: Record<string, any>
      }
      walrus_blobs: {
        Row: Record<string, any>
        Insert: Record<string, any>
        Update: Record<string, any>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
