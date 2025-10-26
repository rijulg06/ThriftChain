import { bcs } from '@mysten/sui/bcs';

console.log('BCS available:', !!bcs);
console.log('bcs.string:', typeof bcs.string);
console.log('bcs.vector:', typeof bcs.vector);
console.log('bcs.u64:', typeof bcs.u64);

// Test serialization
try {
  const stringBytes = bcs.string().serialize('test');
  console.log('✓ String serialization works');
  console.log('  Result type:', stringBytes.constructor.name);
  console.log('  Has toBytes:', typeof stringBytes.toBytes);
  
  if (typeof stringBytes.toBytes === 'function') {
    const bytes = stringBytes.toBytes();
    console.log('  Bytes:', Array.from(bytes));
  } else {
    console.log('  Direct value:', stringBytes);
  }
} catch (e) {
  console.log('✗ String serialization failed:', e.message);
}

// Test vector
try {
  const vectorBytes = bcs.vector(bcs.string()).serialize(['test1', 'test2']);
  console.log('✓ Vector serialization works');
  console.log('  Result type:', vectorBytes.constructor.name);
  
  if (typeof vectorBytes.toBytes === 'function') {
    const bytes = vectorBytes.toBytes();
    console.log('  Bytes length:', bytes.length);
  }
} catch (e) {
  console.log('✗ Vector serialization failed:', e.message);
}
