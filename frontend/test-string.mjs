import { Transaction } from '@mysten/sui/transactions';

const tx = new Transaction();

console.log('=== Testing tx.pure.string ===');

// Test 1: Simple string
try {
  const result = tx.pure.string('Test Title');
  console.log('✓ Simple string works');
} catch (e) {
  console.log('✗ Simple string failed:', e.message);
  console.log('Full error:', e);
}

// Test 2: String with special characters
try {
  const result = tx.pure.string('Vintage Denim Jacket - Size M');
  console.log('✓ String with special characters works');
} catch (e) {
  console.log('✗ String with special characters failed:', e.message);
}

// Test 3: Multiple strings in sequence
try {
  tx.pure.string('Title');
  tx.pure.string('Description here');
  tx.pure.u64(BigInt(1000000000));
  tx.pure.string('Category');
  console.log('✓ Multiple strings in sequence works');
} catch (e) {
  console.log('✗ Multiple strings failed:', e.message);
  console.log('Full error:', e);
}

console.log('\n=== Testing in moveCall context ===');

// Test 4: In a moveCall-like structure
try {
  const tx2 = new Transaction();
  const args = [
    tx2.object('0x6'),
    tx2.object('0x123'),
    tx2.pure.string('Title'),
    tx2.pure.string('Description'),
    tx2.pure.u64(BigInt(1000000000)),
  ];
  console.log('✓ Arguments array construction works');
  console.log('  Args:', args.length);
} catch (e) {
  console.log('✗ moveCall context failed:', e.message);
  console.log('Full error:', e);
}
