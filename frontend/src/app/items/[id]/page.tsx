"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useWallet } from "@suiet/wallet-kit"
import { Button } from "@/components/ui/button"
import { getMockListings } from "@/lib/data/mock-listings"
import type { ItemCardProps } from "@/components/ItemCard"

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
export default function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { connected, account } = useWallet()
  
  // Unwrap params Promise
  const { id } = use(params)
  
  const [item, setItem] = useState<ItemCardProps | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    // Scroll to top when page loads
    window.scrollTo(0, 0)
    loadItem()
  }, [id])

  const loadItem = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // CURRENT: Load from CSV mock data
      const allItems = await getMockListings()
      const foundItem = allItems.find(i => i.objectId === id)
      
      // TODO: Replace with blockchain query
      // import { getItemById } from '@/lib/sui/queries'
      // const foundItem = await getItemById(id)
      
      if (!foundItem) {
        setError('Item not found')
      } else {
        setItem(foundItem)
      }
    } catch (err) {
      console.error('Error loading item:', err)
      setError('Failed to load item. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Format price from MIST to SUI
  const formatPrice = (price: bigint) => {
    const priceInSui = Number(price) / 1_000_000_000
    return priceInSui.toFixed(2)
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
  const isOwner = account?.address && item?.seller === account.address

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

  const currentImageUrl = getImageUrl(item.walrusImageIds[selectedImageIndex])

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
                  <img
                    src={currentImageUrl}
                    alt={item.title}
                    onError={() => setImageError(true)}
                    className="w-full h-full object-cover"
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
            {item.walrusImageIds.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {item.walrusImageIds.map((imageId, index) => {
                  const thumbUrl = getImageUrl(imageId)
                  return (
                    <button
                      key={index}
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
                        <img
                          src={thumbUrl}
                          alt={`${item.title} ${index + 1}`}
                          className="w-full h-full object-cover"
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
                  {item.title}
                </h1>
                <div className="bg-black text-white px-3 py-1 text-xs font-bold uppercase ml-4">
                  {item.category}
                </div>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl font-black">{formatPrice(item.price)}</span>
                <span className="text-xl font-bold opacity-60">{item.currency}</span>
              </div>

              {/* Seller */}
              <div className="pt-4 border-t-2 border-black border-dashed">
                <div className="flex items-center justify-between">
                  <span className="text-sm opacity-60 font-semibold">Seller:</span>
                  <span className="font-mono font-bold">{shortenAddress(item.seller)}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="retro-card retro-shadow p-6">
              <h2 className="text-xl font-black mb-3">Description</h2>
              <p className="text-base leading-relaxed opacity-80">
                {/* TODO: Add description field to mock data */}
                This is a unique thrifted item available on ThriftChain. 
                All transactions are secured on the Sui blockchain with 
                images stored on Walrus decentralized storage.
              </p>
            </div>

            {/* Tags */}
            {/* TODO: Add tags display once available in data */}

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
