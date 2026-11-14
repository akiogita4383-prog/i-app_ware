import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { ClosetCategory, SelectedOwnedItems, ProductItem } from '@/types/product'
import { mockProducts } from '@/data/mockProductItems'
import { MAIN_CATEGORY_LABELS, buildTaxonomyPrompt } from '@/lib/clothingTaxonomy'

const anthropic = new Anthropic()

const TAXONOMY_PROMPT = buildTaxonomyPrompt()

async function getAIKeywords(
  searchCategory: ClosetCategory,
  selectedOwnedItems: SelectedOwnedItems,
  personalColors: string[] = [],
): Promise<string[]> {
  const ownedList = Object.entries(selectedOwnedItems)
    .filter(([, item]) => Boolean(item))
    .map(([cat, item]) => {
      const label = MAIN_CATEGORY_LABELS[cat as keyof typeof MAIN_CATEGORY_LABELS] ?? cat
      return `- ${label}: ${item!.name}${item!.color ? ` (${item!.color})` : ''}`
    })
    .join('\n')

  const catJp = MAIN_CATEGORY_LABELS[searchCategory as keyof typeof MAIN_CATEGORY_LABELS] ?? searchCategory
  const colorHint = personalColors.length > 0
    ? `\nユーザーの好みの色（パーソナルカラー）: ${personalColors.join('・')}（可能な限りキーワードに反映してください）`
    : ''

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [{
      role: 'user',
      content: [
        `以下の洋服カテゴリー・色・素材の分類を使って、Yahoo!ショッピング検索キーワードを生成してください。\n\n${TAXONOMY_PROMPT}`,
        `\n\nユーザーの持っているアイテム:\n${ownedList || '(なし)'}`,
        `\n探したいカテゴリ: ${catJp}`,
        colorHint,
        '\n\n上記の分類からキーワードを選び、手持ちのコーデに合う検索キーワードを3つ生成してください。',
        'それぞれ「サブカテゴリー名＋色＋素材」を組み合わせた具体的なキーワードにしてください。',
        '\nJSON配列のみを返してください。例:',
        '\n["フレアスカート ベージュ シフォン","プリーツスカート ネイビー","ワイドパンツ グレー デニム"]',
      ].join(''),
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : '[]'
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return []
  try {
    return JSON.parse(match[0]) as string[]
  } catch {
    return []
  }
}

interface YahooHit {
  index: number
  name: string
  price: number
  image?: { medium?: string; small?: string }
  url: string
  brand?: { id?: number; name?: string }
}

// TODO: アバター選択に連動してジャンルIDを切り替える（現在はレディース固定）
const LADIES_GENRE_ID: Partial<Record<ClosetCategory, number>> = {
  tops:        36861,  // レディーストップス
  bottoms:     36913,  // レディースボトムス、パンツ
  dresses:     36887,  // ワンピース、チュニック
  outerwear:   37019,  // レディースコート、ジャケット
  shoes:        1729,  // レディースシューズ
  bags:         1574,  // レディースバッグ
  accessories:  1591,  // レディースアクセサリー
}

async function searchYahoo(
  keyword: string,
  category: ClosetCategory,
  appId: string,
  results = 3,
): Promise<ProductItem[]> {
  const url = new URL('https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch')
  const query = keyword.includes('レディース') ? keyword : `レディース ${keyword}`
  url.searchParams.set('appid', appId)
  url.searchParams.set('query', query)
  const genreId = LADIES_GENRE_ID[category]
  if (genreId) url.searchParams.set('genreCategory', String(genreId))
  url.searchParams.set('results', String(results))
  url.searchParams.set('availability', '1')
  url.searchParams.set('sort', '-score')

  const res = await fetch(url.toString(), { cache: 'no-store' })
  if (!res.ok) return []

  const json = await res.json() as { hits?: YahooHit[] }
  return (json.hits ?? [])
    .filter((h) => h.image?.medium && typeof h.price === 'number')
    .map((h) => ({
      id: `yahoo-${h.index}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: h.name,
      category,
      brand: h.brand?.name ?? '',
      price: h.price,
      currency: 'JPY' as const,
      imageUrl: h.image!.medium!,
      productUrl: h.url,
      isOwned: false as const,
      source: 'yahoo_shopping' as const,
    }))
}

export interface KeywordGroup {
  keyword: string
  products: ProductItem[]
}

export interface SearchResponse {
  keywordGroups: KeywordGroup[]
  source: string
}

function makeMockGroups(category: ClosetCategory, keywords: string[]): KeywordGroup[] {
  const mocks = mockProducts.filter((p) => p.category === category)
  const labels = keywords.length > 0 ? keywords : ['スタイル1', 'スタイル2', 'スタイル3']
  return labels.slice(0, 3).map((kw) => ({ keyword: kw, products: mocks.slice(0, 4) }))
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    searchCategory: ClosetCategory
    selectedOwnedItems: SelectedOwnedItems
    personalColors?: string[]
  }
  const { searchCategory, selectedOwnedItems, personalColors = [] } = body
  const appId = process.env.YAHOO_SHOPPING_APP_ID?.trim()

  try {
    const mainKeywords = await getAIKeywords(searchCategory, selectedOwnedItems, personalColors)

    if (!appId) {
      return NextResponse.json({ keywordGroups: makeMockGroups(searchCategory, mainKeywords), source: 'mock' })
    }

    // キーワードごとに独立して検索し、グループを維持する
    const settled = await Promise.allSettled(
      mainKeywords.slice(0, 3).map(async (kw) => ({
        keyword: kw,
        products: await searchYahoo(kw, searchCategory, appId, 4),
      }))
    )
    const keywordGroups: KeywordGroup[] = settled
      .filter((r): r is PromiseFulfilledResult<KeywordGroup> =>
        r.status === 'fulfilled' && r.value.products.length > 0
      )
      .map((r) => r.value)

    if (keywordGroups.length === 0) {
      return NextResponse.json({ keywordGroups: makeMockGroups(searchCategory, mainKeywords), source: 'mock_fallback' })
    }

    return NextResponse.json({ keywordGroups, source: 'yahoo_shopping' })
  } catch (err) {
    console.error('[shopping/search]', err)
    return NextResponse.json({ keywordGroups: makeMockGroups(searchCategory, []), source: 'error_fallback' })
  }
}
