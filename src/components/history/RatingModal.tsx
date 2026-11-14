'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface RatingModalProps {
  historyId: string
  onSubmit: (rating: number, note?: string) => void
  onClose: () => void
  loading?: boolean
}

const ratingOptions = [
  { value: 3, label: '⭐⭐⭐ 最高だった' },
  { value: 2, label: '⭐⭐ 良かった' },
  { value: 1, label: '⭐ まあまあ' },
  { value: 0, label: '👎 着なかった' },
]

export function RatingModal({ onSubmit, onClose, loading }: RatingModalProps) {
  const [rating, setRating] = useState<number | null>(null)
  const [note, setNote] = useState('')

  const handleSubmit = () => {
    if (rating === null) return
    onSubmit(rating === 0 ? 1 : rating, rating === 0 ? note || '着なかった' : note || undefined)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm p-6">
        <h2 className="text-lg font-bold text-stone-900 mb-1">昨日のコーデはどうでしたか？</h2>
        <p className="text-stone-400 text-sm mb-5">フィードバックでAIが学習します</p>

        <div className="space-y-2 mb-4">
          {ratingOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRating(opt.value)}
              className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                rating === opt.value
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-50 text-stone-700 hover:bg-stone-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {rating === 0 && (
          <input
            type="text"
            placeholder="理由（任意）"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-stone-500"
          />
        )}

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>スキップ</Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={rating === null} loading={loading}>
            送信
          </Button>
        </div>
      </div>
    </div>
  )
}
