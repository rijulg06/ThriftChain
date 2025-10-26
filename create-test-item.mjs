/**
 * Create a persistent test item (don't clean up)
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

console.log('📦 Creating persistent test item...\n');

async function create() {
  try {
    const title = 'Vintage Leather Jacket';
    const description = 'Brown leather jacket, size M';

    console.log(`Title: ${title}`);
    console.log(`Description: ${description}\n`);

    console.log('Generating embeddings...');
    const titleEmb = await embedText(title);
    const descEmb = await embedText(description);
    const combinedEmb = await embedText(`${title}. ${description}`);

    console.log(`✓ Title embedding: ${titleEmb.length} dims`);
    console.log(`✓ Description embedding: ${descEmb.length} dims`);
    console.log(`✓ Combined embedding: ${combinedEmb.length} dims`);
    console.log(`✓ First 3 values of combined: [${combinedEmb.slice(0, 3).map(v => v.toFixed(3)).join(', ')}...]`);
    console.log();

    console.log('Storing in Supabase...');
    const { data, error } = await supabaseAdmin.from('item_search_index').upsert({
      sui_object_id: '0xPERSISTENT_TEST_JACKET',
      title_embedding: titleEmb,
      description_embedding: descEmb,
      image_embedding: titleEmb,
      combined_embedding: combinedEmb,
      indexed_at: new Date().toISOString(),
    }, {
      onConflict: 'sui_object_id',
    }).select();

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log('✅ Item created successfully!\n');
    console.log('Item ID: 0xPERSISTENT_TEST_JACKET\n');
    console.log('Now run this SQL in Supabase to check the data:');
    console.log('```sql');
    console.log('SELECT');
    console.log('  sui_object_id,');
    console.log('  array_length(combined_embedding::real[], 1) as vector_length,');
    console.log('  combined_embedding IS NULL as is_null');
    console.log('FROM item_search_index');
    console.log('WHERE sui_object_id = \'0xPERSISTENT_TEST_JACKET\';');
    console.log('```');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

create();
