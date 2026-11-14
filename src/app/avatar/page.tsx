'use client'

import { useMemo } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { AvatarCustomizer } from '@/components/avatar/AvatarCustomizer'
import { AvatarPreview } from '@/components/avatar/AvatarPreview'
import { useAvatarStore } from '@/stores/avatar'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'

export default function AvatarPage() {
  const router = useRouter()
  const config = useAvatarStore((state) => state.config)
  const updateField = useAvatarStore((state) => state.updateField)
  const resetConfig = useAvatarStore((state) => state.resetConfig)

  const summary = useMemo(() => {
    return `${config.height}cm / ${config.bodyType} / ${config.hairStyle} / ${config.hairColor}`
  }, [config])

  return (
    <AppShell>
      <div className="px-4 pt-6 pb-20 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-stone-900">アバターカスタマイズ</h1>
          <p className="text-stone-400 text-sm mt-1">体型・髪型・肌色を設定して、試着結果をより自分らしく表示します。</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <AvatarCustomizer
              height={config.height}
              bodyType={config.bodyType}
              hairStyle={config.hairStyle}
              hairColor={config.hairColor}
              skinTone={config.skinTone}
              onChange={(field, value) => {
                if (field === 'height') return updateField('height', value)
                if (field === 'bodyType') return updateField('bodyType', value)
                if (field === 'hairStyle') return updateField('hairStyle', value)
                if (field === 'hairColor') return updateField('hairColor', value)
                if (field === 'skinTone') return updateField('skinTone', value)
              }}
            />
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-stone-200 bg-white p-5">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <p className="text-sm font-semibold text-stone-700">現在のアバター</p>
                  <p className="text-xs text-stone-400 mt-1">{summary}</p>
                </div>
                <Button variant="secondary" onClick={resetConfig}>リセット</Button>
              </div>
              <div className="rounded-[2.5rem] bg-stone-100 p-5">
                <AvatarPreview selected={{ tops: null, bottoms: null, outer: null, shoes: null, accessories: null, other: null }} avatarConfig={config} onRemove={() => undefined} />
              </div>
            </div>
            <Button className="w-full" onClick={() => router.push('/tryon')}>試着画面に戻る</Button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
