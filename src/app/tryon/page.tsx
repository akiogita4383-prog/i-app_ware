'use client'

import { useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import Image from 'next/image'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/AppShell'
import { AvatarPreview } from '@/components/avatar/AvatarPreview'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { ClothingItem, Category } from '@/types'
import { useAvatarStore } from '@/stores/avatar'
import api from '@/lib/api'
import toast from 'react-hot-toast'

const categories: Array<Category | 'all'> = [
  'all',
  'tops',
  'bottoms',
  'outer',
  'shoes',
  'accessories',
  'other',
]

const categoryLabels: Record<Category | 'all', string> = {
  all: 'すべて',
  tops: 'トップス',
  bottoms: 'ボトムス',
  outer: 'アウター',
  shoes: 'シューズ',
  accessories: 'アクセ',
  other: 'その他',
}

export default function TryonPage() {
  const qc = useQueryClient()
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all')
  const [selectedItems, setSelectedItems] = useState<Record<Category, ClothingItem | null>>({
    tops: null,
    bottoms: null,
    outer: null,
    shoes: null,
    accessories: null,
    other: null,
  })
  const [title, setTitle] = useState('マイコーデ')

  const { data: items = [], isLoading } = useQuery<ClothingItem[]>({
    queryKey: ['items', 'all'],
    queryFn: () => api.get('/items').then((r) => r.data.data),
  })

  const saveMutation = useMutation({
    mutationFn: (payload: { itemIds: string[]; title: string }) =>
      api.post('/outfit/draft', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['history'] })
      qc.invalidateQueries({ queryKey: ['outfit', 'draft'] })
      toast.success('試着コーデを保存しました')
    },
    onError: () => toast.error('保存に失敗しました'),
  })

  const filteredItems = useMemo(() => {
    if (selectedCategory === 'all') return items
    return items.filter((item) => item.category === selectedCategory)
  }, [items, selectedCategory])

  const selectedCount = Object.values(selectedItems).filter(Boolean).length
  const avatarConfig = useAvatarStore((state) => state.config)
  const previewRef = useRef<HTMLDivElement | null>(null)

  const handleSaveImage = async () => {
    if (!previewRef.current) return
    try {
      const dataUrl = await toPng(previewRef.current, { cacheBust: true })
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `${title || 'my-coordy'}.png`
      link.click()
      toast.success('画像を保存しました')
    } catch (error) {
      console.error(error)
      toast.error('画像の保存に失敗しました')
    }
  }

  const handleSelect = (item: ClothingItem) => {
    setSelectedItems((prev) => ({ ...prev, [item.category]: item }))
  }

  const handleRemove = (category: Category) => {
    setSelectedItems((prev) => ({ ...prev, [category]: null }))
  }

  const handleSave = () => {
    const itemIds = Object.values(selectedItems).filter(Boolean).map((item) => item!.id)
    if (!itemIds.length) {
      toast.error('少なくとも1つのアイテムを選択してください')
      return
    }

    saveMutation.mutate({
      itemIds,
      title,
    })
  }

  return (
    <AppShell>
      <div className="px-4 pt-6 pb-20 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-stone-900">アバター試着</h1>
          <p className="text-stone-400 text-sm mt-1">クローゼットのアイテムを選んで、アバター上でコーデを確認しましょう。</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-stone-100 p-5">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-stone-900">プレビュー</h2>
                  <p className="text-sm text-stone-400">選択したアイテムをアバターに重ねて表示します</p>
                </div>
                <Badge>{selectedCount}アイテム</Badge>
              </div>
              <div ref={previewRef} className="rounded-[2.5rem] bg-stone-100 p-4">
                <AvatarPreview selected={selectedItems} avatarConfig={avatarConfig} onRemove={handleRemove} />
              </div>
              <div className="mt-4 flex gap-3">
                <Button type="button" variant="secondary" className="flex-1" onClick={handleSaveImage}>
                  画像を保存
                </Button>
                <Button type="button" className="flex-1" onClick={() => window.location.href = '/avatar'}>
                  アバター設定
                </Button>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-stone-100 p-5">
              <label className="block text-sm font-medium text-stone-700 mb-2">コーデ名</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none focus:border-stone-900"
                placeholder="例：春のカジュアルコーデ"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-stone-100 p-5">
              <p className="text-sm font-medium text-stone-700 mb-3">カテゴリー</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                      selectedCategory === category
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    } ${category === 'all' ? 'min-w-[72px]' : ''}`}
                  >
                    {categoryLabels[category]}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-stone-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-stone-900">アイテム一覧</h2>
                  <p className="text-sm text-stone-400">選択したいアイテムをタップして試着します</p>
                </div>
                <span className="text-xs text-stone-500">{filteredItems.length}件</span>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner />
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-12 text-stone-400">このカテゴリのアイテムはありません</div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {filteredItems.map((item) => {
                    const selectedForCategory = selectedItems[item.category]
                    const isSelected = selectedForCategory?.id === item.id
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelect(item)}
                        className={`rounded-3xl border p-3 text-left transition ${
                          isSelected ? 'border-stone-900 bg-stone-100' : 'border-stone-200 bg-white hover:border-stone-900'
                        }`}
                      >
                        <div className="relative aspect-[3/4] mb-3 overflow-hidden rounded-3xl bg-stone-100">
                          {item.thumbnailUrl ? (
                            <Image src={item.thumbnailUrl} alt={item.name} fill className="object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-stone-400">No Image</div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-stone-900 truncate">{item.name}</p>
                          <p className="text-xs text-stone-400 mt-1">{item.color}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="sticky bottom-6 z-10 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="mb-3 text-sm text-stone-500">選択済みアイテム</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(selectedItems)
                  .filter(([, item]) => item)
                  .map(([category, item]) => (
                    <span key={category} className="rounded-full bg-stone-100 px-3 py-2 text-xs text-stone-600">
                      {categoryLabels[category as Category]}：{item?.name}
                    </span>
                  ))}
              </div>
              <Button
                className="mt-4 w-full"
                onClick={handleSave}
                loading={saveMutation.isPending}
              >
                保存して履歴に追加
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
