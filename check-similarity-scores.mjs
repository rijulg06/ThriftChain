/**
 * Check actual similarity scores for different queries
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
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function embedText(text) {
  const model = genAI.getGenerativeModel({ model: 'models/text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

console.log('🔍 Checking Similarity Scores\n');
console.log('Item in database: "Vintage Leather Jacket. Brown leather jacket, size M"\n');

async function check() {
  const queries = [
    'Vintage Leather Jacket',
    'vintage jacket',
    'brown jacket',
    'leather coat',
    'brown leather jacket',
    'jacket',
    'red dress'  // Should be very different
  ];

  for (const query of queries) {
    console.log(`Query: "${query}"`);

    try {
      const queryEmb = await embedText(query);

      // Use search function with -10 threshold (allow negative scores)
      const { data, error } = await supabase.rpc('search_items_by_embedding', {
        query_embedding: queryEmb,
        similarity_threshold: -10.0,  // Super low to see everything
        max_results: 1,
        use_combined: true
      });

      if (error) {
        console.error(`  ❌ Error: ${error.message}`);
      } else if (data && data.length > 0) {
        const score = data[0].similarity_score;
        const percentage = (score * 100).toFixed(1);
        const bar = '█'.repeat(Math.floor(score * 20));
        console.log(`  Similarity: ${percentage}% ${bar}`);
      } else {
        console.log(`  ❌ No results (even with -10 threshold!)`);
      }
    } catch (e) {
      console.error(`  ❌ Exception: ${e.message}`);
    }

    console.log();
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('If all queries show "No results", there\'s still a bug.');
  console.log('If queries show different similarity scores, it\'s working! 🎉\n');
}

check();
