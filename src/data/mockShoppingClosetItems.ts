import type { ClosetItem } from '@/lib/closetTypes'

export const mockClosetItems: ClosetItem[] = [
  {
    id: 'owned-tops-1',
    name: 'ホワイトブラウス',
    category: 'tops',
    imageUrl: '/assets/items/blouse.svg',
    thumbnailUrl: '/assets/items/blouse.svg',
  },
  {
    id: 'owned-tops-2',
    name: 'ピンクカーディガン',
    category: 'tops',
    imageUrl: '/assets/items/pink-cardigan.svg',
    thumbnailUrl: '/assets/items/pink-cardigan.svg',
  },
  {
    id: 'owned-bottoms-1',
    name: 'ブルースカート',
    category: 'bottoms',
    imageUrl: '/assets/items/blue-skirt.svg',
    thumbnailUrl: '/assets/items/blue-skirt.svg',
  },
  {
    id: 'owned-shoes-1',
    name: 'パンプス',
    category: 'shoes',
    imageUrl: '/assets/items/pumps.svg',
    thumbnailUrl: '/assets/items/pumps.svg',
  },
  {
    id: 'owned-bags-1',
    name: 'バッグ',
    category: 'bags',
    imageUrl: '/assets/items/bag.svg',
    thumbnailUrl: '/assets/items/bag.svg',
  },
  {
    id: 'owned-accessories-1',
    name: 'ネックレス',
    category: 'accessories',
    imageUrl: '/assets/items/necklace.svg',
    thumbnailUrl: '/assets/items/necklace.svg',
  },
]

export const CATEGORY_LABELS: Record<string, string> = {
  tops:        'トップス',
  bottoms:     'ボトムス',
  dresses:     'ワンピース',
  outerwear:   'アウター',
  shoes:       'シューズ',
  bags:        'バッグ',
  accessories: 'アクセサリー',
}
