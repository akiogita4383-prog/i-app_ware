'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import type { ProductItem, SearchCategory, ShoppingClosetItem } from '@/types/product'
import { useLikedCoordinates } from '@/stores/likedCoordinates'
import { cn } from '@/lib/utils'

interface Props {
  keyword: string
  products: ProductItem[]
  ownedItems: ShoppingClosetItem[]
  searchCategory: SearchCategory
}

export function KeywordProductCard({ keyword, products, ownedItems }: Props) {
  const displayProducts = products.slice(0, 4)
  const [selectedId, setSelectedId] = useState<string>(displayProducts[0]?.id ?? '')
  const [generating, setGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [genError, setGenError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const { add: addLiked } = useLikedCoordinates()

  const selectedProduct = displayProducts.find((p) => p.id === selectedId) ?? displayProducts[0]

  const handleGenerate = async () => {
    if (!selectedProduct) return
    setGenerating(true)
    setGenError(null)
    try {
      const items = [
        ...ownedItems.map((i) => ({ name: i.name, category: i.category, imageUrl: i.imageUrl })),
        { name: selectedProduct.name, category: selectedProduct.category, imageUrl: selectedProduct.imageUrl },
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
      <div className="w-72 shrink-0 bg-white rounded-3xl border border-stone-100 shadow-md shadow-stone-100 overflow-hidden snap-start flex flex-col">

        {/* ── ヘッダー（条件） ── */}
        <div className="px-4 pt-4 pb-3 border-b border-stone-50">
          <p className="text-[10px] font-bold text-pink-400 uppercase tracking-wide mb-1">探しているアイテム</p>
          <p className="text-[12px] font-bold text-stone-700 leading-snug">「{keyword}」</p>
        </div>

        {/* ── 商品リスト（縦・選択式） ── */}
        <div className="flex-1 px-3 py-3 space-y-0">
          <p className="text-[10px] text-stone-400 mb-2 px-1">タップして1つ選んでください</p>
          {displayProducts.map((product, idx) => {
            const isSelected = product.id === selectedId
            return (
              <div key={product.id}>
                {idx > 0 && <div className="border-t border-stone-50 my-1.5" />}
                <button
                  type="button"
                  onClick={() => setSelectedId(product.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 rounded-2xl p-2 transition-all text-left',
                    isSelected
                      ? 'bg-pink-50 ring-1 ring-pink-300'
                      : 'hover:bg-stone-50'
                  )}
                >
                  {/* 選択インジケーター */}
                  <div className={cn(
                    'w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all',
                    isSelected ? 'border-pink-500 bg-pink-500' : 'border-stone-300 bg-white'
                  )}>
                    {isSelected && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>

                  {/* 商品画像 */}
                  <div className="w-11 h-11 rounded-xl overflow-hidden bg-stone-50 border border-stone-100 shrink-0">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      width={44}
                      height={44}
                      className="w-full h-full object-contain p-1"
                      unoptimized
                    />
                  </div>

                  {/* 商品情報 */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-[11px] font-bold leading-snug line-clamp-2',
                      isSelected ? 'text-pink-700' : 'text-stone-800'
                    )}>
                      {product.name}
                    </p>
                    <p className="text-[10px] text-stone-400 mt-0.5">{product.brand}</p>
                    <p className={cn(
                      'text-[12px] font-bold mt-0.5',
                      isSelected ? 'text-pink-500' : 'text-stone-600'
                    )}>
                      ¥{product.price.toLocaleString()}
                    </p>
                  </div>

                  {/* 購入ボタン */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      window.open(product.productUrl, '_blank', 'noopener,noreferrer')
                    }}
                    className="shrink-0 text-[9px] font-bold text-stone-500 border border-stone-200 rounded-full px-2 py-1 hover:bg-stone-50 transition-colors"
                  >
                    購入
                  </button>
                </button>
              </div>
            )
          })}
        </div>

        {/* ── AI生成ボタン ── */}
        <div className="px-4 pb-4 pt-2 border-t border-stone-50">
          {selectedProduct && (
            <p className="text-[10px] text-stone-400 mb-2 text-center line-clamp-1">
              選択中: <span className="text-pink-500 font-bold">{selectedProduct.name}</span>
            </p>
          )}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !selectedProduct}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl font-bold text-[12px] transition-all active:scale-[0.98] bg-gradient-to-r from-pink-400 to-rose-400 text-white hover:from-pink-500 hover:to-rose-500 shadow-[0_4px_14px_rgba(251,113,133,0.3)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {generating ? (
              <><SpinnerIcon /><span>AIが生成中...</span></>
            ) : (
              <><SparkleIcon /><span>このコーデをAIで生成する</span></>
            )}
          </button>
          {genError && <p className="text-center text-[10px] text-red-400 mt-1.5">{genError}</p>}
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
                onClick={() => { addLiked(generatedImage, selectedProduct?.name ?? keyword); setSaved(true) }}
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
