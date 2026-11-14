'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { useLikedCoordinates } from '@/stores/likedCoordinates'
import { useWeather } from '@/hooks/useWeather'
import { TOKYO_COORDS } from '@/lib/weather'
import type { ClothingItem } from '@/types'
import type { ClosetCategory, ClosetItem, FitPreset, SelectedItems } from '@/lib/closetTypes'
import { mockClosetItems } from '@/lib/mockClosetItems'
import { ModelDressUp } from './coordinate/ModelDressUp'
import { ItemGrid } from './coordinate/ItemGrid'
import api from '@/lib/api'

// ── ランダムコーデのパターン定義 ──────────────────────────────────
// dresses と (tops/bottoms) は同一パターンに混在させない
const OUTFIT_PATTERNS: ClosetCategory[][] = [
  ['tops', 'bottoms', 'shoes', 'bags'],
  ['tops', 'bottoms', 'shoes'],
  ['dresses', 'shoes', 'bags'],
  ['outerwear', 'tops', 'bottoms', 'shoes'],
  ['tops', 'bottoms', 'shoes', 'accessories'],
  ['tops', 'bottoms', 'accessories'],
]

// ── DB カテゴリ → ClosetCategory マッピング ───────────────────────
const DB_CATEGORY_MAP: Partial<Record<string, ClosetCategory>> = {
  tops:        'tops',
  bottoms:     'bottoms',
  outer:       'outerwear',   // DB は "outer"、フロントは "outerwear"
  shoes:       'shoes',
  accessories: 'accessories',
}

function toClosetItem(item: ClothingItem): ClosetItem | null {
  const imageUrl = item.imageUrl ?? item.thumbnailUrl
  if (!imageUrl) return null
  const category = DB_CATEGORY_MAP[item.category]
  if (!category) return null
  return {
    id:           item.id,
    name:         item.name,
    category,
    imageUrl,
    thumbnailUrl: item.thumbnailUrl ?? undefined,
  }
}

function buildInitialOutfit(items: ClosetItem[]): SelectedItems {
  const result: SelectedItems = {}
  for (const cat of OUTFIT_PATTERNS[0]) {
    const match = items.find((i) => i.category === cat)
    if (match) result[cat] = match
  }
  return result
}

function buildRandomOutfit(items: ClosetItem[]): SelectedItems {
  const pattern = OUTFIT_PATTERNS[Math.floor(Math.random() * OUTFIT_PATTERNS.length)]
  const result: SelectedItems = {}
  for (const cat of pattern) {
    const pool = items.filter((i) => i.category === cat)
    if (pool.length > 0) result[cat] = pool[Math.floor(Math.random() * pool.length)]
  }
  return result
}

interface RecommendItem { id: string; name: string; category: string }
interface Recommendation { title: string; tags: string[]; itemIds: string[]; items: RecommendItem[] }

interface Props {
  items: ClothingItem[]
  isLoading?: boolean
  targetDate?: string | null
}

