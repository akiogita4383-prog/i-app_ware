'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { AppShell } from '@/components/layout/AppShell'
import { RatingModal } from '@/components/history/RatingModal'
import { WeeklyStatsCard } from '@/components/history/WeeklyStats'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { OutfitHistory } from '@/types'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import Image from 'next/image'

type Tab = 'list' | 'calendar'
type Filter = 'all' | 'favorite' | 'skipped'

const statusLabels = {
  adopted: { label: '着用', color: 'success' as const },
  skipped: { label: 'スキップ', color: 'warning' as const },
  draft: { label: '下書き', color: 'default' as const },
}

const ratingStars = (r: number | null | undefined) => {
  if (!r) return null
  return ['', '⭐', '⭐⭐', '⭐⭐⭐'][r] || null
}

export default function HistoryPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('list')
  const [filter, setFilter] = useState<Filter>('all')
  const [ratingTarget, setRatingTarget] = useState<OutfitHistory | null>(null)
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'))

  const { data: histories = [], isLoading } = useQuery<OutfitHistory[]>({
    queryKey: ['history', filter, currentMonth, tab],
    queryFn: () => {
      const params = new URLSearchParams()
      if (tab === 'calendar') params.set('month', currentMonth)
      if (filter !== 'all') params.set('rating', filter)
      return api.get(`/history?${params}`).then((r) => r.data.data)
    },
  })

  const rateMutation = useMutation({
    mutationFn: ({ id, rating, note }: { id: string; rating: number; note?: string }) =>
      api.put(`/history/${id}/rate`, { rating, note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['history'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      setRatingTarget(null)
      toast.success('評価を登録しました')
    },
    onError: () => toast.error('エラーが発生しました'),
  })

  const calendarDays = (() => {
    const [year, month] = currentMonth.split('-').map(Number)
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    const days: (Date | null)[] = Array(firstDay.getDay()).fill(null)
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month - 1, d))
    }
    return days
  })()

  const historyByDate = Object.fromEntries(
    histories
      .filter((h) => h.status === 'adopted')
      .map((h) => [h.date.split('T')[0], h])
  )

  const prevMonth = () => {
    const d = new Date(currentMonth + '-01')
    d.setMonth(d.getMonth() - 1)
    setCurrentMonth(format(d, 'yyyy-MM'))
  }

  const nextMonth = () => {
    const d = new Date(currentMonth + '-01')
    d.setMonth(d.getMonth() + 1)
    setCurrentMonth(format(d, 'yyyy-MM'))
  }

  return (
    <AppShell>
      <div className="px-4 pt-6">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-stone-900">履歴</h1>
          <p className="text-stone-400 text-sm">コーデの記録と振り返り</p>
        </div>

        <WeeklyStatsCard />

        <div className="flex gap-1 mt-5 mb-4 bg-stone-100 rounded-2xl p-1">
          {(['list', 'calendar'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 py-2 rounded-xl text-sm font-medium transition-colors',
                tab === t ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
              )}
            >
              {t === 'list' ? 'リスト' : 'カレンダー'}
            </button>
          ))}
        </div>

        {tab === 'list' && (
          <div className="flex gap-2 mb-4">
            {(['all', 'favorite', 'skipped'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  filter === f ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600'
                )}
              >
                {f === 'all' ? 'すべて' : f === 'favorite' ? '⭐ お気に入り' : '👎 着なかった'}
              </button>
            ))}
          </div>
        )}

        {tab === 'calendar' && (
          <div className="bg-white rounded-3xl border border-stone-100 p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="p-2 hover:bg-stone-100 rounded-xl transition-colors">
                <svg className="w-4 h-4 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="font-semibold text-stone-900">
                {format(new Date(currentMonth + '-01'), 'yyyy年M月', { locale: ja })}
              </h3>
              <button onClick={nextMonth} className="p-2 hover:bg-stone-100 rounded-xl transition-colors">
                <svg className="w-4 h-4 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['日', '月', '火', '水', '木', '金', '土'].map((d) => (
                <div key={d} className="text-center text-xs text-stone-400 font-medium py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, i) => {
                if (!date) return <div key={i} />
                const key = format(date, 'yyyy-MM-dd')
                const history = historyByDate[key]
                const isToday = key === format(new Date(), 'yyyy-MM-dd')

                return (
                  <div
                    key={key}
                    className={cn(
                      'aspect-square rounded-xl overflow-hidden relative',
                      isToday && 'ring-2 ring-stone-900',
                      history ? 'cursor-pointer' : ''
                    )}
                  >
                    {history && history.items?.[0]?.thumbnailUrl ? (
                      <Image
                        src={history.items[0].thumbnailUrl}
                        alt=""
                        fill
                        className="object-cover opacity-80"
                      />
                    ) : (
                      <div className={cn('w-full h-full flex items-center justify-center', history ? 'bg-stone-200' : 'bg-stone-50')} />
                    )}
                    <div className="absolute inset-0 flex items-end justify-center pb-0.5">
                      <span className={cn('text-xs font-medium', history ? 'text-white drop-shadow' : 'text-stone-400')}>
                        {date.getDate()}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner />
          </div>
        ) : tab === 'list' ? (
          <div className="space-y-3">
            {histories.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-stone-400">履歴がありません</p>
              </div>
            ) : (
              histories.map((history) => (
                <div key={history.id} className="bg-white rounded-2xl border border-stone-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-stone-400">
                          {format(new Date(history.date), 'M月d日(E)', { locale: ja })}
                        </span>
                        <Badge variant={statusLabels[history.status]?.color}>
                          {statusLabels[history.status]?.label}
                        </Badge>
                      </div>
                      <h3 className="font-bold text-stone-900">{history.aiTitle || 'コーデ'}</h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(history.aiTags as string[]).map((tag) => (
                          <span key={tag} className="text-xs text-stone-400">#{tag}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {history.rating ? (
                        <span className="text-sm">{ratingStars(history.rating)}</span>
                      ) : history.status === 'adopted' ? (
                        <button
                          onClick={() => setRatingTarget(history)}
                          className="text-xs text-stone-400 hover:text-stone-700 underline"
                        >
                          評価する
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {history.items && history.items.length > 0 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto">
                      {history.items.slice(0, 4).map((item) => (
                        <div key={item.id} className="flex-shrink-0 w-12 h-16 bg-stone-100 rounded-xl overflow-hidden relative">
                          {item.thumbnailUrl && (
                            <Image src={item.thumbnailUrl} alt={item.name} fill className="object-cover" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : null}
      </div>

      {ratingTarget && (
        <RatingModal
          historyId={ratingTarget.id}
          onSubmit={(rating, note) => rateMutation.mutate({ id: ratingTarget.id, rating, note })}
          onClose={() => setRatingTarget(null)}
          loading={rateMutation.isPending}
        />
      )}
    </AppShell>
  )
}
