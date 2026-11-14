'use client'

import Image from 'next/image'
import { ClothingItem } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

interface OutfitCardProps {
  title: string
  tips: string
  tags: string[]
  items: (ClothingItem & { reason?: string })[]
  historyId: string
  onAdopt: () => void
  onSkip: () => void
  adopting?: boolean
  skipping?: boolean
}

export function OutfitCard({ title, tips, tags, items, onAdopt, onSkip, adopting, skipping }: OutfitCardProps) {
  return (
    <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-stone-50">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-stone-900">{title}</h2>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
          </div>
          <span className="text-3xl">✨</span>
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-2 gap-3 mb-4">
          {items.map((item) => (
            <div key={item.id} className="bg-stone-50 rounded-2xl overflow-hidden">
              <div className="relative aspect-[3/4]">
                {item.thumbnailUrl ? (
                  <Image src={item.thumbnailUrl} alt={item.name} fill className="object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-stone-100">
                    <svg className="w-8 h-8 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="p-2.5">
                <p className="text-sm font-medium text-stone-900 truncate">{item.name}</p>
                {item.reason && (
                  <p className="text-xs text-stone-400 mt-0.5 line-clamp-2">{item.reason}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-stone-50 rounded-2xl p-4 mb-4">
          <p className="text-xs font-medium text-stone-500 mb-1.5">スタイリングTips</p>
          <p className="text-sm text-stone-700 leading-relaxed">{tips}</p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onSkip}
            loading={skipping}
          >
            ↺ 別の提案
          </Button>
          <Button
            className="flex-1 bg-stone-900"
            onClick={onAdopt}
            loading={adopting}
          >
            ✓ このコーデにする
          </Button>
        </div>
      </div>
    </div>
  )
}
