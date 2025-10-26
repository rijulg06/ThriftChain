import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';

const tx = new Transaction();

console.log('=== tx.pure API ===');
console.log('tx.pure.vector:', typeof tx.pure.vector);
console.log('tx.pure.string:', typeof tx.pure.string);

console.log('\n=== bcs API ===');  
console.log('bcs.vector:', typeof bcs.vector);
console.log('bcs.string:', typeof bcs.string);
console.log('bcs.String:', typeof bcs.String);

try {
  const vec = bcs.vector(bcs.string());
  const result = vec.serialize(['hello', 'world']);
  console.log('\n✓ bcs.vector(bcs.string()).serialize() works');
  console.log('Has toBytes:', typeof result.toBytes);
} catch (e) {
  console.log('\n✗ Failed:', e.message);
}
