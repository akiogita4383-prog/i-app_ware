'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import api from '@/lib/api'
import toast from 'react-hot-toast'

interface AuthFormProps {
  mode: 'login' | 'register'
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const setTokens = useAuthStore((s) => s.setTokens)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', name: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.email) errs.email = 'メールアドレスを入力してください'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = '有効なメールアドレスを入力してください'
    if (!form.password) errs.password = 'パスワードを入力してください'
    else if (form.password.length < 8) errs.password = 'パスワードは8文字以上必要です'
    if (mode === 'register' && !form.name) errs.name = '名前を入力してください'
    setErrors(errs)
    return !Object.keys(errs).length
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)

    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register'
      const res = await api.post(endpoint, form)
      const { accessToken, refreshToken, user } = res.data.data
      setTokens(accessToken, refreshToken, user)
      router.push('/')
      toast.success(mode === 'login' ? 'ログインしました' : 'アカウントを作成しました')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google'
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">my coordy♡</h1>
        <p className="mt-2 text-stone-500 text-sm">
          {mode === 'login' ? 'おかえりなさい' : 'アカウントを作成する'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'register' && (
          <Input
            label="名前"
            type="text"
            placeholder="山田 太郎"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
          />
        )}
        <Input
          label="メールアドレス"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          error={errors.email}
        />
        <Input
          label="パスワード"
          type="password"
          placeholder="8文字以上"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          error={errors.password}
        />

        <Button type="submit" className="w-full" loading={loading} size="lg">
          {mode === 'login' ? 'ログイン' : 'アカウント作成'}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-stone-200" />
        </div>
        <div className="relative flex justify-center text-xs text-stone-400">
          <span className="bg-white px-2">または</span>
        </div>
      </div>

      <Button variant="secondary" className="w-full" size="lg" onClick={handleGoogleLogin}>
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Googleでログイン
      </Button>

      <p className="text-center text-sm text-stone-500 mt-6">
        {mode === 'login' ? (
          <>
            アカウントをお持ちでない方は{' '}
            <a href="/register" className="text-stone-900 font-medium hover:underline">
              新規登録
            </a>
          </>
        ) : (
          <>
            既にアカウントをお持ちの方は{' '}
            <a href="/login" className="text-stone-900 font-medium hover:underline">
              ログイン
            </a>
          </>
        )}
      </p>
    </div>
  )
}
