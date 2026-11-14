import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyRefreshToken, signAccessToken, signRefreshToken, getRefreshTokenExpiry } from '@/lib/jwt'
import { apiError, apiSuccess } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json()
    if (!refreshToken) return apiError('リフレッシュトークンが必要です', 400)

    let payload
    try {
      payload = verifyRefreshToken(refreshToken)
    } catch {
      return apiError('無効なトークンです', 401)
    }

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } })
    if (!stored || stored.expiresAt < new Date()) {
      return apiError('トークンが無効または期限切れです', 401)
    }

    await prisma.refreshToken.deleteMany({ where: { id: stored.id } })

    const newAccessToken = signAccessToken({ userId: payload.userId, email: payload.email })
    const newRefreshToken = signRefreshToken({ userId: payload.userId, email: payload.email })

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: payload.userId,
        expiresAt: getRefreshTokenExpiry(),
      },
    })

    return apiSuccess({ accessToken: newAccessToken, refreshToken: newRefreshToken })
  } catch (e) {
    console.error(e)
    return apiError('サーバーエラーが発生しました', 500)
  }
}
