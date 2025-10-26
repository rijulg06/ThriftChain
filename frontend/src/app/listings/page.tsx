"use client"

import { Suspense, useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ItemCard, ItemCardSkeleton } from "@/components/ItemCard"
import { getAllItems, getItemsByIds } from "@/lib/sui/queries"
import { ItemStatus } from "@/lib/types/sui-objects"
import type { ItemCardProps } from "@/components/ItemCard"

/**
 * Listings Page - Browse all marketplace items with AI-powered search
 *
 * Features:
 * - Browse all items (no query)
 * - AI semantic search (with ?q= query parameter)
 * - Responsive grid layout
 * - Loading states with skeleton loaders
 * - Empty state handling
 */
function ListingsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [items, setItems] = useState<ItemCardProps[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')

  useEffect(() => {
    const query = searchParams.get('q')
    setSearchQuery(query || '')
    loadItems(query || '')
  }, [searchParams])

  const loadItems = async (query: string) => {
    setLoading(true)
    setError(null)

    try {
      let activeItems

      if (query.trim()) {
        // AI Search mode
        console.log(`🔍 AI Search: "${query}"`)

        // Call AI search API
        const searchResponse = await fetch('/api/ai/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            similarityThreshold: 0.3,  // Lower threshold for better recall
            maxResults: 50,
            useCombined: true,
          }),
        })

        if (!searchResponse.ok) {
          throw new Error('Search failed')
        }

        const searchResult = await searchResponse.json()
        console.log(`✓ Found ${searchResult.count} matching items`)

        if (searchResult.results.length === 0) {
          setItems([])
          setLoading(false)
          return
        }

        // Fetch items from blockchain using search results
        const itemsResponse = await getItemsByIds(searchResult.results)
        activeItems = itemsResponse.filter(item => item && item.fields.status === ItemStatus.Active)
      } else {
        // Browse all mode
        console.log('📋 Browsing all items')
        const response = await getAllItems(undefined, { limit: 100 })
        activeItems = response.data.filter(item => item.fields.status === ItemStatus.Active)
      }

      const mapped: ItemCardProps[] = activeItems.map(item => ({
        objectId: item.objectId,
        title: item.fields.title,
        priceMist: BigInt(item.fields.price),
        category: item.fields.category,
        walrusImageIds: item.fields.walrus_image_ids || [],
        seller: item.fields.seller,
      }))

      setItems(mapped)
    } catch (err) {
      console.error('Error loading items:', err)
      setError('Failed to load listings. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const query = searchQuery.trim()
    if (query) {
      router.push(`/listings?q=${encodeURIComponent(query)}`)
    } else {
      router.push('/listings')
    }
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="retro-card retro-shadow p-6 mb-8">
          <h1 className="text-4xl font-black mb-2">
            {searchParams.get('q') ? 'Search Results' : 'Browse Listings'}
          </h1>
          <p className="text-lg opacity-80">
            {searchParams.get('q')
              ? `AI-powered semantic search for: "${searchParams.get('q')}"`
              : 'Discover unique thrifted items on the blockchain'}
          </p>

          {/* Stats */}
          {!loading && items.length > 0 && (
            <div className="mt-4 pt-4 border-t-2 border-black border-dashed">
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="font-bold">{items.length}</span>
                  <span className="opacity-60 ml-1">{searchParams.get('q') ? 'results found' : 'items listed'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="retro-card retro-shadow p-4 mb-8">
          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by meaning: 'vintage leather jacket', 'warm winter coat'..."
              className="flex-1 px-4 py-2 border-2 border-black retro-card outline-none focus:shadow-[2px_2px_0px_rgba(0,0,0,1)]"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-black text-white retro-btn"
            >
              Search
            </button>
            {searchParams.get('q') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  router.push('/listings')
                }}
                className="px-4 py-2 border-2 border-black retro-btn"
              >
                Clear
              </button>
            )}
          </form>
        </div>

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
              onClick={() => loadItems(searchQuery)}
              className="retro-btn retro-shadow px-6 py-2 bg-white hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && items.length === 0 && (
          <div className="retro-card retro-shadow p-12 text-center">
            {searchParams.get('q') ? (
              <>
                <div className="text-6xl mb-4">🔍</div>
                <h2 className="text-2xl font-bold mb-2">No Results Found</h2>
                <p className="text-lg opacity-80 mb-6">
                  Try different search terms or browse all items
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('')
                    router.push('/listings')
                  }}
                  className="inline-block retro-btn retro-shadow px-8 py-3 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                >
                  Browse All Items
                </button>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">📦</div>
                <h2 className="text-2xl font-bold mb-2">No Items Yet</h2>
                <p className="text-lg opacity-80 mb-6">
                  Be the first to list an item on ThriftChain!
                </p>
                <a
                  href="/list-item"
                  className="inline-block retro-btn retro-shadow px-8 py-3 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                >
                  List Your First Item
                </a>
              </>
            )}
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

export default function ListingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-4xl mb-4">📦</div>
          <p>Loading listings...</p>
        </div>
      </div>
    }>
      <ListingsContent />
    </Suspense>
  )
}
