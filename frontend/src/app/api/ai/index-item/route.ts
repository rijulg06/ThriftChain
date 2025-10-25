/**
 * AI Indexing API Route
 *
 * POST /api/ai/index-item
 *
 * PURPOSE:
 * After user mints an item NFT on Sui, this API indexes it for AI-powered search.
 *
 * COMPLETE USER FLOW:
 *
 * 1. USER LISTS ITEM (Frontend):
 *    - User fills form: title, description, price, etc.
 *    - User selects images from file picker (Files in browser memory)
 *
 * 2. FRONTEND UPLOADS & MINTS:
 *    - Upload images to Walrus → get blob IDs
 *    - Mint NFT on Sui with blob IDs → get sui_object_id
 *
 * 3. FRONTEND CALLS THIS API (immediately, while data still in memory):
 *    POST /api/ai/index-item
 *    {
 *      "sui_object_id": "0xabc123...",
 *      "title": "Vintage Leather Jacket",
 *      "description": "Brown leather, size M...",
 *      "images": [<base64>, <base64>, ...] // Original images (not downloaded from Walrus!)
 *    }
 *
 * 4. THIS API DOES:
 *    a. Generate 4 embeddings (title, description, image, combined)
 *    b. Store in Supabase with sui_object_id as primary key
 *
 * 5. RESULT:
 *    ✅ Item is now searchable via semantic search!
 *    ✅ Users can find it by searching "brown jacket", "vintage coat", etc.
 *
 * ARCHITECTURE INTEGRATION:
 * ┌──────────────┐
 * │  Frontend    │ Provides: sui_object_id + title + description + images
 * └──────┬───────┘
 *        │
 *        ▼
 * ┌──────────────┐
 * │  THIS API    │ Generates embeddings (calls embeddings.ts)
 * └──────┬───────┘
 *        │
 *        ▼
 * ┌──────────────┐
 * │  Supabase    │ Stores vectors for search
 * └──────────────┘
 *
 * WHY NOT FETCH FROM BLOCKCHAIN?
 * - Frontend already has all the data in memory
 * - No need to download from Walrus (images already available)
 * - Faster and more efficient!
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateItemEmbeddings } from '@/lib/ai/embeddings';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Supabase client with service role key
 *
 * WHY SERVICE ROLE?
 * - This API needs to bypass Row Level Security (RLS)
 * - Only backend can index items (prevents abuse)
 * - Service role key stays secure on server (never exposed to client)
 */
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// ============================================================================
// TYPES
// ============================================================================

interface IndexItemRequest {
  sui_object_id: string;
  title: string;
  description: string;
  images: string[]; // Array of base64-encoded images
}

// ============================================================================
// MAIN API HANDLER
// ============================================================================

/**
 * POST /api/ai/index-item
 *
 * Index an item for AI-powered semantic search
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    const body: IndexItemRequest = await request.json();
    const { sui_object_id, title, description, images } = body;

    // 2. Validate input
    if (!sui_object_id || typeof sui_object_id !== 'string') {
      return NextResponse.json(
        { error: 'sui_object_id is required and must be a string' },
        { status: 400 }
      );
    }

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'title is required and must be a string' },
        { status: 400 }
      );
    }

    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: 'description is required and must be a string' },
        { status: 400 }
      );
    }

    if (!Array.isArray(images)) {
      return NextResponse.json(
        { error: 'images must be an array of base64 strings' },
        { status: 400 }
      );
    }

    console.log(`[index-item] Indexing item: ${sui_object_id}`);
    console.log(`[index-item] Title: ${title}`);
    console.log(`[index-item] Images: ${images.length}`);

    // 3. Convert base64 images to File objects (required by embeddings.ts)
    const imageFiles = images.length > 0 ? await convertBase64ToFiles(images) : [];

    console.log(`[index-item] Converted ${imageFiles.length} images to File objects`);

    // 4. Generate embeddings using our embeddings utility
    console.log('[index-item] Generating embeddings...');
    const embeddings = await generateItemEmbeddings({
      title,
      description,
      imageFiles, // Can be empty array (will use text-only embeddings)
    });

    console.log('[index-item] Embeddings generated:', {
      titleDim: embeddings.titleEmbedding.length,
      descDim: embeddings.descriptionEmbedding.length,
      imageDim: embeddings.imageEmbedding.length,
      combinedDim: embeddings.combinedEmbedding.length,
    });

    // 5. Store in Supabase
    console.log('[index-item] Storing embeddings in Supabase...');
    await storeEmbeddingsInSupabase(sui_object_id, embeddings);

    console.log('[index-item] ✅ Indexing complete!');

    // 6. Return success
    return NextResponse.json({
      success: true,
      sui_object_id,
      message: 'Item indexed successfully for AI search',
      embeddings_generated: {
        title: embeddings.titleEmbedding.length,
        description: embeddings.descriptionEmbedding.length,
        image: embeddings.imageEmbedding.length,
        combined: embeddings.combinedEmbedding.length,
      },
    });
  } catch (error) {
    console.error('[index-item] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to index item',
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
 * Convert base64 images to File objects
 *
 * WHY?
 * - Frontend sends images as base64 strings (easy to serialize in JSON)
 * - Our embeddings.ts expects File objects
 * - This converts between the two formats
 *
 * @param base64Images - Array of base64-encoded image strings
 * @returns Array of File objects
 */
