"use client"

import Image from "next/image"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useWallet } from "@suiet/wallet-kit"
import { Button } from "@/components/ui/button"
import { getItemById } from "@/lib/sui/queries"
import type { ThriftItemObject } from "@/lib/types/sui-objects"
import { mistToSui } from "@/lib/types/sui-objects"

/**
 * Item Detail Page - View full item details
 * 
 * Current: Loads mock data from CSV
 * TODO: Replace with blockchain query getItemById(objectId)
 * 
 * Features:
 * - Full image gallery with thumbnails
 * - Complete item details (title, description, price, category, tags)
 * - Seller information
 * - Action buttons (Make Offer if not owner, Cancel Listing if owner)
 * - Retro-themed styling
 */
export default function ItemDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { connected, account } = useWallet()

  const { id } = params

  const [item, setItem] = useState<ThriftItemObject | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [imageError, setImageError] = useState(false)

  const loadItem = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const fetchedItem = await getItemById(id)

      if (!fetchedItem) {
        setError('Item not found')
        setItem(null)
      } else {
        setSelectedImageIndex(0)
        setImageError(false)
        setItem(fetchedItem)
      }
    } catch (err) {
      console.error('Error loading item:', err)
      setError('Failed to load item. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    window.scrollTo(0, 0)
    void loadItem()
  }, [loadItem])

  // Format price from MIST to SUI
  const formatPrice = (price: string | bigint) => {
    return mistToSui(price).toFixed(2)
  }

  // Shorten wallet address
  const shortenAddress = (addr: string) => {
    if (addr.length <= 10) return addr
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  // Get image URL (handles Walrus blob IDs and direct URLs)
  const getImageUrl = (imageId: string) => {
    if (imageId.startsWith('mock_blob_')) return null
    if (imageId.startsWith('http://') || imageId.startsWith('https://')) {
      return imageId
    }
    return `https://aggregator.walrus-testnet.walrus.space/v1/${imageId}`
  }

  // Check if current user is the owner
  const isOwner = account?.address && item?.fields.seller === account.address

  // Handle Make Offer click
  const handleMakeOffer = () => {
    if (!connected) {
      alert('Please connect your wallet first')
      return
    }
    // TODO: Implement offer modal (Task 2.8)
    alert('Make Offer functionality coming soon!')
  }

  // Handle Cancel Listing click
  const handleCancelListing = () => {
    if (!connected) {
      alert('Please connect your wallet first')
      return
    }
    // TODO: Implement cancel listing transaction
    alert('Cancel Listing functionality coming soon!')
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="retro-card retro-shadow p-8 text-center">
            <div className="text-4xl mb-3">⏳</div>
            <p className="text-lg font-bold">Loading item...</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !item) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="retro-card retro-shadow p-8 bg-red-50 border-2 border-red-500 text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <h2 className="text-2xl font-bold mb-2">Item Not Found</h2>
            <p className="opacity-80 mb-6">{error || 'The item you are looking for does not exist.'}</p>
            <Button onClick={() => router.push('/listings')}>
              Back to Listings
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const fields = item.fields
  const walrusImageIds = (fields.walrus_image_ids || []) as string[]
  const currentImageId = walrusImageIds[selectedImageIndex] || ''
  const currentImageUrl = currentImageId ? getImageUrl(currentImageId) : null

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="retro-btn retro-shadow px-4 py-2 mb-6 bg-white hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
        >
          ← Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left column - Images */}
          <div className="space-y-4">
            {/* Main image */}
            <div className="retro-card retro-shadow overflow-hidden">
              <div className="relative aspect-square bg-gray-100">
                {currentImageUrl && !imageError ? (
                  <Image
                    src={currentImageUrl}
                    alt={fields.title}
                    fill
                    sizes="(min-width: 1024px) 600px, 100vw"
                    onError={() => setImageError(true)}
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center px-4">
                      <div className="text-8xl mb-4">📦</div>
                      <div className="text-lg font-bold opacity-60">No Image</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Thumbnail gallery */}
            {walrusImageIds.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {walrusImageIds.map((imageId: string, index: number) => {
                  const thumbUrl = getImageUrl(imageId)
                  return (
                    <button
                      key={`${imageId}-${index}`}
                      onClick={() => {
                        setSelectedImageIndex(index)
                        setImageError(false)
                      }}
                      className={`retro-card aspect-square overflow-hidden border-2 ${
                        selectedImageIndex === index
                          ? 'border-black shadow-lg'
                          : 'border-gray-300 hover:border-black'
                      } transition-all`}
                    >
                      {thumbUrl ? (
                        <Image
                          src={thumbUrl}
                          alt={`${fields.title} ${index + 1}`}
                          fill
                          sizes="120px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <span className="text-2xl">📦</span>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right column - Details */}
          <div className="space-y-6">
            {/* Title and Category */}
            <div className="retro-card retro-shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <h1 className="text-3xl font-black leading-tight flex-1">
                  {fields.title}
                </h1>
                <div className="bg-black text-white px-3 py-1 text-xs font-bold uppercase ml-4">
                  {fields.category}
                </div>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl font-black">{formatPrice(fields.price)}</span>
                <span className="text-xl font-bold opacity-60">SUI</span>
              </div>

              {/* Seller */}
              <div className="pt-4 border-t-2 border-black border-dashed">
                <div className="flex items-center justify-between">
                  <span className="text-sm opacity-60 font-semibold">Seller:</span>
                  <span className="font-mono font-bold">{shortenAddress(fields.seller)}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="retro-card retro-shadow p-6">
              <h2 className="text-xl font-black mb-3">Description</h2>
              <p className="text-base leading-relaxed opacity-80 whitespace-pre-line">
                {fields.description}
              </p>
            </div>

            {/* Item Metadata */}
            <div className="retro-card retro-shadow p-6">
              <h2 className="text-xl font-black mb-3">Item Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-semibold">Condition:</span>
                  <span className="ml-2 opacity-80">{fields.condition || 'Unknown'}</span>
                </div>
                <div>
                  <span className="font-semibold">Brand:</span>
                  <span className="ml-2 opacity-80">{fields.brand || 'Unknown'}</span>
                </div>
                <div>
                  <span className="font-semibold">Size:</span>
                  <span className="ml-2 opacity-80">{fields.size || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-semibold">Color:</span>
                  <span className="ml-2 opacity-80">{fields.color || 'N/A'}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="font-semibold">Material:</span>
                  <span className="ml-2 opacity-80">{fields.material || 'N/A'}</span>
                </div>
              </div>
              {fields.tags && fields.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {fields.tags.map((tag: string) => (
                    <span key={tag} className="text-xs uppercase font-bold bg-black text-white px-2 py-1">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="retro-card retro-shadow p-6">
              {!connected ? (
                <div className="text-center p-4">
                  <p className="text-sm opacity-80 mb-3">
                    Connect your wallet to interact with this item
                  </p>
                  <Button onClick={() => router.push('/')}>
                    Connect Wallet
                  </Button>
                </div>
              ) : isOwner ? (
                <div className="space-y-3">
                  <p className="text-sm opacity-80 mb-3">
                    You own this item
                  </p>
                  <Button
                    onClick={handleCancelListing}
                    variant="outline"
                    className="w-full"
                  >
                    Cancel Listing
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Button
                    onClick={handleMakeOffer}
                    className="w-full h-12 text-base"
                  >
                    💰 Make an Offer
                  </Button>
                  <p className="text-xs opacity-60 text-center">
                    Submit your offer and negotiate with the seller
                  </p>
                </div>
              )}
            </div>

            {/* Blockchain Info */}
            <div className="retro-card retro-shadow p-6 bg-blue-50 border-2 border-blue-500">
              <h3 className="text-sm font-black mb-2">🔗 Blockchain Details</h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="opacity-60">Object ID:</span>
                  <span className="font-mono">{shortenAddress(item.objectId)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Network:</span>
                  <span className="font-bold">Sui Testnet</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Storage:</span>
                  <span className="font-bold">Walrus</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
