import { Transaction } from '@mysten/sui/transactions';

const tx = new Transaction();

console.log('=== Testing tx.pure.vector signature ===');

// Test 1: Without length option
try {
  const result1 = tx.pure.vector('string', ['test1', 'test2']);
  console.log('✓ Without length works');
} catch (e) {
  console.log('✗ Without length failed:', e.message);
}

// Test 2: With length as third parameter (number)
try {
  const result2 = tx.pure.vector('string', ['test1', 'test2'], 2);
  console.log('✓ With length as number works');
} catch (e) {
  console.log('✗ With length as number failed:', e.message);
}

// Test 3: With length as object
try {
  const result3 = tx.pure.vector('string', ['test1', 'test2'], { length: 2 });
  console.log('✓ With length as object works');
} catch (e) {
  console.log('✗ With length as object failed:', e.message);
}

// Test 4: Check what tx.pure.vector actually is
console.log('\n=== Function signature ===');
console.log('tx.pure.vector type:', typeof tx.pure.vector);
console.log('tx.pure.vector toString:', tx.pure.vector.toString().substring(0, 200));
