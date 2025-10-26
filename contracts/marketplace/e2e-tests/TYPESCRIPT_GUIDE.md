# TypeScript E2E Test Implementation Guide

This guide explains the TypeScript implementation of the ThriftChain marketplace E2E tests.

## 📁 Files Created

### Core Implementation
1. **`list-item.ts`** - Demo version showing transaction structure
2. **`list-item-full.ts`** - Complete implementation with keypair signing
3. **`package.json`** - NPM dependencies and scripts
4. **`tsconfig.json`** - TypeScript configuration

### Documentation
5. **`README.md`** - Complete documentation
6. **`QUICKSTART.md`** - Quick start guide
7. **`TYPESCRIPT_GUIDE.md`** - This file

### Utilities
8. **`export-keypair.sh`** - Helper script to export keypairs
9. **`.gitignore`** - Ignore sensitive files

## 🎯 Two Implementations

### 1. Demo Version (`list-item.ts`)

**Purpose:** Shows transaction structure without actual signing

**When to use:**
- Learning how transactions are constructed
- Understanding the SDK API
- When you prefer using Sui CLI for signing

**Run:**
```bash
npm run list-item         # devnet
npm run list-item:testnet # testnet
```

### 2. Full Version (`list-item-full.ts`)

**Purpose:** Complete implementation with keypair signing

**When to use:**
- Automated testing
- CI/CD pipelines
- Integration with other TypeScript tools
- When you need programmatic control

**Run:**
```bash
# With keypair file
tsx list-item-full.ts --keypair keypair.json --testnet

# With environment variable
PRIVATE_KEY="base64_key" tsx list-item-full.ts --testnet

# Using npm scripts
npm run list-item-full:testnet
```

## 🔑 Keypair Management

### Option 1: Export from Sui CLI (Recommended)

Use the helper script:
```bash
./export-keypair.sh
```

Or manually:
```bash
sui keytool export --key-identity <address> --json > keypair.json
```

### Option 2: Environment Variable

```bash
export PRIVATE_KEY="your_base64_encoded_key"
tsx list-item-full.ts --testnet
```

### Option 3: Create New Keypair

```typescript
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const keypair = new Ed25519Keypair();
console.log('Address:', keypair.toSuiAddress());
console.log('Private Key:', keypair.export().privateKey);
```

## 📦 SDK Usage Examples

### 1. Creating a Transaction

```typescript
import { Transaction } from '@mysten/sui/transactions';

const tx = new Transaction();

tx.moveCall({
  target: `${packageId}::${module}::${function}`,
  arguments: [
    tx.object(objectId),           // Object reference
    tx.pure.string('Hello'),       // String
    tx.pure.u64(1000000000),       // Number (u64)
    tx.pure.vector('string', [...]), // Vector
  ],
});

tx.setGasBudget(100000000);
```

### 2. Signing and Executing

```typescript
import { SuiClient } from '@mysten/sui/client';

const client = new SuiClient({ 
  url: 'https://fullnode.testnet.sui.io:443' 
});

const result = await client.signAndExecuteTransaction({
  transaction: tx,
  signer: keypair,
  options: {
    showEffects: true,
    showEvents: true,
    showObjectChanges: true,
  },
});
```

### 3. Parsing Results

```typescript
// Get transaction status
const status = result.effects?.status?.status;

// Find events
for (const event of result.events || []) {
  if (event.type.includes('ItemCreated')) {
    const itemId = event.parsedJson?.item_id;
    console.log('Item created:', itemId);
  }
}

// Find created objects
for (const change of result.objectChanges || []) {
  if (change.type === 'created') {
    console.log('Created object:', change.objectId);
  }
}
```

## 🔧 Architecture

### Transaction Flow

```
1. Load Config (testnet_ids.txt)
   ↓
2. Load Keypair (from file or env)
   ↓
3. Build Transaction
   - moveCall() with arguments
   - setGasBudget()
   ↓
4. Sign and Execute
   - client.signAndExecuteTransaction()
   ↓
5. Parse Results
   - Extract events
   - Find created objects
   - Validate outcomes
   ↓
6. Display Results
   - Pretty console output
   - Transaction explorer links
```

### Key Components

```typescript
// 1. Config Interface
interface MarketplaceConfig {
  MARKETPLACE_PACKAGE_ID: string;
  MARKETPLACE_OBJECT_ID: string;
  ITEMCAP_OBJECT_ID: string;
  CLOCK_OBJECT_ID: string;
}

// 2. Load from file
function loadConfig(useTestnet: boolean): MarketplaceConfig {
  // Parse testnet_ids.txt or devnet_ids.txt
}

// 3. Create listing
async function createListing(
  client: SuiClient,
  config: MarketplaceConfig,
  params: ItemParams,
  keypair: Ed25519Keypair
): Promise<any> {
  // Build and execute transaction
}

// 4. Parse results
function parseResults(result: any): void {
  // Extract and validate results
}
```

