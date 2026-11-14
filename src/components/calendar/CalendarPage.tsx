'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { addMonths, format, startOfMonth, endOfMonth, addDays, subDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useAuthStore } from '@/stores/auth'
import { WeeklyView }  from './WeeklyView'
import { MonthlyView } from './MonthlyView'
import { EventModal }  from './EventModal'

type ViewMode = 'weekly' | 'monthly'

interface CalendarEvent { id: string; title: string; startAt: string; endAt: string }
interface OutfitHistory  {
  id: string; isFavorite: boolean;
  items: { id: string; name: string; imageUrl?: string; thumbnailUrl?: string }[]
  date: string
}

export function CalendarPage() {
  const router = useRouter()
  const { accessToken } = useAuthStore()
  const authHeader = { Authorization: `Bearer ${accessToken}` }

  const [viewMode,      setViewMode]      = useState<ViewMode>('weekly')
  const [selectedDate,  setSelectedDate]  = useState(new Date())
  const [currentMonth,  setCurrentMonth]  = useState(new Date())
  const [showEventModal, setShowEventModal] = useState(false)

  const [eventsByDate,  setEventsByDate]  = useState<Record<string, CalendarEvent[]>>({})
  const [outfitsByDate, setOutfitsByDate] = useState<Record<string, OutfitHistory | null>>({})

  // ── データ取得 ────────────────────────────────────────────────
  const fetchData = useCallback(async (month: Date) => {
    const from = format(subDays(startOfMonth(month), 7), 'yyyy-MM-dd')
    const to   = format(addDays(endOfMonth(month),   7), 'yyyy-MM-dd')

    try {
      const [evRes, outRes] = await Promise.all([
        fetch(`/api/events?from=${from}&to=${to}`, { headers: authHeader }),
        fetch(`/api/history?month=${format(month, 'yyyy-MM')}`, { headers: authHeader }),
      ])

      if (evRes.ok) {
        const { data: events }: { data: CalendarEvent[] } = await evRes.json()
        const map: Record<string, CalendarEvent[]> = {}
        for (const ev of events) {
          const key = format(new Date(ev.startAt), 'yyyy-MM-dd')
          ;(map[key] ??= []).push(ev)
        }
        setEventsByDate((prev) => ({ ...prev, ...map }))
      }

      if (outRes.ok) {
        const { data: outfits }: { data: OutfitHistory[] } = await outRes.json()
        const map: Record<string, OutfitHistory> = {}
        for (const o of outfits) {
          const key = format(new Date(o.date), 'yyyy-MM-dd')
          map[key] = o
        }
        setOutfitsByDate((prev) => ({ ...prev, ...map }))
      }
    } catch { /* ignore */ }
  }, [accessToken]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData(currentMonth) }, [currentMonth, fetchData])

  // 月が変わったら再フェッチ
  const handleChangeMonth = (month: Date) => {
    setCurrentMonth(month)
  }

  // ── 予定追加 ────────────────────────────────────────────────
  const handleAddEvent = async (title: string, startAt: string, endAt: string) => {
    const res = await fetch('/api/events', {
      method:  'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ title, startAt, endAt }),
    })
    if (!res.ok) throw new Error('Failed')
    const { data: ev }: { data: CalendarEvent } = await res.json()
    const key = format(new Date(ev.startAt), 'yyyy-MM-dd')
    setEventsByDate((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), ev] }))
  }

  // ── コーデ追加（クローゼットへ遷移） ─────────────────────────────
  const handleAddOutfit = (dateKey: string) => {
    router.push(`/closet?date=${dateKey}`)
  }

  // ── お気に入りトグル ──────────────────────────────────────────
  const handleToggleFavorite = async (outfitId: string) => {
    const res = await fetch(`/api/history/${outfitId}/favorite`, {
      method: 'PATCH', headers: authHeader,
    })
    if (!res.ok) return
    const { data }: { data: { isFavorite: boolean } } = await res.json()
    setOutfitsByDate((prev) => {
      const next = { ...prev }
      for (const key of Object.keys(next)) {
        if (next[key]?.id === outfitId) {
          next[key] = { ...next[key]!, isFavorite: data.isFavorite }
        }
      }
      return next
    })
  }

  const calendarIcon = (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3"  y1="10" x2="21" y2="10" />
    </svg>
  )

  return (
    <div className="flex flex-col h-full">

      {/* ── ページヘッダー ── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 bg-white border-b border-stone-100">
        <p className="text-[18px] font-bold text-stone-800">
          {viewMode === 'weekly'
            ? format(selectedDate, 'yyyy年M月', { locale: ja })
            : format(currentMonth, 'yyyy年M月', { locale: ja })
          }
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEventModal(true)}
            className="flex items-center gap-1 text-[11px] font-bold text-pink-600 border border-pink-200 rounded-full px-3 py-1.5 hover:bg-pink-50 transition-colors"
          >
            ＋ 予定を追加
          </button>
          <button
            type="button"
            onClick={() => setViewMode(v => v === 'weekly' ? 'monthly' : 'weekly')}
            className={`p-1.5 rounded-full transition-colors ${viewMode === 'monthly' ? 'text-pink-500 bg-pink-50' : 'text-stone-400 hover:bg-stone-100'}`}
            aria-label={viewMode === 'weekly' ? '月間カレンダーに切り替え' : '週間カレンダーに切り替え'}
          >
            {calendarIcon}
          </button>
        </div>
      </div>

      {/* ── カレンダー本体 ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {viewMode === 'weekly' ? (
          <WeeklyView
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            eventsByDate={eventsByDate}
            outfitsByDate={outfitsByDate}
            onToggleFavorite={handleToggleFavorite}
            onAddOutfit={handleAddOutfit}
          />
        ) : (
          <MonthlyView
            currentMonth={currentMonth}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onChangeMonth={handleChangeMonth}
            eventsByDate={eventsByDate}
            outfitsByDate={outfitsByDate}
            onToggleFavorite={handleToggleFavorite}
            onAddOutfit={handleAddOutfit}
          />
        )}
      </div>

      {/* 予定追加モーダル */}
      {showEventModal && (
        <EventModal
          defaultDate={selectedDate}
          onClose={() => setShowEventModal(false)}
          onSave={handleAddEvent}
        />
      )}
    </div>
  )
}
