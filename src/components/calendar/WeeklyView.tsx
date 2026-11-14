'use client'

import { useRef } from 'react'
import {
  addDays, startOfWeek, format, isSameDay, isToday,
} from 'date-fns'
import { ja } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { OutfitDayCard } from './OutfitDayCard'

interface CalendarEvent { id: string; title: string; startAt: string; endAt: string }
interface OutfitHistory  { id: string; isFavorite: boolean; items: { id: string; name: string; imageUrl?: string; thumbnailUrl?: string }[] }

interface Props {
  selectedDate:      Date
  onSelectDate:      (d: Date) => void
  eventsByDate:      Record<string, CalendarEvent[]>
  outfitsByDate:     Record<string, OutfitHistory | null>
  onToggleFavorite:  (id: string) => void
  onAddOutfit:       (dateKey: string) => void
}

const DAY_LABELS = ['月', '火', '水', '木', '金', '土', '日']
const SLIDE_RANGE = 3  // 前後3日

export function WeeklyView({ selectedDate, onSelectDate, eventsByDate, outfitsByDate, onToggleFavorite, onAddOutfit }: Props) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekDays  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // スライダー用（前後 SLIDE_RANGE 日）
  const sliderDays = Array.from({ length: SLIDE_RANGE * 2 + 1 }, (_, i) =>
    addDays(selectedDate, i - SLIDE_RANGE)
  )
  const centerIdx = SLIDE_RANGE

  // スワイプ
  const touchStartX = useRef(0)
  const sliderRef   = useRef<HTMLDivElement>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 50) onSelectDate(addDays(selectedDate, dx < 0 ? 1 : -1))
  }

  const toKey = (d: Date) => format(d, 'yyyy-MM-dd')

  return (
    <div className="flex flex-col gap-4">

      {/* ── 週ヘッダー（月〜日） ── */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-7">
          {weekDays.map((day, i) => {
            const active = isSameDay(day, selectedDate)
            const today  = isToday(day)
            const isSat  = i === 5
            const isSun  = i === 6
            return (
              <button
                key={i}
                type="button"
                onClick={() => onSelectDate(day)}
                className={cn(
                  'flex flex-col items-center py-2.5 gap-1 transition-colors',
                  active ? 'bg-pink-400' : 'hover:bg-stone-50',
                )}
              >
                <span className={cn(
                  'text-[9px] font-semibold',
                  active ? 'text-white' : isSat ? 'text-blue-400' : isSun ? 'text-rose-400' : 'text-stone-400',
                )}>
                  {DAY_LABELS[i]}
                </span>
                <span className={cn(
                  'text-[14px] font-bold leading-none',
                  active ? 'text-white' : today ? 'text-pink-400' : isSat ? 'text-blue-500' : isSun ? 'text-rose-500' : 'text-stone-700',
                )}>
                  {format(day, 'd')}
                </span>
                {/* イベント・コーデドット */}
                <div className="flex gap-0.5 h-1.5">
                  {(eventsByDate[toKey(day)]?.length ?? 0) > 0 && (
                    <span className={cn('w-1.5 h-1.5 rounded-full', active ? 'bg-white/70' : 'bg-pink-300')} />
                  )}
                  {outfitsByDate[toKey(day)] && (
                    <span className={cn('w-1.5 h-1.5 rounded-full', active ? 'bg-white/70' : 'bg-violet-300')} />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 選択日の予定リスト（時刻付き） ── */}
      {(() => {
        const evs = eventsByDate[toKey(selectedDate)] ?? []
        if (evs.length === 0) return null
        return (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm px-4 py-3 space-y-2">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">予定</p>
            {evs.map((ev) => (
              <div key={ev.id} className="flex items-center gap-3">
                <div className="text-right shrink-0 w-10">
                  <p className="text-[10px] text-stone-400 tabular-nums">{format(new Date(ev.startAt), 'H:mm')}</p>
                  <p className="text-[10px] text-stone-300 tabular-nums">{format(new Date(ev.endAt),   'H:mm')}</p>
                </div>
                <div className="w-0.5 self-stretch bg-pink-200 rounded-full" />
                <p className="text-[13px] text-stone-700 font-medium">{ev.title}</p>
              </div>
            ))}
          </div>
        )
      })()}

      {/* ── コーデスライダー（前後3日） ── */}
      <div>
        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wide mb-2 px-1">コーディネート</p>
        <div
          ref={sliderRef}
          className="overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* transform で中央カードを表示 */}
          <div
            className="flex transition-transform duration-300"
            style={{
              width: `${sliderDays.length * 100}%`,
              transform: `translateX(${-(centerIdx / sliderDays.length) * 100}%)`,
            }}
          >
            {sliderDays.map((day) => (
              <div
                key={toKey(day)}
                style={{ width: `${100 / sliderDays.length}%` }}
                className="px-1"
              >
                <OutfitDayCard
                  date={day}
                  events={eventsByDate[toKey(day)] ?? []}
                  outfit={outfitsByDate[toKey(day)] ?? null}
                  onToggleFavorite={onToggleFavorite}
                  onAddOutfit={() => onAddOutfit(toKey(day))}
                  compact
                />
              </div>
            ))}
          </div>
        </div>

        {/* ページネーションドット */}
        <div className="flex justify-center gap-1.5 mt-3">
          {sliderDays.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSelectDate(sliderDays[i])}
              className={cn(
                'rounded-full transition-all',
                i === centerIdx ? 'w-4 h-1.5 bg-pink-400' : 'w-1.5 h-1.5 bg-stone-200',
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