## 🎨 Output Formatting

The scripts use ANSI color codes for pretty output:

```typescript
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',   // Success
  red: '\x1b[31m',     // Errors
  yellow: '\x1b[33m',  // Warnings
  blue: '\x1b[36m',    // Info
};

console.log(`${colors.green}✅ Success${colors.reset}`);
```

## 🧪 Testing Strategy

### Unit Test Pattern
```typescript
describe('TC-LIST-001', () => {
  it('should create listing with valid parameters', async () => {
    const result = await createListing(client, config, params, keypair);
    expect(result.effects?.status?.status).toBe('success');
    expect(result.events).toContainEvent('ItemCreated');
  });
});
```

### Integration Test Pattern
```typescript
async function runTestSuite() {
  // 1. Create item
  const itemResult = await createListing(...);
  const itemId = extractItemId(itemResult);
  
  // 2. Make offer
  const offerResult = await makeOffer(itemId, ...);
  
  // 3. Accept offer
  const acceptResult = await acceptOffer(...);
  
  // Validate entire flow
}
```

## 📊 Comparison Table

| Feature | Shell Script | TypeScript Demo | TypeScript Full |
|---------|-------------|-----------------|-----------------|
| Setup Complexity | Low | Medium | Medium |
| Signing | Sui CLI | Sui CLI | Keypair |
| Type Safety | None | Full | Full |
| Result Parsing | grep/sed | SDK | SDK |
| Integration | Limited | Easy | Easy |
| Automation | Medium | Easy | Easy |
| CI/CD Ready | Partial | No | Yes |

## 🚀 Advanced Usage

### 1. Batch Operations

```typescript
// Create multiple listings in parallel
const promises = items.map(item => 
  createListing(client, config, item, keypair)
);
const results = await Promise.all(promises);
```

### 2. Error Handling

```typescript
try {
  const result = await createListing(...);
  parseResults(result);
} catch (error: any) {
  if (error.message?.includes('Insufficient gas')) {
    console.log('💡 Request gas from faucet');
  } else if (error.message?.includes('ObjectNotFound')) {
    console.log('❌ Object not found. Check IDs.');
  } else {
    console.error('❌ Unknown error:', error);
  }
}
```

### 3. Dry Run

```typescript
// Build transaction without executing
const tx = buildTransaction(config, params);

// Inspect transaction
const dryRunResult = await client.dryRunTransaction({
  transactionBlock: await tx.build({ client }),
});

console.log('Gas estimate:', dryRunResult.effects.gasUsed);
```

### 4. Custom RPC

```typescript
const client = new SuiClient({ 
  url: process.env.CUSTOM_RPC_URL || 'https://fullnode.testnet.sui.io:443'
});
```

## 📝 Best Practices

1. **Security**
   - Never commit private keys
   - Use test accounts only
   - Rotate keys regularly

2. **Gas Management**
   - Check balance before operations
   - Set appropriate gas budgets
   - Handle insufficient gas errors

3. **Error Handling**
   - Catch specific error types
   - Provide helpful error messages
   - Log for debugging

4. **Validation**
   - Verify transaction status
   - Check event emissions
   - Validate object creation

5. **Documentation**
   - Document test cases
   - Explain expected results
   - Provide examples

## 🔗 Resources

- [Sui TypeScript SDK](https://sdk.mystenlabs.com/typescript)
- [Sui Move Docs](https://docs.sui.io/build/move)
- [Transaction Building Guide](https://sdk.mystenlabs.com/typescript/transaction-building)
- [Keypair Management](https://sdk.mystenlabs.com/typescript/cryptography)

## 💡 Next Steps

1. **Run the tests**
   ```bash
   cd contracts/marketplace/e2e-tests
   npm install
   ./export-keypair.sh
   npm run list-item-full:testnet
   ```

2. **Extend the tests**
   - Add more test cases (TC-LIST-002, TC-OFFER-001, etc.)
   - Implement test suites
   - Add validation helpers

3. **Integrate**
   - Add to CI/CD pipeline
   - Create test reports
   - Monitor gas usage

## 🎉 Conclusion

You now have a complete TypeScript implementation of the E2E tests that:
- ✅ Uses the official Sui SDK
- ✅ Provides type safety
- ✅ Has rich result parsing
- ✅ Includes comprehensive documentation
- ✅ Can run in automated environments

Happy testing! 🚀

