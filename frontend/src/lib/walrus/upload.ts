/**
 * Walrus HTTP API Integration
 *
 * This file provides simple HTTP-based functions to upload and retrieve
 * blobs from Walrus decentralized storage using public testnet endpoints.
 *
 * Why HTTP API instead of SDK (@mysten/walrus)?
 * - Simpler: No wallet signing required
 * - More reliable on testnet: Direct HTTP to public publishers
 * - Less complexity: Just fetch() calls, no smart contract interactions
 *
 * Architecture:
 * 1. Browser uploads file via HTTP PUT to Publisher
 * 2. Publisher stores file on Walrus network, returns blob ID
 * 3. Browser can later retrieve file via HTTP GET from Aggregator using blob ID
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Walrus publisher endpoint (handles uploads)
 * This is a public testnet service that accepts file uploads and stores them on Walrus
 * Multiple publishers available - see Walrus docs for full list
 * 
 * Note: The default publisher requires WAL token payment.
 * For free uploads on testnet, you can:
 * 1. Set up your own publisher with a funded wallet
 * 2. Use a sponsored publisher if available
 * 3. Add NEXT_PUBLIC_WALRUS_PUBLISHER_URL to .env.local
 */
const PUBLISHER_URL =
  process.env.NEXT_PUBLIC_WALRUS_PUBLISHER_URL ||
  'https://publisher-devnet.walrus.space'

/**
 * Walrus aggregator endpoint (handles downloads)
 * This is a public testnet service that retrieves blobs from Walrus storage
 */
const AGGREGATOR_URL =
  process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL ||
  'https://aggregator-devnet.walrus.space'

/**
 * Storage duration in epochs
 * 1 epoch = ~2 days on testnet
 * 183 epochs = ~1 year (maximum on testnet)
 */
const DEFAULT_EPOCHS =
  parseInt(process.env.NEXT_PUBLIC_WALRUS_STORAGE_EPOCHS || '183')

// ============================================================================
// TYPESCRIPT TYPES (For type safety)
// ============================================================================

/**
 * Response when a blob is newly created on Walrus
 * This is what the publisher returns when you upload a new file
 */
interface NewlyCreatedBlob {
  newlyCreated: {
    blobObject: {
      id: string           // Sui object ID (not the blob ID!)
      blobId: string       // THIS is what we need! (e.g., "Cmh2LQEG...")
      size: number         // File size in bytes
      encodingType: string // "RedStuff" (erasure coding algorithm)
      certifiedEpoch: number
      deletable: boolean   // false (we create permanent blobs)
      storage: {
        startEpoch: number
        endEpoch: number   // When storage expires
        storageSize: number
      }
    }
    cost: number  // Cost in FROST (1 WAL = 1 billion FROST)
  }
}

/**
 * Response when a blob already exists on Walrus
 * If you try to upload the same file twice, Walrus recognizes it
 * and just returns the existing blob ID (saves money!)
 */
interface AlreadyCertifiedBlob {
  alreadyCertified: {
    blobId: string  // Existing blob ID
    event: {
      txDigest: string    // Sui transaction that created it
      eventSeq: string
    }
    endEpoch: number  // When it expires
  }
}

/**
 * Union type: Response can be either newly created OR already certified
 */
type WalrusUploadResponse = NewlyCreatedBlob | AlreadyCertifiedBlob

// ============================================================================
// MAIN UPLOAD FUNCTION
// ============================================================================

/**
 * Upload a single file to Walrus decentralized storage
 *
 * How it works:
 * 1. Makes HTTP PUT request to Walrus publisher
 * 2. Publisher stores file across decentralized nodes using erasure coding
 * 3. Publisher returns blob ID (unique identifier for this file)
 *
 * @param file - Browser File object (from <input type="file">)
 * @param epochs - How many epochs to store (default: 183 = max testnet)
 * @returns Promise<string> - Blob ID (e.g., "Cmh2LQEGJwBYfmIC8duzK8FUE2UipCCrshAYjiUheZM")
 *
 * @example
 * const file = document.querySelector('input[type="file"]').files[0]
 * const blobId = await uploadToWalrus(file)
 * console.log('Uploaded! Blob ID:', blobId)
 * // Later, retrieve with: https://aggregator.../v1/blobs/{blobId}
 */
export async function uploadToWalrus(
  file: File | Blob,
  epochs: number = DEFAULT_EPOCHS
): Promise<string> {
  try {
    // Log what we're uploading (helpful for debugging)
    const fileName = file instanceof File ? file.name : 'blob'
    const fileSizeKB = (file.size / 1024).toFixed(2)
    console.log(`[Walrus] Uploading: ${fileName} (${fileSizeKB} KB)`)

    // DEBUG: Log environment variables being used
    console.log('[Walrus] DEBUG - Publisher URL:', PUBLISHER_URL)
    console.log('[Walrus] DEBUG - Aggregator URL:', AGGREGATOR_URL)
    console.log('[Walrus] DEBUG - Epochs:', epochs)

    // Build the upload URL with query parameter for storage duration
    // Example: https://publisher.../v1/blobs?epochs=183
    const uploadUrl = `${PUBLISHER_URL}/v1/blobs?epochs=${epochs}`
    console.log('[Walrus] DEBUG - Full upload URL:', uploadUrl)

    // Make HTTP PUT request to Walrus publisher
    // We send the raw file bytes as the request body
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,  // File object automatically sends as binary
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
    })

    // Check if upload failed
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Upload failed (${response.status}): ${errorText}`)
    }

    // Parse JSON response from publisher
    const result: WalrusUploadResponse = await response.json()

    // Extract blob ID from response
    // Response can be one of two shapes (see types above)
    let blobId: string

    if ('newlyCreated' in result) {
      // File was just uploaded
      blobId = result.newlyCreated.blobObject.blobId
      const cost = result.newlyCreated.cost
      const { startEpoch, endEpoch } = result.newlyCreated.blobObject.storage

      console.log(`[Walrus] ✓ New blob created: ${blobId}`)
      console.log(`[Walrus]   Storage: epoch ${startEpoch} → ${endEpoch}`)
      console.log(`[Walrus]   Cost: ${cost} FROST`)
    } else {
      // File already exists on Walrus (same content hash)
      blobId = result.alreadyCertified.blobId
      const endEpoch = result.alreadyCertified.endEpoch

      console.log(`[Walrus] ✓ Blob already exists: ${blobId}`)
      console.log(`[Walrus]   Valid until epoch: ${endEpoch}`)
    }

    return blobId

  } catch (error) {
    // Log error and re-throw with context
    console.error('[Walrus] Upload error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to upload to Walrus: ${message}`)
  }
}

