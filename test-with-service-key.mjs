/**
 * Test with SERVICE ROLE key instead of ANON key
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
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);  // SERVICE ROLE!

async function embedText(text) {
  const model = genAI.getGenerativeModel({ model: 'models/text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

console.log('🔍 Testing with SERVICE ROLE key\n');

async function test() {
  const queries = ['brown jacket', 'vintage jacket', 'red dress'];

  for (const query of queries) {
    console.log(`Query: "${query}"`);

    const queryEmb = await embedText(query);

    const { data, error } = await supabaseAdmin.rpc('search_items_by_embedding', {
      query_embedding: queryEmb,
      similarity_threshold: -10.0,
      max_results: 1,
      use_combined: true
    });

    if (error) {
      console.error(`  ❌ Error: ${error.message}`);
    } else if (data && data.length > 0) {
      const score = data[0].similarity_score;
      console.log(`  ✅ Similarity: ${(score * 100).toFixed(1)}%`);
    } else {
      console.log(`  ❌ No results`);
    }
    console.log();
  }
}

test();
