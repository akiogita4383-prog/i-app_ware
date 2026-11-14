'use client'

import { format, isToday } from 'date-fns'
import { ja } from 'date-fns/locale'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface CalendarEvent {
  id: string
  title: string
  startAt: string
  endAt: string
}

interface OutfitItem {
  id: string
  name: string
  imageUrl?: string
  thumbnailUrl?: string
}

interface OutfitHistory {
  id: string
  isFavorite: boolean
  items: OutfitItem[]
}

interface Props {
  date: Date
  events: CalendarEvent[]
  outfit: OutfitHistory | null
  onToggleFavorite?: (outfitId: string) => void
  onAddOutfit?: () => void
  compact?: boolean
}

export function OutfitDayCard({ date, events, outfit, onToggleFavorite, onAddOutfit, compact }: Props) {
  const isDateToday = isToday(date)
  const dayLabel = format(date, 'M月d日(E)', { locale: ja })

  return (
    <div className={cn(
      'bg-white rounded-2xl border shadow-sm flex flex-col overflow-hidden',
      isDateToday ? 'border-pink-200' : 'border-stone-100',
      compact ? 'min-h-[160px]' : 'min-h-[220px]',
    )}>
      {/* ヘッダー */}
      <div className={cn(
        'flex items-center justify-between px-3 py-2',
        isDateToday ? 'bg-pink-50' : 'bg-stone-50/60',
      )}>
        <p className={cn(
          'text-[12px] font-bold',
          isDateToday ? 'text-pink-600' : 'text-stone-600',
        )}>
          {isDateToday ? '今日 · ' : ''}{dayLabel}
        </p>

        {/* ハートアイコン（outfit があるときのみ） */}
        {outfit && (
          <button
            type="button"
            onClick={() => onToggleFavorite?.(outfit.id)}
            aria-label={outfit.isFavorite ? 'お気に入り解除' : 'お気に入り登録'}
            className="p-1"
          >
            <span className={cn(
              'text-[18px] leading-none transition-colors',
              outfit.isFavorite ? 'text-pink-500' : 'text-stone-300 hover:text-pink-300',
            )}>
              {outfit.isFavorite ? '♥' : '♡'}
            </span>
          </button>
        )}
      </div>

      <div className="flex-1 px-3 py-2 flex flex-col gap-2">

        {/* 予定リスト */}
        {events.length > 0 && (
          <div className="space-y-1">
            {events.map((ev) => (
              <div key={ev.id} className="flex items-start gap-1.5">
                <span className="text-[10px] text-stone-400 tabular-nums shrink-0 pt-0.5">
                  {format(new Date(ev.startAt), 'H:mm')}
                </span>
                <span className="text-[11px] text-stone-700 font-medium leading-snug">{ev.title}</span>
              </div>
            ))}
          </div>
        )}

        {/* コーデ表示 */}
        {outfit ? (
          <div className="flex gap-1.5 flex-wrap mt-auto">
            {outfit.items.slice(0, compact ? 3 : 6).map((item) => {
              const src = item.thumbnailUrl ?? item.imageUrl
              if (!src) return null
              return (
                <div key={item.id} className="w-10 h-10 rounded-lg overflow-hidden bg-stone-50 border border-stone-100 shrink-0">
                  <Image
                    src={src}
                    alt={item.name}
                    width={40}
                    height={40}
                    className="w-full h-full object-contain p-0.5"
                    unoptimized={src.startsWith('/assets/')}
                  />
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 py-2">
            <p className="text-[10px] text-stone-400 text-center leading-relaxed">
              この日のコーデは<br />まだありません
            </p>
            <button
              type="button"
              onClick={onAddOutfit}
              className="text-[10px] font-bold text-pink-500 border border-pink-200 rounded-full px-3 py-1 hover:bg-pink-50 transition-colors"
            >
              ＋ コーデを追加
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
