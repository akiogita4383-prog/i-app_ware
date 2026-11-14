import type { ProductItem, SelectedOwnedItems } from '@/types/product'

interface ScoredProduct {
  product: ProductItem
  score: number
}

const COLOR_AFFINITY: Record<string, string[]> = {
  'off white': ['ベージュ', 'ホワイト', 'ライトブルー', 'ピンク', 'ブラック'],
  'ベージュ':  ['オフホワイト', 'ブラウン', 'カーキ', 'ホワイト'],
  'ホワイト':  ['ネイビー', 'ブラック', 'ベージュ', 'ブルー'],
  'ブラック×ホワイト': ['ブラック', 'ホワイト', 'グレー', 'レッド'],
}

function colorScore(ownedColor: string | undefined): number {
  if (!ownedColor) return 0
  const normalized = ownedColor.toLowerCase().trim()
  return COLOR_AFFINITY[normalized] ? 20 : 10
}

export function scoreProducts(
  products: ProductItem[],
  selectedOwnedItems: SelectedOwnedItems,
): ProductItem[] {
  const ownedColors = Object.values(selectedOwnedItems)
    .filter(Boolean)
    .map((i) => i!.color)

  const scored: ScoredProduct[] = products.map((product) => {
    let score = 50 // base: category match

    // 画像あり
    if (product.imageUrl) score += 5

    // 価格帯（高すぎない）
    if (product.price <= 15000)  score += 10
    if (product.price <= 8000)   score += 5

    // 色の相性
    for (const color of ownedColors) {
      score += colorScore(color)
      break // 1つだけ評価
    }

    // ブランドスコア（フェミニン系優先）
    const femBrands = ['NATURAL BEAUTY BASIC', "ROPE' PICNIC", 'SNIDEL', 'Lily Brown', 'Whim Gazette']
    if (femBrands.includes(product.brand)) score += 15

    return { product, score }
  })

  return scored
    .sort((a, b) => b.score - a.score)
    .map((s) => s.product)
}
