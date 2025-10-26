# Supabase Setup for ThriftChain AI Search

## ⚠️ IMPORTANT: Run This First!

The AI search functionality **requires** the Supabase database schema to be set up. Without this, items won't be indexed and search won't work.

## Step 1: Open Supabase SQL Editor

1. Go to your Supabase project: https://app.supabase.com/project/ugqihaluigqeldjxrars
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**

## Step 2: Run the Schema

Copy and paste the **entire contents** of `supabase-schema.sql` into the SQL Editor and click **Run**.

This will:
- ✅ Create the `item_search_index` table with 768-dimensional vectors (Gemini AI)
- ✅ Set up vector similarity indexes for fast search
- ✅ Create the `search_items_by_embedding()` function
- ✅ Enable Row Level Security with permissive policies

## Step 3: Verify Setup

After running the schema, you should see:
```
✓ Schema created successfully!
```

And a table with 6 columns:
- `sui_object_id` (TEXT, primary key)
- `title_embedding` (VECTOR(768))
- `description_embedding` (VECTOR(768))
- `image_embedding` (VECTOR(768))
- `combined_embedding` (VECTOR(768))
- `indexed_at` (TIMESTAMP)

## Step 4: Test It

1. Create an item via `/list-item`
2. Check the browser console - you should see:
   ```
   ✓ AI embeddings generated and indexed
   ```
3. Check Supabase Table Editor - you should see a new row in `item_search_index`
4. Try searching from home page or `/listings`

## Troubleshooting

### "Error creating item record"
- Schema not run in Supabase
- Wrong database URL/key in `.env.local`

### "No results found"
- No items indexed yet - create some items first
- Search query too specific - try broader terms like "jacket" or "shirt"

### "Failed to generate embeddings"
- Missing `GEMINI_API_KEY` in `.env.local`
- Get one at: https://makersuite.google.com/app/apikey
