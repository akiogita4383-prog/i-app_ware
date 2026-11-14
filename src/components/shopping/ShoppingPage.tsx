'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ClosetCategory } from '@/lib/closetTypes'
import type {
  ShoppingClosetItem, SelectedOwnedItems, SearchCategory,
} from '@/types/product'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { mockClosetItems, DEFAULT_SELECTED_IDS } from '@/data/mockClosetItems'
import { searchProducts, type KeywordGroup } from '@/lib/shopping/searchProducts'
import { OwnedItemSelector } from './OwnedItemSelector'
import { SearchCategoryTabs } from './SearchCategoryTabs'
import { ShoppingSuggestionGrid } from './ShoppingSuggestionGrid'

const DB_CATEGORY_MAP: Partial<Record<string, ClosetCategory>> = {
  tops: 'tops', bottoms: 'bottoms', outer: 'outerwear', outerwear: 'outerwear',
  shoes: 'shoes', bags: 'bags', accessories: 'accessories', dresses: 'dresses',
}

function toShoppingItem(raw: {
  id: string; name: string; category: string; imageUrl?: string; thumbnailUrl?: string; color?: string
}): ShoppingClosetItem | null {
  const category = DB_CATEGORY_MAP[raw.category]
  if (!category) return null
  return {
    id: raw.id, name: raw.name, category,
    color: raw.color,
    imageUrl: raw.imageUrl ?? '',
    thumbnailUrl: raw.thumbnailUrl,
    owned: true,
  }
}

export function ShoppingPage() {
  const { accessToken } = useAuthStore()
  const personalColors = useSettingsStore((s) => s.personalColors)

  const [closetItems,    setClosetItems]    = useState<ShoppingClosetItem[]>(mockClosetItems)
  const [ownedItems,     setOwnedItems]     = useState<SelectedOwnedItems>(() => {
    const init: SelectedOwnedItems = {}
    for (const item of mockClosetItems) {
      if (DEFAULT_SELECTED_IDS.includes(item.id)) init[item.category] = item
    }
    return init
  })
  const [searchCategory, setSearchCategory] = useState<SearchCategory | null>('bottoms')
  const [keywordGroups,  setKeywordGroups]  = useState<KeywordGroup[]>([])
  const [isLoading,      setIsLoading]      = useState(false)
  const abortRef   = useRef<AbortController | null>(null)

  // クローゼットからアイテム取得
  useEffect(() => {
    if (!accessToken) return
    fetch('/api/items', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        if (!json?.data?.length) return
        const mapped = (json.data as Parameters<typeof toShoppingItem>[0][])
          .flatMap((i) => { const r = toShoppingItem(i); return r ? [r] : [] })
        setClosetItems(mapped)
        // デフォルト選択: tops と shoes の最初のアイテム
        const init: SelectedOwnedItems = {}
        const tops  = mapped.find((i) => i.category === 'tops')
        const shoes = mapped.find((i) => i.category === 'shoes')
        if (tops)  init.tops  = tops
        if (shoes) init.shoes = shoes
        setOwnedItems(init)
      })
      .catch(() => {/* フォールバック: mockClosetItems を使い続ける */})
  }, [accessToken])

  // 検索実行（前回リクエストをキャンセルしてからスタート）
  const generateSuggestions = useCallback(async (
    category: SearchCategory | null,
    owned: SelectedOwnedItems,
  ) => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    const { signal } = abortRef.current

    if (!category) { setKeywordGroups([]); return }
    setIsLoading(true)
    try {
      const { keywordGroups } = await searchProducts({ category, selectedOwnedItems: owned, personalColors, signal })
      if (signal.aborted) return
      setKeywordGroups(keywordGroups)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
    } finally {
      if (!signal.aborted) setIsLoading(false)
    }
  }, [personalColors])

  useEffect(() => {
    generateSuggestions(searchCategory, ownedItems)
  }, [searchCategory, ownedItems, generateSuggestions])

  const handleRefresh = () => {
    generateSuggestions(searchCategory, ownedItems)
  }

  const handleOwnedChange = (next: SelectedOwnedItems) => {
    setOwnedItems(next)
    // 選択済みカテゴリを探したいカテゴリに選んでいた場合は解除
    if (searchCategory && next[searchCategory as ClosetCategory]) {
      setSearchCategory(null)
    }
  }

  const ownedList = Object.values(ownedItems).filter(Boolean) as ShoppingClosetItem[]

  return (
    <div className="flex flex-col h-full bg-stone-50">

      {/* ── ページヘッダー ── */}
      <div className="px-4 pt-4 pb-3 bg-white border-b border-stone-100">
        <p className="text-[18px] font-bold text-stone-800">ショッピング</p>
        <p className="text-[11px] text-stone-400 mt-0.5">手持ち服に合うアイテムを見つけよう</p>
      </div>

      {/* ── スクロールコンテンツ ── */}
      <div className="flex-1 overflow-y-auto">

        {/* 持っているアイテムを選ぶ */}
        <div className="pt-4 pb-4 bg-white border-b border-stone-50">
          <OwnedItemSelector
            items={closetItems}
            selected={ownedItems}
            onChange={handleOwnedChange}
          />
        </div>

        {/* 探したいカテゴリ */}
        <div className="pt-4 pb-4 bg-white border-b border-stone-50">
          <SearchCategoryTabs
            selected={searchCategory}
            ownedItems={ownedItems}
            onChange={setSearchCategory}
          />
        </div>

        {/* おすすめ提案 */}
        <div className="pt-4 pb-6">
          <ShoppingSuggestionGrid
            searchCategory={searchCategory}
            keywordGroups={keywordGroups}
            ownedItems={ownedList}
            onRefresh={handleRefresh}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  )
}
