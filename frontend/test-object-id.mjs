import { Transaction } from '@mysten/sui/transactions';

const tx = new Transaction();

console.log('=== Testing tx.object() with various inputs ===\n');

// Test 1: Valid object ID
try {
  const result = tx.object('0x6');
  console.log('✓ Valid object ID (0x6) works');
} catch (e) {
  console.log('✗ Valid object ID failed:', e.message);
}

// Test 2: Empty string
try {
  const result = tx.object('');
  console.log('✓ Empty string works (unexpected!)');
} catch (e) {
  console.log('✗ Empty string failed:', e.message);
}

// Test 3: undefined
try {
  const result = tx.object(undefined);
  console.log('✓ undefined works (unexpected!)');
} catch (e) {
  console.log('✗ undefined failed:', e.message);
}

// Test 4: null
try {
  const result = tx.object(null);
  console.log('✓ null works (unexpected!)');
} catch (e) {
  console.log('✗ null failed:', e.message);
}

// Test 5: Invalid short ID
try {
  const result = tx.object('0x123');
  console.log('✓ Short object ID (0x123) works');
} catch (e) {
  console.log('✗ Short object ID failed:', e.message);
}

// Test 6: Full 64-char address
try {
  const fullId = '0xf8bf13db14dc7fb2beba747d9132f19e45f1317bc46081ec0d8915148caae403';
  const result = tx.object(fullId);
  console.log('✓ Full 64-char object ID works');
} catch (e) {
  console.log('✗ Full object ID failed:', e.message);
}
