import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signAccessToken, signRefreshToken, getRefreshTokenExpiry } from '@/lib/jwt'
import { apiError, apiSuccess } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json()

    if (!email || !password || !name) {
      return apiError('メールアドレス、パスワード、名前は必須です', 400)
    }
    if (password.length < 8) {
      return apiError('パスワードは8文字以上必要です', 400)
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return apiError('このメールアドレスは既に使用されています', 409)
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { email, passwordHash, name },
    })

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

    return apiSuccess(
      {
        accessToken,
        refreshToken,
        user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
      },
      201
    )
  } catch (e) {
    console.error(e)
    return apiError('サーバーエラーが発生しました', 500)
  }
}
