/**
 * Detailed diagnostics - check what the WHERE clause is doing
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

console.log('🔬 Deep Diagnostic\n');

async function diagnose() {
  try {
    // Index item
    console.log('1️⃣ Indexing: "Vintage Leather Jacket"');
    const itemEmb = await embedText('Vintage Leather Jacket');

    await supabaseAdmin.from('item_search_index').upsert({
      sui_object_id: '0xDIAGNOSE',
      title_embedding: itemEmb,
      description_embedding: itemEmb,
      image_embedding: itemEmb,
      combined_embedding: itemEmb,
    }, { onConflict: 'sui_object_id' });
    console.log('   ✅ Done\n');

    // Test queries
    const queries = ['brown jacket', 'leather coat'];

    for (const query of queries) {
      console.log(`🔍 Testing: "${query}"`);
      const queryEmb = await embedText(query);

      // Create a simpler search function to test
      const testSQL = `
        SELECT
          sui_object_id,
          (1 - (combined_embedding <=> $1::vector(768)))::FLOAT as similarity
        FROM item_search_index
        WHERE sui_object_id = '0xDIAGNOSE'
      `;

      try {
        // This won't work with supabase-js, but let's try the RPC
        // with a very simple version
        const { data, error } = await supabaseAdmin
          .rpc('search_items_by_embedding', {
            query_embedding: queryEmb,
            similarity_threshold: -1.0,  // Allow negative scores
            max_results: 10,
            use_combined: true
          });

        if (error) {
          console.error('   RPC Error:', error.message);
        } else {
          console.log('   Results:', data?.length || 0);
          if (data && data.length > 0) {
            console.log('   Similarity:', data[0].similarity_score);
          }
        }
      } catch (e) {
        console.error('   Exception:', e.message);
      }
      console.log();
    }

    // Try with title embedding instead
    console.log('4️⃣ Testing with title_embedding instead of combined...');
    const queryEmb2 = await embedText('brown jacket');
    const { data: titleResults, error: titleError } = await supabaseAdmin
      .rpc('search_items_by_embedding', {
        query_embedding: queryEmb2,
        similarity_threshold: 0,
        max_results: 10,
        use_combined: false  // Use title_embedding
      });

    if (titleError) {
      console.error('   Error:', titleError.message);
    } else {
      console.log('   Results:', titleResults?.length || 0);
      if (titleResults && titleResults.length > 0) {
        console.log('   Similarity:', titleResults[0].similarity_score);
      }
    }

    // Cleanup
    await supabaseAdmin.from('item_search_index').delete().eq('sui_object_id', '0xDIAGNOSE');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

diagnose();
