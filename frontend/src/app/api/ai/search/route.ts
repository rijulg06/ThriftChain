/**
 * AI Search API Route
 *
 * POST /api/ai/search
 *
 * PURPOSE:
 * Enable semantic search for marketplace items using AI-powered vector similarity.
 *
 * COMPLETE USER FLOW:
 *
 * 1. USER SEARCHES (Frontend):
 *    - User types query: "vintage leather jacket"
 *    - Frontend calls: POST /api/ai/search { query: "vintage leather jacket" }
 *
 * 2. THIS API DOES:
 *    a. Convert query text to embedding vector [0.023, -0.145, ..., 0.892]
 *    b. Query Supabase with vector similarity search
 *    c. Return matching Sui object IDs sorted by relevance (highest first)
 *
 * 3. FRONTEND DOES:
 *    a. Receives: ["0xabc...", "0xdef...", ...] (sorted by relevance)
 *    b. Fetches full item data from Sui blockchain
 *    c. Displays results to user
 *
 * ARCHITECTURE INTEGRATION:
 * ┌──────────────┐
 * │  Frontend    │ Search query: "vintage jacket"
 * └──────┬───────┘
 *        │
 *        ▼
 * ┌──────────────┐
 * │  THIS API    │ embedText() → [0.023, -0.145, ...]
 * └──────┬───────┘
 *        │
 *        ▼
 * ┌──────────────┐
 * │  Supabase    │ Vector similarity search (pgvector)
 * │              │ Calculates cosine similarity for each item
 * │              │ WHERE similarity > 0.7
 * │              │ ORDER BY similarity DESC
 * └──────┬───────┘
 *        │
 *        ▼
 * ┌──────────────┐
 * │  Returns     │ ["0xabc...", "0xdef...", ...] (sorted by relevance)
 * └──────┬───────┘
 *        │
 *        ▼
 * ┌──────────────┐
 * │  Frontend    │ Fetches from Sui blockchain
 * └──────────────┘
 *
 * HOW VECTOR SIMILARITY WORKS:
 *
 * 1. Query Embedding:
 *    "vintage jacket" → [0.023, -0.145, 0.892, ..., -0.034] (768 numbers)
 *
 * 2. Compare with Each Item:
 *    Item A: [0.019, -0.152, 0.887, ...] → cosine_similarity = 0.92 ✅
 *    Item B: [0.654, 0.234, -0.123, ...] → cosine_similarity = 0.22 ❌
 *
 * 3. Filter & Sort:
 *    Keep items > 0.7 threshold, sort by similarity (highest first)
 *
 * 4. Return IDs:
 *    ["sui_object_id_A", ...] (most relevant first)
 *
 * WHY SEMANTIC SEARCH IS POWERFUL:
 *
 * Traditional Keyword Search:
 * - Query: "jacket" → Only finds items with word "jacket"
 * - Query: "coat" → Misses jackets entirely
 *
 * Semantic Search (This API):
 * - Query: "vintage jacket" → Finds "retro coat", "classic leather jacket"
 * - Query: "brown leather jacket" → Understands: brown=color, leather=material
 * - Query: "warm winter coat" → Finds jackets, parkas, sweaters
 */

import { NextRequest, NextResponse } from 'next/server';
import { embedText } from '@/lib/ai/embeddings';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Supabase client for search queries
 *
 * NOTE: Using anonymous key (not service role) because:
 * - RLS policy allows public read on item_search_index
 * - Searching is a public operation (anyone can search)
 * - More secure (limits permissions)
 */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================================================
// TYPES
// ============================================================================

interface SearchRequest {
  query: string; // User's search query (e.g., "vintage leather jacket")
  similarityThreshold?: number; // Minimum similarity score (0-1), default 0.5
  maxResults?: number; // Maximum results to return, default 20
  useCombined?: boolean; // Use combined embedding (true) or title only (false)
}

interface SearchResponse {
  success: boolean;
  query: string;
  results: string[]; // Array of sui_object_ids, sorted by relevance (highest first)
  count: number;
}

// ============================================================================
// MAIN API HANDLER
// ============================================================================

