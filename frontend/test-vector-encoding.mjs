import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';

const tx = new Transaction();

console.log('=== Testing tx.pure.vector ===');

// Test 1: Empty array
try {
  const result = tx.pure.vector('string', []);
  console.log('✓ Empty array works');
} catch (e) {
  console.log('✗ Empty array failed:', e.message);
}

// Test 2: Array with strings
try {
  const result = tx.pure.vector('string', ['q28h9cmLojwI-3TIXQoA6xQxDvcDpdMyw6IohKQhN6o']);
  console.log('✓ Array with blob ID works');
} catch (e) {
  console.log('✗ Array with blob ID failed:', e.message);
  console.log('Full error:', e);
}

console.log('\n=== Testing bcs.vector ===');

// Test with bcs
try {
  const blobIds = ['q28h9cmLojwI-3TIXQoA6xQxDvcDpdMyw6IohKQhN6o'];
  const serialized = bcs.vector(bcs.string()).serialize(blobIds).toBytes();
  console.log('✓ BCS serialization works');
  console.log('  Result type:', serialized.constructor.name);
  console.log('  Result length:', serialized.length);
  
  // Try using it in tx.pure
  const result = tx.pure(serialized);
  console.log('✓ tx.pure(bcs serialized) works');
} catch (e) {
  console.log('✗ BCS method failed:', e.message);
  console.log('Full error:', e);
}
