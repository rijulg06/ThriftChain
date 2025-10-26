import { bcs } from '@mysten/sui/bcs';

console.log('=== Testing BCS Serialization ===');

// Test 1: String
try {
  const titleBytes = bcs.string().serialize('aaa').toBytes();
  console.log('✓ String serialization works');
  console.log('  Type:', titleBytes.constructor.name);
  console.log('  Length:', titleBytes.length);
  console.log('  Value:', Array.from(titleBytes));
} catch (e) {
  console.log('✗ String serialization failed:', e.message);
  console.log('Full error:', e);
}

// Test 2: u64
try {
  const priceBytes = bcs.u64().serialize(BigInt(900000000)).toBytes();
  console.log('✓ u64 serialization works');
  console.log('  Length:', priceBytes.length);
} catch (e) {
  console.log('✗ u64 serialization failed:', e.message);
}

// Test 3: Vector of strings
try {
  const blobIds = ['q28h9cmLojwI-3TIXQoA6xQxDvcDpdMyw6IohKQhN6o'];
  const vectorBytes = bcs.vector(bcs.string()).serialize(blobIds).toBytes();
  console.log('✓ Vector serialization works');
  console.log('  Length:', vectorBytes.length);
} catch (e) {
  console.log('✗ Vector serialization failed:', e.message);
}

// Test 4: Empty string (optional fields)
try {
  const emptyBytes = bcs.string().serialize('').toBytes();
  console.log('✓ Empty string serialization works');
  console.log('  Length:', emptyBytes.length);
} catch (e) {
  console.log('✗ Empty string serialization failed:', e.message);
}
