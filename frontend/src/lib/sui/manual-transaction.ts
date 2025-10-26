/**
 * Manual Transaction Builder - No SDK Dependencies
 *
 * Builds Sui transaction bytes manually using pure BCS encoding
 * to completely bypass the TypeScript SDK's buggy serialization
 */

import type { CreateItemParams } from '../types/sui-objects'

// ============================================
// BCS ENCODING PRIMITIVES
// ============================================

/**
 * Encode an unsigned integer as ULEB128
 */
function encodeUleb128(value: number): number[] {
  const bytes: number[] = []
  let num = value

  while (num >= 128) {
    bytes.push((num & 0x7f) | 0x80)
    num >>= 7
  }
  bytes.push(num)

  return bytes
}

/**
 * Encode a u64 as little-endian
 */
function encodeU64(value: bigint): number[] {
  const bytes: number[] = []
  let num = value

  for (let i = 0; i < 8; i++) {
    bytes.push(Number(num & 0xffn))
    num >>= 8n
  }

  return bytes
}

/**
 * Encode a string to BCS format
 */
function encodeString(str: string): number[] {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(str)

  return [
    ...encodeUleb128(bytes.length),
    ...Array.from(bytes)
  ]
}

/**
 * Encode a vector of strings to BCS format
 */
function encodeVectorString(strings: string[]): number[] {
  const bytes: number[] = []

  // Encode length
  bytes.push(...encodeUleb128(strings.length))

  // Encode each string
  for (const str of strings) {
    bytes.push(...encodeString(str))
  }

  return bytes
}

/**
 * Encode an address (32 bytes)
 */
function encodeAddress(address: string): number[] {
  // Remove 0x prefix if present
  const hex = address.startsWith('0x') ? address.slice(2) : address

  // Pad to 64 characters (32 bytes)
  const padded = hex.padStart(64, '0')

  // Convert to bytes
  const bytes: number[] = []
  for (let i = 0; i < padded.length; i += 2) {
    bytes.push(parseInt(padded.slice(i, i + 2), 16))
  }

  return bytes
}

// ============================================
// TRANSACTION BUILDER
// ============================================

/**
 * Build a Programmable Transaction manually
 */
