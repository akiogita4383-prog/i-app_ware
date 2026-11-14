'use client'

import { useQuery } from '@tanstack/react-query'
import { WeeklyStats } from '@/types'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import api from '@/lib/api'

const categoryLabels: Record<string, string> = {
  tops: 'トップス',
  bottoms: 'ボトムス',
  outer: 'アウター',
  shoes: 'シューズ',
  accessories: 'アクセ',
  other: 'その他',
}

export function WeeklyStatsCard() {
  const { data: stats, isLoading } = useQuery<WeeklyStats>({
    queryKey: ['stats', 'weekly'],
    queryFn: () => api.get('/stats/weekly').then((r) => r.data.data),
  })

  if (isLoading) {
    return (
      <Card className="flex items-center justify-center py-8">
        <Spinner />
      </Card>
    )
  }

  if (!stats) return null

  const statItems = [
    { label: '今週の着用日数', value: `${stats.wornDays}日`, icon: '📅' },
    { label: 'よく着たカテゴリ', value: stats.topCategory ? categoryLabels[stats.topCategory] || stats.topCategory : '-', icon: '👕' },
    { label: 'クローゼット活用率', value: `${stats.utilizationRate}%`, icon: '📊' },
    { label: '平均評価', value: stats.avgRating ? `${stats.avgRating} / 3` : '-', icon: '⭐' },
  ]

  return (
    <Card>
      <h3 className="text-sm font-semibold text-stone-700 mb-3">今週のサマリー</h3>
      <div className="grid grid-cols-2 gap-3">
        {statItems.map((s) => (
          <div key={s.label} className="bg-stone-50 rounded-2xl p-3">
            <span className="text-lg">{s.icon}</span>
            <p className="text-lg font-bold text-stone-900 mt-1">{s.value}</p>
            <p className="text-xs text-stone-400">{s.label}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}
