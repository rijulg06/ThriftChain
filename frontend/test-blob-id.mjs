import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';

const blobId = 'q28h9cmLojwI-3TIXQoA6xQxDvcDpdMyw6IohKQhN6o';

console.log('Blob ID:', blobId);
console.log('Type:', typeof blobId);
console.log('Length:', blobId.length);
console.log('Bytes:', new TextEncoder().encode(blobId).length);

const tx = new Transaction();

console.log('\n=== Test 1: Direct array ===');
try {
  const result = tx.pure.vector('string', [blobId]);
  console.log('✓ Works');
} catch (e) {
  console.log('✗ Failed:', e.message);
  console.log('Stack:', e.stack);
}

console.log('\n=== Test 2: BCS serialization ===');
try {
  const serialized = bcs.vector(bcs.string()).serialize([blobId]);
  console.log('✓ Works, length:', serialized.toBytes().length);
} catch (e) {
  console.log('✗ Failed:', e.message);
}

console.log('\n=== Test 3: Check each character ===');
for (let i = 0; i < blobId.length; i++) {
  const char = blobId[i];
  const code = blobId.charCodeAt(i);
  if (code > 127) {
    console.log(`Non-ASCII at position ${i}: '${char}' (code ${code})`);
  }
}
