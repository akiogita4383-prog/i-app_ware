import type { ShoppingClosetItem } from '@/types/product'

export const CATEGORY_LABELS: Record<string, string> = {
  tops:        'トップス',
  bottoms:     'ボトムス',
  dresses:     'ワンピース',
  outerwear:   'アウター',
  shoes:       'シューズ',
  bags:        'バッグ',
  accessories: 'アクセサリー',
}

export const mockClosetItems: ShoppingClosetItem[] = [
  {
    id: 'owned-tops-001',
    name: 'リボンタイブラウス',
    category: 'tops',
    color: 'off white',
    imageUrl: '/assets/items/blouse.svg',
    thumbnailUrl: '/assets/items/blouse.svg',
    owned: true,
  },
  {
    id: 'owned-tops-002',
    name: 'ボーダーニット',
    category: 'tops',
    color: 'ブラック×ホワイト',
    imageUrl: '/assets/items/pink-cardigan.svg',
    thumbnailUrl: '/assets/items/pink-cardigan.svg',
    owned: true,
  },
  {
    id: 'owned-shoes-001',
    name: 'ポインテッドパンプス',
    category: 'shoes',
    color: 'ベージュ',
    imageUrl: '/assets/items/pumps.svg',
    thumbnailUrl: '/assets/items/pumps.svg',
    owned: true,
  },
  {
    id: 'owned-shoes-002',
    name: '白スニーカー',
    category: 'shoes',
    color: 'ホワイト',
    imageUrl: '/assets/items/pumps.svg',
    thumbnailUrl: '/assets/items/pumps.svg',
    owned: true,
  },
  {
    id: 'owned-bags-001',
    name: 'ベージュバッグ',
    category: 'bags',
    color: 'ベージュ',
    imageUrl: '/assets/items/bag.svg',
    thumbnailUrl: '/assets/items/bag.svg',
    owned: true,
  },
]

export const DEFAULT_SELECTED_IDS = ['owned-tops-001', 'owned-shoes-001']