export function CoordinateGenerator({ items: dbItems, isLoading = false, targetDate }: Props) {
  const qc = useQueryClient()

  const closetItems = useMemo<ClosetItem[]>(() => {
    const real = dbItems.map(toClosetItem).filter((i): i is ClosetItem => i !== null)
    return real.length > 0 ? real : mockClosetItems
  }, [dbItems])

  const [selectedItems, setSelectedItems] = useState<SelectedItems>(() =>
    buildInitialOutfit(mockClosetItems)
  )
  const [liked, setLiked]               = useState(false)
  const [initialized, setInitialized]   = useState(false)
  const [recApplied, setRecApplied]     = useState(false)
  const [generating, setGenerating]     = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [genError, setGenError]         = useState<string | null>(null)
  const [saved, setSaved]               = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const { add: addLiked } = useLikedCoordinates()

  // アイテムごとの保存済みフィット（item.id → FitPreset）
  const [savedFits, setSavedFits] = useState<Record<string, FitPreset>>({})

  // ── AIおすすめコーデ取得 ──────────────────────────────────────────
  const { data: weather } = useWeather(TOKYO_COORDS)
  const { data: recommendations } = useQuery<Recommendation[]>({
    queryKey: ['outfit', 'recommend', weather?.weatherCode, Math.round(weather?.temperature ?? 0)],
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
    enabled: !!weather && dbItems.length > 0,
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  })

  // ── 実アイテムが届いたら初期コーデを更新（おすすめ優先） ───────────
  useEffect(() => {
    if (initialized || dbItems.length === 0) return
    setInitialized(true)
    // おすすめがあればそれを優先して表示
    if (recommendations && recommendations.length > 0) {
      const rec = recommendations[0]
      const itemMap = new Map(closetItems.map((i) => [i.id, i]))
      const outfit: SelectedItems = {}
      for (const id of rec.itemIds) {
        const ci = itemMap.get(id)
        if (ci) outfit[ci.category] = ci
      }
      if (Object.keys(outfit).length > 0) {
        setSelectedItems(outfit)
        setRecApplied(true)
        return
      }
    }
    setSelectedItems(buildInitialOutfit(closetItems))
  }, [dbItems.length, initialized, closetItems, recommendations])

  // おすすめが後から届いた場合（まだ未適用のとき）に反映
  useEffect(() => {
    if (recApplied || !initialized || !recommendations || recommendations.length === 0) return
    const rec = recommendations[0]
    const itemMap = new Map(closetItems.map((i) => [i.id, i]))
    const outfit: SelectedItems = {}
    for (const id of rec.itemIds) {
      const ci = itemMap.get(id)
      if (ci) outfit[ci.category] = ci
    }
    if (Object.keys(outfit).length > 0) {
      setSelectedItems(outfit)
      setRecApplied(true)
    }
  }, [recommendations, recApplied, initialized, closetItems])

  // ── このコーデでスタート（カレンダー保存） ────────────────────────
  const [started, setStarted] = useState(false)
  const startMutation = useMutation({
    mutationFn: () => {
      const itemIds = Object.values(selectedItems).filter(Boolean).map((i) => i!.id)
      const title = recommendations?.[0]?.title ?? 'マイコーデ'
      const tags  = recommendations?.[0]?.tags  ?? []
      return api.post('/outfit/draft', {
        itemIds,
        title,
        tags,
        ...(targetDate ? { date: targetDate } : {}),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outfit', 'draft'] })
      qc.invalidateQueries({ queryKey: ['history'] })
      setStarted(true)
      toast.success(targetDate ? `${targetDate} のコーデを保存しました` : '今日のコーデに設定しました')
    },
    onError: () => toast.error('保存に失敗しました'),
  })

  // savedFits を selectedItems にマージして ModelDressUp へ渡す
  const selectedItemsWithFits = useMemo<SelectedItems>(() => {
    const result: SelectedItems = {}
    for (const [cat, item] of Object.entries(selectedItems) as [ClosetCategory, ClosetItem][]) {
      const savedFit = savedFits[item.id]
      result[cat] = savedFit ? { ...item, fit: savedFit } : item
    }
    return result
  }, [selectedItems, savedFits])

  // ── アイテム選択（dresses ↔ tops/bottoms 排他制御） ──────────────
  const handleSelectItem = (item: ClosetItem) => {
    setSelectedItems((prev) => {
      const next = { ...prev }

      if (item.category === 'dresses') {
        delete next.tops
        delete next.bottoms
      } else if (item.category === 'tops' || item.category === 'bottoms') {
        delete next.dresses
      }

      if (next[item.category]?.id === item.id) {
        delete next[item.category]
      } else {
        next[item.category] = item
      }

      return next
    })
  }

  // ── ランダムコーデ ────────────────────────────────────────────────
  const handleRefresh = () => {
    setSelectedItems(buildRandomOutfit(closetItems))
    setLiked(false)
  }

  // ── フィット保存（ModelDressUp からのコールバック） ───────────────
  const handleFitSave = (category: ClosetCategory, fit: FitPreset | null) => {
    const item = selectedItems[category]
    if (!item) return
    if (fit === null) {
      setSavedFits((prev) => {
        const next = { ...prev }
        delete next[item.id]
        return next
      })
    } else {
      setSavedFits((prev) => ({ ...prev, [item.id]: fit }))
    }
  }

  // ── AI コーデ生成 ─────────────────────────────────────────────────
  const handleGenerate = async () => {
    const items = Object.values(selectedItems).filter(Boolean) as ClosetItem[]
    if (items.length === 0) return

    setGenerating(true)
    setGenError(null)

    try {
      const res = await fetch('/api/coordinate/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedItems: items.map((i) => ({
            name:     i.name,
            category: i.category,
            imageUrl: i.imageUrl,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '生成に失敗しました')
      setGeneratedImage(`data:image/png;base64,${data.image}`)
      dialogRef.current?.showModal()
    } catch (err) {
      setGenError(err instanceof Error ? err.message : '生成に失敗しました')
    } finally {
      setGenerating(false)
    }
  }

  const closeModal = () => {
    dialogRef.current?.close()
    setGeneratedImage(null)
    setSaved(false)
  }

  const hasItems = Object.values(selectedItems).some(Boolean)

  return (
    <section className="mb-6">

      {/* ── ページヘッダー ── */}
      <div className="flex items-center justify-between mb-4 px-0.5">
        <p className="text-[22px] font-bold text-stone-800 tracking-wide">
          my closet <span className="text-pink-400 font-normal">♡</span>
        </p>
        <button
          type="button"
          className="flex items-center gap-1.5 bg-pink-400 hover:bg-pink-500 active:scale-[0.97] text-white text-[12px] font-bold px-4 py-2.5 rounded-full shadow-sm transition-all"
        >
          <span className="text-sm leading-none">＋</span>
          <span>アイテムを追加</span>
        </button>
      </div>

      {/* ── メインカード ── */}
      <div className="bg-white rounded-[1.75rem] shadow-[0_6px_32px_rgba(252,200,220,0.28)] border border-pink-50">

        {/* カードヘッダー */}
        <div className="flex items-center justify-between px-4 pt-4 pb-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-pink-600 bg-pink-50 px-3 py-1.5 rounded-full shrink-0">
              ✨ コーデ生成
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-stone-700 truncate">手持ちのアイテムを使って</p>
              <p className="text-[10px] text-pink-400 font-medium">自分だけのコーデをつくろう♡</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-0.5 text-[9.5px] font-bold text-pink-600 border border-pink-200 rounded-full px-2.5 py-1.5 hover:bg-pink-50 active:bg-pink-100 transition-colors whitespace-nowrap shrink-0"
          >
            <span>おすすめ</span>
            <span className="text-[11px] leading-none">›</span>
          </button>
        </div>

        {/* 2カラムレイアウト */}
        <div className="grid grid-cols-[3fr_2fr] gap-2 px-3 pt-3 pb-1 items-start">

          {/* モデルステージ（FitControls 込み） */}
          <div className="rounded-2xl bg-[#fdf9f7] overflow-visible border border-pink-50/80 shadow-[inset_0_0_20px_rgba(255,240,245,0.6)]">
            <ModelDressUp
              selectedItems={selectedItemsWithFits}
              onFitSave={handleFitSave}
            />
          </div>

          {/* アイテムグリッド */}
          <ItemGrid
            items={closetItems}
            selectedItems={selectedItems}
            onSelect={handleSelectItem}
            isLoading={isLoading && !initialized}
          />
        </div>

        {/* AI 生成ボタン */}
        <div className="px-3 pb-1 pt-1 space-y-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !hasItems}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-[13px] transition-all shadow-sm active:scale-[0.98]',
              hasItems && !generating
                ? 'bg-gradient-to-r from-pink-400 to-rose-400 text-white hover:from-pink-500 hover:to-rose-500 shadow-[0_4px_14px_rgba(251,113,133,0.35)]'
                : 'bg-stone-100 text-stone-400 cursor-not-allowed'
            )}
          >
            {generating ? (
              <>
                <SpinnerIcon />
                <span>AIが生成中...</span>
              </>
            ) : (
              <>
                <SparkleIcon />
                <span>このコーデをAIで生成する</span>
              </>
            )}
          </button>

          {/* このコーデでスタートボタン */}
          <button
            type="button"
            onClick={() => !started && startMutation.mutate()}
            disabled={startMutation.isPending || started || !hasItems}
            className={cn(
              'w-full flex items-center justify-center gap-1.5 py-3 rounded-2xl font-bold text-[13px] transition-all border',
              started
                ? 'bg-pink-50 text-pink-400 border-pink-200 cursor-default'
                : hasItems
                  ? 'bg-white text-pink-500 border-pink-300 hover:bg-pink-50 active:scale-[0.98]'
                  : 'bg-stone-50 text-stone-300 border-stone-200 cursor-not-allowed'
            )}
          >
            {startMutation.isPending ? '保存中…' : started ? '✓ コーデを設定済み' : targetDate ? `${targetDate} のコーデに設定する` : 'このコーデでスタート'}
          </button>

          {genError && (
            <p className="text-center text-[10px] text-red-400">{genError}</p>
          )}
        </div>

        {/* カードフッター */}
        <div className="flex items-center justify-between px-4 pt-2 pb-4 mx-2 border-t border-pink-50/80">
          <p className="text-[9px] text-stone-400 tracking-wide">
            アイテムをタップして着せ替え・ドラッグで位置調整
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              aria-label="コーデを更新"
              className="w-8 h-8 flex items-center justify-center rounded-full border border-stone-200 bg-white hover:bg-stone-50 active:bg-stone-100 text-stone-500 transition-colors shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setLiked((p) => !p)}
              aria-label={liked ? 'Likeを解除' : 'Likeする'}
              className={cn(
                'w-8 h-8 flex items-center justify-center rounded-full border text-[18px] leading-none transition-all shadow-[0_1px_4px_rgba(0,0,0,0.06)]',
                liked
                  ? 'border-pink-300 bg-pink-50 text-pink-500 shadow-[0_0_0_2.5px_rgba(251,207,218,0.35)]'
                  : 'border-stone-200 bg-white text-stone-400 hover:border-pink-200'
              )}
            >
              {liked ? '♥' : '♡'}
            </button>
          </div>
        </div>
      </div>

      {/* 生成結果モーダル */}
      <dialog
        ref={dialogRef}
        onClick={(e) => { if (e.target === dialogRef.current) closeModal() }}
        className="fixed inset-0 m-auto w-[90vw] max-w-sm rounded-3xl border-0 p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm open:flex open:flex-col"
      >
        {generatedImage && (
          <>
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <p className="text-[13px] font-bold text-stone-700">✨ AIコーデ</p>
              <button type="button" onClick={closeModal} aria-label="閉じる"
                className="w-7 h-7 flex items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 text-sm">
                ×
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={generatedImage} alt="AIが生成したコーディネート" className="w-full object-contain" />
            <div className="flex gap-2 p-4">
              <button
                type="button"
                onClick={() => {
                  const label = Object.values(selectedItems).find(Boolean)?.name
                  addLiked(generatedImage, label)
                  setSaved(true)
                }}
                disabled={saved}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-gradient-to-r from-pink-400 to-rose-400 text-white text-[12px] font-bold hover:from-pink-500 hover:to-rose-500 transition-colors disabled:opacity-70"
              >
                {saved ? (
                  <><span className="text-base leading-none">♥</span><span>Likeに保存済み</span></>
                ) : (
                  <><span className="text-base leading-none">♡</span><span>Likeに保存する</span></>
                )}
              </button>
              <button type="button" onClick={closeModal}
                className="flex-1 py-2.5 rounded-2xl border border-stone-200 text-stone-500 text-[12px] font-bold hover:bg-stone-50 transition-colors">
                閉じる
              </button>
            </div>
          </>
        )}
      </dialog>
    </section>
  )
}

function SparkleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
      <path d="M19 3l.75 2.25L22 6l-2.25.75L19 9l-.75-2.25L16 6l2.25-.75z" />
      <path d="M5 15l.75 2.25L8 18l-2.25.75L5 21l-.75-2.25L2 18l2.25-.75z" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}
