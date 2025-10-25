/**
 * Multimodal Embeddings Utility for ThriftChain AI Search
 *
 * ARCHITECTURE INTEGRATION:
 *
 * This module sits at the intersection of:
 * 1. Browser (user's image File objects)
 * 2. Walrus (decentralized image storage)
 * 3. Gemini AI (multimodal embeddings)
 * 4. Supabase (vector search index)
 * 5. Sui blockchain (source of truth)
 *
 * COMPLETE DATA FLOW:
 *
 * User Lists Item:
 * ┌─────────────┐
 * │   Browser   │ User selects images (File objects in memory)
 * └──────┬──────┘
 *        │
 *        ▼
 * ┌─────────────┐
 * │ THIS MODULE │ Generate embeddings from raw File objects
 * │ embeddings  │ - embedText(title) → title_embedding
 * │   .ts       │ - embedText(description) → description_embedding
 * │             │ - embedImage(File) → image_embedding
 * │             │ - embedTextAndImage() → combined_embedding
 * └──────┬──────┘
 *        │
 *        ├─────────────────┐
 *        │                 │
 *        ▼                 ▼
 * ┌─────────────┐   ┌─────────────┐
 * │   Walrus    │   │  Supabase   │
 * │   Upload    │   │   Insert    │
 * │ image→blobID│   │  embeddings │
 * └──────┬──────┘   └─────────────┘
 *        │
 *        ▼
 * ┌─────────────┐
 * │ Sui Blockchain│
 * │ Mint NFT with│
 * │ walrus_blob_id│
 * └─────────────┘
 *
 * User Searches:
 * ┌─────────────┐
 * │   Browser   │ User types "vintage jacket"
 * └──────┬──────┘
 *        │
 *        ▼
 * ┌─────────────┐
 * │ THIS MODULE │ embedText("vintage jacket") → query_embedding
 * └──────┬──────┘
 *        │
 *        ▼
 * ┌─────────────┐
 * │  Supabase   │ Vector similarity search → [sui_object_ids]
 * └──────┬──────┘
 *        │
 *        ▼
 * ┌─────────────┐
 * │ Sui Blockchain│ Fetch full item data using object IDs
 * └─────────────┘
 *
 * WHY THIS FLOW IS EFFICIENT:
 * - Process image ONCE (when user selects it, before upload)
 * - No need to download from Walrus for embedding generation
 * - Faster user experience (parallel: embed + upload to Walrus)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Gemini API Configuration
 *
 * WHY GEMINI?
 * - Free tier: 1500 requests/day (good for hackathon/MVP)
 * - Multimodal: Handles text + images in single API call
 * - 768-dim embeddings: Good balance of quality and performance
 * - Fast: ~200-500ms per request
 *
 * ALTERNATIVES:
 * - OpenAI CLIP: Better quality, 1536-dim, costs $$$
 * - Cohere: Good balance, 1024-dim
 * - Local models: Free but slower (CLIP-ViT, Sentence-BERT)
 */
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

// Models
const TEXT_EMBEDDING_MODEL = 'models/text-embedding-004'; // Latest Gemini text embeddings
const MULTIMODAL_MODEL = 'models/gemini-1.5-flash';      // For image understanding

// Embedding dimensions (must match Supabase schema)
export const EMBEDDING_DIMENSIONS = 768;

// Initialize Gemini client
let genAI: GoogleGenerativeAI | null = null;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

// ============================================================================
// CORE EMBEDDING FUNCTIONS
// ============================================================================

/**
 * Convert text to embedding vector
 *
 * INTEGRATION POINT: Gemini API
 *
 * HOW IT WORKS:
 * 1. Sends text to Gemini's embedding model
 * 2. Model analyzes semantic meaning
 * 3. Returns 768-number array representing the concept
 *
 * EXAMPLE:
 * embedText("vintage leather jacket")
 * → [0.023, -0.145, 0.892, ..., -0.034]  (768 numbers)
 *
 * embedText("retro leather coat")
 * → [0.019, -0.152, 0.887, ..., -0.029]  (similar vector!)
 *
 * COSINE SIMILARITY:
 * cosine([vintage leather jacket], [retro leather coat]) ≈ 0.92 (very similar)
 * cosine([vintage leather jacket], [bicycle helmet]) ≈ 0.15 (not similar)
 *
 * @param text - Any text string (title, description, search query)
 * @returns 768-dimensional embedding vector
 */
