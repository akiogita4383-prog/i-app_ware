'use client'

import type { ClosetItem, FitPreset } from '@/lib/closetTypes'

interface Props {
  item: ClosetItem
  fit: FitPreset
  isActive: boolean
  onPointerDown: (e: React.PointerEvent<HTMLImageElement>) => void
  onPointerMove: (e: React.PointerEvent<HTMLImageElement>) => void
  onPointerUp:   (e: React.PointerEvent<HTMLImageElement>) => void
}

export function OutfitLayer({ item, fit, isActive, onPointerDown, onPointerMove, onPointerUp }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.imageUrl}
      alt={item.name}
      draggable={false}
      className={[
        'absolute object-contain select-none transition-[filter,outline] duration-100',
        isActive
          ? 'cursor-grabbing outline outline-2 outline-pink-300 outline-offset-1 drop-shadow-md'
          : 'cursor-grab hover:brightness-95',
      ].join(' ')}
      style={{
        left:      `${fit.x}%`,
        top:       `${fit.y}%`,
        width:     `${fit.width}%`,
        transform: `translate(-50%, -50%) rotate(${fit.rotation}deg)`,
        zIndex:    isActive ? 100 : fit.zIndex,
        touchAction: 'none',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    />
  )
}
