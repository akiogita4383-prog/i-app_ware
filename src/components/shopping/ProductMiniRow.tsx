'use client'

import Image from 'next/image'
import type { ProductItem } from '@/types/product'

interface Props {
  product: ProductItem
  label?: string
}

export function ProductMiniRow({ product, label }: Props) {
  const handlePurchase = () => {
    window.open(product.productUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">{label}</p>
      )}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-stone-50 border border-stone-100 shrink-0">
          <Image
            src={product.imageUrl}
            alt={product.name}
            width={48}
            height={48}
            className="w-full h-full object-contain p-1.5"
            unoptimized
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold text-stone-800 leading-snug line-clamp-2">{product.name}</p>
          <p className="text-[10px] text-stone-400 mt-0.5">{product.brand}</p>
          <p className="text-[13px] font-bold text-pink-500 mt-0.5">¥{product.price.toLocaleString()}</p>
        </div>
        <button
          type="button"
          onClick={handlePurchase}
          className="shrink-0 text-[11px] font-bold text-white bg-pink-400 hover:bg-pink-500 rounded-full px-3 py-1.5 transition-colors shadow-sm"
        >
          購入する
        </button>
      </div>
    </div>
  )
}
