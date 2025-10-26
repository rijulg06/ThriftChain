"use client"

import { useState, useRef } from "react"
import { useWallet } from "@suiet/wallet-kit"
import { buildCreateItemTransaction } from "@/lib/sui/transactions"
import { suiClient } from "@/lib/sui/client"
import { Button } from "./ui/button"
import { LoginModal } from "./LoginModal"
import { uploadMultipleToWalrus } from "@/lib/walrus/upload"
import type { CreateItemParams } from "@/lib/types/sui-objects"

interface UploadedImage {
  file: File
  preview: string
  blobId?: string
  uploading: boolean
}

const CATEGORIES = [
  "Clothing",
  "Shoes",
  "Accessories",
  "Electronics",
  "Books",
  "Home & Garden",
  "Sports",
  "Other"
]

export function ItemForm() {
  const wallet = useWallet()
  const { connected, account } = wallet
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [category, setCategory] = useState(CATEGORIES[0])
  const [tags, setTags] = useState("")
  const [images, setImages] = useState<UploadedImage[]>([])

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loginModalOpen, setLoginModalOpen] = useState(false)

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    // Validate number of images (max 5)
    if (images.length + files.length > 5) {
      setError("Maximum 5 images allowed")
      return
    }

    // Create preview URLs
    const newImages: UploadedImage[] = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: false
    }))

    setImages(prev => [...prev, ...newImages])
    setError(null)
  }

  // Remove image
  const handleRemoveImage = (index: number) => {
    setImages(prev => {
      const updated = [...prev]
      URL.revokeObjectURL(updated[index].preview)
      updated.splice(index, 1)
      return updated
    })
  }

  // Upload single image to Walrus
  const uploadImage = async (image: UploadedImage, index: number): Promise<string> => {
    setImages(prev => {
      const updated = [...prev]
      updated[index].uploading = true
      return updated
    })

    try {
      // Validate file size
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (image.file.size > maxSize) {
        throw new Error(`Image "${image.file.name}" is too large (${(image.file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 10MB.`)
      }

      console.log(`Uploading image: ${image.file.name}, size: ${(image.file.size / 1024).toFixed(2)}KB`)

      // TEMPORARY: Use mock blob IDs until smart contracts are deployed
      console.warn('[TEMP] Using mock blob ID - Walrus integration disabled for now')
      const mockBlobId = `mock_blob_${Date.now()}_${Math.random().toString(36).substring(7)}`
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 500))

      setImages(prev => {
        const updated = [...prev]
        updated[index].blobId = mockBlobId
        updated[index].uploading = false
        return updated
      })

      console.log(`Generated mock blob ID: ${mockBlobId}`)
      return mockBlobId
    } catch (error) {
      console.error('Error uploading image:', error)
      setImages(prev => {
        const updated = [...prev]
        updated[index].uploading = false
        return updated
      })
      throw error
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    // Validation
    if (!connected || !account) {
      setError("Please connect your wallet first")
      return
    }

    if (!title.trim()) {
      setError("Title is required")
      return
    }

    if (!description.trim()) {
      setError("Description is required")
      return
    }

    if (!price || parseFloat(price) <= 0) {
      setError("Please enter a valid price")
      return
    }

    if (images.length === 0) {
      setError("At least one image is required")
      return
    }

    setIsSubmitting(true)

    try {
      // Upload images to Walrus decentralized storage
      console.log(`Uploading ${images.length} images to Walrus...`)

      let blobIds: string[]
      try {
        // Upload all images and get blob IDs
        blobIds = await uploadMultipleToWalrus(
          images.map(img => img.file),  // Extract File objects from UploadedImage[]
          (completed, total) => {
            // Progress callback - logs to console
            // Later we could show a progress bar to user
            console.log(`Upload progress: ${completed}/${total}`)
          }
        )

        console.log('✓ All images uploaded to Walrus:', blobIds)

      } catch (uploadError) {
        // If upload fails, show error to user and stop
        console.error('Walrus upload failed:', uploadError)
        setError(
          uploadError instanceof Error
            ? `Failed to upload images: ${uploadError.message}`
            : 'Failed to upload images to Walrus'
        )
        setIsSubmitting(false)
        return  // Exit early, don't proceed with transaction
      }

      // Parse tags
      const tagArray = tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0)

      // Convert price to MIST (1 SUI = 10^9 MIST)
      const priceInSui = parseFloat(price)
      const priceInMist = BigInt(Math.floor(priceInSui * 1_000_000_000))

      // Build transaction parameters
      const params: CreateItemParams = {
        title: title.trim(),
        description: description.trim(),
        price: priceInMist,
        currency: "SUI",
        category,
        tags: tagArray,
        walrusImageIds: blobIds,
      }

      // Build transaction
      console.log('[TEMP] Building transaction with params:', params)
      const tx = buildCreateItemTransaction(params)

      console.log('[TEMP] Transaction built successfully (empty for now)')
      console.log('[TEMP] Would execute transaction here once smart contracts are deployed')

      // TEMPORARY: Simulate success without actually executing
      setSuccess(true)
      
      // Reset form
      setTitle("")
      setDescription("")
      setPrice("")
      setCategory(CATEGORIES[0])
      setTags("")
      setImages([])
      
      // Don't redirect yet - just show success message
      console.log('[TEMP] Item listing prepared (not actually created on-chain yet)')

    } catch (err) {
      console.error('Error creating item:', err)
      setError(err instanceof Error ? err.message : 'Failed to create item listing')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!connected) {
    return (
      <>
        <div className="retro-card retro-shadow p-6 text-center">
          <h2 className="text-xl mb-3">Wallet Not Connected</h2>
          <p className="opacity-80 mb-4">Please connect your wallet to list an item</p>
          <Button onClick={() => setLoginModalOpen(true)}>
            Connect Wallet
          </Button>
        </div>
        <LoginModal open={loginModalOpen} onOpenChange={setLoginModalOpen} />
      </>
    )
  }

  if (success) {
    return (
      <div className="retro-card retro-shadow p-6 text-center">
        <div className="text-4xl mb-3">✓</div>
        <h2 className="text-xl mb-3">Your item has been listed!</h2>
        <p className="opacity-80 mb-4">Item listed successfully. Check item status and offers through your dashboard.</p>
        <Button onClick={() => setSuccess(false)}>
          Create Another Listing
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title */}
      <div className="retro-card retro-shadow p-4">
        <label className="block text-sm font-semibold mb-2">
          Title *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Vintage Denim Jacket"
          className="w-full px-3 py-2 border-2 border-black bg-white outline-none focus:border-black/70"
          maxLength={100}
          required
        />
        <div className="text-xs opacity-60 mt-1">{title.length}/100</div>
      </div>

      {/* Description */}
      <div className="retro-card retro-shadow p-4">
        <label className="block text-sm font-semibold mb-2">
          Description *
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your item in detail..."
          className="w-full px-3 py-2 border-2 border-black bg-white outline-none focus:border-black/70 min-h-[120px]"
          maxLength={1000}
          required
        />
        <div className="text-xs opacity-60 mt-1">{description.length}/1000</div>
      </div>

      {/* Price and Category */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="retro-card retro-shadow p-4">
          <label className="block text-sm font-semibold mb-2">
            Price (SUI) *
          </label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            className="w-full px-3 py-2 border-2 border-black bg-white outline-none focus:border-black/70"
            required
          />
        </div>

        <div className="retro-card retro-shadow p-4">
          <label className="block text-sm font-semibold mb-2">
            Category *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border-2 border-black bg-white outline-none focus:border-black/70"
            required
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tags */}
      <div className="retro-card retro-shadow p-4">
        <label className="block text-sm font-semibold mb-2">
          Tags (comma-separated)
        </label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="vintage, denim, jacket, 90s"
          className="w-full px-3 py-2 border-2 border-black bg-white outline-none focus:border-black/70"
        />
        <div className="text-xs opacity-60 mt-1">
          Add tags to help buyers find your item
        </div>
      </div>

      {/* Images */}
      <div className="retro-card retro-shadow p-4">
        <label className="block text-sm font-semibold mb-2">
          Images * (Max 5)
        </label>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageSelect}
          className="hidden"
        />

        <div className="space-y-3">
          {/* Image previews */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((img, idx) => (
                <div key={idx} className="relative retro-card border-2 border-black aspect-square">
                  <img
                    src={img.preview}
                    alt={`Preview ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {img.uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs">
                      Uploading...
                    </div>
                  )}
                  {img.blobId && (
                    <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-2 py-1">
                      ✓
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 flex items-center justify-center hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add images button */}
          {images.length < 5 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              + Add Images ({images.length}/5)
            </Button>
          )}
        </div>

        <div className="text-xs opacity-60 mt-2">
          Images will be stored on Walrus decentralized storage
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="retro-card p-4 bg-red-50 border-2 border-red-500">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Submit button */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-12 text-base"
      >
        {isSubmitting ? 'Creating Listing...' : 'List Item on Blockchain'}
      </Button>

      <p className="text-xs opacity-60 text-center">
        By listing, you confirm the item information is accurate and you own the item.
      </p>
    </form>
  )
}
