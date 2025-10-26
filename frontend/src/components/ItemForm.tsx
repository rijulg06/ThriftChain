"use client"

import Image from "next/image"
import { useState, useRef } from "react"
import { useWallet } from "@suiet/wallet-kit"
import { buildCreateItemTransaction, extractItemIdFromEvent } from "@/lib/sui/transactions"
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

const CONDITIONS = [
  "New",
  "Like New",
  "Excellent",
  "Good",
  "Fair",
  "Needs Repair"
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
  const [condition, setCondition] = useState(CONDITIONS[0])
  const [brand, setBrand] = useState("")
  const [size, setSize] = useState("")
  const [color, setColor] = useState("")
  const [material, setMaterial] = useState("")
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

      setImages(prev => prev.map(image => ({ ...image, uploading: true })))

      // Declare blobIds outside try block so it's accessible later
      let blobIds: string[] = []
      
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

        setImages(prev =>
          prev.map((image, index) => ({
            ...image,
            blobId: blobIds[index] ?? image.blobId,
            uploading: false,
          }))
        )

      } catch (uploadError) {
        // If upload fails, show error to user and stop
        console.error('Walrus upload failed:', uploadError)
        setImages(prev => prev.map(image => ({ ...image, uploading: false })))
        setError(
          uploadError instanceof Error
            ? `Failed to upload images: ${uploadError.message}`
            : 'Failed to upload images to Walrus'
        )
        setIsSubmitting(false)
        return  // Exit early, don't proceed with transaction
      }

      // Convert price to MIST (1 SUI = 10^9 MIST)
      const priceInSui = parseFloat(price)
      const priceInMist = BigInt(Math.floor(priceInSui * 1_000_000_000))

      // Validate blobIds before proceeding
      console.log('BlobIds type:', typeof blobIds, 'isArray:', Array.isArray(blobIds), 'value:', blobIds)

      if (!Array.isArray(blobIds) || blobIds.length === 0) {
        throw new Error('No valid blob IDs from Walrus upload')
      }

      // Step 1: Build transaction parameters (WITH Walrus blob IDs)
      const params: CreateItemParams = {
        title: title.trim(),
        description: description.trim(),
        price: priceInMist,
        category,
        condition,
        brand: brand.trim(),
        size: size.trim(),
        color: color.trim(),
        material: material.trim(),
        walrusImageIds: blobIds, // Pass Walrus blob IDs to be stored on-chain
      }

      // Build transaction with BCS serialization
      console.log('Building transaction to create item on-chain...')
      console.log('Transaction params:', { ...params, price: params.price.toString() })

      const transaction = buildCreateItemTransaction(params)

      // Step 3: Execute transaction with wallet (using modern Wallet Standard API)
      console.log('Signing and executing transaction...')

      // Modern Wallet Standard API returns BCS-encoded effects
      const result = await wallet.signAndExecuteTransaction({
        transaction: transaction,
      })

      console.log('✓ Transaction executed with digest:', result.digest)
      console.log('Raw result:', result)

      // Wait for transaction to be indexed and fetch full details
      console.log('Fetching transaction details...')
      const txResult = await suiClient.waitForTransaction({
        digest: result.digest,
        options: {
          showEffects: true,
          showObjectChanges: true,
          showEvents: true, // IMPORTANT: Need this to get ItemCreated event
        },
      })

      console.log('✓ Transaction details fetched:', txResult)

      // Check if transaction was successful
      if (txResult.effects?.status?.status !== 'success') {
        console.error('Transaction failed:', txResult);
        throw new Error(`Transaction failed: ${txResult.effects?.status?.error || 'Unknown error'}`);
      }

      console.log('✓ Item created successfully on blockchain')

      // Step 4: Extract the item ID from the ItemCreated event
      // Items in Tables don't appear in objectChanges, but the event has the ID
      const suiObjectId = extractItemIdFromEvent(txResult);
      if (!suiObjectId) {
        console.error('No item ID found in ItemCreated event:', txResult);
        throw new Error('Failed to extract item ID from transaction event');
      }

      console.log('✓ Item object ID from event:', suiObjectId);

      // Step 5: Generate AI embeddings and index for search
      console.log('\n' + '='.repeat(60));
      console.log('🔵 Starting AI indexing for item:', suiObjectId);
      console.log('='.repeat(60));

      try {
        // Convert images to base64 for AI processing
        console.log('📸 Converting', images.length, 'images to base64...');
        const base64Images = await Promise.all(
          images.map(async (img) => {
            return new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(img.file);
            });
          })
        );
        console.log('✅ Images converted to base64');

        // Call AI indexing API
        console.log('🚀 Calling /api/ai/index-item...');
        console.log('Payload:', {
          sui_object_id: suiObjectId,
          title: title.substring(0, 30) + '...',
          description: description.substring(0, 30) + '...',
          images: base64Images.length + ' base64 strings'
        });

        const indexResponse = await fetch('/api/ai/index-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sui_object_id: suiObjectId,
            title,
            description,
            images: base64Images,
          }),
        });

        console.log('📡 API Response status:', indexResponse.status, indexResponse.statusText);

        if (!indexResponse.ok) {
          const errorData = await indexResponse.json();
          console.error('🔴 AI indexing FAILED:', errorData);
          console.error('Error details:', JSON.stringify(errorData, null, 2));
          console.warn('⚠️  Item created on blockchain but NOT AI-searchable yet');
          console.warn('⚠️  You can still browse it directly at /listings (without search)');
          // Not fatal - item is on blockchain, just not AI-searchable yet
        } else {
          const indexResult = await indexResponse.json();
          console.log('✅ AI embeddings generated and indexed successfully!');
          console.log('Result:', JSON.stringify(indexResult, null, 2));
        }
      } catch (indexError) {
        console.error('🔴 Exception during AI indexing:', indexError);
        console.error('Error type:', indexError instanceof Error ? indexError.constructor.name : typeof indexError);
        console.error('Error message:', indexError instanceof Error ? indexError.message : String(indexError));
        if (indexError instanceof Error && indexError.stack) {
          console.error('Stack trace:', indexError.stack);
        }
        console.warn('⚠️  Item created on blockchain but NOT AI-searchable yet');
        // Continue - item is still on blockchain
      }

      console.log('='.repeat(60) + '\n');

      console.log('✅ Item listing complete! Item is on blockchain.')
      console.log('📍 Item ID:', suiObjectId)
      console.log('🔗 View at: http://localhost:3000/listings')

      setSuccess(true)
      
      // Reset form
      setTitle("")
      setDescription("")
      setPrice("")
      setCategory(CATEGORIES[0])
      setCondition(CONDITIONS[0])
      setBrand("")
      setSize("")
      setColor("")
      setMaterial("")
      setImages([])

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
    // Scroll to the top of the page when success is true
    window.scrollTo({ top: 0, behavior: 'smooth' });

    return (
      <div className="retro-card retro-shadow p-6 text-center">
        <div className="text-4xl mb-3">✓</div>
        <h2 className="text-xl mb-3">Your item has been listed!</h2>
        <p className="opacity-80 mb-4">Item listed successfully. Check item status and offers through your dashboard.</p>
        <Button onClick={() => setSuccess(false)}>
          Create Another Listing
        </Button>
      </div>
    );
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

      {/* Condition and Brand */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="retro-card retro-shadow p-4">
          <label className="block text-sm font-semibold mb-2">
            Condition *
          </label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="w-full px-3 py-2 border-2 border-black bg-white outline-none focus:border-black/70"
            required
          >
            {CONDITIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div className="retro-card retro-shadow p-4">
          <label className="block text-sm font-semibold mb-2">
            Brand
          </label>
          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="e.g., Levi's"
            className="w-full px-3 py-2 border-2 border-black bg-white outline-none focus:border-black/70"
            maxLength={60}
          />
        </div>
      </div>

      {/* Size and Color */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="retro-card retro-shadow p-4">
          <label className="block text-sm font-semibold mb-2">
            Size
          </label>
          <input
            type="text"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder="e.g., M, 32W"
            className="w-full px-3 py-2 border-2 border-black bg-white outline-none focus:border-black/70"
            maxLength={30}
          />
        </div>

        <div className="retro-card retro-shadow p-4">
          <label className="block text-sm font-semibold mb-2">
            Color
          </label>
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="e.g., Dark Blue"
            className="w-full px-3 py-2 border-2 border-black bg-white outline-none focus:border-black/70"
            maxLength={40}
          />
        </div>
      </div>

      {/* Material */}
      <div className="retro-card retro-shadow p-4">
        <label className="block text-sm font-semibold mb-2">
          Material
        </label>
        <input
          type="text"
          value={material}
          onChange={(e) => setMaterial(e.target.value)}
          placeholder="e.g., 100% Cotton"
          className="w-full px-3 py-2 border-2 border-black bg-white outline-none focus:border-black/70"
          maxLength={80}
        />
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
                <div key={idx} className="relative retro-card border-2 border-black aspect-square overflow-hidden">
                  <Image
                    src={img.preview}
                    alt={`Preview ${idx + 1}`}
                    fill
                    sizes="(min-width: 640px) 160px, 40vw"
                    className="object-cover"
                    unoptimized
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
