'use client'

import { Suspense } from 'react'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'
import { Spinner } from '@/components/ui/Spinner'
import api from '@/lib/api'

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setTokens = useAuthStore((s) => s.setTokens)

  useEffect(() => {
    const accessToken = searchParams.get('accessToken')
    const refreshToken = searchParams.get('refreshToken')

    if (accessToken && refreshToken) {
      api.defaults.headers.common.Authorization = `Bearer ${accessToken}`
      api.get('/auth/me').then((res) => {
        setTokens(accessToken, refreshToken, res.data.data)
        router.replace('/')
      }).catch(() => {
        router.replace('/login')
      })
    } else {
      router.replace('/login')
    }
  }, [searchParams, router, setTokens])

  return (
    <div className="text-center">
      <Spinner className="mx-auto mb-3 h-8 w-8" />
      <p className="text-stone-500 text-sm">ログイン中...</p>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Suspense fallback={<Spinner className="h-8 w-8" />}>
        <CallbackContent />
      </Suspense>
    </div>
  )
}
