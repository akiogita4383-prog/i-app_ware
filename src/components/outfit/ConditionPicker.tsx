'use client'

import { OutfitContext, Weather, Temperature, Schedule, Mood } from '@/types'
import { cn } from '@/lib/utils'

const weatherOptions: { value: Weather; emoji: string }[] = [
  { value: '晴れ', emoji: '☀️' },
  { value: '曇り', emoji: '☁️' },
  { value: '雨', emoji: '🌧️' },
  { value: '雪', emoji: '❄️' },
]

const temperatureOptions: { value: Temperature; label: string }[] = [
  { value: '〜10℃', label: '〜10℃' },
  { value: '10〜16℃', label: '10-16℃' },
  { value: '16〜22℃', label: '16-22℃' },
  { value: '22〜27℃', label: '22-27℃' },
  { value: '27℃〜', label: '27℃〜' },
]

const scheduleOptions: { value: Schedule; label: string }[] = [
  { value: 'オフィス', label: '🏢 オフィス' },
  { value: 'カジュアル打合せ', label: '☕ カジュアル' },
  { value: '重要商談', label: '💼 重要商談' },
  { value: 'ランチ', label: '🍽️ ランチ' },
  { value: 'デート', label: '💕 デート' },
  { value: '休日', label: '🌿 休日' },
  { value: '在宅', label: '🏠 在宅' },
]

const moodOptions: { value: Mood; label: string }[] = [
  { value: 'きれいめ', label: '✨ きれいめ' },
  { value: 'カジュアル', label: '😊 カジュアル' },
  { value: 'ミニマル', label: '⬜ ミニマル' },
  { value: 'トレンド', label: '🔥 トレンド' },
  { value: 'ラク', label: '😴 ラク' },
  { value: 'モード', label: '🖤 モード' },
]

interface ConditionPickerProps {
  value: Partial<OutfitContext>
  onChange: (v: Partial<OutfitContext>) => void
}

function OptionGroup<T extends string>({
  label,
  options,
  value,
  onSelect,
}: {
  label: string
  options: { value: T; label?: string; emoji?: string }[]
  value: T | undefined
  onSelect: (v: T) => void
}) {
  return (
    <div>
      <p className="text-sm font-medium text-stone-700 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            className={cn(
              'px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-150',
              value === opt.value
                ? 'bg-stone-900 text-white shadow-sm'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            )}
          >
            {opt.emoji ? `${opt.emoji} ${opt.value}` : opt.label || opt.value}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ConditionPicker({ value, onChange }: ConditionPickerProps) {
  const set = <K extends keyof OutfitContext>(key: K, v: OutfitContext[K]) =>
    onChange({ ...value, [key]: v })

  return (
    <div className="space-y-5">
      <OptionGroup
        label="天気"
        options={weatherOptions}
        value={value.weather}
        onSelect={(v) => set('weather', v)}
      />
      <OptionGroup
        label="気温"
        options={temperatureOptions}
        value={value.temperature}
        onSelect={(v) => set('temperature', v)}
      />
      <OptionGroup
        label="予定"
        options={scheduleOptions}
        value={value.schedule}
        onSelect={(v) => set('schedule', v)}
      />
      <OptionGroup
        label="気分"
        options={moodOptions}
        value={value.mood}
        onSelect={(v) => set('mood', v)}
      />
    </div>
  )
}
