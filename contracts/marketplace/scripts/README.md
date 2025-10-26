# ThriftChain Smart Contract Scripts

This directory contains scripts for deploying, upgrading, and managing the ThriftChain smart contract on the Sui blockchain.

## Available Scripts

### 🚀 [`deploy.sh`](./deploy.sh)

**Purpose**: Initial deployment of the ThriftChain smart contract

**Usage**:
```bash
cd contracts/marketplace
./scripts/deploy.sh
```

**What it does**:
1. Builds the Move contract
2. Publishes to Sui network
3. Extracts and saves deployment IDs
4. Updates frontend environment variables
5. Creates `testnet_ids.txt` with all on-chain IDs

**When to use**: 
- First time deploying the contract
- Starting fresh on a new network
- Testing from scratch

📖 **[Full Documentation](./DEPLOYMENT.md)**

---

### 🔄 [`upgrade.sh`](./upgrade.sh)

**Purpose**: Upgrade existing contract while preserving on-chain data

**Usage**:
```bash
cd contracts/marketplace
./scripts/upgrade.sh
```

**What it does**:
1. Verifies existing deployment
2. Builds updated contract code
3. Upgrades using UpgradeCap
4. Updates Package ID in config files
5. Preserves all shared objects and data

**When to use**:
- Adding new features
- Fixing bugs
- Optimizing code
- Any code changes after initial deployment

📖 **[Full Documentation](./UPGRADE.md)**

---

### 📝 [`publish_thriftchain.sh`](./publish_thriftchain.sh)

**Purpose**: Update frontend environment variables from `testnet_ids.txt`

**Usage**:
```bash
cd contracts/marketplace
./scripts/publish_thriftchain.sh
```

**What it does**:
1. Reads IDs from `testnet_ids.txt`
2. Comments out old env vars in `frontend/.env.local`
3. Appends new env vars with timestamp

**When to use**:
- Manually syncing frontend after deployment
- Recovering from corrupted `.env.local`
- Switching between different deployments

---

## Quick Reference

| Task | Script | Prerequisites |
|------|--------|---------------|
| **First deployment** | `./scripts/deploy.sh` | Sui CLI, wallet with SUI |
| **Update contract code** | `./scripts/upgrade.sh` | Previous deployment, UpgradeCap |
| **Sync frontend config** | `./scripts/publish_thriftchain.sh` | `testnet_ids.txt` exists |

## Workflow

### Initial Setup

```bash
# 1. Deploy contract
./scripts/deploy.sh

# 2. Verify deployment
cat e2e-tests/testnet_ids.txt
cat frontend/.env.local

# 3. Test
cd e2e-tests && ./run_all_tests.sh

# 4. Start frontend
cd ../../frontend && npm run dev
```

### Making Changes

```bash
# 1. Edit contract
nano sources/thriftchain.move

# 2. Test locally
sui move test

# 3. Upgrade contract
./scripts/upgrade.sh

# 4. Test upgrade
cd e2e-tests && ./run_all_tests.sh

# 5. Restart frontend
cd ../../frontend
pkill -f "next dev" && npm run dev
```

### Switching Networks

```bash
# Change network
sui client switch --env mainnet  # or testnet, devnet

# Deploy to new network
./scripts/deploy.sh

# Frontend automatically uses new IDs
```

## Output Files

All scripts interact with these files:

### `e2e-tests/testnet_ids.txt`

Contains on-chain object IDs in shell-friendly format:

```bash
MARKETPLACE_PACKAGE_ID="0x..."
MARKETPLACE_OBJECT_ID="0x..."
ITEMCAP_OBJECT_ID="0x..."
CLOCK_OBJECT_ID="0x..."
OWNER_ADDRESS="0x..."
UPGRADE_CAP_OBJECT_ID="0x..."
```

- **Used by**: E2E tests, scripts, manual operations
- **Version controlled**: ❌ No (add to `.gitignore`)
- **Backed up**: ✅ Yes (automatic on each deploy/upgrade)

### `frontend/.env.local`

Contains Next.js environment variables:

