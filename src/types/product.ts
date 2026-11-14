import type { ClosetCategory } from '@/lib/closetTypes'

export type { ClosetCategory }

export interface ShoppingClosetItem {
  id: string
  name: string
  category: ClosetCategory
  color?: string
  imageUrl: string
  thumbnailUrl?: string
  owned: true
}

export type SelectedOwnedItems = Partial<Record<ClosetCategory, ShoppingClosetItem>>

export type SearchCategory = ClosetCategory

export interface ProductItem {
  id: string
  name: string
  category: ClosetCategory
  brand: string
  price: number
  currency: 'JPY'
  imageUrl: string
  productUrl: string
  isOwned: false
  source?: 'yahoo_shopping'
}

export interface ShoppingOutfitSuggestion {
  id: string
  imageUrl: string
  mainProduct: ProductItem
  recommendedProducts: ProductItem[]
  ownedItems: ShoppingClosetItem[]
  totalPrice: number
  liked: boolean
}
