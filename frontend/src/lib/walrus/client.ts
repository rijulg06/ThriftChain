import { WalrusClient, TESTNET_WALRUS_PACKAGE_CONFIG } from '@mysten/walrus'
import type { WalrusBlob } from '@mysten/walrus'

/**
 * Walrus client configuration
 * For development/testing, using TESTNET_WALRUS_PACKAGE_CONFIG
 * In production, switch to MAINNET_WALRUS_PACKAGE_CONFIG
 */
const WALRUS_CONFIG = TESTNET_WALRUS_PACKAGE_CONFIG

/**
 * Creates a new Walrus client instance
 * @returns Walrus client ready for blob operations
 */
function createWalrusClient(): WalrusClient {
  return new WalrusClient({
    packageConfig: WALRUS_CONFIG,
  })
}

/**
 * Upload a file to Walrus decentralized storage
 * @param file - The file to upload (File, Blob, or ArrayBuffer)
 * @param metadata - Optional metadata to attach to the blob
 * @returns Promise resolving to WalrusBlob with blob ID and URL
 */
export async function uploadToWalrus(
  file: File | Blob | ArrayBuffer,
  metadata?: Record<string, string>
): Promise<WalrusBlob> {
  const client = createWalrusClient()
  
  try {
    // Create a WalrusBlob from the file
    const blob = new WalrusBlob(file, metadata)
    
    // Upload to Walrus
    const result = await client.upload(blob)
    
    return result
  } catch (error) {
    console.error('Error uploading to Walrus:', error)
    throw new Error(`Failed to upload to Walrus: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Upload multiple files to Walrus
 * @param files - Array of files to upload
 * @param onProgress - Optional callback for progress updates
 * @returns Promise resolving to array of WalrusBlob objects
 */
export async function uploadMultipleToWalrus(
  files: File[],
  onProgress?: (completed: number, total: number) => void
): Promise<WalrusBlob[]> {
  const results: WalrusBlob[] = []
  
  for (let i = 0; i < files.length; i++) {
    const blob = await uploadToWalrus(files[i])
    results.push(blob)
    
    if (onProgress) {
      onProgress(i + 1, files.length)
    }
  }
  
  return results
}

/**
 * Get a blob by its ID from Walrus
 * @param blobId - The blob ID to retrieve
 * @returns Promise resolving to WalrusBlob with data
 */
export async function getBlobFromWalrus(blobId: string): Promise<WalrusBlob> {
  const client = createWalrusClient()
  
  try {
    const blob = await client.get(blobId)
    return blob
  } catch (error) {
    console.error('Error getting blob from Walrus:', error)
    throw new Error(`Failed to get blob from Walrus: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get the public URL for a blob
 * @param blobId - The blob ID
 * @returns Public URL to access the blob
 */
export function getWalrusBlobUrl(blobId: string): string {
  // Walrus provides public URLs for uploaded blobs
  // The exact URL format depends on your Walrus configuration
  // This is a placeholder that should be updated based on actual Walrus implementation
  return `https://walrus.testnet.sui.io/blob/${blobId}`
}

/**
 * Validate file before uploading
 * @param file - File to validate
 * @param options - Validation options
 * @returns Validation result with errors if any
 */
export function validateFile(file: File, options?: {
  maxSize?: number // in bytes
  allowedTypes?: string[] // MIME types
}): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check file size
  if (options?.maxSize && file.size > options.maxSize) {
    errors.push(`File size exceeds maximum of ${options.maxSize / 1024 / 1024}MB`)
  }
  
  // Check file type
  if (options?.allowedTypes && !options.allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} not allowed. Allowed types: ${options.allowedTypes.join(', ')}`)
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Helper to convert WalrusBlob to a format suitable for database storage
 * @param blob - Walrus blob
 * @returns Database-compatible blob reference
 */
export function blobToDatabaseReference(blob: WalrusBlob): {
  blobId: string
  url: string
  size: number
  mimeType: string
  uploadedAt: Date
} {
  return {
    blobId: blob.id,
    url: getWalrusBlobUrl(blob.id),
    size: blob.size,
    mimeType: blob.type,
    uploadedAt: new Date(),
  }
}
