import { AuthForm } from '@/components/auth/AuthForm'

export const metadata = { title: '新規登録 — WARE' }

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-stone-100 p-8">
        <AuthForm mode="register" />
      </div>
    </div>
  )
}
