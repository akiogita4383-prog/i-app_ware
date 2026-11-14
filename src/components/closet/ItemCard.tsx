'use client'

import Image from 'next/image'
import { ClothingItem, Category } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

const categoryLabels: Record<Category, string> = {
  tops: 'トップス',
  bottoms: 'ボトムス',
  outer: 'アウター',
  shoes: 'シューズ',
  accessories: 'アクセ',
  other: 'その他',
}

interface ItemCardProps {
  item: ClothingItem
  onEdit?: (item: ClothingItem) => void
  onDelete?: (item: ClothingItem) => void
}

export function ItemCard({ item, onEdit, onDelete }: ItemCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-sm group">
      <div className="relative aspect-[3/4] bg-stone-50">
        {item.thumbnailUrl ? (
          <Image
            src={item.thumbnailUrl}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-10 h-10 text-stone-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <Badge>{categoryLabels[item.category as Category]}</Badge>
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          {onEdit && (
            <button
              onClick={() => onEdit(item)}
              className="bg-white rounded-full p-2 shadow-md hover:bg-stone-50 transition-colors"
            >
              <svg className="w-4 h-4 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(item)}
              className="bg-white rounded-full p-2 shadow-md hover:bg-red-50 transition-colors"
            >
              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="p-3">
        <p className="font-medium text-stone-900 text-sm truncate">{item.name}</p>
        <p className="text-stone-400 text-xs mt-0.5">{item.color}</p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex gap-1 flex-wrap">
            {(item.tags as string[]).slice(0, 2).map((tag) => (
              <span key={tag} className="text-xs text-stone-400">#{tag}</span>
            ))}
          </div>
          {item.wornCount > 0 && (
            <span className="text-xs text-stone-400">{item.wornCount}回</span>
          )}
        </div>
      </div>
    </div>
  )
}
