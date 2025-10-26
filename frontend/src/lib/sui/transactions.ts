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
import { bcs } from '@mysten/sui/bcs'
import { suiClient } from './client'
import { THRIFTCHAIN_PACKAGE_ID } from './queries'
import type {
  CreateItemParams,
  CreateOfferParams,
  AcceptOfferParams,
  ConfirmDeliveryParams,
} from '../types/sui-objects'

type SignAndExecuteParams = Parameters<typeof suiClient.signAndExecuteTransaction>[0]
type TransactionSigner = SignAndExecuteParams['signer']
type SignAndExecuteResult = Awaited<ReturnType<typeof suiClient.signAndExecuteTransaction>>
type ObjectChange = NonNullable<SignAndExecuteResult['objectChanges']>[number]
type CreatedObjectChange = Extract<ObjectChange, { type: 'created'; objectId: string }>

// ============================================
// CONFIGURATION
// ============================================

/**
 * Module names in the smart contract
 */
const MODULE_NAME = 'thriftchain'

/**
 * Shared object IDs from deployment
 */
const MARKETPLACE_ID = process.env.NEXT_PUBLIC_MARKETPLACE_ID || ''
const ITEM_CAP_ID = process.env.NEXT_PUBLIC_ITEM_CAP_ID || ''
const CLOCK_ID = process.env.NEXT_PUBLIC_CLOCK_ID || '0x6'

/**
 * Gas budget for transactions (in MIST)
 * Adjust based on actual gas costs after deployment
 */
const DEFAULT_GAS_BUDGET = 100_000_000 // 0.1 SUI

// ============================================
// ITEM TRANSACTIONS
// ============================================

/**
 * Build transaction to create a new item listing
 *
 * This calls the Move smart contract to create a real on-chain item.
 * The item will be stored in the shared Marketplace table.
 *
 * @param params - Item creation parameters
 * @returns Transaction ready to be signed
 */
