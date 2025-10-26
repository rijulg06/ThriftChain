/**
 * Test how vectors are passed from JS to Supabase RPC
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, 'frontend/.env.local') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function embedText(text) {
  const model = genAI.getGenerativeModel({ model: 'models/text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

console.log('🧪 Testing Vector Passing to RPC\n');

async function test() {
  try {
    // Get the exact embedding from the database
    console.log('1️⃣ Getting stored embedding from database...');
    const { data: item, error: fetchError } = await supabaseAdmin
      .from('item_search_index')
      .select('combined_embedding')
      .eq('sui_object_id', '0xPERSISTENT_TEST_JACKET')
      .single();

    if (fetchError) throw fetchError;

    const storedEmbedding = item.combined_embedding;
    console.log(`   ✓ Got embedding - Type: ${typeof storedEmbedding}`);
    console.log(`   ✓ Is Array: ${Array.isArray(storedEmbedding)}`);

    // Parse if it's a string
    let embeddingArray = storedEmbedding;
    if (typeof storedEmbedding === 'string') {
      console.log(`   ⚠️  Embedding is a STRING (length: ${storedEmbedding.length} chars)`);
      console.log(`   → Parsing string to array...`);
      // Remove brackets and parse
      embeddingArray = JSON.parse(storedEmbedding);
      console.log(`   ✓ Parsed to array: ${embeddingArray.length} values`);
    }

    console.log(`   ✓ First 3: [${embeddingArray.slice(0, 3).join(', ')}]`);
    console.log();

    // Test 1: Pass the exact same embedding we just got
    console.log('2️⃣ Test 1: Pass stored embedding back to search...');
    const { data: test1, error: error1 } = await supabaseAdmin.rpc('search_items_by_embedding', {
      query_embedding: embeddingArray,
      similarity_threshold: 0.0,
      max_results: 10,
      use_combined: true
    });

    if (error1) {
      console.error(`   ❌ Error: ${error1.message}`);
    } else {
      console.log(`   ✓ Results: ${test1?.length || 0}`);
      if (test1 && test1.length > 0) {
        console.log(`   ✓ Similarity: ${test1[0].similarity_score}`);
      }
    }
    console.log();

    // Test 2: Generate a new embedding for same text
    console.log('3️⃣ Test 2: Generate fresh embedding for "Vintage Leather Jacket"...');
    const freshEmbedding = await embedText('Vintage Leather Jacket. Brown leather jacket, size M');
    console.log(`   ✓ Generated: ${freshEmbedding.length} values`);
    console.log(`   ✓ First 3: [${freshEmbedding.slice(0, 3).join(', ')}]`);

    const { data: test2, error: error2 } = await supabaseAdmin.rpc('search_items_by_embedding', {
      query_embedding: freshEmbedding,
      similarity_threshold: 0.0,
      max_results: 10,
      use_combined: true
    });

    if (error2) {
      console.error(`   ❌ Error: ${error2.message}`);
    } else {
      console.log(`   ✓ Results: ${test2?.length || 0}`);
      if (test2 && test2.length > 0) {
        console.log(`   ✓ Similarity: ${test2[0].similarity_score}`);
      }
    }
    console.log();

    // Test 3: Try with a different query
    console.log('4️⃣ Test 3: Search with "brown jacket"...');
    const queryEmbedding = await embedText('brown jacket');
    console.log(`   ✓ Generated query embedding: ${queryEmbedding.length} values`);

    const { data: test3, error: error3 } = await supabaseAdmin.rpc('search_items_by_embedding', {
      query_embedding: queryEmbedding,
      similarity_threshold: 0.0,
      max_results: 10,
      use_combined: true
    });

    if (error3) {
      console.error(`   ❌ Error: ${error3.message}`);
    } else {
      console.log(`   ✓ Results: ${test3?.length || 0}`);
      if (test3 && test3.length > 0) {
        console.log(`   ✓ Similarity: ${test3[0].similarity_score}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

test();
