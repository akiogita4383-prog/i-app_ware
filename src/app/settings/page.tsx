'use client'

import { useState } from 'react'
import Image from 'next/image'
import { AppShell } from '@/components/layout/AppShell'
import { useAvatarStore, AVATAR_OPTIONS } from '@/stores/avatar'
import { useSettingsStore } from '@/stores/settings'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

// ── パーソナルカラーパレット ───────────────────────────────────────
export const PERSONAL_COLOR_OPTIONS = [
  { id: 'white',     label: 'ホワイト',     hex: '#FAFAFA', border: '#e5e7eb' },
  { id: 'ivory',     label: 'アイボリー',   hex: '#FFFFF0', border: '#d1d5db' },
  { id: 'beige',     label: 'ベージュ',     hex: '#E8DCCA', border: '#d1d5db' },
  { id: 'camel',     label: 'キャメル',     hex: '#C19A6B' },
  { id: 'brown',     label: 'ブラウン',     hex: '#92400E' },
  { id: 'black',     label: 'ブラック',     hex: '#1F2937' },
  { id: 'gray',      label: 'グレー',       hex: '#9CA3AF' },
  { id: 'navy',      label: 'ネイビー',     hex: '#1E3A5F' },
  { id: 'blue',      label: 'ブルー',       hex: '#3B82F6' },
  { id: 'skyblue',   label: 'スカイブルー', hex: '#87CEEB' },
  { id: 'pink',      label: 'ピンク',       hex: '#F472B6' },
  { id: 'rose',      label: 'ローズ',       hex: '#E11D48' },
  { id: 'red',       label: 'レッド',       hex: '#EF4444' },
  { id: 'orange',    label: 'オレンジ',     hex: '#F97316' },
  { id: 'yellow',    label: 'イエロー',     hex: '#EAB308' },
  { id: 'green',     label: 'グリーン',     hex: '#22C55E' },
  { id: 'khaki',     label: 'カーキ',       hex: '#6B7C3B' },
  { id: 'lavender',  label: 'ラベンダー',   hex: '#C084FC' },
  { id: 'purple',    label: 'パープル',     hex: '#7C3AED' },
  { id: 'turquoise', label: 'ターコイズ',   hex: '#0D9488' },
]

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-stone-50">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-wide">{title}</p>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

export default function SettingsPage() {
  const avatarId = useAvatarStore((s) => s.avatarId)
  const setAvatarId = useAvatarStore((s) => s.setAvatarId)
  const {
    dateOfBirth, setDateOfBirth,
    yahooId, setYahooId,
    yahooPassword, setYahooPassword,
    personalColors, togglePersonalColor,
  } = useSettingsStore()

  const [showPassword, setShowPassword] = useState(false)

  return (
    <AppShell>
      <div className="px-4 pt-6 pb-24 space-y-4">

        {/* ── ページヘッダー ── */}
        <h1 className="text-xl font-bold text-stone-900">設定</h1>

        {/* ── アバター選択 ── */}
        <SectionCard title="アバター">
          <p className="text-xs text-stone-500 mb-3">使用するアバターを選択してください</p>
          <div className="grid grid-cols-4 gap-3">
            {AVATAR_OPTIONS.map((option) => {
              const selected = avatarId === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setAvatarId(option.id)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-2xl p-2 border-2 transition-all',
                    selected
                      ? 'border-pink-400 bg-pink-50'
                      : 'border-stone-100 bg-stone-50 hover:border-pink-200'
                  )}
                >
                  <div className="relative w-full aspect-[3/5] rounded-xl overflow-hidden bg-stone-100">
                    <Image
                      src={option.src}
                      alt={option.label}
                      fill
                      className="object-contain object-bottom"
                      unoptimized
                    />
                    {selected && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center">
                        <span className="text-white text-[10px] font-bold">✓</span>
                      </div>
                    )}
                  </div>
                  <span className={cn(
                    'text-[10px] font-medium leading-tight',
                    selected ? 'text-pink-500' : 'text-stone-500'
                  )}>
                    {option.label}
                  </span>
                </button>
              )
            })}
          </div>
        </SectionCard>

        {/* ── プロフィール ── */}
        <SectionCard title="プロフィール">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-500">生年月日</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300"
            />
          </div>
        </SectionCard>

        {/* ── Yahoo! 連携 ── */}
        <SectionCard title="Yahoo! 連携">
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded bg-[#FF0033] flex items-center justify-center">
                <span className="text-white text-[10px] font-black">Y!</span>
              </div>
              <p className="text-xs text-stone-500">Yahoo! JAPANアカウントと連携します</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500">Yahoo! ID</label>
              <input
                type="text"
                value={yahooId}
                onChange={(e) => setYahooId(e.target.value)}
                placeholder="例: yamada_taro"
                autoComplete="username"
                className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500">パスワード</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={yahooPassword}
                  onChange={(e) => setYahooPassword(e.target.value)}
                  placeholder="パスワードを入力"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-stone-200 px-3 py-2.5 pr-10 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            {(yahooId || yahooPassword) && (
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <p className="text-[11px] text-green-600 font-medium">入力済み</p>
              </div>
            )}
          </div>
        </SectionCard>

        {/* ── パーソナルカラー ── */}
        <SectionCard title="パーソナルカラー">
          <div className="space-y-3">
            <p className="text-xs text-stone-500">
              好みの色を選ぶと、ショッピングのおすすめに反映されます（複数選択可）
            </p>
            <div className="grid grid-cols-5 gap-3">
              {PERSONAL_COLOR_OPTIONS.map((color) => {
                const selected = personalColors.includes(color.id)
                return (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => togglePersonalColor(color.id)}
                    className="flex flex-col items-center gap-1"
                  >
                    <div
                      className={cn(
                        'w-11 h-11 rounded-full transition-all',
                        selected
                          ? 'ring-2 ring-pink-400 ring-offset-2 scale-110'
                          : 'ring-1 ring-stone-200 hover:scale-105'
                      )}
                      style={{
                        backgroundColor: color.hex,
                        borderWidth: color.border ? 1 : 0,
                        borderColor: color.border,
                        borderStyle: 'solid',
                      }}
                    />
                    <span
                      className={cn(
                        'text-[9px] leading-tight text-center',
                        selected ? 'text-pink-500 font-bold' : 'text-stone-400'
                      )}
                    >
                      {color.label}
                    </span>
                  </button>
                )
              })}
            </div>
            {personalColors.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {personalColors.map((id) => {
                  const c = PERSONAL_COLOR_OPTIONS.find((o) => o.id === id)
                  if (!c) return null
                  return (
                    <span key={id} className="flex items-center gap-1 text-[11px] bg-pink-50 text-pink-600 rounded-full px-2.5 py-1 font-medium">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block border border-pink-200"
                        style={{ backgroundColor: c.hex }}
                      />
                      {c.label}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        </SectionCard>

        {/* ── 保存ボタン ── */}
        <button
          type="button"
          onClick={() => toast.success('設定を保存しました')}
          className="w-full py-3.5 rounded-2xl bg-pink-500 text-white text-sm font-bold hover:bg-pink-600 active:scale-[0.98] transition-all shadow-sm"
        >
          設定を保存する
        </button>

      </div>
    </AppShell>
  )
}