async function convertBase64ToFiles(base64Images: string[]): Promise<File[]> {
  const files: File[] = [];

  for (let i = 0; i < base64Images.length; i++) {
    try {
      const base64 = base64Images[i];

      // Extract mime type and data from base64 string
      // Format: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
      const matches = base64.match(/^data:(.+);base64,(.+)$/);

      if (!matches) {
        console.warn(`[convertBase64ToFiles] Invalid base64 format for image ${i}`);
        continue;
      }

      const mimeType = matches[1]; // "image/jpeg"
      const base64Data = matches[2]; // "/9j/4AAQSkZJRg..."

      // Convert base64 to Blob
      const byteString = atob(base64Data);
      const arrayBuffer = new ArrayBuffer(byteString.length);
      const uint8Array = new Uint8Array(arrayBuffer);

      for (let j = 0; j < byteString.length; j++) {
        uint8Array[j] = byteString.charCodeAt(j);
      }

      const blob = new Blob([uint8Array], { type: mimeType });

      // Convert Blob to File
      const file = new File([blob], `image-${i}.${mimeType.split('/')[1]}`, {
        type: mimeType,
      });

      files.push(file);
    } catch (error) {
      console.error(`[convertBase64ToFiles] Error converting image ${i}:`, error);
      // Continue with other images even if one fails
    }
  }

  return files;
}

/**
 * Store embeddings in Supabase
 *
 * INTEGRATION: Supabase PostgreSQL with pgvector extension
 *
 * HOW IT WORKS:
 * 1. Upsert row into item_search_index table
 * 2. Primary key = sui_object_id (links to blockchain NFT)
 * 3. Store all 4 embedding vectors (768 dimensions each)
 * 4. pgvector extension enables fast cosine similarity search
 *
 * UPSERT:
 * - If item already indexed, updates embeddings (allows re-indexing)
 * - If new item, inserts new row
 *
 * SCHEMA:
 * item_search_index (
 *   sui_object_id TEXT PRIMARY KEY,
 *   title_embedding VECTOR(768),
 *   description_embedding VECTOR(768),
 *   image_embedding VECTOR(768),
 *   combined_embedding VECTOR(768),
 *   indexed_at TIMESTAMP
 * )
 *
 * @param suiObjectId - Sui NFT object ID (primary key)
 * @param embeddings - All 4 embedding vectors
 */
async function storeEmbeddingsInSupabase(
  suiObjectId: string,
  embeddings: {
    titleEmbedding: number[];
    descriptionEmbedding: number[];
    imageEmbedding: number[];
    combinedEmbedding: number[];
  }
) {
  try {
    const { error } = await supabaseAdmin.from('item_search_index').upsert(
      {
        sui_object_id: suiObjectId,
        title_embedding: embeddings.titleEmbedding,
        description_embedding: embeddings.descriptionEmbedding,
        image_embedding: embeddings.imageEmbedding,
        combined_embedding: embeddings.combinedEmbedding,
        indexed_at: new Date().toISOString(),
      },
      {
        onConflict: 'sui_object_id', // Update if already exists
      }
    );

    if (error) {
      throw error;
    }

    console.log('[storeEmbeddingsInSupabase] ✅ Embeddings stored successfully');
  } catch (error) {
    console.error('[storeEmbeddingsInSupabase] Error:', error);
    throw new Error(
      `Failed to store embeddings in Supabase: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ============================================================================
// USAGE EXAMPLE (from frontend ItemForm.tsx)
// ============================================================================

/**
 * Example: After minting item NFT
 *
 * // Step 1: Upload images to Walrus
 * const blobIds = await uploadImagesToWalrus(imageFiles);
 *
 * // Step 2: Mint NFT on Sui
 * const tx = buildCreateItemTransaction({ title, description, walrus_image_ids: blobIds });
 * const result = await wallet.signAndExecuteTransaction(tx);
 * const sui_object_id = result.objectId;
 *
 * // Step 3: Index for AI search (images still in memory!)
 * const base64Images = await Promise.all(
 *   imageFiles.map(file => fileToBase64(file))
 * );
 *
 * const response = await fetch('/api/ai/index-item', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     sui_object_id,
 *     title,
 *     description,
 *     images: base64Images
 *   })
 * });
 *
 * const result = await response.json();
 * // { success: true, sui_object_id: '0xabc123...', message: 'Item indexed successfully' }
 */
