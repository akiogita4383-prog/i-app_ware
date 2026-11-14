'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Image from 'next/image'
import { useAuthStore } from '@/stores/auth'
import { useWeather } from '@/hooks/useWeather'
import { TOKYO_COORDS, describeWeatherCode, type WeatherData } from '@/lib/weather'
import type { ClothingItem } from '@/types'
import { Spinner } from '@/components/ui/Spinner'
import api from '@/lib/api'

const DAILY_KEY = 'ware-daily-screen'

interface Recommendation {
  title: string
  reason: string
  itemIds: string[]
  items: ClothingItem[]
  tags: string[]
}

interface CalendarEvent {
  id: string
  title: string
  startAt: string
  endAt: string
}

// ── サブコンポーネント ───────────────────────────────────────────────

function OutfitDisplay({ items }: { items: ClothingItem[] }) {
  const display = items.slice(0, 4)
  if (display.length === 0) {
    return <p className="text-[11px] text-pink-300">アイテムなし</p>
  }
  return (
    <div className={`grid gap-1.5 w-full ${display.length === 1 ? 'grid-cols-1 max-w-[100px]' : 'grid-cols-2'}`}>
      {display.map((item) => (
        <div
          key={item.id}
          className="aspect-square rounded-xl overflow-hidden bg-white border border-pink-100 shadow-sm relative"
        >
          {item.thumbnailUrl ? (
            <Image src={item.thumbnailUrl} alt={item.name} fill className="object-cover" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-1">
              <p className="text-[8px] text-stone-400 text-center leading-tight">{item.name}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ScheduleCard({ events, todayLabel }: { events: CalendarEvent[]; todayLabel: string }) {
  return (
    <div className="flex-1 bg-white rounded-2xl p-3 border border-stone-100 flex flex-col gap-1 overflow-hidden min-h-0">
      <p className="text-[11px] font-bold text-stone-600 shrink-0">📅 今日の予定</p>
      <p className="text-[10px] text-stone-400 shrink-0">{todayLabel}</p>
      <div className="flex-1 overflow-hidden space-y-1">
        {events.length === 0 ? (
          <p className="text-[10px] text-stone-300 text-center pt-1">予定なし</p>
        ) : (
          events.slice(0, 4).map((e) => (
            <div key={e.id} className="flex items-start gap-1.5">
              <span className="text-[9px] text-stone-400 shrink-0 pt-px">
                {format(new Date(e.startAt), 'H:mm')}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-pink-300 shrink-0 mt-[3px]" />
              <span className="text-[10px] text-stone-600 leading-tight line-clamp-1">{e.title}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function WeatherCard({
  weather,
  weatherInfo,
}: {
  weather: WeatherData | undefined
  weatherInfo: { label: string; icon: string } | null
}) {
  return (
    <div className="flex-1 bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl p-3 border border-sky-100 min-h-0">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[11px] font-bold text-sky-600">今日の天気</p>
        <p className="text-[9px] text-stone-400">東京 📍</p>
      </div>
      {!weather || !weatherInfo ? (
        <p className="text-[10px] text-sky-300">読み込み中…</p>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <span className="text-2xl leading-none">{weatherInfo.icon}</span>
            <div>
              <p className="text-[18px] font-bold text-stone-800 leading-none">
                {Math.round(weather.temperature)}<span className="text-[10px] font-normal">℃</span>
              </p>
              <p className="text-[9px] text-stone-500">{weatherInfo.label}</p>
            </div>
          </div>
          <div className="mt-1.5 flex gap-2">
            <span className="text-[9px] text-stone-400">最高 {Math.round(weather.daily.tempMax)}℃</span>
            <span className="text-[9px] text-stone-400">最低 {Math.round(weather.daily.tempMin)}℃</span>
          </div>
        </>
      )}
    </div>
  )
}

function MessageCard({ message }: { message?: string }) {
  return (
    <div className="flex-1 bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-3 border border-pink-100 min-h-0">
      <p className="text-[11px] font-bold text-pink-500 mb-1.5">♡ ひとこと</p>
      {message ? (
        <p className="text-[11px] text-stone-600 leading-relaxed">{message}</p>
      ) : (
        <div className="flex items-center gap-1 pt-1">
          {[0, 0.15, 0.3].map((delay, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-pink-200 animate-bounce"
              style={{ animationDelay: `${delay}s` }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── メインページ ────────────────────────────────────────────────────

export default function DailyPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [currentIdx, setCurrentIdx] = useState(0)

  // 当日すでに見ていたらホームへ
  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    if (localStorage.getItem(DAILY_KEY) === today) {
      router.replace('/')
    }
  }, [router])

  const { data: weather } = useWeather(TOKYO_COORDS)
  const weatherInfo = weather ? describeWeatherCode(weather.weatherCode, weather.isDay) : null

  // AI コーデおすすめ
  const { data: recommendations = [], isLoading: recLoading } = useQuery<Recommendation[]>({
    queryKey: ['outfit', 'recommend', weather?.weatherCode, Math.round(weather?.temperature ?? 0)],
    queryFn: () => {
      const p = new URLSearchParams({
        weatherCode: String(weather!.weatherCode),
        temp:        String(weather!.temperature),
        tempMax:     String(weather!.daily.tempMax),
        tempMin:     String(weather!.daily.tempMin),
        precipProb:  String(weather!.daily.precipitationProbabilityMax),
        isDay:       String(weather!.isDay),
      })
      return api.get(`/outfit/recommend?${p}`).then((r) => r.data.data)
    },
    enabled: !!weather,
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  })

  // 今日の予定
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const { data: events = [] } = useQuery<CalendarEvent[]>({
    queryKey: ['events', 'today', todayStr],
    queryFn: () =>
      api.get(`/events?from=${todayStr}&to=${todayStr}`).then((r) => r.data.data ?? []),
    staleTime: 1000 * 60 * 5,
  })

  // AI ひとこと
  const { data: messageData } = useQuery<{ message: string }>({
    queryKey: ['daily', 'message', weather?.weatherCode],
    queryFn: () => {
      const dayOfWeek = format(new Date(), 'EEEE', { locale: ja })
      const p = new URLSearchParams({
        weather: weatherInfo?.label ?? '晴れ',
        temp:    String(Math.round(weather?.temperature ?? 20)),
        day:     dayOfWeek,
      })
      return fetch(`/api/daily/message?${p}`)
        .then((r) => r.json())
        .then((d) => d.data)
    },
    enabled: !!weather,
    staleTime: 1000 * 60 * 60,
  })

  // コーデでスタート
  const startMutation = useMutation({
    mutationFn: (rec: Recommendation) =>
      api.post('/outfit/draft', { itemIds: rec.itemIds, title: rec.title, tags: rec.tags }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outfit', 'draft'] })
      markSeen()
      router.replace('/')
    },
  })

  const markSeen = () => localStorage.setItem(DAILY_KEY, format(new Date(), 'yyyy-MM-dd'))
  const handleStart = () => {
    const rec = recommendations[currentIdx]
    if (rec) startMutation.mutate(rec)
  }
  const handleOther = () => { markSeen(); router.replace('/') }

  // 時間帯別挨拶
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning!♡' : hour < 18 ? 'Good afternoon!♡' : 'Good evening!♡'
  const todayLabel = format(new Date(), 'M月d日(E)', { locale: ja })
  const selectedRec = recommendations[currentIdx]

  return (
    <div className="flex flex-col h-dvh bg-white overflow-hidden select-none">

      {/* ── ヘッダー ── */}
      <div className="px-4 pt-6 pb-2 flex items-start justify-between shrink-0">
        <div>
          <p className="text-[18px] font-bold italic text-pink-400 leading-tight">{greeting}</p>
          <p className="text-[15px] font-bold text-stone-800 mt-0.5">
            おはようございます、{user?.name?.split(' ')[0]}さん🌸
          </p>
          <p className="text-[11px] text-stone-400 mt-0.5">今日も素敵な1日になりますように✨</p>
        </div>
        <button
          type="button"
          aria-label="通知"
          className="w-9 h-9 rounded-full bg-stone-50 border border-stone-100 flex items-center justify-center text-stone-400 shrink-0 mt-0.5"
        >
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>
      </div>

      {/* ── メイングリッド ── */}
      <div className="flex-1 px-3 grid grid-cols-[1fr_1fr] gap-2.5 min-h-0 pb-1">

        {/* 左：おすすめコーデ */}
        <div className="bg-gradient-to-b from-pink-50 to-rose-50 rounded-3xl border border-pink-100 flex flex-col overflow-hidden">
          {/* バッジ */}
          <div className="px-3 pt-3 pb-1 shrink-0">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-pink-400 rounded-full px-2.5 py-1 shadow-sm">
              ✦ おすすめコーデ
            </span>
          </div>

          {/* アイテム表示エリア */}
          <div className="flex-1 px-3 py-2 flex flex-col items-center justify-center min-h-0">
            {recLoading ? (
              <div className="flex flex-col items-center gap-2">
                <Spinner className="text-pink-300" />
                <p className="text-[10px] text-pink-300">提案中…</p>
              </div>
            ) : selectedRec ? (
              <OutfitDisplay items={selectedRec.items} />
            ) : (
              <p className="text-[11px] text-pink-300 text-center">クローゼットに<br />アイテムを追加してね</p>
            )}
          </div>

          {/* タイトル・理由 */}
          <div className="px-3 pt-1 pb-2 shrink-0 bg-white/60 backdrop-blur-sm">
            {selectedRec ? (
              <>
                <p className="text-[12px] font-bold text-stone-800 text-center leading-snug">{selectedRec.title}</p>
                <p className="text-[10px] text-stone-500 text-center mt-0.5 leading-snug line-clamp-2">{selectedRec.reason}</p>
              </>
            ) : (
              <p className="text-[10px] text-pink-200 text-center">―</p>
            )}
          </div>

          {/* カルーセルドット */}
          <div className="flex justify-center gap-1.5 pb-2.5 pt-2 shrink-0">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => recommendations.length > 0 && setCurrentIdx(i)}
                className={`rounded-full transition-all duration-200 ${
                  i === currentIdx
                    ? 'bg-pink-500 w-3 h-1.5'
                    : 'bg-pink-200 w-1.5 h-1.5'
                }`}
              />
            ))}
          </div>
        </div>

        {/* 右：3カード */}
        <div className="flex flex-col gap-2.5 min-h-0">
          <ScheduleCard events={events} todayLabel={todayLabel} />
          <WeatherCard weather={weather} weatherInfo={weatherInfo} />
          <MessageCard message={messageData?.message} />
        </div>
      </div>

      {/* ── ボタン ── */}
      <div className="px-4 pt-2 pb-8 space-y-2.5 shrink-0">
        <button
          type="button"
          onClick={handleStart}
          disabled={!selectedRec || startMutation.isPending}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-pink-400 to-rose-400 text-white font-bold text-[14px] shadow-[0_4px_16px_rgba(251,113,133,0.35)] hover:from-pink-500 hover:to-rose-500 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {startMutation.isPending ? (
            <><Spinner className="w-4 h-4 text-white/70" /><span>保存中…</span></>
          ) : (
            <>
              <span>このコーデでスタート</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleOther}
          className="w-full flex items-center justify-center gap-1.5 py-3 rounded-2xl border border-stone-200 bg-white text-stone-500 font-medium text-[13px] hover:bg-stone-50 transition-colors active:scale-[0.98]"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          <span>他のコーデも見る</span>
        </button>
      </div>
    </div>
  )
}