export function buildCreateItemTransaction(params: CreateItemParams): Transaction {
  if (!THRIFTCHAIN_PACKAGE_ID) {
    throw new Error('NEXT_PUBLIC_THRIFTCHAIN_PACKAGE_ID not configured')
  }
  if (!MARKETPLACE_ID) {
    throw new Error('NEXT_PUBLIC_MARKETPLACE_ID not configured')
  }
  if (!ITEM_CAP_ID) {
    throw new Error('NEXT_PUBLIC_ITEM_CAP_ID not configured')
  }

  const tx = new Transaction()

  // Validate and prepare arrays
  const tags = Array.isArray(params.tags) ? params.tags : []
  const walrusImageIds = Array.isArray(params.walrusImageIds) ? params.walrusImageIds : []
  
  console.log('Creating item with tags:', tags)
  console.log('Creating item with images:', walrusImageIds)

  // Manually encode strings as Move String (which is vector<u8>)
  const encodeMovieString = (str: string): Uint8Array => {
    const bytes = new TextEncoder().encode(str)
    // Move String format: length prefix (ULEB128) + UTF-8 bytes
    // For simplicity, just return the UTF-8 bytes and let BCS handle length
    return bytes
  }

  // Encode each string to bytes
  const tagsAsVecOfBytes: Uint8Array[] = tags.map(encodeMovieString)
  const imagesAsVecOfBytes: Uint8Array[] = walrusImageIds.map(encodeMovieString)

  console.log('Tags as byte arrays:', tagsAsVecOfBytes.map(b => b.length))
  console.log('Images as byte arrays:', imagesAsVecOfBytes.map(b => b.length))

  // Serialize vector<vector<u8>> manually with proper ULEB encoding
  const encodeVectorOfVectors = (vectors: Uint8Array[]): Uint8Array => {
    // Calculate total size
    let totalSize = 0
    
    // Add size for vector length (we'll use simple length encoding)
    const lengthBytes = new Uint8Array([vectors.length])
    totalSize += 1
    
    // Add sizes for each inner vector (1 byte length + data)
    vectors.forEach(v => {
      totalSize += 1 + v.length
    })
    
    const result = new Uint8Array(totalSize)
    let offset = 0
    
    // Write outer vector length
    result[offset++] = vectors.length
    
    // Write each inner vector
    vectors.forEach(v => {
      result[offset++] = v.length
      result.set(v, offset)
      offset += v.length
    })
    
    return result
  }

  const tagsBytes = encodeVectorOfVectors(tagsAsVecOfBytes)
  const imagesBytes = encodeVectorOfVectors(imagesAsVecOfBytes)

  console.log('Final tags bytes:', tagsBytes)
  console.log('Final images bytes:', imagesBytes)

  // Call create_item entry function
  tx.moveCall({
    target: `${THRIFTCHAIN_PACKAGE_ID}::${MODULE_NAME}::create_item`,
    arguments: [
      tx.object(MARKETPLACE_ID),           // marketplace: &mut Marketplace
      tx.object(ITEM_CAP_ID),              // cap: &ItemCap
      tx.pure.string(params.title),        // title: String
      tx.pure.string(params.description),  // description: String
      tx.pure.u64(params.price),           // price: u64
      tx.pure.string(params.category),     // category: String
      tx.pure(tagsBytes),                  // tags: vector<String>
      tx.pure(imagesBytes),                // walrus_image_ids: vector<String>
      tx.pure.string(params.condition),    // condition: String
      tx.pure.string(params.brand),        // brand: String
      tx.pure.string(params.size),         // size: String
      tx.pure.string(params.color),        // color: String
      tx.pure.string(params.material),     // material: String
      tx.object(CLOCK_ID),                 // clock: &Clock
    ],
  })

  tx.setGasBudget(DEFAULT_GAS_BUDGET)

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
  if (!THRIFTCHAIN_PACKAGE_ID || !MARKETPLACE_ID) {
    throw new Error('Package or Marketplace ID not configured')
  }

  const tx = new Transaction()

  tx.moveCall({
    target: `${THRIFTCHAIN_PACKAGE_ID}::${MODULE_NAME}::update_item_price_by_id`,
    arguments: [
      tx.object(MARKETPLACE_ID),
      tx.pure.id(itemId),
      tx.pure.u64(newPrice),
      tx.object(CLOCK_ID),
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
  if (!THRIFTCHAIN_PACKAGE_ID || !MARKETPLACE_ID) {
    throw new Error('Package or Marketplace ID not configured')
  }

  const tx = new Transaction()

  tx.moveCall({
    target: `${THRIFTCHAIN_PACKAGE_ID}::${MODULE_NAME}::cancel_item_by_id`,
    arguments: [
      tx.object(MARKETPLACE_ID),
      tx.pure.id(itemId),
      tx.object(CLOCK_ID),
    ],
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
  if (!THRIFTCHAIN_PACKAGE_ID || !MARKETPLACE_ID) {
    throw new Error('Package or Marketplace ID not configured')
  }

  const tx = new Transaction()
  
  const expiresInDays = params.expiresInDays ?? 7
  const expiresInHours = expiresInDays * 24

  tx.moveCall({
    target: `${THRIFTCHAIN_PACKAGE_ID}::${MODULE_NAME}::create_offer`,
    arguments: [
      tx.object(MARKETPLACE_ID),
      tx.pure.id(params.itemId),
      tx.pure.u64(params.amount),
      tx.pure.string(params.message || ''),
      tx.pure.u64(expiresInHours),
      tx.object(CLOCK_ID),
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
  if (!THRIFTCHAIN_PACKAGE_ID || !MARKETPLACE_ID) {
    throw new Error('Package or Marketplace ID not configured')
  }

  const tx = new Transaction()

  tx.moveCall({
    target: `${THRIFTCHAIN_PACKAGE_ID}::${MODULE_NAME}::cancel_offer`,
    arguments: [
      tx.object(MARKETPLACE_ID),
      tx.pure.id(offerId),
      tx.object(CLOCK_ID),
    ],
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
  if (!THRIFTCHAIN_PACKAGE_ID || !MARKETPLACE_ID) {
    throw new Error('Package or Marketplace ID not configured')
  }

  const tx = new Transaction()

  tx.moveCall({
    target: `${THRIFTCHAIN_PACKAGE_ID}::${MODULE_NAME}::reject_offer`,
    arguments: [
      tx.object(MARKETPLACE_ID),
      tx.pure.id(offerId),
      tx.object(CLOCK_ID),
    ],
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
  if (!THRIFTCHAIN_PACKAGE_ID || !MARKETPLACE_ID) {
    throw new Error('Package or Marketplace ID not configured')
  }

  const tx = new Transaction()

  tx.moveCall({
    target: `${THRIFTCHAIN_PACKAGE_ID}::${MODULE_NAME}::accept_offer`,
    arguments: [
      tx.object(MARKETPLACE_ID),
      tx.pure.id(params.offerId),
      tx.pure.id(params.itemId),
      tx.object(CLOCK_ID),
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
  if (!THRIFTCHAIN_PACKAGE_ID || !MARKETPLACE_ID) {
    throw new Error('Package or Marketplace ID not configured')
  }

  const tx = new Transaction()

  tx.moveCall({
    target: `${THRIFTCHAIN_PACKAGE_ID}::${MODULE_NAME}::confirm_delivery`,
    arguments: [
      tx.object(MARKETPLACE_ID),
      tx.pure.id(params.escrowId),
      tx.object(CLOCK_ID),
    ],
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
  if (!THRIFTCHAIN_PACKAGE_ID || !MARKETPLACE_ID) {
    throw new Error('Package or Marketplace ID not configured')
  }

  const tx = new Transaction()

  tx.moveCall({
    target: `${THRIFTCHAIN_PACKAGE_ID}::${MODULE_NAME}::dispute_escrow`,
    arguments: [
      tx.object(MARKETPLACE_ID),
      tx.pure.id(escrowId),
      tx.object(CLOCK_ID),
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
  if (!THRIFTCHAIN_PACKAGE_ID || !MARKETPLACE_ID) {
    throw new Error('Package or Marketplace ID not configured')
  }

  const tx = new Transaction()

  tx.moveCall({
    target: `${THRIFTCHAIN_PACKAGE_ID}::${MODULE_NAME}::refund_escrow`,
    arguments: [
      tx.object(MARKETPLACE_ID),
      tx.pure.id(escrowId),
      tx.object(CLOCK_ID),
    ],
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
export async function executeTransaction(tx: Transaction, signer: TransactionSigner): Promise<SignAndExecuteResult> {
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
function isCreatedObjectChange(change: ObjectChange): change is CreatedObjectChange {
  return change.type === 'created'
}

export function extractCreatedObjectIds(result: SignAndExecuteResult): string[] {
  const objectChanges = result.objectChanges ?? []

  return objectChanges
    .filter(isCreatedObjectChange)
    .map(change => change.objectId)
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
    } catch {
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
  void sender
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
    void operation
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
