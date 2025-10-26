"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { getWalrusBlobUrl } from "@/lib/walrus/upload"

export interface ItemCardProps {
  objectId: string
  title: string
  price: bigint
  currency: string
  category: string
  walrusImageIds: string[]
  seller: string
}

/**
 * ItemCard component for displaying marketplace items
 * 
 * Features:
 * - Displays item image from Walrus (first image in array)
 * - Shows title, price, category
 * - Shows shortened seller address
 * - Click to navigate to item detail page
 * - Retro-themed styling matching the app design
 */
export function ItemCard({
  objectId,
  title,
  price,
  currency,
  category,
  walrusImageIds,
  seller,
}: ItemCardProps) {
  const router = useRouter()
  const [imageError, setImageError] = useState(false)

  // Format price from MIST to SUI (1 SUI = 10^9 MIST)
  const priceInSui = Number(price) / 1_000_000_000
  const formattedPrice = priceInSui.toFixed(2)

  // Shorten wallet address: 0x1234...5678
  const shortenAddress = (addr: string) => {
    if (addr.length <= 10) return addr
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  // Get image URL (handles Walrus blob IDs and direct URLs)
  const getImageUrl = () => {
    if (walrusImageIds.length === 0) return null

    const firstImage = walrusImageIds[0]

    // If it's a mock blob ID, return placeholder
    if (firstImage.startsWith('mock_blob_')) {
      return null
    }

    // If it's already a full URL (http/https), use it directly
    if (firstImage.startsWith('http://') || firstImage.startsWith('https://')) {
      return firstImage
    }

    // Otherwise, treat as Walrus blob ID and convert to full URL
    return getWalrusBlobUrl(firstImage)
  }

  const imageUrl = getImageUrl()

  const handleClick = () => {
    router.push(`/items/${objectId}`)
  }

  return (
    <div
      onClick={handleClick}
      className="retro-card retro-shadow cursor-pointer hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-150 overflow-hidden"
    >
      {/* Image Section */}
      <div className="relative aspect-square bg-gray-100 border-b-2 border-black">
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={title}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center px-4">
              <div className="text-6xl mb-2">📦</div>
              <div className="text-sm font-bold opacity-60">No Image</div>
            </div>
          </div>
        )}
        
        {/* Category Badge */}
        <div className="absolute top-2 left-2 bg-black text-white px-2 py-1 text-xs font-bold uppercase">
          {category}
        </div>

        {/* Multiple Images Indicator */}
        {walrusImageIds.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 text-xs font-bold">
            +{walrusImageIds.length - 1} more
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-2">
        {/* Title */}
        <h3 className="font-bold text-lg line-clamp-2 min-h-[3.5rem]">
          {title}
        </h3>

        {/* Price */}
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black">{formattedPrice}</span>
          <span className="text-sm font-bold opacity-60">{currency}</span>
        </div>

        {/* Seller */}
        <div className="pt-2 border-t-2 border-black border-dashed">
          <div className="flex items-center gap-2 text-xs">
            <span className="opacity-60 font-semibold">Seller:</span>
            <span className="font-mono font-bold">{shortenAddress(seller)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * ItemCardSkeleton - Loading placeholder
 */
export function ItemCardSkeleton() {
  return (
    <div className="retro-card retro-shadow overflow-hidden animate-pulse">
      {/* Image skeleton */}
      <div className="aspect-square bg-gray-200 border-b-2 border-black" />
      
      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        <div className="h-6 bg-gray-200 rounded w-3/4" />
        <div className="h-8 bg-gray-200 rounded w-1/2" />
        <div className="pt-2 border-t-2 border-black border-dashed">
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
      </div>
    </div>
  )
}