export function buildCreateItemTransactionManual(
  params: CreateItemParams,
  senderAddress: string,
  gasObjectId: string,
  gasPrice: string,
  gasBudget: string
): Uint8Array {
  console.log('=== Building Transaction Manually (No SDK) ===')

  const packageId = process.env.NEXT_PUBLIC_THRIFTCHAIN_PACKAGE_ID
  const marketplaceId = process.env.NEXT_PUBLIC_MARKETPLACE_ID
  const itemCapId = process.env.NEXT_PUBLIC_ITEM_CAP_ID
  const clockId = process.env.NEXT_PUBLIC_CLOCK_ID || '0x6'

  console.log('Environment check:', {
    packageId,
    marketplaceId,
    itemCapId,
    clockId,
    senderAddress,
    gasObjectId
  })

  if (!packageId) throw new Error('NEXT_PUBLIC_THRIFTCHAIN_PACKAGE_ID not set')
  if (!marketplaceId) throw new Error('NEXT_PUBLIC_MARKETPLACE_ID not set')
  if (!itemCapId) throw new Error('NEXT_PUBLIC_ITEM_CAP_ID not set')
  if (!senderAddress) throw new Error('Sender address is required')
  if (!gasObjectId) throw new Error('Gas object ID is required')

  const brand = params.brand || ''
  const size = params.size || ''
  const color = params.color || ''
  const material = params.material || ''

  // Transaction data structure
  const txBytes: number[] = []

  // 1. Transaction kind (ProgrammableTransaction = 1)
  txBytes.push(1)

  // 2. Inputs (13 total)
  txBytes.push(...encodeUleb128(13))

  // Input 0: marketplace (shared object, mutable)
  txBytes.push(2) // InputKind::SharedObject
  txBytes.push(...encodeAddress(marketplaceId))
  txBytes.push(...encodeUleb128(1)) // initial_shared_version
  txBytes.push(1) // mutable = true

  // Input 1: item_cap (shared object, immutable)
  txBytes.push(2) // InputKind::SharedObject
  txBytes.push(...encodeAddress(itemCapId))
  txBytes.push(...encodeUleb128(1)) // initial_shared_version
  txBytes.push(0) // mutable = false

  // Input 2: title (pure)
  const titleBytes = encodeString(params.title)
  txBytes.push(0) // InputKind::Pure
  txBytes.push(...encodeUleb128(titleBytes.length))
  txBytes.push(...titleBytes)

  // Input 3: description (pure)
  const descriptionBytes = encodeString(params.description)
  txBytes.push(0) // InputKind::Pure
  txBytes.push(...encodeUleb128(descriptionBytes.length))
  txBytes.push(...descriptionBytes)

  // Input 4: price (pure u64)
  const priceBytes = encodeU64(params.price)
  txBytes.push(0) // InputKind::Pure
  txBytes.push(...encodeUleb128(priceBytes.length))
  txBytes.push(...priceBytes)

  // Input 5: category (pure)
  const categoryBytes = encodeString(params.category)
  txBytes.push(0) // InputKind::Pure
  txBytes.push(...encodeUleb128(categoryBytes.length))
  txBytes.push(...categoryBytes)

  // Input 6: condition (pure)
  const conditionBytes = encodeString(params.condition)
  txBytes.push(0) // InputKind::Pure
  txBytes.push(...encodeUleb128(conditionBytes.length))
  txBytes.push(...conditionBytes)

  // Input 7: brand (pure)
  const brandBytes = encodeString(brand)
  txBytes.push(0) // InputKind::Pure
  txBytes.push(...encodeUleb128(brandBytes.length))
  txBytes.push(...brandBytes)

  // Input 8: size (pure)
  const sizeBytes = encodeString(size)
  txBytes.push(0) // InputKind::Pure
  txBytes.push(...encodeUleb128(sizeBytes.length))
  txBytes.push(...sizeBytes)

  // Input 9: color (pure)
  const colorBytes = encodeString(color)
  txBytes.push(0) // InputKind::Pure
  txBytes.push(...encodeUleb128(colorBytes.length))
  txBytes.push(...colorBytes)

  // Input 10: material (pure)
  const materialBytes = encodeString(material)
  txBytes.push(0) // InputKind::Pure
  txBytes.push(...encodeUleb128(materialBytes.length))
  txBytes.push(...materialBytes)

  // Input 11: walrus_image_ids (pure vector<string>)
  const walrusIdsBytes = encodeVectorString(params.walrusImageIds)
  txBytes.push(0) // InputKind::Pure
  txBytes.push(...encodeUleb128(walrusIdsBytes.length))
  txBytes.push(...walrusIdsBytes)

  // Input 12: clock (shared object, immutable)
  txBytes.push(2) // InputKind::SharedObject
  txBytes.push(...encodeAddress(clockId))
  txBytes.push(...encodeUleb128(1)) // initial_shared_version
  txBytes.push(0) // mutable = false

  // 3. Commands (1 MoveCall)
  txBytes.push(...encodeUleb128(1))

  // MoveCall command
  txBytes.push(1) // CommandKind::MoveCall

  // Package ID
  txBytes.push(...encodeAddress(packageId))

  // Module name
  const moduleName = 'thriftchain'
  txBytes.push(...encodeString(moduleName))

  // Function name
  const functionName = 'create_item'
  txBytes.push(...encodeString(functionName))

  // Type arguments (empty)
  txBytes.push(0)

  // Arguments (13 inputs)
  txBytes.push(...encodeUleb128(13))
  for (let i = 0; i < 13; i++) {
    txBytes.push(0) // Argument::Input
    txBytes.push(...encodeUleb128(i))
  }

  // 4. Sender
  txBytes.push(...encodeAddress(senderAddress))

  // 5. Gas Data
  // Gas payment (1 coin)
  txBytes.push(...encodeUleb128(1))
  txBytes.push(...encodeAddress(gasObjectId))
  txBytes.push(...encodeUleb128(0)) // version
  txBytes.push(...encodeAddress(gasObjectId)) // digest (simplified)

  // Gas owner
  txBytes.push(...encodeAddress(senderAddress))

  // Gas price
  txBytes.push(...encodeU64(BigInt(gasPrice)))

  // Gas budget
  txBytes.push(...encodeU64(BigInt(gasBudget)))

  // 6. Expiration (None)
  txBytes.push(0)

  console.log('Transaction bytes length:', txBytes.length)
  console.log('First 50 bytes:', txBytes.slice(0, 50))

  return new Uint8Array(txBytes)
}

/**
 * Convert transaction bytes to base64 for signing
 */
export function txBytesToBase64(txBytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < txBytes.length; i++) {
    binary += String.fromCharCode(txBytes[i])
  }
  return btoa(binary)
}

/**
 * Get user's gas coins
 */
export async function getUserGasCoins(
  address: string,
  rpcUrl: string = 'https://fullnode.testnet.sui.io:443'
): Promise<{ coinObjectId: string; version: string; digest: string }[]> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'suix_getCoins',
      params: [address, '0x2::sui::SUI', null, 10]
    })
  })

  const data = await response.json()
  console.log('Gas coins response:', data)

  if (data.error) {
    throw new Error(`Failed to get gas coins: ${data.error.message}`)
  }

  return data.result?.data || []
}

/**
 * Get reference gas price
 */
export async function getReferenceGasPrice(
  rpcUrl: string = 'https://fullnode.testnet.sui.io:443'
): Promise<string> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'suix_getReferenceGasPrice',
      params: []
    })
  })

  const data = await response.json()
  return data.result
}
