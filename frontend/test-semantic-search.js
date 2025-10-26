/**
 * Comprehensive Semantic Search Test
 *
 * This test:
 * 1. Indexes several test items with different descriptions
 * 2. Performs various searches to verify semantic understanding
 * 3. Shows search results ranked by relevance
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Test items with different semantics
const testItems = [
  {
    sui_object_id: '0xtest_leather_jacket_001',
    title: 'Vintage Leather Jacket',
    description: 'Classic brown leather motorcycle jacket from the 80s, excellent condition',
    images: []
  },
  {
    sui_object_id: '0xtest_denim_jeans_002',
    title: 'Levi\'s 501 Jeans',
    description: 'Blue denim jeans, size 32W 34L, slightly worn',
    images: []
  },
  {
    sui_object_id: '0xtest_winter_coat_003',
    title: 'Winter Parka',
    description: 'Warm black winter coat with fur hood, perfect for cold weather',
    images: []
  },
  {
    sui_object_id: '0xtest_running_shoes_004',
    title: 'Nike Running Shoes',
    description: 'Athletic sneakers for running and sports, size 10, barely used',
    images: []
  },
  {
    sui_object_id: '0xtest_summer_dress_005',
    title: 'Floral Summer Dress',
    description: 'Light and airy sundress with flower patterns, size M',
    images: []
  }
];

// Semantic search queries to test
const searchQueries = [
  {
    query: 'motorcycle jacket',
    expectedMatch: '0xtest_leather_jacket_001',
    reason: 'Should understand "motorcycle jacket" relates to "leather jacket"'
  },
  {
    query: 'pants',
    expectedMatch: '0xtest_denim_jeans_002',
    reason: 'Should understand "pants" = "jeans"'
  },
  {
    query: 'warm clothing',
    expectedMatch: '0xtest_winter_coat_003',
    reason: 'Should understand "warm" relates to "winter coat"'
  },
  {
    query: 'sneakers',
    expectedMatch: '0xtest_running_shoes_004',
    reason: 'Should understand "sneakers" = "running shoes"'
  },
  {
    query: 'floral clothing',
    expectedMatch: '0xtest_summer_dress_005',
    reason: 'Should understand "floral" relates to "flower patterns"'
  }
];

async function indexTestItem(item) {
  const response = await fetch('http://localhost:3000/api/ai/index-item', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  });

  const data = await response.json();
  return { success: response.ok, data };
}

async function searchItems(query) {
  const response = await fetch('http://localhost:3000/api/ai/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      similarityThreshold: 0.3,  // Lower threshold for better recall
      maxResults: 10,
      useCombined: true
    })
  });

  const data = await response.json();
  return data;
}

async function runTests() {
  console.log('🧪 Semantic Search Test Suite\n');
  console.log('='.repeat(60));

  // Step 1: Clean up old test items
  console.log('\n📝 Step 1: Cleaning up old test items...');
  const { error: deleteError } = await supabase
    .from('item_search_index')
    .delete()
    .like('sui_object_id', '0xtest_%');

  if (deleteError) {
    console.log('⚠️  Warning: Could not clean up:', deleteError.message);
  } else {
    console.log('✅ Old test items removed');
  }

  // Step 2: Index test items
  console.log('\n📝 Step 2: Indexing test items...');
  let indexedCount = 0;

  for (const item of testItems) {
    const result = await indexTestItem(item);
    if (result.success) {
      indexedCount++;
      console.log(`✅ Indexed: ${item.title}`);
    } else {
      console.log(`❌ Failed: ${item.title}`, result.data);
    }
  }

  console.log(`\n✅ Indexed ${indexedCount}/${testItems.length} items`);

  if (indexedCount === 0) {
    console.log('❌ No items indexed, cannot run search tests');
    return;
  }

  // Wait a moment for indexing to complete
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Step 3: Run semantic search tests
  console.log('\n📝 Step 3: Testing semantic search...\n');
  console.log('='.repeat(60));

  let passedTests = 0;
  let failedTests = 0;

  for (const test of searchQueries) {
    console.log(`\n🔍 Query: "${test.query}"`);
    console.log(`   Expected: ${test.reason}`);

    try {
      const searchResult = await searchItems(test.query);

      if (!searchResult.success) {
        console.log('   ❌ Search failed:', searchResult.error);
        failedTests++;
        continue;
      }

      if (searchResult.results.length === 0) {
        console.log('   ❌ No results found');
        failedTests++;
        continue;
      }

      console.log(`   Found ${searchResult.results.length} results:`);

      // Show top 3 results
      for (let i = 0; i < Math.min(3, searchResult.results.length); i++) {
        const itemId = searchResult.results[i];
        const item = testItems.find(t => t.sui_object_id === itemId);
        const isExpected = itemId === test.expectedMatch;

        console.log(`   ${i + 1}. ${isExpected ? '✅' : '  '} ${item ? item.title : itemId}`);
      }

      // Check if expected item is in top results
      const topResult = searchResult.results[0];
      if (topResult === test.expectedMatch) {
        console.log('   ✅ TEST PASSED - Expected item ranked #1');
        passedTests++;
      } else if (searchResult.results.includes(test.expectedMatch)) {
        console.log(`   ⚠️  TEST PARTIAL - Expected item found but not #1`);
        passedTests += 0.5;
        failedTests += 0.5;
      } else {
        console.log('   ❌ TEST FAILED - Expected item not found');
        failedTests++;
      }

    } catch (error) {
      console.log('   ❌ Error:', error.message);
      failedTests++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results:');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passedTests}/${searchQueries.length}`);
  console.log(`❌ Failed: ${failedTests}/${searchQueries.length}`);

  const percentage = Math.round((passedTests / searchQueries.length) * 100);
  console.log(`\n🎯 Success Rate: ${percentage}%`);

  if (percentage >= 80) {
    console.log('\n🎉 SEMANTIC SEARCH IS WORKING WELL!');
    console.log('The AI understands meaning and context, not just exact keywords.');
  } else if (percentage >= 50) {
    console.log('\n⚠️  SEMANTIC SEARCH IS PARTIALLY WORKING');
    console.log('Some semantic understanding but may need tuning.');
  } else {
    console.log('\n❌ SEMANTIC SEARCH NEEDS IMPROVEMENT');
    console.log('Results suggest embeddings may not be working correctly.');
  }

  console.log('\n💡 To test manually:');
  console.log('   1. Go to http://localhost:3000/listings');
  console.log('   2. Try searching: "motorcycle jacket", "pants", "warm clothing"');
  console.log('   3. See if results make semantic sense!\n');
}

// Run the tests
runTests().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
