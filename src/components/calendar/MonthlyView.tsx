'use client'

import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, isSameDay, isToday, format, addMonths, subMonths,
} from 'date-fns'
import { ja } from 'date-fns/locale'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface CalendarEvent { id: string; title: string; startAt: string; endAt: string }
interface OutfitItem    { id: string; name: string; imageUrl?: string; thumbnailUrl?: string }
interface OutfitHistory  { id: string; isFavorite: boolean; items: OutfitItem[] }

interface Props {
  currentMonth:     Date
  selectedDate:     Date
  onSelectDate:     (d: Date) => void
  onChangeMonth:    (d: Date) => void
  eventsByDate:     Record<string, CalendarEvent[]>
  outfitsByDate:    Record<string, OutfitHistory | null>
  onToggleFavorite: (id: string) => void
  onAddOutfit:      (dateKey: string) => void
}

const DAY_LABELS = ['月', '火', '水', '木', '金', '土', '日']

export function MonthlyView({
  currentMonth, selectedDate, onSelectDate, onChangeMonth,
  eventsByDate, outfitsByDate, onToggleFavorite, onAddOutfit,
}: Props) {

  const monthStart = startOfMonth(currentMonth)
  const monthEnd   = endOfMonth(currentMonth)
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd    = endOfWeek(monthEnd,   { weekStartsOn: 1 })
  const gridDays   = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const toKey = (d: Date) => format(d, 'yyyy-MM-dd')

  const selectedKey = toKey(selectedDate)
  const selectedEvents = eventsByDate[selectedKey] ?? []
  const selectedOutfit = outfitsByDate[selectedKey] ?? null

  return (
    <div className="flex flex-col gap-0 h-full">

      {/* ── 上半分：月間カレンダー ── */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">

        {/* 月ナビ */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-50">
          <button
            type="button"
            onClick={() => onChangeMonth(subMonths(currentMonth, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-500 transition-colors"
          >
            ‹
          </button>
          <p className="text-[14px] font-bold text-stone-700">
            {format(currentMonth, 'yyyy年M月', { locale: ja })}
          </p>
          <button
            type="button"
            onClick={() => onChangeMonth(addMonths(currentMonth, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-500 transition-colors"
          >
            ›
          </button>
        </div>

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 border-b border-stone-50">
          {DAY_LABELS.map((d, i) => (
            <div key={d} className={cn(
              'py-1.5 text-center text-[10px] font-bold',
              i === 5 ? 'text-blue-400' : i === 6 ? 'text-rose-400' : 'text-stone-400',
            )}>
              {d}
            </div>
          ))}
        </div>

        {/* 日付グリッド */}
        <div className="grid grid-cols-7">
          {gridDays.map((day, idx) => {
            const key       = toKey(day)
            const inMonth   = isSameMonth(day, currentMonth)
            const isSelected = isSameDay(day, selectedDate)
            const isDateToday = isToday(day)
            const hasEvent  = (eventsByDate[key]?.length ?? 0) > 0
            const hasOutfit = !!outfitsByDate[key]
            const hasBoth   = hasEvent && hasOutfit
            const col       = idx % 7

            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectDate(day)}
                className={cn(
                  'flex flex-col items-center py-1.5 gap-0.5 transition-colors relative',
                  isSelected ? 'bg-pink-400' : isDateToday ? 'bg-pink-50' : 'hover:bg-stone-50',
                  !inMonth && 'opacity-30',
                )}
              >
                <span className={cn(
                  'text-[12px] font-semibold leading-none',
                  isSelected ? 'text-white' : isDateToday ? 'text-pink-500' :
                  col === 5 ? 'text-blue-500' : col === 6 ? 'text-rose-500' : 'text-stone-700',
                )}>
                  {format(day, 'd')}
                </span>

                {/* 色分けドット */}
                <div className="flex gap-0.5 h-1.5 items-center">
                  {hasBoth ? (
                    <>
                      <span className={cn('w-1.5 h-1.5 rounded-full', isSelected ? 'bg-white/70' : 'bg-pink-400')} />
                      <span className={cn('w-1.5 h-1.5 rounded-full', isSelected ? 'bg-white/50' : 'bg-violet-400')} />
                    </>
                  ) : hasEvent ? (
                    <span className={cn('w-1.5 h-1.5 rounded-full', isSelected ? 'bg-white/70' : 'bg-pink-400')} />
                  ) : hasOutfit ? (
                    <span className={cn('w-1.5 h-1.5 rounded-full', isSelected ? 'bg-white/70' : 'bg-violet-400')} />
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>

        {/* 凡例 */}
        <div className="flex items-center justify-end gap-3 px-4 py-2 border-t border-stone-50">
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-400" /><span className="text-[9px] text-stone-400">予定あり</span></div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-400" /><span className="text-[9px] text-stone-400">コーデあり</span></div>
        </div>
      </div>

      {/* ── 下半分：選択日の詳細 ── */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm flex-1 overflow-y-auto mt-3">
        <div className="px-4 py-3 border-b border-stone-50">
          <p className="text-[13px] font-bold text-stone-700">
            {format(selectedDate, 'M月d日(E)', { locale: ja })}
          </p>
        </div>

        <div className="px-4 py-3 space-y-4">

          {/* 時間ごとの予定 */}
          {selectedEvents.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">予定</p>
              {selectedEvents.map((ev) => (
                <div key={ev.id} className="flex items-stretch gap-3">
                  <div className="text-right shrink-0 w-10">
                    <p className="text-[11px] text-stone-500 tabular-nums font-medium">{format(new Date(ev.startAt), 'H:mm')}</p>
                    <p className="text-[10px] text-stone-300 tabular-nums">{format(new Date(ev.endAt),   'H:mm')}</p>
                  </div>
                  <div className="w-0.5 bg-pink-200 rounded-full shrink-0" />
                  <div className="flex-1 py-0.5">
                    <p className="text-[13px] text-stone-800 font-medium leading-snug">{ev.title}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-stone-300 text-center py-2">予定なし</p>
          )}

          {/* コーディネート */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">コーディネート</p>
              {selectedOutfit && (
                <button
                  type="button"
                  onClick={() => onToggleFavorite(selectedOutfit.id)}
                  className="text-[18px] leading-none"
                >
                  <span className={selectedOutfit.isFavorite ? 'text-pink-500' : 'text-stone-300'}>
                    {selectedOutfit.isFavorite ? '♥' : '♡'}
                  </span>
                </button>
              )}
            </div>

            {selectedOutfit ? (
              <div className="flex flex-wrap gap-2">
                {selectedOutfit.items.map((item) => {
                  const src = item.thumbnailUrl ?? item.imageUrl
                  if (!src) return null
                  return (
                    <div key={item.id} className="flex flex-col items-center gap-1">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-stone-50 border border-stone-100">
                        <Image
                          src={src}
                          alt={item.name}
                          width={56}
                          height={56}
                          className="w-full h-full object-contain p-1"
                          unoptimized={src.startsWith('/assets/')}
                        />
                      </div>
                      <p className="text-[9px] text-stone-400 text-center max-w-[56px] truncate">{item.name}</p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-3">
                <p className="text-[11px] text-stone-400">この日のコーデはまだありません</p>
                <button
                  type="button"
                  onClick={() => onAddOutfit(selectedKey)}
                  className="text-[11px] font-bold text-pink-500 border border-pink-200 rounded-full px-4 py-1.5 hover:bg-pink-50 transition-colors"
                >
                  ＋ コーデを追加
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
