export type CoordinateItem = {
  id: string
  name: string
  category: 'tops' | 'bottoms' | 'shoes' | 'bags' | 'accessories'
  src: string
  layer: 'tops' | 'bottoms' | 'outer' | 'shoes' | 'bag' | 'accessories' | 'other'
}

export type CoordinatePreset = {
  id: string
  label: string
  itemIds: string[]
}

export const coordinateItems: CoordinateItem[] = [
  {
    id: 'blouse',
    name: 'ブラウス',
    category: 'tops',
    src: '/assets/items/blouse.svg',
    layer: 'tops',
  },
  {
    id: 'pink-cardigan',
    name: 'ピンクトップス',
    category: 'tops',
    src: '/assets/items/pink-cardigan.svg',
    layer: 'tops',
  },
  {
    id: 'blue-skirt',
    name: '水色スカート',
    category: 'bottoms',
    src: '/assets/items/blue-skirt.svg',
    layer: 'bottoms',
  },
  {
    id: 'bag',
    name: 'バッグ',
    category: 'bags',
    src: '/assets/items/bag.svg',
    layer: 'bag',
  },
  {
    id: 'pumps',
    name: 'パンプス',
    category: 'shoes',
    src: '/assets/items/pumps.svg',
    layer: 'shoes',
  },
  {
    id: 'necklace',
    name: 'ネックレス',
    category: 'accessories',
    src: '/assets/items/necklace.svg',
    layer: 'accessories',
  },
]

export const coordinatePresets: CoordinatePreset[] = [
  {
    id: 'fresh-pink',
    label: 'おすすめコーデ①',
    itemIds: ['pink-cardigan', 'blue-skirt', 'bag', 'pumps'],
  },
  {
    id: 'clean-lace',
    label: 'おすすめコーデ②',
    itemIds: ['blouse', 'blue-skirt', 'bag', 'pumps', 'necklace'],
  },
]
