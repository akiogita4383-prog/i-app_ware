'use client'

import type { ClosetItem } from '@/lib/closetTypes'
import type { ShoppingClosetItem, ProductItem, SearchCategory } from '@/types/product'
import { categoryFitPresets, LAYER_ORDER } from '@/lib/fitPresets'
import { useAvatarStore, AVATAR_OPTIONS } from '@/stores/avatar'

interface Props {
  ownedItems: ShoppingClosetItem[]
  mainProduct?: ProductItem
  searchCategory?: SearchCategory
}

export function MiniAvatarOutfit({ ownedItems, mainProduct, searchCategory }: Props) {
  const avatarId = useAvatarStore((s) => s.avatarId)
  const avatarSrc = AVATAR_OPTIONS.find((a) => a.id === avatarId)?.src ?? AVATAR_OPTIONS[0].src

  const itemsByCategory: Partial<Record<string, ClosetItem>> = {}

  for (const item of ownedItems) {
    itemsByCategory[item.category] = {
      id:           item.id,
      name:         item.name,
      category:     item.category,
      imageUrl:     item.imageUrl,
      thumbnailUrl: item.thumbnailUrl,
    }
  }

  if (mainProduct && searchCategory) {
    itemsByCategory[searchCategory] = {
      id:       mainProduct.id,
      name:     mainProduct.name,
      category: searchCategory,
      imageUrl: mainProduct.imageUrl,
    }
  }

  return (
    <div className="relative w-full h-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={avatarSrc}
        alt="avatar"
        draggable={false}
        className="absolute inset-0 w-full h-full object-contain"
      />
      {LAYER_ORDER.map((cat) => {
        const item = itemsByCategory[cat]
        if (!item?.imageUrl) return null
        const fit = categoryFitPresets[cat]
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={cat}
            src={item.imageUrl}
            alt={item.name}
            draggable={false}
            className="absolute object-contain"
            style={{
              left:      `${fit.x}%`,
              top:       `${fit.y}%`,
              width:     `${fit.width}%`,
              transform: `translate(-50%, -50%) rotate(${fit.rotation}deg)`,
              zIndex:    fit.zIndex,
            }}
          />
        )
      })}
    </div>
  )
}
