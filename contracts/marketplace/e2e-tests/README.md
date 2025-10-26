# E2E Test Framework for ThriftChain

## Overview

This directory contains end-to-end testing utilities for the ThriftChain marketplace smart contract. The framework is designed to make Sui blockchain interactions more developer-friendly by abstracting complex CLI commands into simple, readable scripts.

## Directory Structure

```
e2e-tests/
├── helper/          # Command abstraction scripts - simple wrappers around Sui CLI commands
├── cases/           # Test case execution scripts - full test scenarios with validation
├── devnet_ids.txt   # Devnet-specific IDs and addresses (NEVER commit sensitive keys)
└── testnet_ids.txt  # Testnet-specific IDs and addresses (NEVER commit sensitive keys)
```

## Core Principles

### 1. ID Management is CRITICAL
- **ALWAYS update the corresponding `*_ids.txt` file when scripts create new objects**
- Every script that creates objects MUST add the new IDs to the tracking file
- Format: `KEY_NAME="value"` with clear comments explaining the object's purpose
- This is the **ONLY** way to maintain consistency across test runs

### 2. Helper Scripts (`helper/`)
- **Purpose**: Simple wrappers around Sui CLI commands
- **Pattern**: Display parameters → Execute command → Show raw output
- **No parsing or validation**: Just make commands readable and parameterizable
- **One script per smart contract function**: Create a helper for every public function

### 3. Test Case Scripts (`cases/`)
- **Purpose**: Full test scenarios with validation
- **Pattern**: Setup → Execute → Validate → Report
- **Must display**: Keys, parameters, raw output, and validation results
- **Should track**: New objects created and update `*_ids.txt` accordingly

## Usage Flow

1. **Switch to your network**: `sui client switch --env devnet`
2. **Publish package**: Use helper script if needed
3. **Update IDs file**: Manually add Package ID, Marketplace ID, etc. from publish output
4. **Run helper scripts**: To interact with the smart contract
5. **Update IDs file**: Add any new object IDs created by helper scripts
6. **Run test cases**: Execute full test scenarios

## See Also

- `helper/README.md` - Helper script guidelines and examples
- `cases/README.md` - Test case script guidelines and examples
