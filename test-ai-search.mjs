/**
 * Test Script for AI Search Functionality
 *
 * Tests:
 * 1. Embeddings generation (text → vector)
 * 2. Indexing API (store embeddings in Supabase)
 * 3. Search API (find similar items)
 *
 * Run: node test-ai-search.mjs
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, 'frontend/.env.local') });

// Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Testing AI Search Setup...\n');

// Verify environment variables
console.log('✅ Environment Variables:');
console.log(`   Gemini API Key: ${GEMINI_API_KEY ? '✓ Set' : '✗ Missing'}`);
console.log(`   Supabase URL: ${SUPABASE_URL ? '✓ Set' : '✗ Missing'}`);
console.log(`   Supabase Anon Key: ${SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing'}`);
console.log(`   Supabase Service Key: ${SUPABASE_SERVICE_KEY ? '✓ Set' : '✗ Missing'}\n`);

if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables!');
  process.exit(1);
}

// Initialize clients
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================================================
// TEST 1: Generate Text Embedding
// ============================================================================
async function testEmbedding() {
  console.log('📝 TEST 1: Generate Text Embedding');
  console.log('   Testing: "vintage leather jacket"\n');

  try {
    const model = genAI.getGenerativeModel({ model: 'models/text-embedding-004' });
    const result = await model.embedContent('vintage leather jacket');
    const embedding = result.embedding.values;

    console.log(`   ✅ Success!`);
    console.log(`   - Dimensions: ${embedding.length}`);
    console.log(`   - First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(3)).join(', ')}...]`);
    console.log(`   - Range: ${Math.min(...embedding).toFixed(3)} to ${Math.max(...embedding).toFixed(3)}\n`);

    return embedding;
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}\n`);
    throw error;
  }
}

// ============================================================================
// TEST 2: Index Test Item
// ============================================================================
async function testIndexing(embedding) {
  console.log('📦 TEST 2: Index Test Item in Supabase');
  console.log('   Storing test item with embeddings...\n');

  try {
    const testItem = {
      sui_object_id: '0xTEST_ITEM_12345',
      title_embedding: embedding,
      description_embedding: embedding,
      image_embedding: embedding,
      combined_embedding: embedding,
      indexed_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from('item_search_index')
      .upsert(testItem, { onConflict: 'sui_object_id' });

    if (error) throw error;

    console.log(`   ✅ Success!`);
    console.log(`   - Item ID: ${testItem.sui_object_id}`);
    console.log(`   - Embeddings stored: 4 vectors (title, description, image, combined)\n`);

    return testItem.sui_object_id;
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}\n`);
    throw error;
  }
}

// ============================================================================
// TEST 3: Search for Similar Items
// ============================================================================
async function testSearch(queryEmbedding) {
  console.log('🔍 TEST 3: Search for Similar Items');
  console.log('   Searching with query embedding...\n');

  try {
    const { data, error } = await supabase.rpc('search_items_by_embedding', {
      query_embedding: queryEmbedding,
      similarity_threshold: 0.5,
      max_results: 10,
      use_combined: true,
    });

    if (error) throw error;

    console.log(`   ✅ Success!`);
    console.log(`   - Found ${data.length} matching items`);

    if (data.length > 0) {
      console.log(`   - Top results:`);
      data.slice(0, 3).forEach((item, i) => {
        console.log(`     ${i + 1}. ${item.sui_object_id} (similarity: ${item.similarity_score.toFixed(3)})`);
      });
    }
    console.log();

    return data;
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}\n`);
    throw error;
  }
}

// ============================================================================
// TEST 4: Verify Database Schema
// ============================================================================
async function testSchema() {
  console.log('🗄️  TEST 4: Verify Database Schema');
  console.log('   Checking item_search_index table...\n');

  try {
    // Check if table exists by counting rows
    const { count, error: tableError } = await supabase
      .from('item_search_index')
      .select('*', { count: 'exact', head: true });

    if (tableError) throw tableError;

    console.log(`   ✅ Table exists!`);
    console.log(`   - Current items indexed: ${count || 0}`);
    console.log(`   - Expected columns: sui_object_id, title_embedding, description_embedding, image_embedding, combined_embedding, indexed_at\n`);

  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}\n`);
    throw error;
  }
}

// ============================================================================
// TEST 5: Clean Up Test Data
// ============================================================================
async function cleanUp(testItemId) {
  console.log('🧹 TEST 5: Clean Up Test Data');
  console.log('   Removing test item...\n');

  try {
    const { error } = await supabaseAdmin
      .from('item_search_index')
      .delete()
      .eq('sui_object_id', testItemId);

    if (error) throw error;

    console.log(`   ✅ Test item removed\n`);
  } catch (error) {
    console.error(`   ⚠️  Warning: ${error.message}\n`);
    // Don't throw - cleanup is optional
  }
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================
async function runAllTests() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Test 1: Generate embedding
    const embedding = await testEmbedding();

    // Test 2: Verify schema
    await testSchema();

    // Test 3: Index test item
    const testItemId = await testIndexing(embedding);

    // Test 4: Search
    const results = await testSearch(embedding);

    // Test 5: Clean up
    await cleanUp(testItemId);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ ALL TESTS PASSED!\n');
    console.log('Your AI search is ready to use! 🎉\n');
    console.log('Next steps:');
    console.log('1. Start your dev server: npm run dev');
    console.log('2. Test the API endpoints:');
    console.log('   - POST /api/ai/index-item');
    console.log('   - POST /api/ai/search\n');

  } catch (error) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.error('❌ TESTS FAILED\n');
    console.error('Error:', error.message);
    console.error('\nPlease check:');
    console.error('1. API keys are correct in .env.local');
    console.error('2. Supabase schema is deployed correctly');
    console.error('3. Network connection is working\n');
    process.exit(1);
  }
}

// Run tests
runAllTests();
