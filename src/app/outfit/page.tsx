'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/AppShell'
import { ConditionPicker } from '@/components/outfit/ConditionPicker'
import { OutfitCard } from '@/components/outfit/OutfitCard'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { OutfitContext, ClothingItem, OutfitGenerationResult } from '@/types'
import api from '@/lib/api'
import toast from 'react-hot-toast'

interface GeneratedOutfit extends OutfitGenerationResult {
  historyId: string
}

export default function OutfitPage() {
  const qc = useQueryClient()
  const [conditions, setConditions] = useState<Partial<OutfitContext>>({})
  const [generated, setGenerated] = useState<GeneratedOutfit | null>(null)
  const [outfitItems, setOutfitItems] = useState<ClothingItem[]>([])

  const { data: allItems = [] } = useQuery<ClothingItem[]>({
    queryKey: ['items', 'all'],
    queryFn: () => api.get('/items').then((r) => r.data.data),
  })

  const generateMutation = useMutation({
    mutationFn: (ctx: OutfitContext) => api.post('/outfit/generate', ctx),
    onSuccess: (res) => {
      const data = res.data.data as GeneratedOutfit
      setGenerated(data)
      const itemMap = Object.fromEntries(allItems.map((i) => [i.id, i]))
      const items = data.outfit.map((o) => ({
        ...itemMap[o.itemId],
        reason: o.reason,
      })).filter(Boolean) as ClothingItem[]
      setOutfitItems(items)
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'コーデの生成に失敗しました'),
  })

  const adoptMutation = useMutation({
    mutationFn: (id: string) => api.post(`/history/${id}/adopt`),
    onSuccess: () => {
      toast.success('コーデを採用しました！')
      qc.invalidateQueries({ queryKey: ['history'] })
      setGenerated(null)
    },
    onError: () => toast.error('エラーが発生しました'),
  })

  const skipMutation = useMutation({
    mutationFn: (id: string) => api.post(`/history/${id}/skip`),
    onSuccess: () => {
      if (isComplete) {
        generateMutation.mutate(conditions as OutfitContext)
      }
    },
    onError: () => toast.error('エラーが発生しました'),
  })

  const isComplete =
    !!conditions.weather && !!conditions.temperature && !!conditions.schedule && !!conditions.mood

  const handleGenerate = () => {
    if (!isComplete) {
      toast.error('すべての条件を選択してください')
      return
    }
    if (allItems.length === 0) {
      toast.error('クローゼットにアイテムを登録してください')
      return
    }
    generateMutation.mutate(conditions as OutfitContext)
  }

  const handleSkip = () => {
    if (!generated) return
    skipMutation.mutate(generated.historyId)
  }

  const handleAdopt = () => {
    if (!generated) return
    adoptMutation.mutate(generated.historyId)
  }

  return (
    <AppShell>
      <div className="px-4 pt-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-stone-900">コーデ提案</h1>
          <p className="text-stone-400 text-sm">今日の条件を選んでください</p>
        </div>

        {!generated ? (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-5 border border-stone-100">
              <ConditionPicker value={conditions} onChange={setConditions} />
            </div>

            {allItems.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700">
                クローゼットにアイテムを登録してからコーデ提案が使えます
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={handleGenerate}
              loading={generateMutation.isPending}
              disabled={!isComplete || allItems.length === 0}
            >
              {generateMutation.isPending ? 'AIが考えています...' : 'コーデを提案してもらう'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <OutfitCard
              title={generated.title}
              tips={generated.tips}
              tags={generated.tags}
              items={outfitItems}
              historyId={generated.historyId}
              onAdopt={handleAdopt}
              onSkip={handleSkip}
              adopting={adoptMutation.isPending}
              skipping={skipMutation.isPending || generateMutation.isPending}
            />

            <Button
              variant="ghost"
              className="w-full text-stone-400"
              onClick={() => setGenerated(null)}
            >
              条件を変更する
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  )
}
