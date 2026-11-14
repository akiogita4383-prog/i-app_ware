'use client'

import { cn } from '@/lib/utils'
import { MAIN_CATEGORY_LABELS } from '@/lib/clothingTaxonomy'
import type { ClosetCategory, SelectedOwnedItems, SearchCategory } from '@/types/product'

const SEARCH_CATEGORIES: ClosetCategory[] = [
  'tops', 'bottoms', 'dresses', 'outerwear', 'shoes',
]

interface Props {
  selected: SearchCategory | null
  ownedItems: SelectedOwnedItems
  onChange: (cat: SearchCategory) => void
}

export function SearchCategoryTabs({ selected, ownedItems, onChange }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-[13px] font-bold text-stone-700 px-4">探したいアイテムを選ぶ</p>
      <div className="overflow-x-auto scrollbar-none">
        <div className="flex gap-2 px-4 pb-1" style={{ minWidth: 'max-content' }}>
          {SEARCH_CATEGORIES.map((cat) => {
            const isOwned    = !!ownedItems[cat]
            const isSelected = selected === cat
            return (
              <button
                key={cat}
                type="button"
                disabled={isOwned}
                onClick={() => !isOwned && onChange(cat)}
                className={cn(
                  'shrink-0 px-4 py-1.5 rounded-full text-[12px] font-bold transition-all border',
                  isOwned
                    ? 'border-stone-100 bg-stone-50 text-stone-300 cursor-not-allowed'
                    : isSelected
                    ? 'border-pink-300 bg-pink-50 text-pink-600 shadow-sm shadow-pink-100'
                    : 'border-stone-200 bg-white text-stone-600 hover:border-pink-200 hover:text-pink-500',
                )}
              >
                {MAIN_CATEGORY_LABELS[cat as keyof typeof MAIN_CATEGORY_LABELS] ?? cat}
                {isOwned && <span className="ml-1 text-[9px] opacity-60">所持済</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
