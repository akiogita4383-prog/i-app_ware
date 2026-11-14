'use client'

import type { ClosetItem, FitPreset } from '@/lib/closetTypes'

interface Props {
  item:       ClosetItem
  fit:        FitPreset
  defaultFit: FitPreset   // カテゴリプリセット（リセット用）
  onChange:   (fit: FitPreset) => void
  onReset:    () => void
  onSave:     () => void
  onClose:    () => void
}

export function FitControls({ item, fit, onChange, onReset, onSave, onClose }: Props) {
  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-pink-100 shadow-sm p-3 space-y-2.5">

      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-stone-700 truncate max-w-[60%]">
          ✏️ {item.name}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="w-5 h-5 flex items-center justify-center rounded-full bg-stone-100 text-stone-400 hover:bg-stone-200 text-xs leading-none"
        >
          ×
        </button>
      </div>

      {/* サイズスライダー */}
      <label className="block space-y-1">
        <div className="flex justify-between">
          <span className="text-[10px] text-stone-500">サイズ</span>
          <span className="text-[10px] text-stone-400 tabular-nums">{fit.width.toFixed(0)}%</span>
        </div>
        <input
          type="range"
          min={5}
          max={80}
          step={1}
          value={fit.width}
          onChange={(e) => onChange({ ...fit, width: Number(e.target.value) })}
          className="w-full h-1.5 accent-pink-400 cursor-pointer"
        />
      </label>

      {/* 回転スライダー */}
      <label className="block space-y-1">
        <div className="flex justify-between">
          <span className="text-[10px] text-stone-500">回転</span>
          <span className="text-[10px] text-stone-400 tabular-nums">{fit.rotation}°</span>
        </div>
        <input
          type="range"
          min={-45}
          max={45}
          step={1}
          value={fit.rotation}
          onChange={(e) => onChange({ ...fit, rotation: Number(e.target.value) })}
          className="w-full h-1.5 accent-pink-400 cursor-pointer"
        />
      </label>

      {/* ボタン */}
      <div className="flex gap-2 pt-0.5">
        <button
          type="button"
          onClick={onReset}
          className="flex-1 py-1.5 rounded-xl border border-stone-200 text-[10px] text-stone-500 hover:bg-stone-50 active:bg-stone-100 transition-colors"
        >
          リセット
        </button>
        <button
          type="button"
          onClick={onSave}
          className="flex-[2] py-1.5 rounded-xl bg-pink-400 text-white text-[10px] font-bold hover:bg-pink-500 active:scale-[0.98] transition-all"
        >
          この位置で保存
        </button>
      </div>
    </div>
  )
}
