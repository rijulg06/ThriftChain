/**
 * Sui JSON-RPC Transaction Builder
 *
 * Direct JSON-RPC implementation bypassing the TypeScript SDK
 * to avoid serialization issues with tx.pure.string() and tx.pure.vector()
 */

import type { CreateItemParams } from '../types/sui-objects'

// ============================================
// CONFIGURATION
// ============================================

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://fullnode.testnet.sui.io:443'
const MODULE_NAME = 'thriftchain'
const MARKETPLACE_ID = process.env.NEXT_PUBLIC_MARKETPLACE_ID || ''
const ITEM_CAP_ID = process.env.NEXT_PUBLIC_ITEM_CAP_ID || ''
const CLOCK_ID = process.env.NEXT_PUBLIC_CLOCK_ID || '0x6'

// ============================================
// JSON-RPC CLIENT
// ============================================

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params: any[]
}

interface JsonRpcResponse<T = any> {
  jsonrpc: '2.0'
  id: string | number
  result?: T
  error?: {
    code: number
    message: string
    data?: any
  }
}

async function callJsonRpc<T = any>(method: string, params: any[] = []): Promise<T> {
  const request: JsonRpcRequest = {
    jsonrpc: '2.0',
    id: Date.now(),
    method,
    params,
  }

  console.log('JSON-RPC Request:', method, params)

  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data: JsonRpcResponse<T> = await response.json()

  if (data.error) {
    throw new Error(`JSON-RPC error: ${data.error.message}`)
  }

  console.log('JSON-RPC Response:', data.result)

  return data.result!
}

// ============================================
// BCS ENCODING HELPERS
// ============================================

/**
 * Encode a string to BCS format
 */
function bcsEncodeString(str: string): number[] {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(str)
  const length = bytes.length

  // BCS encoding: [length as uleb128, ...bytes]
  const encoded: number[] = []

  // Encode length as uleb128
  let len = length
  while (len >= 128) {
    encoded.push((len & 0x7f) | 0x80)
    len >>= 7
  }
  encoded.push(len)

  // Add string bytes
  encoded.push(...Array.from(bytes))

  return encoded
}

/**
 * Encode a u64 to BCS format (little-endian)
 */
function bcsEncodeU64(value: bigint): number[] {
  const bytes: number[] = []
  let num = value

  for (let i = 0; i < 8; i++) {
    bytes.push(Number(num & 0xffn))
    num >>= 8n
  }

  return bytes
}

/**
 * Encode a vector of strings to BCS format
 */
function bcsEncodeVectorString(strings: string[]): number[] {
  const encoded: number[] = []

  // Encode vector length as uleb128
  let len = strings.length
  while (len >= 128) {
    encoded.push((len & 0x7f) | 0x80)
    len >>= 7
  }
  encoded.push(len)

  // Encode each string
  for (const str of strings) {
    encoded.push(...bcsEncodeString(str))
  }

  return encoded
}

/**
 * Convert byte array to base64
 */
function bytesToBase64(bytes: number[]): string {
  const uint8Array = new Uint8Array(bytes)
  let binary = ''
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i])
  }
  return btoa(binary)
}

// ============================================
// TRANSACTION BUILDING
// ============================================

/**
 * Build a transaction to create an item using JSON-RPC
 */