export async function embedText(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty for embedding generation');
  }

  if (!genAI) {
    throw new Error(
      'Gemini API key not configured. Set GEMINI_API_KEY in .env.local\n' +
      'Get a key at: https://makersuite.google.com/app/apikey'
    );
  }

  try {
    const model = genAI.getGenerativeModel({ model: TEXT_EMBEDDING_MODEL });

    // Generate embedding
    const result = await model.embedContent(text);
    const embedding = result.embedding.values;

    // Validate
    if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Expected ${EMBEDDING_DIMENSIONS}-dim embedding, got ${embedding?.length || 0}`
      );
    }

    return embedding;
  } catch (error) {
    console.error('[embedText] Error:', error);
    throw new Error(
      `Failed to generate text embedding: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Convert image to embedding vector
 *
 * INTEGRATION POINT: Browser File API + Gemini Vision API
 *
 * HOW IT WORKS:
 * 1. Takes raw File object from browser (e.g., from <input type="file" />)
 * 2. Converts to base64 format that Gemini can process
 * 3. Sends to Gemini Vision model
 * 4. Model analyzes visual features (colors, shapes, objects, style)
 * 5. Returns 768-number array representing visual content
 *
 * WHY PROCESS BEFORE WALRUS UPLOAD?
 * - Image is already in browser memory (no extra download)
 * - Can run in parallel with Walrus upload (faster UX)
 * - Only process once (vs. download from Walrus every time)
 *
 * EXAMPLE USAGE:
 * const fileInput = document.querySelector('input[type="file"]');
 * const file = fileInput.files[0];
 * const imageEmbedding = await embedImage(file);
 *
 * WHAT IT CAPTURES:
 * - Visual appearance (colors, patterns, textures)
 * - Object types (dress, jacket, shoes, etc.)
 * - Style (vintage, modern, casual, formal)
 *
 * @param imageFile - File object from browser input
 * @returns 768-dimensional embedding vector
 */
export async function embedImage(imageFile: File): Promise<number[]> {
  if (!imageFile) {
    throw new Error('Image file is required');
  }

  if (!imageFile.type.startsWith('image/')) {
    throw new Error(`Invalid file type: ${imageFile.type}. Expected an image.`);
  }

  if (!genAI) {
    throw new Error('Gemini API key not configured');
  }

  try {
    // Convert File to base64 for Gemini API
    const base64Image = await fileToBase64(imageFile);

    // Use multimodal model to understand image
    const model = genAI.getGenerativeModel({ model: MULTIMODAL_MODEL });

    // Generate embedding with visual understanding prompt
    const parts = [
      {
        text: 'Generate an embedding that captures the visual features, style, colors, and objects in this image.',
      },
      {
        inlineData: {
          mimeType: imageFile.type,
          data: base64Image,
        },
      },
    ];

    const result = await model.embedContent(parts);
    const embedding = result.embedding.values;

    if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Expected ${EMBEDDING_DIMENSIONS}-dim embedding, got ${embedding?.length || 0}`
      );
    }

    return embedding;
  } catch (error) {
    console.error('[embedImage] Error:', error);
    throw new Error(
      `Failed to generate image embedding: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate multimodal embedding (text + image combined)
 *
 * INTEGRATION POINT: Gemini Vision API (multimodal understanding)
 *
 * THIS IS THE MOST POWERFUL EMBEDDING!
 *
 * HOW IT WORKS:
 * 1. Combines text description with image(s)
 * 2. Gemini understands BOTH:
 *    - What the text says ("vintage leather jacket, brown, size M")
 *    - What the image shows (brown jacket with vintage style)
 * 3. Returns single vector that captures both modalities
 *
 * WHY BETTER THAN SEPARATE?
 * - Text-only: Might miss visual details ("red dress" could be crimson, scarlet, burgundy)
 * - Image-only: Might miss important context ("size M", "new with tags", "rare brand")
 * - COMBINED: Understands "brown leather jacket that LOOKS vintage" (not just text mention)
 *
 * EXAMPLE:
 * Item: "Vintage Levi's denim jacket, size L" + [image of worn denim jacket]
 * Search: "old jeans jacket" → HIGH MATCH (understands vintage ≈ old, denim ≈ jeans)
 * Search: "red dress" → LOW MATCH (different item type and color)
 *
 * @param text - Combined title + description
 * @param imageFiles - Array of File objects (usually 1-5 images per item)
 * @returns 768-dimensional multimodal embedding
 */
export async function embedTextAndImage(
  text: string,
  imageFiles: File[]
): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('Text is required for multimodal embedding');
  }

  if (!imageFiles || imageFiles.length === 0) {
    console.warn('[embedTextAndImage] No images provided, falling back to text-only');
    return embedText(text);
  }

  if (!genAI) {
    throw new Error('Gemini API key not configured');
  }

  try {
    // Convert all images to base64
    const base64Images = await Promise.all(
      imageFiles.map(file => fileToBase64(file))
    );

    // Use multimodal model
    const model = genAI.getGenerativeModel({ model: MULTIMODAL_MODEL });

    // Build multimodal prompt
    const prompt = `Generate a comprehensive embedding for this marketplace item.

Item Description: ${text}

Consider both:
1. The textual description (what's written)
2. The visual appearance (what's shown in images)

Capture the overall essence of this item for semantic search.`;

    // Build parts array: text + all images
    const parts = [
      { text: prompt },
      ...base64Images.map((imgData, idx) => ({
        inlineData: {
          mimeType: imageFiles[idx].type,
          data: imgData,
        },
      })),
    ];

    const result = await model.embedContent(parts);
    const embedding = result.embedding.values;

    if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Expected ${EMBEDDING_DIMENSIONS}-dim embedding, got ${embedding?.length || 0}`
      );
    }

    return embedding;
  } catch (error) {
    console.error('[embedTextAndImage] Error:', error);
    // Fallback to text-only if multimodal fails
    console.warn('Falling back to text-only embedding due to error');
    return embedText(text);
  }
}

/**
 * Generate all embeddings for a marketplace item
 *
 * MAIN INTEGRATION FUNCTION - Called when user lists an item
 *
 * COMPLETE FLOW:
 *
 * 1. USER ACTION (Browser):
 *    - User fills out form: title, description
 *    - User selects images from file picker
 *
 * 2. CALL THIS FUNCTION:
 *    const embeddings = await generateItemEmbeddings({
 *      title: "Vintage Leather Jacket",
 *      description: "Brown leather, size M, excellent condition",
 *      imageFiles: [file1, file2]  // Raw File objects
 *    });
 *
 * 3. THIS FUNCTION GENERATES:
 *    - titleEmbedding: Quick search by item name
 *    - descriptionEmbedding: Detailed feature search
 *    - imageEmbedding: Visual similarity search
 *    - combinedEmbedding: Multimodal (most powerful)
 *
 * 4. NEXT STEPS (caller's responsibility):
 *    - Upload images to Walrus → get blob IDs
 *    - Mint NFT on Sui with blob IDs
 *    - Store embeddings in Supabase with sui_object_id
 *
 * WHY FOUR EMBEDDINGS?
 * - Different search strategies for different use cases
 * - title: Fast autocomplete ("jacket" → shows all jackets)
 * - description: Detailed filtering ("leather jacket size M")
 * - image: Visual search ("find items that look like this")
 * - combined: Semantic search ("vintage brown leather outerwear")
 *
 * @param item - Item data with text and image File objects
 * @returns Four embedding vectors for different search strategies
 */
export async function generateItemEmbeddings(item: {
  title: string;
  description: string;
  imageFiles?: File[]; // Raw File objects from browser
}): Promise<{
  titleEmbedding: number[];
  descriptionEmbedding: number[];
  imageEmbedding: number[];
  combinedEmbedding: number[];
}> {
  if (!item.title || !item.description) {
    throw new Error('Item must have both title and description');
  }

  try {
    // Generate all embeddings in parallel (faster!)
    const [titleEmbedding, descriptionEmbedding, imageEmbedding, combinedEmbedding] =
      await Promise.all([
        // 1. Title-only (text)
        embedText(item.title),

        // 2. Description-only (text)
        embedText(item.description),

        // 3. Image-only (visual)
        item.imageFiles && item.imageFiles.length > 0
          ? embedImage(item.imageFiles[0]) // Use first image for image-only embedding
          : embedText(item.title), // Fallback to title if no images

        // 4. Combined multimodal (text + images) - MOST POWERFUL
        item.imageFiles && item.imageFiles.length > 0
          ? embedTextAndImage(`${item.title}. ${item.description}`, item.imageFiles)
          : embedText(`${item.title}. ${item.description}`), // Fallback to text if no images
      ]);

    return {
      titleEmbedding,
      descriptionEmbedding,
      imageEmbedding,
      combinedEmbedding,
    };
  } catch (error) {
    console.error('[generateItemEmbeddings] Error:', error);
    throw new Error(
      `Failed to generate item embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert File object to base64 string
 *
 * @param file - File object from browser
 * @returns Base64-encoded string (without data URL prefix)
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Remove "data:image/jpeg;base64," prefix
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };

    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${file.name}`));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Calculate cosine similarity between two vectors
 *
 * WHAT IS COSINE SIMILARITY?
 * - Measures angle between two vectors in high-dimensional space
 * - Range: 0 (completely different) to 1 (identical)
 * - 0.7+ = very similar, 0.5-0.7 = somewhat similar, <0.5 = not similar
 *
 * USE CASE: Testing/debugging locally before Supabase integration
 *
 * NOTE: Supabase's pgvector extension calculates this automatically,
 * so you usually don't need to call this manually.
 *
 * @param vec1 - First embedding vector
 * @param vec2 - Second embedding vector
 * @returns Similarity score (0-1)
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error(`Vector dimensions must match: ${vec1.length} vs ${vec2.length}`);
  }

  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    magnitude1 += vec1[i] * vec1[i];
    magnitude2 += vec2[i] * vec2[i];
  }

  const magnitude = Math.sqrt(magnitude1) * Math.sqrt(magnitude2);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Check if Gemini API is configured
 *
 * @returns true if API key is set
 */
export function isEmbeddingConfigured(): boolean {
  return !!GEMINI_API_KEY;
}

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

/**
 * Type for embedding vectors (768 dimensions for Gemini)
 */
export type EmbeddingVector = number[];

/**
 * Type for complete item embeddings
 */
export interface ItemEmbeddings {
  titleEmbedding: EmbeddingVector;
  descriptionEmbedding: EmbeddingVector;
  imageEmbedding: EmbeddingVector;
  combinedEmbedding: EmbeddingVector;
}
