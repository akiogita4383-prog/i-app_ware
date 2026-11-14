'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { ClosetItem, SelectedItems } from '@/lib/closetTypes'

interface Props {
  items: ClosetItem[]
  selectedItems: SelectedItems
  onSelect: (item: ClosetItem) => void
  isLoading?: boolean
}

export function ItemGrid({ items, selectedItems, onSelect, isLoading }: Props) {
  const selectedIds = new Set(
    Object.values(selectedItems).map((i) => i?.id).filter(Boolean) as string[]
  )

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-xl bg-stone-100 animate-pulse" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[120px]">
        <p className="text-center text-[9px] text-stone-400 leading-relaxed">
          アイテムを<br />追加してね♡
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-1.5 content-start max-h-[300px] overflow-y-auto pr-0.5">
      {items.map((item) => {
        const active = selectedIds.has(item.id)
        const thumb = item.thumbnailUrl ?? item.imageUrl

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            aria-pressed={active}
            aria-label={item.name}
            className={cn(
              'relative aspect-square rounded-xl overflow-hidden border-2 bg-stone-50 transition-all active:scale-95',
              active
                ? 'border-pink-300 shadow-[0_0_0_1.5px_rgba(251,207,218,0.5)]'
                : 'border-transparent hover:border-pink-100'
            )}
          >
            <Image
              src={thumb}
              alt={item.name}
              fill
              sizes="14vw"
              className="object-contain p-1.5"
              unoptimized={thumb.startsWith('/assets/')}
            />

            {/* 選択インジケーター */}
            {active && (
              <span className="absolute bottom-1 inset-x-1.5 h-1 rounded-full bg-pink-200 opacity-80" />
            )}
          </button>
        )
      })}
    </div>
  )
}
