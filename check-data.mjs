/**
 * Check what's actually in the database
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

console.log('🔍 Checking Database State\n');

async function check() {
  try {
    // 1. Index a test item
    console.log('1️⃣ Indexing item...');
    const titleEmb = await embedText('Vintage Leather Jacket');

    await supabaseAdmin.from('item_search_index').upsert({
      sui_object_id: '0xCHECK_TEST',
      title_embedding: titleEmb,
      description_embedding: titleEmb,
      image_embedding: titleEmb,
      combined_embedding: titleEmb,
    }, { onConflict: 'sui_object_id' });
    console.log('   ✅ Indexed\n');

    // 2. Check what's stored
    console.log('2️⃣ Checking stored data...');
    const { data: items, error: fetchError } = await supabaseAdmin
      .from('item_search_index')
      .select('sui_object_id')
      .eq('sui_object_id', '0xCHECK_TEST');

    if (fetchError) throw fetchError;
    console.log('   Items found:', items?.length || 0);
    console.log('   IDs:', items?.map(i => i.sui_object_id) || []);
    console.log();

    // 3. Test raw SQL similarity calculation
    console.log('3️⃣ Testing raw similarity calculation...');
    const queryEmb = await embedText('brown jacket');

    // Use a simple query without the WHERE clause
    const { data: rawResults, error: rawError } = await supabaseAdmin
      .from('item_search_index')
      .select('sui_object_id')
      .eq('sui_object_id', '0xCHECK_TEST');

    if (rawError) throw rawError;
    console.log('   Direct query results:', rawResults?.length || 0);
    console.log();

    // 4. Try search function with 0 threshold
    console.log('4️⃣ Testing search function...');
    const { data: searchResults, error: searchError } = await supabaseAdmin
      .rpc('search_items_by_embedding', {
        query_embedding: queryEmb,
        similarity_threshold: 0,
        max_results: 10,
        use_combined: true
      });

    if (searchError) {
      console.error('   ❌ Search error:', searchError.message);
    } else {
      console.log('   Search results:', searchResults?.length || 0);
      if (searchResults && searchResults.length > 0) {
        console.log('   Similarity:', searchResults[0].similarity_score);
      }
    }
    console.log();

    // Cleanup
    await supabaseAdmin.from('item_search_index').delete().eq('sui_object_id', '0xCHECK_TEST');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

check();
