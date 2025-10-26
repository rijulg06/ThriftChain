/**
 * Debug Search - Check actual similarity scores
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
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function embedText(text) {
  const model = genAI.getGenerativeModel({ model: 'models/text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

console.log('🔍 Debugging Search Similarity Scores\n');

async function debug() {
  try {
    // Index a test item
    console.log('1️⃣ Indexing test item: "Vintage Leather Jacket"');
    const title = 'Vintage Leather Jacket';
    const description = 'Brown leather jacket, size M';
    const combined = `${title}. ${description}`;

    const titleEmb = await embedText(title);
    const combinedEmb = await embedText(combined);

    await supabaseAdmin.from('item_search_index').upsert({
      sui_object_id: '0xDEBUG_TEST',
      title_embedding: titleEmb,
      description_embedding: titleEmb,
      image_embedding: titleEmb,
      combined_embedding: combinedEmb,
      indexed_at: new Date().toISOString(),
    }, { onConflict: 'sui_object_id' });

    console.log('   ✅ Indexed\n');

    // Test different queries with NO threshold
    const queries = [
      'Vintage Leather Jacket',  // Exact match
      'vintage jacket',          // Similar
      'brown jacket',            // Related
      'leather coat',            // Related
      'red dress'                // Unrelated
    ];

    for (const query of queries) {
      console.log(`🔍 Query: "${query}"`);
      const queryEmb = await embedText(query);

      // Search with NO threshold (0.0)
      const { data, error } = await supabaseAdmin.rpc('search_items_by_embedding', {
        query_embedding: queryEmb,
        similarity_threshold: 0.0,  // Show ALL results
        max_results: 10,
        use_combined: true,
      });

      if (error) {
        console.error('   ❌ Error:', error.message);
        continue;
      }

      if (data && data.length > 0) {
        console.log(`   ✅ Similarity: ${(data[0].similarity_score * 100).toFixed(2)}%`);
      } else {
        console.log('   ❌ NO RESULTS (even with 0.0 threshold!)');
      }
      console.log();
    }

    // Cleanup
    await supabaseAdmin.from('item_search_index').delete().eq('sui_object_id', '0xDEBUG_TEST');

  } catch (error) {
    console.error('Error:', error);
  }
}

debug();
