'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/AppShell'
import { ItemCard } from '@/components/closet/ItemCard'
import { ItemForm } from '@/components/closet/ItemForm'
import { ImageUploader } from '@/components/closet/ImageUploader'
import { CoordinateGenerator } from '@/components/CoordinateGenerator'
import { LikedCoordinates } from '@/components/closet/LikedCoordinates'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { ClothingItem } from '@/types'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

type Modal = null | 'manual' | 'scan' | 'edit'

const categories: { value: string; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'tops', label: 'トップス' },
  { value: 'bottoms', label: 'ボトムス' },
  { value: 'outer', label: 'アウター' },
  { value: 'shoes', label: 'シューズ' },
  { value: 'accessories', label: 'アクセ' },
  { value: 'other', label: 'その他' },
]

export default function ClosetPage() {
  const qc = useQueryClient()
  const searchParams = useSearchParams()
  const targetDate = searchParams.get('date')
  const [modal, setModal] = useState<Modal>(null)
  const [editTarget, setEditTarget] = useState<ClothingItem | null>(null)
  const [category, setCategory] = useState('all')

  const { data: items = [], isLoading } = useQuery<ClothingItem[]>({
    queryKey: ['items', category],
    queryFn: () => api.get(`/items?category=${category}`).then((r) => r.data.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/items/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] })
      toast.success('削除しました')
    },
    onError: () => toast.error('削除に失敗しました'),
  })

  const handleDelete = (item: ClothingItem) => {
    if (confirm(`「${item.name}」を削除しますか？`)) {
      deleteMutation.mutate(item.id)
    }
  }

  const handleEdit = (item: ClothingItem) => {
    setEditTarget(item)
    setModal('edit')
  }

  const handleSuccess = () => {
    qc.invalidateQueries({ queryKey: ['items'] })
    setModal(null)
    setEditTarget(null)
  }

  return (
    <AppShell>
      <div className="px-4 pt-6">
        <CoordinateGenerator items={items} isLoading={isLoading} targetDate={targetDate} />

        <LikedCoordinates />

        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-stone-900">クローゼット</h1>
            <p className="text-stone-400 text-sm">{items.length}点</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setModal('scan')}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              スキャン
            </Button>
            <Button size="sm" onClick={() => setModal('manual')}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              手動追加
            </Button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 mb-4 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={cn(
                'flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                category === cat.value
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-16 h-16 mx-auto text-stone-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-stone-400 font-medium">アイテムがありません</p>
            <p className="text-stone-300 text-sm mt-1">写真スキャンまたは手動で追加してください</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-bold text-stone-900 mb-5">
              {modal === 'manual' ? 'アイテムを手動追加' : modal === 'scan' ? '写真からスキャン' : 'アイテムを編集'}
            </h2>

            {modal === 'manual' && (
              <ItemForm
                onSuccess={handleSuccess}
                onCancel={() => setModal(null)}
              />
            )}
            {modal === 'scan' && (
              <ImageUploader
                onSuccess={handleSuccess}
                onCancel={() => setModal(null)}
              />
            )}
            {modal === 'edit' && editTarget && (
              <ItemForm
                item={editTarget}
                onSuccess={handleSuccess}
                onCancel={() => { setModal(null); setEditTarget(null) }}
              />
            )}
          </div>
        </div>
      )}
    </AppShell>
  )
}
