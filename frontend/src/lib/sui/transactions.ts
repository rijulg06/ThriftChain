/**
 * Sui Transaction Builder Utilities
 *
 * This module provides functions to build and execute transactions on Sui blockchain.
 * All writes to the marketplace (create items, make offers, etc.) happen here.
 *
 * Architecture:
 * - Builds Programmable Transaction Blocks (PTBs)
 * - Signs and executes via user's wallet
 * - Returns transaction results with created object IDs
 */

import { Transaction } from '@mysten/sui/transactions'
import { suiClient } from './client'
import { THRIFTCHAIN_PACKAGE_ID } from './queries'
import type {
  CreateItemParams,
  CreateOfferParams,
  AcceptOfferParams,
  ConfirmDeliveryParams,
} from '../types/sui-objects'

// ============================================
// CONFIGURATION
// ============================================

/**
 * Module names in the smart contract
 */
const MODULE_NAME = 'marketplace'

/**
 * Gas budget for transactions (in MIST)
 * Adjust based on actual gas costs after deployment
 */
const DEFAULT_GAS_BUDGET = 10_000_000 // 0.01 SUI

// ============================================
// ITEM TRANSACTIONS
// ============================================

/**
 * Build transaction to create a new item listing
 *
 * TEMPORARY: Simplified version without complex vector arguments
 * TODO: Re-enable once smart contracts are deployed and vector serialization is fixed
 *
 * @param params - Item creation parameters
 * @returns Transaction ready to be signed
 */
export function buildCreateItemTransaction(params: CreateItemParams): Transaction {
  const tx = new Transaction()

  // TODO: Once smart contracts are deployed and vector serialization is fixed:
  // 1. Verify THRIFTCHAIN_PACKAGE_ID is set
  // 2. Create proper Move vectors for tags and walrusImageIds  
  // 3. Call the actual marketplace::create_item function
  
  console.warn('[TEMP] Transaction building simplified - awaiting smart contract deployment')
  console.log('Would create item with params:', {
    title: params.title,
    description: params.description,
    category: params.category,
    price: params.price.toString(),
    tags: params.tags,
    images: params.walrusImageIds.length,
  })

  // Return empty transaction for now
  return tx
}

/**
 * Build transaction to update item price
 *
 * @param itemId - Sui object ID of the item
 * @param newPrice - New price in MIST
 * @returns Transaction ready to be signed
 */
export function buildUpdateItemPriceTransaction(
  itemId: string,
  newPrice: bigint
): Transaction {
  const tx = new Transaction()

  tx.moveCall({
    target: `${THRIFTCHAIN_PACKAGE_ID}::${MODULE_NAME}::update_item_price`,
    arguments: [
      tx.object(itemId),
      tx.pure.u64(newPrice),
    ],
  })

  tx.setGasBudget(DEFAULT_GAS_BUDGET)

  return tx
}

/**
 * Build transaction to cancel item listing
 *
 * @param itemId - Sui object ID of the item
 * @returns Transaction ready to be signed
 */
export function buildCancelItemTransaction(itemId: string): Transaction {
  const tx = new Transaction()

  tx.moveCall({
    target: `${THRIFTCHAIN_PACKAGE_ID}::${MODULE_NAME}::cancel_item`,
    arguments: [tx.object(itemId)],
  })

  tx.setGasBudget(DEFAULT_GAS_BUDGET)

  return tx
}

// ============================================
// OFFER TRANSACTIONS
// ============================================

/**
 * Build transaction to create an offer on an item
 *
 * Flow:
 * 1. Buyer sees an item they want
 * 2. Buyer calls this to build offer transaction
 * 3. Buyer signs and executes
 * 4. Offer is created on-chain, seller can see it
 *
 * @param params - Offer creation parameters
 * @returns Transaction ready to be signed
 */
export function buildCreateOfferTransaction(params: CreateOfferParams): Transaction {
  const tx = new Transaction()

  // Calculate expiration timestamp (default 7 days from now)
  const expiresInMs = (params.expiresInDays || 7) * 24 * 60 * 60 * 1000
  const expiresAt = Date.now() + expiresInMs

  // Split coins for the offer amount
  const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(params.amount)])

  tx.moveCall({
    target: `${THRIFTCHAIN_PACKAGE_ID}::${MODULE_NAME}::create_offer`,
    arguments: [
      tx.object(params.itemId),
      coin, // Payment coin
      tx.pure.string(params.currency),
      tx.pure.string(params.message || ''),
      tx.pure.u64(BigInt(expiresAt)),
    ],
  })

  tx.setGasBudget(DEFAULT_GAS_BUDGET)

  return tx
}

