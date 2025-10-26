const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

(async () => {
  console.log('🔍 Checking embeddings...\n');

  const { data: items, error } = await supabase
    .from('item_search_index')
    .select('*');

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  console.log(`Total items: ${items.length}\n`);

  items.forEach((item, i) => {
    console.log(`${i+1}. ${item.sui_object_id}`);
    console.log(`   Title embedding: ${item.title_embedding ? 'EXISTS' : 'NULL'}`);
    console.log(`   Description embedding: ${item.description_embedding ? 'EXISTS' : 'NULL'}`);
    console.log(`   Image embedding: ${item.image_embedding ? 'EXISTS' : 'NULL'}`);
    console.log(`   Combined embedding: ${item.combined_embedding ? 'EXISTS' : 'NULL'}`);

    // Check if it's a string (pgvector format) or array
    if (item.combined_embedding) {
      const isString = typeof item.combined_embedding === 'string';
      console.log(`   Format: ${isString ? 'pgvector string' : 'array'}`);
      if (isString) {
        console.log(`   Length: ${item.combined_embedding.length} chars`);
      }
    }
    console.log();
  });
})();
