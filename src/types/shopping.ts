import type { ClosetCategory, ClosetItem } from '@/lib/closetTypes'

export type { ClosetCategory, ClosetItem }

export type SelectedOwnedItems = Partial<Record<ClosetCategory, ClosetItem>>

export type SearchCategory = ClosetCategory

export interface ProductItem {
  id: string
  name: string
  brand: string
  price: number
  imageUrl: string
  purchaseUrl?: string
}

export interface ShoppingOutfitSuggestion {
  id: string
  outfitImageUrl?: string
  searchCategory: SearchCategory
  product: ProductItem
  ownedItemIds: string[]
}