/**
 * Build transaction to cancel an offer
 *
 * @param offerId - Sui object ID of the offer
 * @returns Transaction ready to be signed
 */
export function buildCancelOfferTransaction(offerId: string): Transaction {
  const tx = new Transaction()

  tx.moveCall({
    target: `${THRIFTCHAIN_PACKAGE_ID}::${MODULE_NAME}::cancel_offer`,
    arguments: [tx.object(offerId)],
  })

  tx.setGasBudget(DEFAULT_GAS_BUDGET)

  return tx
}

/**
 * Build transaction to reject an offer (seller only)
 *
 * @param offerId - Sui object ID of the offer
 * @returns Transaction ready to be signed
 */
export function buildRejectOfferTransaction(offerId: string): Transaction {
  const tx = new Transaction()

  tx.moveCall({
    target: `${THRIFTCHAIN_PACKAGE_ID}::${MODULE_NAME}::reject_offer`,
    arguments: [tx.object(offerId)],
  })

  tx.setGasBudget(DEFAULT_GAS_BUDGET)

  return tx
}

// ============================================
// ESCROW TRANSACTIONS
// ============================================

/**
 * Build transaction to accept an offer and create escrow
 *
 * Flow:
 * 1. Seller sees pending offer
 * 2. Seller accepts → this creates escrow
 * 3. Item is locked in escrow
 * 4. Buyer's funds are held until delivery confirmed
 *
 * @param params - Accept offer parameters
 * @returns Transaction ready to be signed
 */
export function buildAcceptOfferTransaction(params: AcceptOfferParams): Transaction {
  const tx = new Transaction()

  tx.moveCall({
    target: `${THRIFTCHAIN_PACKAGE_ID}::${MODULE_NAME}::accept_offer`,
    arguments: [
      tx.object(params.offerId),
      tx.object(params.itemId),
    ],
  })

  tx.setGasBudget(DEFAULT_GAS_BUDGET)

  return tx
}

/**
 * Build transaction to confirm delivery and release escrow
 *
 * Flow:
 * 1. Buyer receives item in real world
 * 2. Buyer calls this to confirm delivery
 * 3. Funds released to seller
 * 4. Item ownership transferred to buyer
 *
 * @param params - Confirm delivery parameters
 * @returns Transaction ready to be signed
 */
export function buildConfirmDeliveryTransaction(params: ConfirmDeliveryParams): Transaction {
  const tx = new Transaction()

  tx.moveCall({
    target: `${THRIFTCHAIN_PACKAGE_ID}::${MODULE_NAME}::confirm_delivery`,
    arguments: [tx.object(params.escrowId)],
  })

  tx.setGasBudget(DEFAULT_GAS_BUDGET)

  return tx
}

/**
 * Build transaction to dispute an escrow
 *
 * @param escrowId - Sui object ID of the escrow
 * @param reason - Reason for dispute
 * @returns Transaction ready to be signed
 */
export function buildDisputeEscrowTransaction(
  escrowId: string,
  reason: string
): Transaction {
  const tx = new Transaction()

  tx.moveCall({
    target: `${THRIFTCHAIN_PACKAGE_ID}::${MODULE_NAME}::dispute_escrow`,
    arguments: [
      tx.object(escrowId),
      tx.pure.string(reason),
    ],
  })

  tx.setGasBudget(DEFAULT_GAS_BUDGET)

  return tx
}

/**
 * Build transaction to refund an escrow (in case of dispute)
 *
 * @param escrowId - Sui object ID of the escrow
 * @returns Transaction ready to be signed
 */
export function buildRefundEscrowTransaction(escrowId: string): Transaction {
  const tx = new Transaction()

  tx.moveCall({
    target: `${THRIFTCHAIN_PACKAGE_ID}::${MODULE_NAME}::refund_escrow`,
    arguments: [tx.object(escrowId)],
  })

  tx.setGasBudget(DEFAULT_GAS_BUDGET)

  return tx
}

