'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { useWeather } from '@/hooks/useWeather'
import { TOKYO_COORDS, describeWeatherCode } from '@/lib/weather'
import { ClothingItem } from '@/types'
import { Spinner } from '@/components/ui/Spinner'
import api from '@/lib/api'

interface Recommendation {
  title: string
  reason: string
  itemIds: string[]
  items: ClothingItem[]
  tags: string[]
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const qc = useQueryClient()
  const [started, setStarted] = useState(false)

  const startMutation = useMutation({
    mutationFn: () =>
      api.post('/outfit/draft', {
        itemIds: rec.itemIds,
        title: rec.title,
        tags: rec.tags,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outfit', 'draft'] })
      setStarted(true)
      toast.success('今日のコーデに設定しました')
    },
    onError: () => toast.error('保存に失敗しました'),
  })

  return (
    <div className="flex-shrink-0 w-52 bg-white rounded-2xl border border-pink-100 p-4 flex flex-col gap-2.5">
      <div>
        <p className="text-sm font-bold text-stone-900 leading-tight">{rec.title}</p>
        <div className="flex flex-wrap gap-1 mt-1">
          {rec.tags.map((tag) => (
            <span key={tag} className="text-[10px] text-pink-400">
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {rec.items.length > 0 && (
        <div className="flex gap-1.5">
          {rec.items.slice(0, 4).map((item) => (
            <div
              key={item.id}
              className="w-12 h-16 bg-stone-100 rounded-xl overflow-hidden relative flex-shrink-0"
            >
              {item.thumbnailUrl ? (
                <Image src={item.thumbnailUrl} alt={item.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[9px] text-stone-400 text-center p-1 leading-tight">
                  {item.name}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-stone-500 leading-relaxed">{rec.reason}</p>

      <button
        type="button"
        onClick={() => !started && startMutation.mutate()}
        disabled={startMutation.isPending || started}
        className={`w-full rounded-xl py-2 text-xs font-semibold transition-colors ${
          started
            ? 'bg-pink-100 text-pink-400 cursor-default'
            : 'bg-pink-500 text-white hover:bg-pink-600 disabled:opacity-60'
        }`}
      >
        {startMutation.isPending ? '保存中…' : started ? '✓ 設定済み' : 'このコーデでスタート'}
      </button>
    </div>
  )
}

export function OutfitRecommendationCarousel() {
  const { data: weather, isLoading: weatherLoading } = useWeather(TOKYO_COORDS)

  const { data: recommendations = [], isLoading: recLoading } = useQuery<Recommendation[]>({
    queryKey: [
      'outfit',
      'recommend',
      weather?.weatherCode,
      Math.round(weather?.temperature ?? 0),
    ],
    queryFn: () => {
      const params = new URLSearchParams({
        weatherCode: String(weather!.weatherCode),
        temp: String(weather!.temperature),
        tempMax: String(weather!.daily.tempMax),
        tempMin: String(weather!.daily.tempMin),
        precipProb: String(weather!.daily.precipitationProbabilityMax),
        isDay: String(weather!.isDay),
      })
      return api.get(`/outfit/recommend?${params}`).then((r) => r.data.data)
    },
    enabled: !!weather,
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  })

  const isLoading = weatherLoading || recLoading
  const weatherInfo = weather ? describeWeatherCode(weather.weatherCode, weather.isDay) : null

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8">
        <Spinner />
        <p className="text-sm text-stone-400">AIがコーデを提案しています…</p>
      </div>
    )
  }

  if (!recommendations.length) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-pink-500">
          ♡ こんなコーディネートもおすすめ
        </h2>
        {weather && (
          <span className="text-xs text-stone-400">
            {weatherInfo?.icon} {Math.round(weather.temperature)}℃
          </span>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        {recommendations.map((rec, i) => (
          <RecommendationCard key={i} rec={rec} />
        ))}
      </div>
    </div>
  )
}
