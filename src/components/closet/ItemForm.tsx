'use client'

import { useState } from 'react'
import { ClothingItem, Category } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import api from '@/lib/api'
import toast from 'react-hot-toast'

const categoryOptions = [
  { value: 'tops', label: 'トップス' },
  { value: 'bottoms', label: 'ボトムス' },
  { value: 'outer', label: 'アウター' },
  { value: 'shoes', label: 'シューズ' },
  { value: 'accessories', label: 'アクセサリー' },
  { value: 'other', label: 'その他' },
]

const TAG_OPTIONS = ['カジュアル', 'きれいめ', 'オフィス', 'デート', 'スポーツ', 'トレンド', 'ベーシック', 'アウトドア', 'フォーマル', 'ストリート']

interface ItemFormProps {
  item?: ClothingItem
  onSuccess: (item: ClothingItem) => void
  onCancel: () => void
}

export function ItemForm({ item, onSuccess, onCancel }: ItemFormProps) {
  const isEdit = !!item
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    category: (item?.category || 'tops') as string,
    name: item?.name || '',
    color: item?.color || '',
    material: item?.material || '',
    memo: item?.memo || '',
    tags: (item?.tags as string[]) || [],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.name) errs.name = 'アイテム名を入力してください'
    else if (form.name.length > 50) errs.name = '50文字以内で入力してください'
    if (!form.color) errs.color = '色を入力してください'
    setErrors(errs)
    return !Object.keys(errs).length
  }

  const toggleTag = (tag: string) => {
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)

    try {
      let result
      if (isEdit) {
        result = await api.put(`/items/${item!.id}`, form)
      } else {
        result = await api.post('/items', form)
      }
      onSuccess(result.data.data)
      toast.success(isEdit ? '更新しました' : 'アイテムを追加しました')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="カテゴリ"
        options={categoryOptions}
        value={form.category}
        onChange={(e) => setForm({ ...form, category: e.target.value })}
      />
      <Input
        label="アイテム名"
        placeholder="白シャツ"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        error={errors.name}
      />
      <Input
        label="色"
        placeholder="ホワイト"
        value={form.color}
        onChange={(e) => setForm({ ...form, color: e.target.value })}
        error={errors.color}
      />
      <Input
        label="素材（任意）"
        placeholder="コットン"
        value={form.material}
        onChange={(e) => setForm({ ...form, material: e.target.value })}
      />
      <Input
        label="メモ（任意）"
        placeholder="お気に入りの一枚"
        value={form.memo}
        onChange={(e) => setForm({ ...form, memo: e.target.value })}
      />

      <div>
        <p className="text-sm font-medium text-stone-700 mb-2">タグ（任意）</p>
        <div className="flex flex-wrap gap-2">
          {TAG_OPTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                form.tags.includes(tag)
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
          キャンセル
        </Button>
        <Button type="submit" className="flex-1" loading={loading}>
          {isEdit ? '更新する' : '追加する'}
        </Button>
      </div>
    </form>
  )
}
