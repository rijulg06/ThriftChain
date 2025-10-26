/**
 * Mock Listings Data Loader
 * 
 * This module loads mock data from CSV for development/testing.
 * 
 * ARCHITECTURE:
 * - Provides same interface as blockchain queries
 * - Easy to swap: change import in listings page
 * - Transforms CSV data to match ItemCardProps format
 * 
 * TODO: Replace with real blockchain queries once contracts deployed
 */

import type { ItemCardProps } from '@/components/ItemCard'

// Parse CSV manually (simple approach, no external libraries)
function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim())
  
  const results: Record<string, string>[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const values: string[] = []
    let currentValue = ''
    let insideQuotes = false
    
    // Handle CSV with commas inside quotes
    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      
      if (char === '"') {
        insideQuotes = !insideQuotes
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue.trim())
        currentValue = ''
      } else {
        currentValue += char
      }
    }
    values.push(currentValue.trim()) // Push last value
    
    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    results.push(row)
  }
  
  return results
}

// Transform CSV row to ItemCardProps format
function transformToItemCard(row: Record<string, string>, index: number): ItemCardProps {
  // Parse price - handle various formats
  const priceStr = row['Price'].replace('$', '').replace(',', '').trim()
  const priceInSui = parseFloat(priceStr)
  
  // Handle invalid prices
  if (isNaN(priceInSui) || priceInSui <= 0) {
    console.warn(`Invalid price for item: ${row['Product Name']}, using default 10 SUI`)
    const defaultPriceInMist = BigInt(10_000_000_000) // 10 SUI default
    
    // Generate CONSISTENT mock data (same ID for same product every time)
    const productHash = row['Product Name'].split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0)
    }, 0)
    const mockObjectId = `mock_obj_${index}_${Math.abs(productHash)}`
    const mockSeller = `0x${Math.abs(productHash).toString(16).slice(0, 8)}...${Math.abs(productHash).toString(16).slice(-4)}`
    
    return {
      objectId: mockObjectId,
      title: row['Product Name'],
      price: defaultPriceInMist,
      currency: 'SUI',
      category: row['Category'],
      walrusImageIds: [row['Main Photo URL']],
      seller: mockSeller,
    }
  }
  
  const priceInMist = BigInt(Math.floor(priceInSui * 1_000_000_000))
  
  // Generate CONSISTENT mock data (same ID for same product every time)
  // Use product name hash for consistent IDs across page loads
  const productHash = row['Product Name'].split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0)
  }, 0)
  const mockObjectId = `mock_obj_${index}_${Math.abs(productHash)}`
  const mockSeller = `0x${Math.abs(productHash).toString(16).slice(0, 8)}...${Math.abs(productHash).toString(16).slice(-4)}`
  
  // Use actual image URL from CSV (Depop images)
  const imageUrl = row['Main Photo URL']
  
  return {
    objectId: mockObjectId,
    title: row['Product Name'],
    price: priceInMist,
    currency: 'SUI',
    category: row['Category'],
    walrusImageIds: [imageUrl], // Using direct URL for now
    seller: mockSeller,
  }
}

/**
 * Fetch mock listings from CSV
 * 
 * This function mimics the signature of blockchain query functions
 * so it can be easily swapped later.
 * 
 * @returns Promise<ItemCardProps[]>
 */
export async function getMockListings(): Promise<ItemCardProps[]> {
  try {
    // Fetch CSV from public directory
    const response = await fetch('/mockdata.csv')
    if (!response.ok) {
      throw new Error('Failed to load mock data')
    }
    
    const csvText = await response.text()
    const rows = parseCSV(csvText)
    
    // Transform to ItemCardProps format
    const items = rows.map((row, index) => transformToItemCard(row, index))
    
    return items
  } catch (error) {
    console.error('Error loading mock listings:', error)
    return []
  }
}

/**
 * TODO: Replace with real blockchain query
 * 
 * import { getAllItems } from '@/lib/sui/queries'
 * 
 * Then in listings page, change:
 * - FROM: import { getMockListings } from '@/lib/data/mock-listings'
 * - TO:   import { getAllItems } from '@/lib/sui/queries'
 * 
 * Both return Promise<ItemCardProps[]> so it's a drop-in replacement!
 */
