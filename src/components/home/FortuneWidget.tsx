'use client'

import { useMemo, useState } from 'react'
import { getDailyFortune, ZODIAC_SIGNS, type ZodiacSign } from '@/lib/horoscope'

function Stars({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={`text-[11px] ${i < value ? 'text-amber-400' : 'text-stone-200'}`}>★</span>
      ))}
    </span>
  )
}

export function FortuneWidget() {
  const [signKey, setSignKey] = useState('aries')

  const sign: ZodiacSign = useMemo(
    () => ZODIAC_SIGNS.find((s) => s.key === signKey) ?? ZODIAC_SIGNS[0],
    [signKey],
  )

  const fortune = useMemo(() => getDailyFortune(sign), [sign])

  return (
    <div className="bg-gradient-to-br from-amber-50 to-pink-50 rounded-2xl p-3 border border-amber-100 flex flex-col gap-2">
      {/* ヘッダー */}
      <p className="text-[11px] font-bold text-amber-600">✨ 今日の運勢</p>

      {/* 星座セレクト */}
      <select
        value={signKey}
        onChange={(e) => setSignKey(e.target.value)}
        className="w-full text-[11px] rounded-xl border border-amber-100 bg-white/80 px-2 py-1.5 text-stone-700 outline-none focus:border-amber-300"
      >
        {ZODIAC_SIGNS.map((s) => (
          <option key={s.key} value={s.key}>
            {s.symbol} {s.name}
          </option>
        ))}
      </select>

      {/* 星座 + 総合運 */}
      <div className="flex items-center justify-between bg-white/70 rounded-xl px-2.5 py-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xl leading-none">{sign.symbol}</span>
          <p className="text-[11px] font-bold text-stone-700">{sign.name}</p>
        </div>
        <Stars value={fortune.overall} />
      </div>

      {/* ラッキー情報 */}
      <div className="grid grid-cols-2 gap-1">
        <div className="bg-white/70 rounded-xl px-2 py-1.5 text-center">
          <p className="text-[9px] text-stone-400">ラッキーカラー</p>
          <p className="text-[11px] font-bold text-amber-600 truncate">{fortune.luckyColor}</p>
        </div>
        <div className="bg-white/70 rounded-xl px-2 py-1.5 text-center">
          <p className="text-[9px] text-stone-400">ラッキーナンバー</p>
          <p className="text-[11px] font-bold text-amber-600">{fortune.luckyNumber}</p>
        </div>
      </div>

      {/* 一言メッセージ */}
      <p className="text-[10px] text-stone-500 leading-relaxed line-clamp-2">{fortune.message}</p>
    </div>
  )
}