// ============================================================================
// BATCH UPLOAD FUNCTION
// ============================================================================

/**
 * Upload multiple files to Walrus with progress tracking
 *
 * Why upload one at a time instead of parallel?
 * - Easier to track progress
 * - Less likely to overwhelm publisher
 * - Can show user "Uploading 2/5..." status
 *
 * @param files - Array of File objects to upload
 * @param onProgress - Optional callback called after each upload
 * @returns Promise<string[]> - Array of blob IDs in same order as files
 *
 * @example
 * const files = Array.from(document.querySelector('input').files)
 * const blobIds = await uploadMultipleToWalrus(files, (done, total) => {
 *   console.log(`Progress: ${done}/${total}`)
 *   updateProgressBar(done / total)
 * })
 */
export async function uploadMultipleToWalrus(
  files: File[],
  onProgress?: (completed: number, total: number) => void
): Promise<string[]> {
  const blobIds: string[] = []
  const totalFiles = files.length

  console.log(`[Walrus] Starting batch upload of ${totalFiles} files`)

  // Upload files sequentially (one at a time)
  for (let i = 0; i < files.length; i++) {
    const file = files[i]

    // Upload this file
    const blobId = await uploadToWalrus(file)
    blobIds.push(blobId)

    // Notify caller of progress (if callback provided)
    if (onProgress) {
      onProgress(i + 1, totalFiles)
    }
  }

  console.log(`[Walrus] ✓ Batch upload complete: ${blobIds.length} blobs`)
  return blobIds
}

// ============================================================================
// RETRIEVAL FUNCTIONS
// ============================================================================

/**
 * Get the public URL to retrieve a blob from Walrus
 *
 * This URL can be used directly in <img src="..."> tags
 * Browser will fetch the image from Walrus aggregator
 *
 * @param blobId - Blob ID from uploadToWalrus()
 * @returns Full URL to blob
 *
 * @example
 * const url = getWalrusBlobUrl("Cmh2LQEG...")
 * // Returns: "https://aggregator.walrus-testnet.../v1/blobs/Cmh2LQEG..."
 * // Use in HTML: <img src={url} />
 */
export function getWalrusBlobUrl(blobId: string): string {
  return `${AGGREGATOR_URL}/v1/blobs/${blobId}`
}

/**
 * Fetch blob data from Walrus (if you need the raw bytes)
 *
 * Usually you don't need this - just use getWalrusBlobUrl() in <img> tag
 * Use this if you need to process the blob data in JavaScript
 *
 * @param blobId - Blob ID to fetch
 * @returns Promise<Blob> - Raw blob data
 */
export async function fetchBlobFromWalrus(blobId: string): Promise<Blob> {
  try {
    const url = getWalrusBlobUrl(blobId)
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch blob: ${response.statusText}`)
    }

    return await response.blob()

  } catch (error) {
    console.error('[Walrus] Fetch error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to fetch from Walrus: ${message}`)
  }
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate file before uploading to Walrus
 *
 * Checks:
 * - File size (default max 10MB)
 * - File type (default: images only)
 *
 * @param file - File to validate
 * @param maxSizeMB - Maximum file size in megabytes
 * @param allowedTypes - Allowed MIME types
 * @returns Object with valid flag and optional error message
 *
 * @example
 * const validation = validateFileForWalrus(file)
 * if (!validation.valid) {
 *   alert(validation.error)  // "File size 15MB exceeds maximum of 10MB"
 * }
 */
export function validateFileForWalrus(
  file: File,
  maxSizeMB: number = 10,
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
): { valid: boolean; error?: string } {

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    const actualSizeMB = (file.size / 1024 / 1024).toFixed(2)
    return {
      valid: false,
      error: `File size ${actualSizeMB}MB exceeds maximum of ${maxSizeMB}MB`,
    }
  }

  // Check file type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} not allowed. Allowed: ${allowedTypes.join(', ')}`,
    }
  }

  // All checks passed
  return { valid: true }
}

/**
 * Check if Walrus publisher is accessible
 * Useful for showing "Walrus offline" warning to users
 *
 * @returns Promise<boolean> - true if publisher is reachable
 */
export async function checkWalrusHealth(): Promise<boolean> {
  try {
    // Just check if we can reach the API endpoint
    // HEAD request = faster than GET (no body returned)
    const response = await fetch(`${PUBLISHER_URL}/v1/api`, {
      method: 'HEAD',
      // Add timeout so we don't wait forever
      signal: AbortSignal.timeout(5000) // 5 second timeout
    })
    return response.ok
  } catch {
    // Any error = publisher not reachable
    return false
  }
}
