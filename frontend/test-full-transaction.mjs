import { Transaction } from '@mysten/sui/transactions';

console.log('=== Testing Full Transaction Build ===\n');

// Test 1: Valid transaction
try {
  const tx = new Transaction();
  tx.moveCall({
    target: '0xf8bf13db14dc7fb2beba747d9132f19e45f1317bc46081ec0d8915148caae403::thriftchain::create_item',
    arguments: [
      tx.object('0xebb31ee7b3409e480b8c71f1ffb9daaf4de6345c6832841c0ca45d5582f034bf'),
      tx.object('0x64a2780f79ee0474202dbe85d0a1a2675c89cbb826906b2d221d4dfd4ff7a333'),
      tx.pure.string('Test Title'),
      tx.pure.string('Test Description'),
      tx.pure.u64(BigInt(1000000000)),
      tx.pure.string('Clothing'),
      tx.pure.string('New'),
      tx.pure.string(''),  // empty brand
      tx.pure.string(''),  // empty size
      tx.pure.string(''),  // empty color
      tx.pure.string(''),  // empty material
      tx.object('0x6'),
    ],
  });
  console.log('✓ Valid transaction built successfully');
} catch (e) {
  console.log('✗ Valid transaction failed:', e.message);
  console.log('Stack:', e.stack);
}

// Test 2: Transaction with empty object ID
try {
  const tx = new Transaction();
  tx.moveCall({
    target: '0xf8bf13db14dc7fb2beba747d9132f19e45f1317bc46081ec0d8915148caae403::thriftchain::create_item',
    arguments: [
      tx.object(''),  // EMPTY!
      tx.object('0x64a2780f79ee0474202dbe85d0a1a2675c89cbb826906b2d221d4dfd4ff7a333'),
      tx.pure.string('Test Title'),
      tx.pure.string('Test Description'),
      tx.pure.u64(BigInt(1000000000)),
      tx.pure.string('Clothing'),
      tx.pure.string('New'),
      tx.pure.string(''),
      tx.pure.string(''),
      tx.pure.string(''),
      tx.pure.string(''),
      tx.object('0x6'),
    ],
  });
  console.log('✓ Transaction with empty object ID works (unexpected!)');
} catch (e) {
  console.log('✗ Transaction with empty object ID failed:', e.message);
  console.log('Error type:', e.constructor.name);
}