```bash
NEXT_PUBLIC_THRIFTCHAIN_PACKAGE_ID=0x...
NEXT_PUBLIC_MARKETPLACE_ID=0x...
NEXT_PUBLIC_ITEM_CAP_ID=0x...
NEXT_PUBLIC_CLOCK_ID=0x...
NEXT_PUBLIC_MARKETPLACE_OWNER=0x...
```

- **Used by**: Frontend application
- **Version controlled**: ❌ No (add to `.gitignore`)
- **History**: ✅ Yes (old values commented with timestamps)

### `deploy.log` / `upgrade.log`

Full transaction output for debugging:

```
BUILDING ThriftChain
...
Transaction Digest: ...
Created Objects: ...
```

- **Used by**: Debugging, record-keeping
- **Version controlled**: ❌ No (temporary files)
- **Retention**: Overwritten on next deploy/upgrade

## Environment Variables Mapping

| `testnet_ids.txt` | `frontend/.env.local` | Description |
|-------------------|----------------------|-------------|
| `MARKETPLACE_PACKAGE_ID` | `NEXT_PUBLIC_THRIFTCHAIN_PACKAGE_ID` | Contract code |
| `MARKETPLACE_OBJECT_ID` | `NEXT_PUBLIC_MARKETPLACE_ID` | Shared marketplace |
| `ITEMCAP_OBJECT_ID` | `NEXT_PUBLIC_ITEM_CAP_ID` | Admin capability |
| `CLOCK_OBJECT_ID` | `NEXT_PUBLIC_CLOCK_ID` | Sui clock (0x6) |
| `OWNER_ADDRESS` | `NEXT_PUBLIC_MARKETPLACE_OWNER` | Deployer address |

## Prerequisites

### System Requirements

- **Sui CLI**: v1.0.0 or later
- **Bash**: 4.0 or later
- **Python 3**: For publish_thriftchain.sh
- **Git**: For version tracking

### Installation

```bash
# Install Sui CLI
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch mainnet sui

# Verify installation
sui --version

# Configure wallet
sui client
```

### Wallet Setup

```bash
# Create new wallet (if needed)
sui client new-address ed25519

# Get testnet tokens
sui client faucet

# Check balance
sui client gas

# Verify active network
sui client active-env  # Should show "testnet" or desired network
```

## Troubleshooting

### Scripts not executable

```bash
chmod +x scripts/*.sh
```

### Wrong network

```bash
# Check current network
sui client active-env

# Switch network
sui client switch --env testnet
```

### Insufficient gas

```bash
# Check balance
sui client gas

# Get more testnet SUI
sui client faucet

# Or visit https://discord.gg/sui and use !faucet <address>
```

### testnet_ids.txt missing

```bash
# If you have a deployment but lost the file, find objects:
sui client objects

# Look for:
# - Package objects (your contract)
# - Shared objects (Marketplace)
# - UpgradeCap (for upgrades)

# Reconstruct testnet_ids.txt manually
```

### Frontend not updating

```bash
# Verify .env.local was updated
cat frontend/.env.local

# Restart Next.js dev server
cd frontend
pkill -f "next dev"
npm run dev

# Clear browser cache
# Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
```

## Best Practices

### 1. Version Control

```bash
# Never commit sensitive files
echo "testnet_ids.txt" >> .gitignore
echo ".env.local" >> .gitignore
echo "*.log" >> .gitignore

# Tag deployments
git tag -a v1.0.0 -m "Initial deployment"
git tag -a v1.1.0 -m "Upgrade: Added feature X"
```

### 2. Backups

Scripts automatically backup files, but you should also:

```bash
# Backup important IDs
cp e2e-tests/testnet_ids.txt ~/backups/thriftchain-$(date +%Y%m%d).txt

# Or use git (in a private branch)
git checkout -b deployment-history
git add -f e2e-tests/testnet_ids.txt
git commit -m "Deployment $(date)"
```

### 3. Testing

```bash
# Always test after deploy/upgrade
cd e2e-tests
./run_all_tests.sh

# Test specific functionality
./cases/TC-ITEM-001.sh     # Item creation
./cases/TC-OFFER-001.sh    # Offer flow
./cases/TC-PAYMENT-001.sh  # Payment escrow
```

### 4. Documentation

Keep track of changes:

