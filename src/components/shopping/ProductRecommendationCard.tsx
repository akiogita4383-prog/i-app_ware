'use client'

import { useRef, useState } from 'react'
import type { ShoppingOutfitSuggestion, SearchCategory } from '@/types/product'
import { useLikedCoordinates } from '@/stores/likedCoordinates'
import { MiniAvatarOutfit } from './MiniAvatarOutfit'
import { ProductMiniRow } from './ProductMiniRow'

interface Props {
  suggestion: ShoppingOutfitSuggestion
  searchCategory: SearchCategory
}

export function ProductRecommendationCard({ suggestion, searchCategory }: Props) {
  const [liked, setLiked] = useState(suggestion.liked)
  const [generating, setGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [genError, setGenError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const { add: addLiked } = useLikedCoordinates()

  const { mainProduct, recommendedProducts, ownedItems, totalPrice } = suggestion

  const handleGenerate = async () => {
    setGenerating(true)
    setGenError(null)
    try {
      const items = [
        ...ownedItems.map((i) => ({ name: i.name, category: i.category, imageUrl: i.imageUrl })),
        { name: mainProduct.name, category: mainProduct.category, imageUrl: mainProduct.imageUrl },
        ...recommendedProducts.map((p) => ({ name: p.name, category: p.category, imageUrl: p.imageUrl })),
      ]
      const res = await fetch('/api/coordinate/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedItems: items }),
      })
      const data = await res.json() as { image?: string; error?: string }
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

  return (
    <>
      <div className="w-72 shrink-0 bg-white rounded-3xl border border-stone-100 shadow-md shadow-stone-100 overflow-hidden snap-start">

        {/* ── アバターコーデプレビュー ── */}
        <div className="relative bg-stone-50 flex items-center justify-center pt-4 pb-2 px-4">
          <div className="relative w-32" style={{ aspectRatio: '3/5' }}>
            <MiniAvatarOutfit
              ownedItems={ownedItems}
              mainProduct={mainProduct}
              searchCategory={searchCategory}
            />
          </div>

          {/* 未所持ラベル */}
          <div className="absolute top-3 left-3">
            <span className="text-[10px] font-bold text-white bg-pink-400 rounded-full px-2.5 py-1 shadow-sm">
              未所持
            </span>
          </div>

          {/* Likeボタン */}
          <button
            type="button"
            onClick={() => setLiked((v) => !v)}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm border border-stone-100"
          >
            <span className={`text-[16px] leading-none ${liked ? 'text-pink-500' : 'text-stone-300'}`}>
              {liked ? '♥' : '♡'}
            </span>
          </button>
        </div>

        {/* ── 商品情報 ── */}
        <div className="px-4 py-3 space-y-3">

          {/* 探しているアイテム */}
          <ProductMiniRow product={mainProduct} label="探しているアイテム" />

          {/* こちらもおすすめ */}
          {recommendedProducts.map((rp) => (
            <div key={rp.id}>
              <div className="border-t border-stone-50 my-3" />
              <ProductMiniRow product={rp} label="こちらもおすすめ" />
            </div>
          ))}

          {/* 合計金額 */}
          <div className="border-t border-stone-100 pt-3 flex items-center justify-between">
            <p className="text-[11px] text-stone-400">合計</p>
            <p className="text-[15px] font-bold text-stone-800">
              ¥{totalPrice.toLocaleString()}
            </p>
          </div>

          {/* AI生成ボタン */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl font-bold text-[12px] transition-all active:scale-[0.98] bg-gradient-to-r from-pink-400 to-rose-400 text-white hover:from-pink-500 hover:to-rose-500 shadow-[0_4px_14px_rgba(251,113,133,0.3)] disabled:opacity-60 disabled:cursor-not-allowed"
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

          {genError && (
            <p className="text-center text-[10px] text-red-400">{genError}</p>
          )}
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
              <button
                type="button"
                onClick={closeModal}
                aria-label="閉じる"
                className="w-7 h-7 flex items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 text-sm"
              >
                ×
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={generatedImage} alt="AIが生成したコーディネート" className="w-full object-contain" />
            <div className="flex gap-2 p-4">
              <button
                type="button"
                onClick={() => {
                  addLiked(generatedImage, mainProduct.name)
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
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 py-2.5 rounded-2xl border border-stone-200 text-stone-500 text-[12px] font-bold hover:bg-stone-50 transition-colors"
              >
                閉じる
              </button>
            </div>
          </>
        )}
      </dialog>
    </>
  )
}

function SparkleIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
      <path d="M19 3l.75 2.25L22 6l-2.25.75L19 9l-.75-2.25L16 6l2.25-.75z" />
      <path d="M5 15l.75 2.25L8 18l-2.25.75L5 21l-.75-2.25L2 18l2.25-.75z" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}
