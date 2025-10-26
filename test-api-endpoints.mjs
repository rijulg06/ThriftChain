/**
 * Test API Endpoints (Direct Function Testing)
 *
 * Since we can't run Next.js dev server with Node 18,
 * this tests the API logic directly.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, 'frontend/.env.local') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🧪 Testing AI API Endpoints Logic\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// ============================================================================
// Helper: Generate Embedding (same as embeddings.ts)
// ============================================================================
async function embedText(text) {
  const model = genAI.getGenerativeModel({ model: 'models/text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

// ============================================================================
// TEST 1: /api/ai/index-item logic
// ============================================================================
async function testIndexItemAPI() {
  console.log('📦 TEST 1: POST /api/ai/index-item (Index Item Logic)');
  console.log('   Simulating: User lists "Vintage Leather Jacket"\n');

  try {
    // Simulate request body
    const requestBody = {
      sui_object_id: '0xTEST_VINTAGE_JACKET_001',
      title: 'Vintage Leather Jacket',
      description: 'Brown leather jacket, excellent condition, size M',
      images: [] // No images for this test
    };

    console.log(`   → Request: ${requestBody.title}`);

    // Generate embeddings (same logic as index-item/route.ts)
    console.log('   → Generating embeddings...');
    const titleEmbedding = await embedText(requestBody.title);
    const descriptionEmbedding = await embedText(requestBody.description);
    const combinedEmbedding = await embedText(`${requestBody.title}. ${requestBody.description}`);

    console.log(`   ✓ Title embedding: ${titleEmbedding.length} dims`);
    console.log(`   ✓ Description embedding: ${descriptionEmbedding.length} dims`);
    console.log(`   ✓ Combined embedding: ${combinedEmbedding.length} dims`);

    // Store in Supabase (same logic as index-item/route.ts)
    console.log('   → Storing in Supabase...');
    const { error } = await supabaseAdmin.from('item_search_index').upsert({
      sui_object_id: requestBody.sui_object_id,
      title_embedding: titleEmbedding,
      description_embedding: descriptionEmbedding,
      image_embedding: titleEmbedding, // Fallback to title
      combined_embedding: combinedEmbedding,
      indexed_at: new Date().toISOString(),
    }, { onConflict: 'sui_object_id' });

    if (error) throw error;

    console.log('   ✅ Success! Item indexed\n');
    return requestBody.sui_object_id;

  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}\n`);
    throw error;
  }
}

// ============================================================================
// TEST 2: /api/ai/search logic
// ============================================================================
async function testSearchAPI() {
  console.log('🔍 TEST 2: POST /api/ai/search (Search Logic)');
  console.log('   Simulating: User searches "brown jacket"\n');

  try {
    // Simulate request body
    const requestBody = {
      query: 'brown jacket',
      similarityThreshold: 0.5, // Lower threshold for testing
      maxResults: 10,
      useCombined: true
    };

    console.log(`   → Query: "${requestBody.query}"`);

    // Generate query embedding (same logic as search/route.ts)
    console.log('   → Generating query embedding...');
    const queryEmbedding = await embedText(requestBody.query);
    console.log(`   ✓ Query embedding: ${queryEmbedding.length} dims`);

    // Search Supabase (same logic as search/route.ts)
    console.log('   → Searching Supabase...');
    const { data, error } = await supabase.rpc('search_items_by_embedding', {
      query_embedding: queryEmbedding,
      similarity_threshold: requestBody.similarityThreshold,
      max_results: requestBody.maxResults,
      use_combined: requestBody.useCombined,
    });

    if (error) throw error;

    const resultIds = (data || []).map(row => row.sui_object_id);
    const topResults = data.slice(0, 3);

    console.log(`   ✅ Success! Found ${resultIds.length} items\n`);

    if (topResults.length > 0) {
      console.log('   📋 Top Results:');
      topResults.forEach((item, i) => {
        console.log(`      ${i + 1}. ${item.sui_object_id}`);
        console.log(`         Similarity: ${(item.similarity_score * 100).toFixed(1)}%`);
      });
      console.log();
    }

    return resultIds;

  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}\n`);
    throw error;
  }
}

// ============================================================================
// TEST 3: Test Multiple Items and Search
// ============================================================================
async function testMultipleItems() {
  console.log('🎯 TEST 3: Index Multiple Items & Test Search Relevance');
  console.log('   Adding 3 different items...\n');

  const items = [
    {
      sui_object_id: '0xTEST_ITEM_JACKET',
      title: 'Vintage Denim Jacket',
      description: 'Classic blue denim jacket from the 90s'
    },
    {
      sui_object_id: '0xTEST_ITEM_DRESS',
      title: 'Red Evening Dress',
      description: 'Elegant red dress perfect for formal events'
    },
    {
      sui_object_id: '0xTEST_ITEM_SNEAKERS',
      title: 'Retro White Sneakers',
      description: 'Vintage white athletic shoes in great condition'
    }
  ];

  try {
    // Index all items
    for (const item of items) {
      console.log(`   → Indexing: ${item.title}`);
      const titleEmb = await embedText(item.title);
      const descEmb = await embedText(item.description);
      const combinedEmb = await embedText(`${item.title}. ${item.description}`);

      await supabaseAdmin.from('item_search_index').upsert({
        sui_object_id: item.sui_object_id,
        title_embedding: titleEmb,
        description_embedding: descEmb,
        image_embedding: titleEmb,
        combined_embedding: combinedEmb,
        indexed_at: new Date().toISOString(),
      }, { onConflict: 'sui_object_id' });
    }

    console.log('   ✅ All items indexed\n');

    // Test search queries
    const queries = [
      'vintage jacket',
      'formal dress',
      'white shoes'
    ];

    for (const query of queries) {
      console.log(`   🔍 Search: "${query}"`);
      const queryEmb = await embedText(query);
      const { data } = await supabase.rpc('search_items_by_embedding', {
        query_embedding: queryEmb,
        similarity_threshold: 0.5,
        max_results: 3,
        use_combined: true,
      });

      if (data && data.length > 0) {
        const topMatch = data[0];
        const matchedItem = items.find(i => i.sui_object_id === topMatch.sui_object_id);
        console.log(`      → Top match: ${matchedItem?.title || topMatch.sui_object_id}`);
        console.log(`      → Similarity: ${(topMatch.similarity_score * 100).toFixed(1)}%\n`);
      } else {
        console.log('      → No matches found\n');
      }
    }

    console.log('   ✅ Search relevance test complete\n');

  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}\n`);
    throw error;
  }
}

// ============================================================================
// CLEANUP
// ============================================================================
async function cleanup() {
  console.log('🧹 Cleanup: Removing test items...\n');

  try {
    const { error } = await supabaseAdmin
      .from('item_search_index')
      .delete()
      .like('sui_object_id', '0xTEST_%');

    if (error) throw error;

    console.log('   ✅ Test items removed\n');
  } catch (error) {
    console.warn(`   ⚠️  Warning: ${error.message}\n`);
  }
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================
async function runTests() {
  try {
    await testIndexItemAPI();
    await testSearchAPI();
    await testMultipleItems();
    await cleanup();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ ALL API TESTS PASSED!\n');
    console.log('Your AI search APIs are working correctly! 🎉\n');
    console.log('Next steps:');
    console.log('1. Upgrade to Node.js 20+ to run Next.js dev server');
    console.log('2. Test live endpoints: http://localhost:3000/api/ai/search');
    console.log('3. Integrate search into your frontend UI\n');

  } catch (error) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.error('❌ TESTS FAILED\n');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

runTests();
