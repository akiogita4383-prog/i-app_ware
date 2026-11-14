'use client'

import Image from 'next/image'
import { ClothingItem, Category } from '@/types'
import { AvatarConfig } from '@/types/avatar'
import { Badge } from '@/components/ui/Badge'

const previewOrder: Category[] = ['outer', 'tops', 'bottoms', 'shoes', 'accessories', 'other']

const layerStyles: Partial<Record<Category, string>> = {
  outer: 'top-[22%] left-1/2 -translate-x-1/2 w-56 h-36',
  tops: 'top-[26%] left-1/2 -translate-x-1/2 w-52 h-32',
  bottoms: 'top-[48%] left-1/2 -translate-x-1/2 w-44 h-32',
  shoes: 'bottom-6 left-1/2 -translate-x-1/2 w-40 h-18',
  accessories: 'top-[18%] right-4 w-24 h-24',
  other: 'top-[30%] left-[12%] w-24 h-20',
}

const categoryLabels: Record<Category, string> = {
  tops: 'トップス',
  bottoms: 'ボトムス',
  outer: 'アウター',
  shoes: 'シューズ',
  accessories: 'アクセ',
  other: 'その他',
}

const bodyWidths: Record<AvatarConfig['bodyType'], string> = {
  スリム: 'w-20',
  ノーマル: 'w-24',
  マッスル: 'w-28',
}

const skinColors: Record<AvatarConfig['skinTone'], string> = {
  明るい: '#F7D3BE',
  自然: '#E0B18B',
  健康的: '#C68A56',
  日焼け: '#A56C44',
}

const hairStyles: Record<AvatarConfig['hairStyle'], string> = {
  ショート: 'w-28 h-16 rounded-b-full',
  ミディアム: 'w-32 h-20 rounded-b-full',
  ロング: 'w-32 h-28 rounded-b-full',
  ポニーテール: 'w-28 h-20 rounded-b-full',
  ボブ: 'w-28 h-18 rounded-b-full',
}

interface AvatarPreviewProps {
  selected: Record<Category, ClothingItem | null>
  avatarConfig?: AvatarConfig
  onRemove: (category: Category) => void
}

export function AvatarPreview({ selected, avatarConfig, onRemove }: AvatarPreviewProps) {
  const config = avatarConfig ?? {
    height: 165,
    bodyType: 'ノーマル',
    hairStyle: 'ミディアム',
    hairColor: 'ブラック',
    skinTone: '自然',
  }

  const bodyWidth = bodyWidths[config.bodyType]
  const bodyHeight = 104 + Math.round((config.height - 150) * 0.5)
  const skinColor = skinColors[config.skinTone]
  const hairClass = hairStyles[config.hairStyle]

  return (
    <div className="relative overflow-hidden rounded-[2.5rem] border border-stone-200 bg-gradient-to-b from-stone-100 to-stone-200 shadow-sm p-4">
      <div className="relative mx-auto w-full max-w-xs aspect-[4/5] rounded-[2.5rem] bg-white/90 shadow-inner">
        <div className="absolute inset-x-0 top-10 flex justify-center">
          <div
            className="rounded-full"
            style={{ width: 112, height: 112, backgroundColor: skinColor }}
          />
        </div>
        <div className="absolute inset-x-0 top-[14%] flex justify-center">
          <div
            className={`absolute ${hairClass} bg-stone-900/90 rounded-full`}
            style={{ backgroundColor: config.hairColor === 'ブラック' ? '#18181b' : config.hairColor === 'ブラウン' ? '#8b5c42' : config.hairColor === 'ブロンド' ? '#f5d372' : config.hairColor === 'ピンク' ? '#f472b6' : config.hairColor === 'ブルー' ? '#60a5fa' : '#9ca3af' }}
          />
        </div>
        <div
          className={`absolute left-1/2 rounded-full ${bodyWidth}`}
          style={{ top: '38%', height: bodyHeight, transform: 'translateX(-50%)', backgroundColor: skinColor }}
        />
        <div className="absolute inset-x-0 top-0 h-full bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.7),_transparent_55%)]" />
      </div>

      {previewOrder.map((category) => {
        const item = selected[category]
        if (!item) return null

        return (
          <div
            key={category}
            className={`absolute ${layerStyles[category]} rounded-[1.5rem] overflow-hidden border border-white/80 bg-white shadow-lg`}
          >
            <div className="relative w-full h-full">
              {item.thumbnailUrl ? (
                <Image
                  src={item.thumbnailUrl}
                  alt={item.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-stone-100 text-stone-500 text-sm">
                  {categoryLabels[category]}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => onRemove(category)}
              className="absolute top-2 right-2 rounded-full bg-black/70 text-white w-8 h-8 flex items-center justify-center text-xs"
              aria-label={`Remove ${categoryLabels[category]}`}
            >
              ×
            </button>
          </div>
        )
      })}

      <div className="mt-4 space-y-2">
        {previewOrder.map((category) => {
          const item = selected[category]
          if (!item) return null
          return (
            <div key={category} className="flex items-center justify-between rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-stone-900">{categoryLabels[category]}</p>
                <p className="text-xs text-stone-500">{item.name}</p>
              </div>
              <Badge>{categoryLabels[category]}</Badge>
            </div>
          )
        })}
      </div>
    </div>
  )
}
