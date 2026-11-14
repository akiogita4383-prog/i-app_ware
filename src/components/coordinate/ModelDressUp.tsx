'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ClosetCategory, FitPreset, SelectedItems } from '@/lib/closetTypes'
import { categoryFitPresets, LAYER_ORDER } from '@/lib/fitPresets'
import { OutfitLayer } from './OutfitLayer'
import { FitControls } from './FitControls'
import { useAvatarStore, AVATAR_OPTIONS } from '@/stores/avatar'

interface DragStart {
  clientX: number
  clientY: number
  fitX:    number
  fitY:    number
}

interface Props {
  selectedItems: SelectedItems
  onFitSave: (category: ClosetCategory, fit: FitPreset | null) => void
}

export function ModelDressUp({ selectedItems, onFitSave }: Props) {
  const [modelError, setModelError]         = useState(false)
  const [activeCategory, setActiveCategory] = useState<ClosetCategory | null>(null)
  const avatarId = useAvatarStore((s) => s.avatarId)
  const avatarSrc = AVATAR_OPTIONS.find((a) => a.id === avatarId)?.src ?? AVATAR_OPTIONS[0].src
  const [draftFit, setDraftFit]           = useState<FitPreset | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef<DragStart | null>(null)

  // アクティブアイテムが外部で解除された場合にクリア
  useEffect(() => {
    if (activeCategory && !selectedItems[activeCategory]) {
      setActiveCategory(null)
      setDraftFit(null)
    }
  }, [selectedItems, activeCategory])

  // 現在の表示用 fit を取得（編集中は draftFit を優先）
  const getDisplayFit = (cat: ClosetCategory): FitPreset => {
    if (cat === activeCategory && draftFit) return draftFit
    const item = selectedItems[cat]
    return item?.fit ?? categoryFitPresets[cat]
  }

  // ── ドラッグ開始 ───────────────────────────────────────────────
  const handlePointerDown = useCallback(
    (cat: ClosetCategory, e: React.PointerEvent<HTMLImageElement>) => {
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)

      const item = selectedItems[cat]
      if (!item) return

      // 別アイテムをタップ → draft 初期化
      const isSame = activeCategory === cat
      const initialFit = isSame && draftFit
        ? draftFit
        : (item.fit ?? categoryFitPresets[cat])

      if (!isSame) {
        setActiveCategory(cat)
        setDraftFit(initialFit)
      }

      dragStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        fitX:    initialFit.x,
        fitY:    initialFit.y,
      }
    },
    [activeCategory, draftFit, selectedItems]
  )

  // ── ドラッグ中（コンテナ % で管理） ───────────────────────────
  const handlePointerMove = useCallback(
    (cat: ClosetCategory, e: React.PointerEvent<HTMLImageElement>) => {
      if (!dragStartRef.current || !containerRef.current || activeCategory !== cat) return
      const rect = containerRef.current.getBoundingClientRect()
      const dx = ((e.clientX - dragStartRef.current.clientX) / rect.width)  * 100
      const dy = ((e.clientY - dragStartRef.current.clientY) / rect.height) * 100
      setDraftFit((prev) =>
        prev
          ? { ...prev, x: dragStartRef.current!.fitX + dx, y: dragStartRef.current!.fitY + dy }
          : prev
      )
    },
    [activeCategory]
  )

  // ── ドラッグ終了 ───────────────────────────────────────────────
  const handlePointerUp = useCallback(() => {
    dragStartRef.current = null
  }, [])

  // ── 保存 ───────────────────────────────────────────────────────
  const handleSave = () => {
    if (!activeCategory || !draftFit) return
    onFitSave(activeCategory, draftFit)
    setActiveCategory(null)
    setDraftFit(null)
  }

  // ── リセット ───────────────────────────────────────────────────
  const handleReset = () => {
    if (!activeCategory) return
    const preset = categoryFitPresets[activeCategory]
    setDraftFit(preset)
    onFitSave(activeCategory, null)   // 保存済みフィットを削除
  }

  // ── 編集パネルを閉じる ─────────────────────────────────────────
  const handleClose = () => {
    setActiveCategory(null)
    setDraftFit(null)
  }

  const activeItem = activeCategory ? selectedItems[activeCategory] : null
  const hasAnyItem = LAYER_ORDER.some((cat) => !!selectedItems[cat])

  return (
    <div className="flex flex-col gap-2">

      {/* ── アバターステージ ── */}
      <div
        ref={containerRef}
        className="relative w-full aspect-[3/5] overflow-hidden rounded-2xl"
      >
        {/* ベースモデル（固定・変更禁止） */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={modelError ? '/assets/model-placeholder.svg' : avatarSrc}
          alt="モデル"
          className="absolute inset-0 w-full h-full object-contain object-bottom select-none"
          draggable={false}
          onError={() => setModelError(true)}
        />

        {/* 服レイヤー */}
        {LAYER_ORDER.map((cat) => {
          const item = selectedItems[cat]
          if (!item) return null
          return (
            <OutfitLayer
              key={cat}
              item={item}
              fit={getDisplayFit(cat)}
              isActive={activeCategory === cat}
              onPointerDown={(e) => handlePointerDown(cat, e)}
              onPointerMove={(e) => handlePointerMove(cat, e)}
              onPointerUp={handlePointerUp}
            />
          )
        })}

        {/* 操作ヒント */}
        {hasAnyItem && !activeCategory && (
          <div className="absolute bottom-1.5 inset-x-0 flex justify-center pointer-events-none">
            <span className="text-[8px] text-stone-300 bg-white/70 backdrop-blur-sm px-2 py-0.5 rounded-full">
              タップで選択・ドラッグで位置調整
            </span>
          </div>
        )}
      </div>

      {/* ── フィット調整パネル（アクティブ時のみ） ── */}
      {activeItem && draftFit && (
        <FitControls
          item={activeItem}
          fit={draftFit}
          defaultFit={categoryFitPresets[activeCategory!]}
          onChange={setDraftFit}
          onReset={handleReset}
          onSave={handleSave}
          onClose={handleClose}
        />
      )}
    </div>
  )
}
