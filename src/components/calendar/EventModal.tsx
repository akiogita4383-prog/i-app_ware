'use client'

import { useRef, useState } from 'react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface Props {
  defaultDate: Date
  onClose: () => void
  onSave:  (title: string, startAt: string, endAt: string) => Promise<void>
}

export function EventModal({ defaultDate, onClose, onSave }: Props) {
  const dateStr = format(defaultDate, 'yyyy-MM-dd')
  const [title,   setTitle]   = useState('')
  const [startAt, setStartAt] = useState(`${dateStr}T09:00`)
  const [endAt,   setEndAt]   = useState(`${dateStr}T10:00`)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const dialogRef = useRef<HTMLDialogElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('内容を入力してください'); return }
    if (startAt >= endAt) { setError('終了時刻は開始時刻より後にしてください'); return }
    setSaving(true)
    try {
      await onSave(title.trim(), new Date(startAt).toISOString(), new Date(endAt).toISOString())
      onClose()
    } catch {
      setError('保存に失敗しました')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm pt-16 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl">
        <h2 className="text-[15px] font-bold text-stone-800 mb-4">＋ 予定を追加</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 内容 */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide">内容</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="予定の内容を入力"
              className="w-full rounded-xl border border-stone-200 px-4 py-3 text-[14px] text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300"
              autoFocus
            />
          </div>

          {/* 開始・終了 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide">開始</label>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full rounded-xl border border-stone-200 px-3 py-3 text-[13px] text-stone-800 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide">終了</label>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="w-full rounded-xl border border-stone-200 px-3 py-3 text-[13px] text-stone-800 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300"
              />
            </div>
          </div>

          {error && <p className="text-[11px] text-red-400">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border border-stone-200 text-[13px] text-stone-500 font-bold hover:bg-stone-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving}
              className={cn(
                'flex-[2] py-3 rounded-2xl text-[13px] font-bold text-white transition-all',
                saving ? 'bg-pink-300' : 'bg-pink-400 hover:bg-pink-500 active:scale-[0.98]'
              )}
            >
              {saving ? '保存中...' : '追加する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
