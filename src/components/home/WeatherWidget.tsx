'use client'

import { useEffect, useState } from 'react'
import { useWeather } from '@/hooks/useWeather'
import { useGeolocation } from '@/hooks/useGeolocation'
import { describeWeatherCode, TOKYO_COORDS, type Coords } from '@/lib/weather'

export function WeatherWidget() {
  const [coords, setCoords] = useState<Coords>(TOKYO_COORDS)
  const [isCurrentLocation, setIsCurrentLocation] = useState(false)
  const { data, isLoading, isError, isFetching, refetch } = useWeather(coords)
  const geo = useGeolocation()

  useEffect(() => {
    if (geo.coords) {
      setCoords(geo.coords)
      setIsCurrentLocation(true)
    }
  }, [geo.coords])

  const weatherInfo = data ? describeWeatherCode(data.weatherCode, data.isDay) : null

  return (
    <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl p-3 border border-sky-100 flex flex-col gap-2">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-sky-600">☁️ 今日の天気</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-sky-400 hover:text-sky-600 transition-colors"
          aria-label="更新"
        >
          <svg className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {isLoading && (
        <p className="text-[11px] text-stone-400 text-center py-4">読み込み中…</p>
      )}
      {isError && (
        <p className="text-[11px] text-red-400 text-center py-4">取得失敗</p>
      )}

      {data && weatherInfo && (
        <>
          {/* メイン気温 */}
          <div className="flex items-center gap-2">
            <span className="text-3xl leading-none">{weatherInfo.icon}</span>
            <div>
              <p className="text-[22px] font-bold text-stone-800 leading-none">
                {Math.round(data.temperature)}<span className="text-[13px] font-normal">℃</span>
              </p>
              <p className="text-[10px] text-stone-500">{weatherInfo.label}</p>
            </div>
          </div>

          {/* 詳細 */}
          <div className="grid grid-cols-2 gap-1">
            <div className="bg-white/70 rounded-xl px-2 py-1.5 text-center">
              <p className="text-[9px] text-stone-400">最高/最低</p>
              <p className="text-[11px] font-bold text-stone-700">
                {Math.round(data.daily.tempMax)}° / {Math.round(data.daily.tempMin)}°
              </p>
            </div>
            <div className="bg-white/70 rounded-xl px-2 py-1.5 text-center">
              <p className="text-[9px] text-stone-400">降水確率</p>
              <p className="text-[11px] font-bold text-stone-700">
                {data.daily.precipitationProbabilityMax}%
              </p>
            </div>
          </div>

          {/* 現在地ボタン */}
          <button
            type="button"
            onClick={() => geo.loading ? null : (isCurrentLocation ? (setCoords(TOKYO_COORDS), setIsCurrentLocation(false)) : geo.request())}
            disabled={geo.loading}
            className="text-[10px] text-sky-500 hover:text-sky-700 transition-colors text-right disabled:opacity-50"
          >
            {geo.loading ? '取得中…' : isCurrentLocation ? '📍 現在地' : '東京 → 現在地'}
          </button>

          {geo.error && (
            <p className="text-[9px] text-red-400">{geo.error}</p>
          )}
        </>
      )}
    </div>
  )
}
