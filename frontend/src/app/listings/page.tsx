"use client"

import { useState, useEffect } from "react"
import { ItemCard, ItemCardSkeleton } from "@/components/ItemCard"
import { getMockListings } from "@/lib/data/mock-listings"
import type { ItemCardProps } from "@/components/ItemCard"

/**
 * Listings Page - Browse all marketplace items
 * 
 * Current: Loads mock data from CSV
 * TODO: Replace with blockchain queries once contracts deployed
 * 
 * Architecture:
 * - Uses getMockListings() which returns Promise<ItemCardProps[]>
 * - Easy swap: change import to use blockchain query with same signature
 * - Responsive grid layout
 * - Loading states with skeleton loaders
 * - Empty state handling
 */
export default function ListingsPage() {
  const [items, setItems] = useState<ItemCardProps[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // CURRENT: Load from CSV
      const data = await getMockListings()
      
      // TODO: Replace with blockchain query
      // import { getAllItems } from '@/lib/sui/queries'
      // const data = await getAllItems()
      
      setItems(data)
    } catch (err) {
      console.error('Error loading items:', err)
      setError('Failed to load listings. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="retro-card retro-shadow p-6 mb-8">
          <h1 className="text-4xl font-black mb-2">Browse Listings</h1>
          <p className="text-lg opacity-80">
            Discover unique thrifted items on the blockchain
          </p>
          
          {/* Stats */}
          {!loading && items.length > 0 && (
            <div className="mt-4 pt-4 border-t-2 border-black border-dashed">
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="font-bold">{items.length}</span>
                  <span className="opacity-60 ml-1">items listed</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Search & Filters Section - Placeholder for future */}
        {/* TODO: Add search bar (Task 3.5) and filters (Task 5.6) */}

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <ItemCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="retro-card retro-shadow p-6 bg-red-50 border-2 border-red-500 text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <h2 className="text-xl font-bold mb-2">Oops!</h2>
            <p className="opacity-80 mb-4">{error}</p>
            <button
              onClick={loadItems}
              className="retro-btn retro-shadow px-6 py-2 bg-white hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && items.length === 0 && (
          <div className="retro-card retro-shadow p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-2xl font-bold mb-2">No Items Yet</h2>
            <p className="text-lg opacity-80 mb-6">
              Be the first to list an item on ThriftChain!
            </p>
            <a
              href="/list-item"
              className="inline-block retro-btn retro-shadow px-8 py-3 bg-yellow-300 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
            >
              List Your First Item
            </a>
          </div>
        )}

        {/* Items Grid */}
        {!loading && !error && items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
              <ItemCard key={item.objectId} {...item} />
            ))}
          </div>
        )}

        {/* Load More - Placeholder for pagination */}
        {/* TODO: Add pagination (Task 5.3) */}
        {!loading && items.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-sm opacity-60">
              Showing all {items.length} items
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
