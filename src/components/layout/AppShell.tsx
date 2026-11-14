'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'
import { BottomNav } from './BottomNav'
import { Spinner } from '@/components/ui/Spinner'

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, accessToken } = useAuthStore()

  useEffect(() => {
    if (!accessToken || !user) {
      router.replace('/login')
    }
  }, [accessToken, user, router])

  if (!accessToken || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <main className="max-w-lg mx-auto pb-20">{children}</main>
      <BottomNav />
    </div>
  )
}
