"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { getWalrusBlobUrl } from "@/lib/walrus/upload"

export interface CompactItemCardProps {
  objectId: string
  title: string
  price: bigint
  currency: string
  category: string
  walrusImageIds: string[]
}

/**
 * CompactItemCard - Minimal item card for carousels
 * 
 * Features:
 * - Horizontal layout (image left, info right)
 * - Smaller text
 * - No seller details
 * - Just title, price, and category
 */
export function CompactItemCard({
  objectId,
  title,
  price,
  currency,
  category,
  walrusImageIds,
}: CompactItemCardProps) {
  const router = useRouter()
  const [imageError, setImageError] = useState(false)

  // Format price from MIST to SUI
  const priceInSui = Number(price) / 1_000_000_000
  const formattedPrice = priceInSui.toFixed(2)

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
      className="retro-card retro-shadow cursor-pointer hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-150 overflow-hidden flex h-48 w-120"
    >
      {/* Image - Left side */}
      <div className="relative w-48 flex-shrink-0 bg-gray-100 border-r-2 border-black">
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={title}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-5xl">📦</div>
          </div>
        )}
        
        {/* Category Badge */}
        <div className="absolute top-1 left-1 bg-black text-white px-1.5 py-0.5 text-[10px] font-bold uppercase">
          {category}
        </div>
      </div>

      {/* Content - Right side */}
      <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
        {/* Title */}
        <h3 className="font-bold text-base line-clamp-3 leading-tight">
          {title}
        </h3>

        {/* Price */}
        <div className="flex items-baseline gap-1 mt-auto">
          <span className="text-2xl font-black">{formattedPrice}</span>
          <span className="text-sm font-bold opacity-60">{currency}</span>
        </div>
      </div>
    </div>
  )
}
