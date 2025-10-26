# ThriftChain E2E Tests - TypeScript Edition

This directory contains end-to-end tests for the ThriftChain marketplace written in TypeScript using the Sui SDK.

## Prerequisites

- Node.js 18+ and npm
- A Sui wallet with testnet/devnet SUI tokens
- The marketplace contract deployed (IDs in `testnet_ids.txt` or `devnet_ids.txt`)

## Installation

```bash
# Install dependencies
npm install
```

## Scripts

### 1. `list-item.ts` (Demo Version)

A demonstration script that shows the structure but requires Sui CLI for actual signing.

**Usage:**
```bash
# Run on devnet
npm run list-item

# Run on testnet
npm run list-item:testnet
```

This script demonstrates the transaction structure but falls back to suggesting the shell script version since it doesn't include keypair handling.

### 2. `list-item-full.ts` (Full Implementation)

A complete implementation that can sign and execute transactions using a keypair.

**Usage:**

#### Method 1: Using Environment Variable

```bash
# Export your private key as base64
export PRIVATE_KEY="your_base64_encoded_private_key"

# Run on testnet
npm run list-item-full:testnet

# Run on devnet
npm run list-item-full
```

#### Method 2: Using Keypair File

First, export your keypair from Sui CLI:

```bash
# Export from Sui CLI
sui keytool export --key-identity <your-address> --json > keypair.json

# Run the test
tsx list-item-full.ts --keypair keypair.json --testnet
```

**Command Line Options:**

- `--testnet` or `-t`: Use testnet instead of devnet
- `--keypair <path>`: Path to keypair JSON file
- `--help` or `-h`: Show help message

## Configuration Files

### `testnet_ids.txt`
Contains deployed contract addresses for testnet:
- `MARKETPLACE_PACKAGE_ID`: The deployed package ID
- `MARKETPLACE_OBJECT_ID`: The marketplace shared object
- `ITEMCAP_OBJECT_ID`: The admin capability object
- `CLOCK_OBJECT_ID`: Sui's standard clock object (0x6)

### `devnet_ids.txt`
Same structure as testnet_ids.txt but for devnet deployment.

## Test Case: TC-LIST-001

**Description:** List an item with valid fields (price, description)

**Expected Result:** 
- Listing created with unique ID
- Ownership bound to seller
- ItemCreated event emitted

**Test Parameters:**
- Title: "Vintage Leather Jacket - Test Item"
- Price: 5 SUI (5,000,000,000 MIST)
- Category: Clothing
- Condition: Excellent
- Plus additional metadata fields

## Output

The scripts provide detailed console output with:
- ✅ Successful operations (green)
- ❌ Failed operations (red)
- ⚠️ Warnings (yellow)
- 🔍 Validation results
- 📊 Transaction details (digest, gas used, etc.)
- 💡 Next steps and suggestions

## Getting Testnet/Devnet Tokens

If you need testnet or devnet SUI tokens:

```bash
# Request from faucet
curl --location --request POST 'https://faucet.testnet.sui.io/gas' \
  --header 'Content-Type: application/json' \
  --data-raw '{"FixedAmountRequest":{"recipient":"YOUR_ADDRESS"}}'
```

Or visit: https://faucet.sui.io/

## Exporting Your Keypair

To export your keypair from the Sui CLI:

```bash
# List your addresses
sui client addresses

# Export a specific address's keypair
sui keytool export --key-identity <your-address> --json > keypair.json
```

**⚠️ Security Warning:** 
- Never commit `keypair.json` to version control
- Never share your private key
- Use test accounts only for testing
- The `keypair.json` is already in `.gitignore`

## Architecture

### Dependencies
- `@mysten/sui`: Official Sui TypeScript SDK
- `tsx`: TypeScript execution engine
- `dotenv`: Environment variable management

### Key Components

1. **Config Loader**: Parses `*_ids.txt` files to load contract addresses
2. **Keypair Loader**: Loads Ed25519 keypair from file or environment
3. **Transaction Builder**: Constructs Move calls using the Transaction API
4. **Result Parser**: Extracts and validates transaction results
5. **Pretty Printer**: Colored console output for better readability

## Comparison with Shell Scripts

### Shell Script Version (`cases/TC-LIST-001.sh`)
- ✅ Uses Sui CLI directly (simpler setup)
- ✅ No dependency management needed
- ❌ Limited parsing and validation capabilities
- ❌ Harder to integrate with other tools

### TypeScript Version (`list-item-full.ts`)
- ✅ Type-safe transaction building
- ✅ Rich SDK for result parsing
- ✅ Easy to integrate with other TS/JS tools
- ✅ Better error handling and validation
- ❌ Requires Node.js and npm setup
- ❌ Keypair management needed

## Troubleshooting

### "Missing required configuration fields"
- Ensure `testnet_ids.txt` or `devnet_ids.txt` exists
- Check that all required IDs are present and properly formatted

### "No keypair provided"
- Set `PRIVATE_KEY` environment variable, or
- Use `--keypair` flag with path to keypair file

### "Insufficient gas"
- Request more tokens from the faucet
- Check your balance: `sui client gas`

### "RPC Error" or network issues
- Check your internet connection
- Try a different RPC endpoint
- Verify the network (testnet/devnet) matches your deployment

## Next Steps

After successfully running TC-LIST-001:

1. Copy the generated `ITEM_ID` to `testnet_ids.txt`:
   ```
   ITEM_ID_TC_LIST_001="0x..."
   ```

2. Run additional test cases (to be implemented):
   - TC-LIST-002: Test listing validation
   - TC-LIST-003: Test listing with edge cases
   - TC-OFFER-001: Test making offers
   - TC-ESCROW-001: Test escrow creation

## Development

To add more test cases:

1. Copy `list-item-full.ts` as a template
2. Modify the test parameters and Move call target
3. Update the validation logic for your expected results
4. Add npm scripts to `package.json`
5. Document in this README

## Resources

- [Sui TypeScript SDK Documentation](https://sdk.mystenlabs.com/typescript)
- [Sui Move Documentation](https://docs.sui.io/build/move)
- [ThriftChain Documentation](../../README.md)

## License

Same as parent project.
