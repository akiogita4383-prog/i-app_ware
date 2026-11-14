'use client'

import type { SearchCategory, ShoppingClosetItem } from '@/types/product'
import type { KeywordGroup } from '@/lib/shopping/searchProducts'
import { MAIN_CATEGORY_LABELS } from '@/lib/clothingTaxonomy'
import { KeywordProductCard } from './KeywordProductCard'

interface Props {
  searchCategory: SearchCategory | null
  keywordGroups: KeywordGroup[]
  ownedItems: ShoppingClosetItem[]
  onRefresh: () => void
  isLoading: boolean
}

export function ShoppingSuggestionGrid({
  searchCategory, keywordGroups, ownedItems, onRefresh, isLoading,
}: Props) {
  if (!searchCategory) {
    return (
      <div className="flex flex-col items-center gap-2 py-12">
        <p className="text-[13px] text-stone-400">探したいカテゴリを選んでください</p>
      </div>
    )
  }

  const label = MAIN_CATEGORY_LABELS[searchCategory as keyof typeof MAIN_CATEGORY_LABELS] ?? searchCategory

  return (
    <div className="space-y-4">
      {/* セクションヘッダー */}
      <div className="flex items-center justify-between px-4">
        <p className="text-[13px] font-bold text-stone-700">
          あなたにおすすめの
          <span className="text-pink-500 ml-1">{label}</span>
        </p>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-1 text-[11px] font-bold text-stone-500 border border-stone-200 rounded-full px-3 py-1 hover:bg-stone-50 transition-colors disabled:opacity-50"
        >
          <svg className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          更新
        </button>
      </div>

      {/* カードカルーセル */}
      {isLoading ? (
        <div className="flex gap-4 px-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-72 shrink-0 rounded-3xl bg-stone-100 animate-pulse" style={{ height: 320 }} />
          ))}
        </div>
      ) : keywordGroups.length === 0 ? (
        <div className="flex flex-col items-center py-12">
          <p className="text-[13px] text-stone-400">このカテゴリの商品は準備中です</p>
        </div>
      ) : (
        <div className="overflow-x-auto scrollbar-none">
          <div className="flex gap-4 px-4 pb-2 snap-x snap-mandatory" style={{ minWidth: 'max-content' }}>
            {keywordGroups.map((group, i) => (
              <KeywordProductCard
                key={`${group.keyword}-${i}`}
                keyword={group.keyword}
                products={group.products}
                ownedItems={ownedItems}
                searchCategory={searchCategory}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
