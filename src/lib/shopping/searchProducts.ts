import type {
  ClosetCategory,
  ProductItem,
  SelectedOwnedItems,
} from '@/types/product'
import { mockProducts } from '@/data/mockProductItems'

export interface SearchParams {
  category: ClosetCategory
  selectedOwnedItems: SelectedOwnedItems
  personalColors?: string[]
  signal?: AbortSignal
}

export interface KeywordGroup {
  keyword: string
  products: ProductItem[]
}

export interface SearchResult {
  keywordGroups: KeywordGroup[]
}

function mockGroups(category: ClosetCategory): KeywordGroup[] {
  const mocks = mockProducts.filter((p) => p.category === category)
  return [
    { keyword: 'おすすめスタイル1', products: mocks.slice(0, 4) },
    { keyword: 'おすすめスタイル2', products: mocks.slice(0, 4) },
    { keyword: 'おすすめスタイル3', products: mocks.slice(0, 4) },
  ]
}

export async function searchProducts(params: SearchParams): Promise<SearchResult> {
  const { category, selectedOwnedItems, personalColors, signal } = params
  try {
    const res = await fetch('/api/shopping/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchCategory: category, selectedOwnedItems, personalColors }),
      signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json() as { keywordGroups?: KeywordGroup[] }
    if (!data.keywordGroups?.length) throw new Error('empty')
    return { keywordGroups: data.keywordGroups }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw err
    return { keywordGroups: mockGroups(category) }
  }
}
