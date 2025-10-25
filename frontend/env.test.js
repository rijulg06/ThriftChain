// Environment Variables Test
// Run this with: node env.test.js

const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

console.log('🔍 Checking environment variables...\n');

const results = requiredVars.map(varName => {
  const value = process.env[varName];
  const exists = !!value;
  const isPlaceholder = exists && (value.includes('your_') || value.includes('xxxxx'));
  
  return {
    name: varName,
    exists,
    isPlaceholder,
    preview: value ? value.substring(0, 30) + '...' : undefined
  };
});

let allGood = true;

results.forEach(result => {
  if (!result.exists) {
    console.log(`❌ ${result.name} - NOT SET`);
    allGood = false;
  } else if (result.isPlaceholder) {
    console.log(`⚠️  ${result.name} - PLACEHOLDER VALUE`);
    console.log(`   Value: ${result.preview}`);
    allGood = false;
  } else {
    console.log(`✅ ${result.name} - SET`);
  }
});

console.log('');

if (allGood) {
  console.log('🎉 All environment variables are configured correctly!');
} else {
  console.log('⚠️  Please update your .env.local file with actual values.');
  console.log('   See frontend/SETUP.md for instructions.\n');
  console.log('💡 Tip: The .env.local file should be in the frontend/ directory');
  console.log('   Example: frontend/.env.local');
}

console.log('');
process.exit(allGood ? 0 : 1);
