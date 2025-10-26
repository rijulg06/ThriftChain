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
  CounterOfferParams,
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
// ITEM_CAP_ID removed - no longer needed for P2P marketplace (any user can create items)
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
 * Note: ItemCap no longer required - this is a P2P marketplace where any user can create items.
 *
 * @param params - Item creation parameters
 * @returns Transaction ready to be signed
 */
export function buildCreateItemTransaction(params: CreateItemParams): Transaction {
  console.log('=== buildCreateItemTransaction called ===')
  console.log('Environment Variables:', {
    PACKAGE_ID: THRIFTCHAIN_PACKAGE_ID,
    MARKETPLACE_ID: MARKETPLACE_ID,
    CLOCK_ID: CLOCK_ID
  })

  if (!THRIFTCHAIN_PACKAGE_ID || THRIFTCHAIN_PACKAGE_ID === '') {
    throw new Error(`NEXT_PUBLIC_THRIFTCHAIN_PACKAGE_ID not configured: "${THRIFTCHAIN_PACKAGE_ID}"`)
  }
  if (!MARKETPLACE_ID || MARKETPLACE_ID === '') {
    throw new Error(`NEXT_PUBLIC_MARKETPLACE_ID not configured: "${MARKETPLACE_ID}"`)
  }

  console.log('Creating new Transaction...')
  const tx = new Transaction()
  console.log('Transaction created successfully')
  console.log('tx.pure type:', typeof tx.pure)
  console.log('tx.pure.string type:', typeof tx.pure?.string)
  console.log('tx.object type:', typeof tx.object)

  // NOTE: Images are now stored in Supabase, not on-chain

  // Ensure all string fields have valid values (empty string for optional fields)
  const brand = params.brand || ''
  const size = params.size || ''
  const color = params.color || ''
  const material = params.material || ''

  // Debug logging
  console.log('Building transaction with params:', {
    title: params.title,
    description: params.description,
    price: params.price.toString(),
    category: params.category,
    condition: params.condition,
    brand,
    size,
    color,
    material
  })

  // Validate all parameters before building transaction
  if (!params.title || typeof params.title !== 'string') {
    throw new Error(`Invalid title: ${params.title}`)
  }
  if (!params.description || typeof params.description !== 'string') {
    throw new Error(`Invalid description: ${params.description}`)
  }
  if (typeof params.price !== 'bigint') {
    throw new Error(`Invalid price: ${params.price} (type: ${typeof params.price})`)
  }
  if (!params.category || typeof params.category !== 'string') {
    throw new Error(`Invalid category: ${params.category}`)
  }
  if (!params.condition || typeof params.condition !== 'string') {
    throw new Error(`Invalid condition: ${params.condition}`)
  }

  // Call create_item entry function
  // NOTE: ItemCap parameter removed - P2P marketplace allows any user to create items
  console.log('Building moveCall with target:', `${THRIFTCHAIN_PACKAGE_ID}::${MODULE_NAME}::create_item`)

  console.log('Adding tx.object(MARKETPLACE_ID)...')
  const marketplaceArg = tx.object(MARKETPLACE_ID)

  console.log('Building moveCall with BCS serialization...')

  // Serialize all arguments first to catch errors early
  try {
    console.log('Step 1: Serialize title...')
    const titleSerialized = bcs.string().serialize(params.title)
    const titleBytes = titleSerialized.toBytes()
    console.log('✓ Title serialized, bytes:', titleBytes.length)

    console.log('Step 2: Serialize description...')
    const descriptionBytes = bcs.string().serialize(params.description).toBytes()
    console.log('✓ Description serialized')

    console.log('Step 3: Serialize price...')
    const priceBytes = bcs.u64().serialize(params.price).toBytes()
    console.log('✓ Price serialized')

    console.log('Step 4: Serialize walrusImageIds...')
    console.log('WalrusImageIds value:', params.walrusImageIds)
    const vectorSerialized = bcs.vector(bcs.string()).serialize(params.walrusImageIds)
    const vectorBytes = vectorSerialized.toBytes()
    console.log('✓ Vector serialized, bytes:', vectorBytes.length)

    console.log('All arguments serialized successfully, building moveCall...')

    tx.moveCall({
      target: `${THRIFTCHAIN_PACKAGE_ID}::${MODULE_NAME}::create_item`,
      arguments: [
        marketplaceArg,
        // itemCapArg removed - P2P marketplace doesn't require admin capability
        tx.pure(titleBytes),
        tx.pure(descriptionBytes),
        tx.pure(priceBytes),
        tx.pure(bcs.string().serialize(params.category).toBytes()),
        tx.pure(bcs.string().serialize(params.condition).toBytes()),
        tx.pure(bcs.string().serialize(brand).toBytes()),
        tx.pure(bcs.string().serialize(size).toBytes()),
        tx.pure(bcs.string().serialize(color).toBytes()),
        tx.pure(bcs.string().serialize(material).toBytes()),
        tx.pure(vectorBytes),
        tx.object(CLOCK_ID),
      ],
    })

    console.log('✓ moveCall with BCS serialization complete')
  } catch (error) {
    console.error('BCS serialization error:', error)
    throw error
  }

  console.log('moveCall completed successfully')

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

/**
 * Build transaction to counter an offer (seller only)
 *
 * Flow:
 * 1. Seller receives an offer on their item
 * 2. Seller counters with a different amount
 * 3. Buyer can accept or decline the counter
 *
 * @param params - Counter offer parameters
 * @returns Transaction ready to be signed
 */
export function buildCounterOfferTransaction(params: CounterOfferParams): Transaction {
  if (!THRIFTCHAIN_PACKAGE_ID || !MARKETPLACE_ID) {
    throw new Error('Package or Marketplace ID not configured')
  }

  const tx = new Transaction()

  tx.moveCall({
    target: `${THRIFTCHAIN_PACKAGE_ID}::${MODULE_NAME}::counter_offer_by_id`,
    arguments: [
      tx.object(MARKETPLACE_ID),
      tx.pure.id(params.offerId),
      tx.pure.u64(params.counterAmount),
      tx.pure.string(params.counterMessage),
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
 * @returns Transaction ready to be signed
 */
export function buildDisputeEscrowTransaction(
  escrowId: string,
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
 * NOTE: This function uses the low-level suiClient API.
 * For wallet transactions, use the wallet's signAndExecuteTransaction method directly.
 *
 * @param tx - Transaction to execute
 * @param signer - Wallet signer (Keypair)
 * @returns Transaction result with created object IDs
 */
export async function executeTransaction(tx: Transaction, signer: TransactionSigner): Promise<SignAndExecuteResult> {
  try {
    // Sign and execute transaction using low-level client API
    // Note: Most apps should use wallet.signAndExecuteTransaction() instead
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
 * Extract item ID from ItemCreated event
 *
 * Items stored in Tables don't appear in objectChanges, but the ItemCreated
 * event contains the item_id that was used as the table key.
 *
 * @param result - Transaction result from wallet.signAndExecuteTransaction
 * @returns Item ID from the event, or null if not found
 */
export function extractItemIdFromEvent(result: SignAndExecuteResult): string | null {
  const events = result.events ?? []

  // Look for ItemCreated event
  const itemCreatedEvent = events.find(event =>
    event.type.includes('::thriftchain::ItemCreated')
  )

  if (!itemCreatedEvent || !itemCreatedEvent.parsedJson) {
    console.warn('[extractItemIdFromEvent] No ItemCreated event found')
    return null
  }

  // Extract item_id from the event
  const itemId = (itemCreatedEvent.parsedJson as any).item_id

  if (!itemId) {
    console.error('[extractItemIdFromEvent] Event found but no item_id field:', itemCreatedEvent.parsedJson)
    return null
  }

  console.log('[extractItemIdFromEvent] ✅ Extracted item ID from event:', itemId)
  return itemId
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