/**
 * POST /api/ai/search
 *
 * Semantic search for marketplace items
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    const body: SearchRequest = await request.json();
    const {
      query,
      similarityThreshold = 0.5, // Default: 50% similarity (lowered for better recall)
      maxResults = 20, // Default: top 20 results
      useCombined = true, // Default: use multimodal embeddings
    } = body;

    // 2. Validate input
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'query is required and must be a string' },
        { status: 400 }
      );
    }

    if (query.trim().length === 0) {
      return NextResponse.json(
        { error: 'query cannot be empty' },
        { status: 400 }
      );
    }

    if (similarityThreshold < 0 || similarityThreshold > 1) {
      return NextResponse.json(
        { error: 'similarityThreshold must be between 0 and 1' },
        { status: 400 }
      );
    }

    if (maxResults < 1 || maxResults > 100) {
      return NextResponse.json(
        { error: 'maxResults must be between 1 and 100' },
        { status: 400 }
      );
    }

    console.log(`[search] Query: "${query}"`);
    console.log(`[search] Config: threshold=${similarityThreshold}, max=${maxResults}, type=${useCombined ? 'combined' : 'title'}`);

    // 3. Generate embedding for search query
    console.log('[search] Generating query embedding...');
    const queryEmbedding = await embedText(query);

    console.log(`[search] Query embedding generated: ${queryEmbedding.length} dimensions`);

    // 4. Search Supabase using vector similarity
    console.log('[search] Searching Supabase for similar items...');
    const resultIds = await searchSupabase(queryEmbedding, {
      similarityThreshold,
      maxResults,
      useCombined,
    });

    console.log(`[search] ✅ Found ${resultIds.length} matching items`);

    // 5. Return results (already sorted by relevance)
    const response: SearchResponse = {
      success: true,
      query,
      results: resultIds, // Array of sui_object_ids, sorted by similarity (highest first)
      count: resultIds.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[search] Error:', error);

    return NextResponse.json(
      {
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Search Supabase for similar items using vector similarity
 *
 * INTEGRATION: Supabase PostgreSQL with pgvector extension
 *
 * HOW IT WORKS:
 * 1. Calls Supabase function `search_items_by_embedding()` (defined in supabase-schema.sql)
 * 2. Function uses pgvector's cosine distance operator (<=>)
 * 3. For each item in database:
 *    - Calculates: similarity = 1 - (item_embedding <=> query_embedding)
 *    - Filters: Only keep items where similarity > threshold
 * 4. Sorts by similarity (highest first) using ORDER BY
 * 5. Limits to max_results
 *
 * COSINE SIMILARITY CALCULATION:
 * - pgvector's <=> operator calculates cosine distance (0 = identical, 2 = opposite)
 * - We convert to similarity: 1 - distance = similarity (0 = different, 1 = identical)
 * - Example:
 *   Query: "vintage jacket" [0.023, -0.145, 0.892, ...]
 *   Item A: "retro coat"    [0.019, -0.152, 0.887, ...] → distance=0.08 → similarity=0.92 ✅
 *   Item B: "red dress"     [0.654, 0.234, -0.123, ...] → distance=0.78 → similarity=0.22 ❌
 *
 * PERFORMANCE (IVFFlat Index):
 * - Without index: Compares against ALL items (slow for 10,000+ items)
 * - With IVFFlat: Clusters similar vectors, only searches relevant clusters (50-100x faster)
 * - Index created in supabase-schema.sql lines 49-50
 *
 * SORTING:
 * - Results are ALREADY SORTED by similarity (highest first)
 * - Supabase function orders by: `ORDER BY embedding <=> query_embedding`
 * - This means: results[0] = most relevant, results[N] = least relevant (but still > threshold)
 *
 * @param queryEmbedding - 768-dimensional embedding vector
 * @param options - Search options
 * @returns Array of sui_object_ids, sorted by relevance (highest first)
 */
async function searchSupabase(
  queryEmbedding: number[],
  options: {
    similarityThreshold: number;
    maxResults: number;
    useCombined: boolean;
  }
): Promise<string[]> {
  try {
    // Call Supabase function (defined in supabase-schema.sql lines 124-155)
    const { data, error } = await supabase.rpc('search_items_by_embedding', {
      query_embedding: queryEmbedding,
      similarity_threshold: options.similarityThreshold,
      max_results: options.maxResults,
      use_combined: options.useCombined,
    });

    if (error) {
      throw error;
    }

    // Extract only sui_object_ids (results are already sorted by similarity DESC)
    const resultIds: string[] = (data || []).map((row: any) => row.sui_object_id);

    console.log('[searchSupabase] ✅ Found results:', {
      count: resultIds.length,
    });

    return resultIds;
  } catch (error) {
    console.error('[searchSupabase] Error:', error);
    throw new Error(
      `Failed to search Supabase: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ============================================================================
// USAGE EXAMPLE (from frontend)
// ============================================================================

/**
 * Example: Search for items from frontend
 *
 * // Step 1: User types search query
 * const query = "vintage leather jacket";
 *
 * // Step 2: Call search API
 * const response = await fetch('/api/ai/search', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     query,
 *     similarityThreshold: 0.7,  // Optional: minimum similarity
 *     maxResults: 20,             // Optional: max results
 *     useCombined: true           // Optional: use multimodal embeddings
 *   })
 * });
 *
 * const result = await response.json();
 * // {
 * //   success: true,
 * //   query: "vintage leather jacket",
 * //   results: ["0xabc123...", "0xdef456...", "0xghi789..."], // Sorted by relevance
 * //   count: 3
 * // }
 *
 * // Step 3: Fetch full item data from Sui blockchain
 * const items = await Promise.all(
 *   result.results.map(sui_object_id => getItemById(sui_object_id))
 * );
 *
 * // Step 4: Display results to user (already in relevance order)
 * // items[0] = most relevant match
 * // items[1] = second most relevant
 * // items[N] = least relevant (but still above threshold)
 */
