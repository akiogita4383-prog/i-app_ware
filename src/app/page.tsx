'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { WeatherWidget } from '@/components/home/WeatherWidget'
import { FortuneWidget } from '@/components/home/FortuneWidget'
import { OutfitRecommendationCarousel } from '@/components/home/OutfitRecommendationCarousel'
import { useAuthStore } from '@/stores/auth'
import { OutfitHistory, ClothingItem } from '@/types'
import api from '@/lib/api'
import Image from 'next/image'


export default function HomePage() {
  const router = useRouter()
  const { user } = useAuthStore()

  // 当日初回アクセス時はデイリー画面へ
  useEffect(() => {
    if (!user) return
    const today = format(new Date(), 'yyyy-MM-dd')
    if (localStorage.getItem('ware-daily-screen') !== today) {
      router.replace('/daily')
    }
  }, [user, router])

  const { data: draft, isLoading: draftLoading } = useQuery<(OutfitHistory & { items: ClothingItem[] }) | null>({
    queryKey: ['outfit', 'draft'],
    queryFn: () => api.get('/outfit/draft').then((r) => r.data.data),
  })

  const today = format(new Date(), 'M月d日(E)', { locale: ja })

  return (
    <AppShell>
      <div className="px-4 pt-6 space-y-5 pb-6">

        {/* ── ヘッダー ── */}
        <div>
          <p className="text-stone-400 text-sm">{today}</p>
          <h1 className="text-2xl font-bold text-stone-900">
            おはよう、{user?.name?.split(' ')[0]}さん
          </h1>
        </div>

        {/* ── こんなコーディネートもおすすめ ── */}
        <OutfitRecommendationCarousel />

        {/* ── 今日のコーデ ── */}
        {draftLoading ? (
          <Card className="flex items-center justify-center py-10">
            <Spinner />
          </Card>
        ) : draft ? (
          <Card padding="none" className="overflow-hidden">
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="success">今日のコーデ</Badge>
              </div>
              <h2 className="text-xl font-bold text-stone-900 mb-1">{draft.aiTitle}</h2>
              <div className="flex gap-1.5 flex-wrap mb-3">
                {(draft.aiTags as string[]).map((tag) => (
                  <span key={tag} className="text-xs text-stone-400">#{tag}</span>
                ))}
              </div>
              {draft.items.length > 0 && (
                <div className="flex gap-2">
                  {draft.items.slice(0, 4).map((item) => (
                    <div key={item.id} className="w-16 h-20 bg-stone-100 rounded-xl overflow-hidden relative flex-shrink-0">
                      {item.thumbnailUrl && (
                        <Image src={item.thumbnailUrl} alt={item.name} fill className="object-cover" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        ) : null}

        {/* ── 他のコーデにする ── */}
        <button
          type="button"
          onClick={() => router.push('/closet')}
          className="w-full rounded-2xl border border-stone-200 bg-white py-3 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
        >
          他のコーデにする
        </button>

        {/* ── 天気 & 占い ── */}
        <div className="grid grid-cols-2 gap-3">
          <WeatherWidget />
          <FortuneWidget />
        </div>

      </div>
    </AppShell>
  )
}
