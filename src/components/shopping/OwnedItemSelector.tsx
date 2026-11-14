'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import { CATEGORY_LABELS } from '@/data/mockClosetItems'
import type { ShoppingClosetItem, SelectedOwnedItems } from '@/types/product'

interface Props {
  items: ShoppingClosetItem[]
  selected: SelectedOwnedItems
  onChange: (next: SelectedOwnedItems) => void
}

function SelectedCountLabel({ selected }: { selected: SelectedOwnedItems }) {
  const entries = Object.entries(selected).filter(([, v]) => v)
  if (entries.length === 0) return <span className="text-stone-300">未選択</span>
  return (
    <span className="text-pink-500">
      {entries.map(([cat]) => `${CATEGORY_LABELS[cat] ?? cat} 1点`).join('・')} 選択中
    </span>
  )
}

export function OwnedItemSelector({ items, selected, onChange }: Props) {
  const toggleItem = (item: ShoppingClosetItem) => {
    const current = selected[item.category]
    if (current?.id === item.id) {
      const next = { ...selected }
      delete next[item.category]
      onChange(next)
    } else {
      onChange({ ...selected, [item.category]: item })
    }
  }

  return (
    <div className="space-y-3">
      <div className="px-4 flex items-baseline justify-between">
        <p className="text-[13px] font-bold text-stone-700">
          持っているアイテムを選ぶ
          <span className="text-[10px] font-normal text-stone-400 ml-1">（複数選択OK）</span>
        </p>
      </div>
      <p className="px-4 text-[11px] font-medium">
        <SelectedCountLabel selected={selected} />
      </p>

      <div className="overflow-x-auto scrollbar-none">
        <div className="flex gap-3 px-4 pb-1" style={{ minWidth: 'max-content' }}>
          {items.map((item) => {
            const isSelected = selected[item.category]?.id === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleItem(item)}
                className={cn(
                  'flex flex-col items-center gap-1.5 shrink-0 w-[72px] transition-all',
                )}
              >
                <div className={cn(
                  'relative w-[72px] h-[72px] rounded-2xl overflow-hidden bg-stone-50 border-2 transition-all',
                  isSelected
                    ? 'border-pink-400 shadow-md shadow-pink-100'
                    : 'border-stone-100 hover:border-stone-200',
                )}>
                  <Image
                    src={item.thumbnailUrl ?? item.imageUrl}
                    alt={item.name}
                    width={72}
                    height={72}
                    className="w-full h-full object-contain p-2"
                    unoptimized
                  />
                  {isSelected && (
                    <span className="absolute top-1 right-1 w-5 h-5 bg-pink-400 rounded-full flex items-center justify-center shadow-sm">
                      <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 6l3 3 5-5" />
                      </svg>
                    </span>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-medium text-stone-700 leading-tight line-clamp-1 max-w-[72px]">{item.name}</p>
                  <p className="text-[9px] text-stone-400 mt-0.5">{CATEGORY_LABELS[item.category] ?? item.category}</p>
                </div>
              </button>
            )
          })}

          {/* アイテムを追加カード */}
          <button
            type="button"
            className="flex flex-col items-center gap-1.5 shrink-0 w-[72px]"
          >
            <div className="w-[72px] h-[72px] rounded-2xl border-2 border-dashed border-stone-200 bg-white flex items-center justify-center hover:border-pink-200 hover:bg-pink-50 transition-colors">
              <svg className="w-6 h-6 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-[10px] text-stone-400 text-center leading-tight">アイテムを<br />追加</p>
          </button>
        </div>
      </div>
    </div>
  )
}
