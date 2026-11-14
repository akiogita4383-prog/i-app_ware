import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signAccessToken, signRefreshToken, getRefreshTokenExpiry } from '@/lib/jwt'
import { apiError, apiSuccess } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return apiError('メールアドレスとパスワードは必須です', 400)
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.passwordHash) {
      return apiError('メールアドレスまたはパスワードが正しくありません', 401)
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return apiError('メールアドレスまたはパスワードが正しくありません', 401)
    }

    const payload = { userId: user.id, email: user.email }
    const accessToken = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: getRefreshTokenExpiry(),
      },
    })

    return apiSuccess({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
    })
  } catch (e) {
    console.error(e)
    return apiError('サーバーエラーが発生しました', 500)
  }
}
