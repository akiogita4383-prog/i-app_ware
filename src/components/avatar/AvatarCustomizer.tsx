'use client'

import { BodyType, HairColor, HairStyle, SkinTone } from '@/types/avatar'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const bodyTypeOptions: { value: BodyType; label: string }[] = [
  { value: 'スリム', label: 'スリム' },
  { value: 'ノーマル', label: 'ノーマル' },
  { value: 'マッスル', label: 'マッスル' },
]

const hairStyleOptions: { value: HairStyle; label: string }[] = [
  { value: 'ショート', label: 'ショート' },
  { value: 'ミディアム', label: 'ミディアム' },
  { value: 'ロング', label: 'ロング' },
  { value: 'ポニーテール', label: 'ポニーテール' },
  { value: 'ボブ', label: 'ボブ' },
]

const hairColorOptions: { value: HairColor; label: string; color: string }[] = [
  { value: 'ブラック', label: 'ブラック', color: '#161616' },
  { value: 'ブラウン', label: 'ブラウン', color: '#8B5C42' },
  { value: 'ブロンド', label: 'ブロンド', color: '#F5D372' },
  { value: 'ピンク', label: 'ピンク', color: '#F472B6' },
  { value: 'ブルー', label: 'ブルー', color: '#60A5FA' },
  { value: 'グレー', label: 'グレー', color: '#9CA3AF' },
]

const skinToneOptions: { value: SkinTone; label: string; bg: string }[] = [
  { value: '明るい', label: '明るい', bg: '#F7D3BE' },
  { value: '自然', label: '自然', bg: '#E0B18B' },
  { value: '健康的', label: '健康的', bg: '#C68A56' },
  { value: '日焼け', label: '日焼け', bg: '#A56C44' },
]

interface AvatarCustomizerProps {
  height: number
  bodyType: BodyType
  hairStyle: HairStyle
  hairColor: HairColor
  skinTone: SkinTone
  onChange: (field: 'height' | 'bodyType' | 'hairStyle' | 'hairColor' | 'skinTone', value: any) => void
}

export function AvatarCustomizer({ height, bodyType, hairStyle, hairColor, skinTone, onChange }: AvatarCustomizerProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-stone-200 bg-white p-5">
        <p className="text-sm font-semibold text-stone-700 mb-3">身長</p>
        <input
          type="range"
          min={150}
          max={185}
          value={height}
          onChange={(e) => onChange('height', Number(e.target.value))}
          className="w-full"
        />
        <div className="mt-3 flex items-center justify-between text-sm text-stone-500">
          <span>150cm</span>
          <span>{height}cm</span>
          <span>185cm</span>
        </div>
      </div>

      <div className="rounded-3xl border border-stone-200 bg-white p-5">
        <p className="text-sm font-semibold text-stone-700 mb-3">体型</p>
        <div className="grid grid-cols-3 gap-2">
          {bodyTypeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange('bodyType', option.value)}
              className={cn(
                'rounded-2xl border px-3 py-2 text-sm font-medium transition',
                bodyType === option.value
                  ? 'border-stone-900 bg-stone-900 text-white'
                  : 'border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-900'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-stone-200 bg-white p-5">
        <p className="text-sm font-semibold text-stone-700 mb-3">ヘアスタイル</p>
        <div className="grid grid-cols-2 gap-2">
          {hairStyleOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange('hairStyle', option.value)}
              className={cn(
                'rounded-2xl border px-3 py-2 text-sm font-medium transition text-left',
                hairStyle === option.value
                  ? 'border-stone-900 bg-stone-900 text-white'
                  : 'border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-900'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-stone-200 bg-white p-5">
        <p className="text-sm font-semibold text-stone-700 mb-3">ヘアカラー</p>
        <div className="grid grid-cols-3 gap-2">
          {hairColorOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange('hairColor', option.value)}
              className={cn(
                'rounded-2xl border px-3 py-3 text-sm font-medium transition',
                hairColor === option.value
                  ? 'border-stone-900 bg-stone-900 text-white'
                  : 'border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-900'
              )}
            >
              <span className="block text-xs text-stone-400">{option.label}</span>
              <span
                className="mt-2 inline-block h-6 w-full rounded-xl"
                style={{ backgroundColor: option.color }}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-stone-200 bg-white p-5">
        <p className="text-sm font-semibold text-stone-700 mb-3">肌の色</p>
        <div className="grid grid-cols-2 gap-2">
          {skinToneOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange('skinTone', option.value)}
              className={cn(
                'rounded-2xl border px-3 py-3 text-sm font-medium transition flex items-center gap-3',
                skinTone === option.value
                  ? 'border-stone-900 bg-stone-900 text-white'
                  : 'border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-900'
              )}
            >
              <span className="h-8 w-8 rounded-full" style={{ backgroundColor: option.bg }} />
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <Button type="button" variant="secondary" className="w-full"
        onClick={() => onChange('height', 165)}
      >
        リセット
      </Button>
    </div>
  )
}
