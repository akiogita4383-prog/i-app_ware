'use client'

import { useRef, useState } from 'react'
import { useLikedCoordinates, type LikedCoordinate } from '@/stores/likedCoordinates'

export function LikedCoordinates() {
  const { coordinates, remove } = useLikedCoordinates()
  const [selected, setSelected] = useState<LikedCoordinate | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

  const openDetail = (coord: LikedCoordinate) => {
    setSelected(coord)
    dialogRef.current?.showModal()
  }

  const closeDetail = () => {
    dialogRef.current?.close()
    setSelected(null)
  }

  const handleDelete = (id: string) => {
    remove(id)
    closeDetail()
  }

  if (coordinates.length === 0) return null

  return (
    <>
      <section className="mb-6">
        {/* ヘッダー */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[18px] leading-none text-pink-400">♡</span>
          <p className="text-[15px] font-bold text-stone-800">Like</p>
          <span className="text-[11px] text-stone-400">{coordinates.length}件</span>
        </div>

        {/* 水平スクロール */}
        <div className="overflow-x-auto scrollbar-none -mx-4 px-4">
          <div className="flex gap-3 pb-1" style={{ width: 'max-content' }}>
            {coordinates.map((coord) => (
              <button
                key={coord.id}
                type="button"
                onClick={() => openDetail(coord)}
                className="relative shrink-0 w-28 rounded-2xl overflow-hidden border border-stone-100 shadow-sm bg-white active:scale-95 transition-transform"
                style={{ aspectRatio: '2/3' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coord.imageDataUrl}
                  alt={coord.label ?? 'AIコーデ'}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/40 to-transparent px-2 py-1.5">
                  <p className="text-[9px] font-bold text-white truncate">
                    {coord.label ?? 'AIコーデ'}
                  </p>
                </div>
                <div className="absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-white/80">
                  <span className="text-[10px] text-pink-500">♥</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 詳細モーダル */}
      <dialog
        ref={dialogRef}
        onClick={(e) => { if (e.target === dialogRef.current) closeDetail() }}
        className="fixed inset-0 m-auto w-[90vw] max-w-sm rounded-3xl border-0 p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm open:flex open:flex-col"
      >
        {selected && (
          <>
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <p className="text-[13px] font-bold text-stone-700">
                <span className="text-pink-400 mr-1">♡</span>
                {selected.label ?? 'AIコーデ'}
              </p>
              <button
                type="button"
                onClick={closeDetail}
                aria-label="閉じる"
                className="w-7 h-7 flex items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 text-sm"
              >
                ×
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selected.imageDataUrl}
              alt={selected.label ?? 'AIコーデ'}
              className="w-full object-contain"
            />
            <div className="flex gap-2 p-4">
              <a
                href={selected.imageDataUrl}
                download="coordinate.png"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-stone-100 text-stone-600 text-[12px] font-bold hover:bg-stone-200 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                保存する
              </a>
              <button
                type="button"
                onClick={() => handleDelete(selected.id)}
                className="flex-1 py-2.5 rounded-2xl border border-red-100 text-red-400 text-[12px] font-bold hover:bg-red-50 transition-colors"
              >
                削除する
              </button>
            </div>
          </>
        )}
      </dialog>
    </>
  )
}
