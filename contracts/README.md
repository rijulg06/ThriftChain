# ThriftChain Smart Contracts

This directory contains Sui Move smart contracts for the ThriftChain marketplace.

## Directory Structure

```
contracts/
├── marketplace/
│   └── sources/
│       └── thriftchain.move      # Main marketplace contract
└── README.md
```

## Contracts

### ThriftChain Marketplace Contract

Location: `marketplace/sources/thriftchain.move`

**Functionality:**
- NFT minting and management for marketplace items
- Escrow functionality for secure transactions
- Ownership tracking and provenance
- Trade execution and settlement

## Development

### Prerequisites

- [Sui CLI](https://docs.sui.io/build/install)

### Building Contracts

```bash
sui move build
```

### Deploying Contracts

```bash
sui client publish --gas-budget 100000000
```

## Smart Contract Architecture

See [PRD_Final.md](../PRD_Final.md) for detailed contract specifications.
