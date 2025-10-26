/**
 * Test script for AI search functionality
 * Run with: node test-ai-search.js
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

console.log('🔍 Testing AI Search Setup\n');
console.log('Environment Variables:');
console.log('- SUPABASE_URL:', SUPABASE_URL ? '✓ Set' : '✗ Missing');
console.log('- SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing');
console.log('- SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? '✓ Set' : '✗ Missing');
console.log('- GEMINI_API_KEY:', GEMINI_API_KEY ? '✓ Set' : '✗ Missing');
console.log('');

async function testSupabaseConnection() {
  console.log('1️⃣ Testing Supabase Connection...');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    // Try to query the table
    const { data, error } = await supabase
      .from('item_search_index')
      .select('sui_object_id')
      .limit(1);

    if (error) {
      if (error.message.includes('does not exist')) {
        console.log('❌ Table "item_search_index" does not exist in Supabase');
        console.log('   You need to run supabase-schema.sql in Supabase SQL Editor');
        return false;
      }
      console.log('❌ Supabase error:', error.message);
      return false;
    }

    console.log('✅ Supabase connection successful');
    console.log(`   Table exists with ${data?.length || 0} items indexed`);
    return true;
  } catch (err) {
    console.log('❌ Failed to connect to Supabase:', err.message);
    return false;
  }
}

async function testSupabaseFunction() {
  console.log('\n2️⃣ Testing Supabase search_items_by_embedding function...');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    // Create a dummy 768-dimensional vector
    const dummyVector = Array(768).fill(0);
    dummyVector[0] = 1; // Just make it non-zero

    const { data, error } = await supabase.rpc('search_items_by_embedding', {
      query_embedding: dummyVector,
      similarity_threshold: 0.5,
      max_results: 10,
      use_combined: true
    });

    if (error) {
      if (error.message.includes('does not exist')) {
        console.log('❌ Function "search_items_by_embedding" does not exist');
        console.log('   You need to run supabase-schema.sql in Supabase SQL Editor');
        return false;
      }
      console.log('❌ Function error:', error.message);
      return false;
    }

    console.log('✅ Search function exists and works');
    console.log(`   Found ${data?.length || 0} results`);
    return true;
  } catch (err) {
    console.log('❌ Failed to call search function:', err.message);
    return false;
  }
}

async function testGeminiAPI() {
  console.log('\n3️⃣ Testing Gemini API...');

  if (!GEMINI_API_KEY) {
    console.log('❌ GEMINI_API_KEY not set');
    return false;
  }

  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({ model: 'models/text-embedding-004' });
    const result = await model.embedContent('test');

    if (!result.embedding || !result.embedding.values) {
      console.log('❌ Invalid response from Gemini API');
      return false;
    }

    const embedding = result.embedding.values;
    console.log('✅ Gemini API works');
    console.log(`   Generated ${embedding.length}-dimensional embedding`);

    if (embedding.length !== 768) {
      console.log(`   ⚠️  WARNING: Expected 768 dimensions, got ${embedding.length}`);
      return false;
    }

    return true;
  } catch (err) {
    console.log('❌ Gemini API failed:', err.message);
    if (err.message.includes('API key')) {
      console.log('   Check if your GEMINI_API_KEY is valid');
    }
    return false;
  }
}

async function testIndexingAPI() {
  console.log('\n4️⃣ Testing Index Item API...');

  try {
    const response = await fetch('http://localhost:3001/api/ai/index-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sui_object_id: 'test_object_id',
        title: 'Test Item',
        description: 'This is a test item',
        images: [] // Empty for now
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.log('❌ Index API failed:', error.message || error.error);
      return false;
    }

    const result = await response.json();
    console.log('✅ Index API works');
    console.log('   Response:', JSON.stringify(result, null, 2));
    return true;
  } catch (err) {
    console.log('❌ Failed to call Index API:', err.message);
    console.log('   Make sure Next.js dev server is running on port 3001');
    return false;
  }
}

async function testSearchAPI() {
  console.log('\n5️⃣ Testing Search API...');

  try {
    const response = await fetch('http://localhost:3001/api/ai/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'test jacket',
        similarityThreshold: 0.5,
        maxResults: 10,
        useCombined: true
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.log('❌ Search API failed:', error.message || error.error);
      return false;
    }

    const result = await response.json();
    console.log('✅ Search API works');
    console.log(`   Found ${result.count} results`);
    return true;
  } catch (err) {
    console.log('❌ Failed to call Search API:', err.message);
    console.log('   Make sure Next.js dev server is running on port 3001');
    return false;
  }
}

async function runAllTests() {
  const results = {
    supabase: await testSupabaseConnection(),
    function: false,
    gemini: false,
    indexAPI: false,
    searchAPI: false
  };

  if (results.supabase) {
    results.function = await testSupabaseFunction();
  }

  results.gemini = await testGeminiAPI();

  // Test APIs only if server is running
  try {
    const serverCheck = await fetch('http://localhost:3001/');
    results.indexAPI = await testIndexingAPI();
    results.searchAPI = await testSearchAPI();
  } catch (err) {
    console.log('\n⚠️  Next.js dev server not running on port 3001');
    console.log('   Start with: npm run dev');
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results Summary:');
  console.log('='.repeat(50));
  console.log(`Supabase Connection: ${results.supabase ? '✅' : '❌'}`);
  console.log(`Supabase Function:   ${results.function ? '✅' : '❌'}`);
  console.log(`Gemini API:          ${results.gemini ? '✅' : '❌'}`);
  console.log(`Index API:           ${results.indexAPI ? '✅' : '❌'}`);
  console.log(`Search API:          ${results.searchAPI ? '✅' : '❌'}`);
  console.log('='.repeat(50));

  const allPassed = Object.values(results).every(r => r);

  if (!allPassed) {
    console.log('\n❌ Some tests failed. Fix the issues above before creating items.\n');

    if (!results.supabase || !results.function) {
      console.log('🔧 To fix Supabase issues:');
      console.log('   1. Go to: https://app.supabase.com/project/ugqihaluigqeldjxrars/sql');
      console.log('   2. Click "New Query"');
      console.log('   3. Copy entire contents of supabase-schema.sql');
      console.log('   4. Click "Run"\n');
    }
  } else {
    console.log('\n✅ All tests passed! AI search is ready to use.\n');
  }
}

runAllTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