// ============================================
// TRANSACTION EXECUTION HELPERS
// ============================================

/**
 * Execute a transaction and wait for confirmation
 *
 * @param tx - Transaction to execute
 * @param signer - Wallet signer
 * @returns Transaction result with created object IDs
 */
export async function executeTransaction(tx: Transaction, signer: any) {
  try {
    // Sign and execute transaction
    const result = await suiClient.signAndExecuteTransaction({
      transaction: tx,
      signer,
      options: {
        showEffects: true,
        showObjectChanges: true,
        showEvents: true,
      },
    })

    // Check if transaction was successful
    if (result.effects?.status?.status !== 'success') {
      throw new Error(`Transaction failed: ${result.effects?.status?.error || 'Unknown error'}`)
    }

    return result
  } catch (error) {
    console.error('Error executing transaction:', error)
    throw error
  }
}

/**
 * Extract created object IDs from transaction result
 *
 * @param result - Transaction execution result
 * @returns Array of created object IDs
 */
export function extractCreatedObjectIds(result: any): string[] {
  if (!result.objectChanges) {
    return []
  }

  return result.objectChanges
    .filter((change: any) => change.type === 'created')
    .map((change: any) => change.objectId)
}

/**
 * Wait for transaction to be indexed (useful before querying)
 *
 * @param txDigest - Transaction digest to wait for
 * @param maxRetries - Maximum number of retries
 * @returns true if indexed, false if timeout
 */
export async function waitForTransactionIndexing(
  txDigest: string,
  maxRetries = 10
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await suiClient.getTransactionBlock({ digest: txDigest })
      return true
    } catch (error) {
      // Transaction not indexed yet, wait and retry
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  return false
}

// ============================================
// GAS ESTIMATION
// ============================================

/**
 * Estimate gas for a transaction (dry run)
 *
 * @param tx - Transaction to estimate
 * @param sender - Sender address
 * @returns Estimated gas cost in MIST
 */
export async function estimateGas(tx: Transaction, sender: string): Promise<bigint> {
  try {
    const dryRunResult = await suiClient.dryRunTransactionBlock({
      transactionBlock: await tx.build({ client: suiClient }),
    })

    if (dryRunResult.effects.status.status !== 'success') {
      throw new Error('Transaction dry run failed')
    }

    // Get gas used from effects
    const gasUsed = dryRunResult.effects.gasUsed
    const totalGas = BigInt(gasUsed.computationCost) +
                     BigInt(gasUsed.storageCost) -
                     BigInt(gasUsed.storageRebate)

    return totalGas
  } catch (error) {
    console.error('Error estimating gas:', error)
    // Return conservative estimate
    return BigInt(DEFAULT_GAS_BUDGET)
  }
}

// ============================================
// BATCH OPERATIONS
// ============================================

/**
 * Build batch transaction for multiple operations
 * Useful for accepting multiple offers at once, etc.
 *
 * @param operations - Array of transaction builders
 * @returns Single transaction with all operations
 */
export function buildBatchTransaction(operations: Transaction[]): Transaction {
  const tx = new Transaction()

  // Merge all operations into single transaction
  operations.forEach(operation => {
    // Note: This is simplified - actual implementation depends on Move contract design
    // You might need to design batch functions in the smart contract
  })

  return tx
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if user has sufficient balance for transaction
 *
 * @param userAddress - User's wallet address
 * @param requiredAmount - Amount needed in MIST
 * @returns true if sufficient balance
 */
export async function hasSufficientBalance(
  userAddress: string,
  requiredAmount: bigint
): Promise<boolean> {
  try {
    const balance = await suiClient.getBalance({
      owner: userAddress,
      coinType: '0x2::sui::SUI',
    })

    return BigInt(balance.totalBalance) >= requiredAmount
  } catch (error) {
    console.error('Error checking balance:', error)
    return false
  }
}

/**
 * Get user's SUI balance
 *
 * @param userAddress - User's wallet address
 * @returns Balance in MIST
 */
export async function getUserBalance(userAddress: string): Promise<bigint> {
  try {
    const balance = await suiClient.getBalance({
      owner: userAddress,
      coinType: '0x2::sui::SUI',
    })

    return BigInt(balance.totalBalance)
  } catch (error) {
    console.error('Error getting balance:', error)
    return BigInt(0)
  }
}