```bash
# Document in CHANGELOG.md
echo "## v1.1.0 - $(date +%Y-%m-%d)" >> CHANGELOG.md
echo "- Added counter-offer feature" >> CHANGELOG.md
echo "- Package ID: $(grep PACKAGE_ID testnet_ids.txt)" >> CHANGELOG.md
```

## Security

### ⚠️ Critical Objects

These objects grant special permissions:

1. **ItemCap** (`ITEMCAP_OBJECT_ID`)
   - Allows item management
   - Keep private and secure

2. **UpgradeCap** (`UPGRADE_CAP_OBJECT_ID`)
   - Allows contract upgrades
   - Essential for maintenance
   - Consider multi-sig for mainnet

### 🔒 Security Checklist

- [ ] Never commit `testnet_ids.txt` to public repos
- [ ] Never commit `.env.local` to version control
- [ ] Secure your Sui keystore (use hardware wallet for mainnet)
- [ ] Backup UpgradeCap ID securely
- [ ] Test thoroughly on testnet before mainnet
- [ ] Use multi-sig for mainnet admin capabilities
- [ ] Monitor deployments on Sui Explorer
- [ ] Keep audit logs of all deployments/upgrades

## Network-Specific Notes

### Testnet

- **Faucet**: Available via CLI or Discord
- **Explorer**: https://suiscan.xyz/testnet
- **Cost**: Free (testnet SUI has no value)
- **Data persistence**: May be reset periodically

### Mainnet

- **Faucet**: None (use real SUI)
- **Explorer**: https://suiscan.xyz/mainnet
- **Cost**: Real SUI tokens required
- **Data persistence**: Permanent
- **Recommendations**:
  - Test exhaustively on testnet first
  - Use hardware wallet for UpgradeCap
  - Consider multi-sig for admin functions
  - Monitor gas costs carefully
  - Have incident response plan

### Devnet

- **Faucet**: Available via CLI
- **Explorer**: https://suiscan.xyz/devnet
- **Cost**: Free
- **Data persistence**: Frequently reset
- **Use case**: Rapid prototyping

## Advanced Usage

### Custom Gas Budget

Edit scripts to adjust gas:

```bash
# In deploy.sh or upgrade.sh, change:
sui client publish --gas-budget 200000000  # Default is 100000000
```

### Multiple Deployments

Manage multiple deployments:

```bash
# Deploy to testnet
sui client switch --env testnet
./scripts/deploy.sh
mv e2e-tests/testnet_ids.txt e2e-tests/testnet_ids.testnet.txt

# Deploy to mainnet
sui client switch --env mainnet
./scripts/deploy.sh
mv e2e-tests/testnet_ids.txt e2e-tests/testnet_ids.mainnet.txt

# Switch between them
cp e2e-tests/testnet_ids.testnet.txt e2e-tests/testnet_ids.txt
./scripts/publish_thriftchain.sh
```

### CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: Deploy Contract

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Sui CLI
        run: cargo install --locked --git https://github.com/MystenLabs/sui.git sui
      
      - name: Configure Sui
        run: |
          mkdir -p ~/.sui
          echo "${{ secrets.SUI_CONFIG }}" > ~/.sui/sui.config
          echo "${{ secrets.SUI_KEYSTORE }}" > ~/.sui/sui.keystore
      
      - name: Deploy
        run: |
          cd contracts/marketplace
          ./scripts/deploy.sh
      
      - name: Archive artifacts
        uses: actions/upload-artifact@v3
        with:
          name: deployment-logs
          path: |
            contracts/marketplace/deploy.log
            contracts/marketplace/e2e-tests/testnet_ids.txt
```

## Getting Help

1. **Check documentation**:
   - [Deployment Guide](./DEPLOYMENT.md)
   - [Upgrade Guide](./UPGRADE.md)

2. **Review logs**:
   - `deploy.log` or `upgrade.log`
   - Sui Explorer transaction details

3. **Debug locally**:
   ```bash
   sui move build
   sui move test
   ```

4. **Community support**:
   - Sui Discord: https://discord.gg/sui
   - Sui Forums: https://forums.sui.io
   - GitHub Issues

## Contributing

To improve these scripts:

1. Test changes on devnet first
2. Document new features
3. Update this README
4. Submit pull request

## License

Same as the ThriftChain project.