export async function buildCreateItemTransactionRpc(
  params: CreateItemParams,
  senderAddress: string
): Promise<{ txBytes: string; gasPrice: string }> {
  console.log('=== Building Transaction via JSON-RPC ===')
  console.log('Params:', params)
  console.log('Sender:', senderAddress)

  const packageId = process.env.NEXT_PUBLIC_THRIFTCHAIN_PACKAGE_ID

  if (!packageId || !MARKETPLACE_ID || !ITEM_CAP_ID) {
    throw new Error('Missing package or object IDs in environment')
  }

  // Prepare optional string fields (empty string if not provided)
  const brand = params.brand || ''
  const size = params.size || ''
  const color = params.color || ''
  const material = params.material || ''

  // Build Move call arguments in BCS format
  const arguments_bcs = [
    // marketplace: &mut Marketplace (object reference, not pure)
    null, // Will be handled as object reference
    // cap: &ItemCap (object reference, not pure)
    null, // Will be handled as object reference
    // title: String
    bytesToBase64(bcsEncodeString(params.title)),
    // description: String
    bytesToBase64(bcsEncodeString(params.description)),
    // price: u64
    bytesToBase64(bcsEncodeU64(params.price)),
    // category: String
    bytesToBase64(bcsEncodeString(params.category)),
    // condition: String
    bytesToBase64(bcsEncodeString(params.condition)),
    // brand: String
    bytesToBase64(bcsEncodeString(brand)),
    // size: String
    bytesToBase64(bcsEncodeString(size)),
    // color: String
    bytesToBase64(bcsEncodeString(color)),
    // material: String
    bytesToBase64(bcsEncodeString(material)),
    // walrus_image_ids: vector<String>
    bytesToBase64(bcsEncodeVectorString(params.walrusImageIds)),
    // clock: &Clock (object reference, not pure)
    null, // Will be handled as object reference
  ]

  console.log('BCS encoded arguments:', arguments_bcs)

  // Build transaction kind
  const txKind = {
    kind: 'programmableTransaction',
    data: {
      version: 1,
      sender: senderAddress,
      gasData: {
        budget: '100000000', // 0.1 SUI
        price: '1000',
        owner: senderAddress,
      },
      inputs: [
        // Input 0: marketplace object
        {
          type: 'object',
          objectType: 'sharedObject',
          objectId: MARKETPLACE_ID,
          initialSharedVersion: '1',
          mutable: true,
        },
        // Input 1: item cap object
        {
          type: 'object',
          objectType: 'sharedObject',
          objectId: ITEM_CAP_ID,
          initialSharedVersion: '1',
          mutable: false,
        },
        // Input 2: title (pure)
        {
          type: 'pure',
          valueType: 'string',
          value: arguments_bcs[2],
        },
        // Input 3: description (pure)
        {
          type: 'pure',
          valueType: 'string',
          value: arguments_bcs[3],
        },
        // Input 4: price (pure)
        {
          type: 'pure',
          valueType: 'u64',
          value: arguments_bcs[4],
        },
        // Input 5: category (pure)
        {
          type: 'pure',
          valueType: 'string',
          value: arguments_bcs[5],
        },
        // Input 6: condition (pure)
        {
          type: 'pure',
          valueType: 'string',
          value: arguments_bcs[6],
        },
        // Input 7: brand (pure)
        {
          type: 'pure',
          valueType: 'string',
          value: arguments_bcs[7],
        },
        // Input 8: size (pure)
        {
          type: 'pure',
          valueType: 'string',
          value: arguments_bcs[8],
        },
        // Input 9: color (pure)
        {
          type: 'pure',
          valueType: 'string',
          value: arguments_bcs[9],
        },
        // Input 10: material (pure)
        {
          type: 'pure',
          valueType: 'string',
          value: arguments_bcs[10],
        },
        // Input 11: walrus_image_ids (pure vector)
        {
          type: 'pure',
          valueType: 'vector<string>',
          value: arguments_bcs[11],
        },
        // Input 12: clock object
        {
          type: 'object',
          objectType: 'sharedObject',
          objectId: CLOCK_ID,
          initialSharedVersion: '1',
          mutable: false,
        },
      ],
      commands: [
        {
          kind: 'moveCall',
          target: `${packageId}::${MODULE_NAME}::create_item`,
          arguments: [
            { kind: 'Input', index: 0 },  // marketplace
            { kind: 'Input', index: 1 },  // cap
            { kind: 'Input', index: 2 },  // title
            { kind: 'Input', index: 3 },  // description
            { kind: 'Input', index: 4 },  // price
            { kind: 'Input', index: 5 },  // category
            { kind: 'Input', index: 6 },  // condition
            { kind: 'Input', index: 7 },  // brand
            { kind: 'Input', index: 8 },  // size
            { kind: 'Input', index: 9 },  // color
            { kind: 'Input', index: 10 }, // material
            { kind: 'Input', index: 11 }, // walrus_image_ids
            { kind: 'Input', index: 12 }, // clock
          ],
          typeArguments: [],
        },
      ],
    },
  }

  // Get gas price from chain
  const referenceGasPrice = await callJsonRpc<string>('suix_getReferenceGasPrice', [])

  // Build transaction bytes
  const txBytesResult = await callJsonRpc<{ txBytes: string }>('unsafe_txBytes', [txKind])

  return {
    txBytes: txBytesResult.txBytes,
    gasPrice: referenceGasPrice,
  }
}

/**
 * Execute a transaction via wallet signature
 */
export async function executeTransactionRpc(
  txBytes: string,
  signature: string,
  publicKey: string
): Promise<any> {
  console.log('=== Executing Transaction via JSON-RPC ===')

  const result = await callJsonRpc('sui_executeTransactionBlock', [
    txBytes,
    [signature],
    {
      showEffects: true,
      showObjectChanges: true,
      showEvents: true,
    },
  ])

  return result
}
