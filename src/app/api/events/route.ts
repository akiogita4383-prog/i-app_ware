import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req)
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to   = searchParams.get('to')

    const where: Record<string, unknown> = { userId: user.userId }
    if (from && to) {
      where.startAt = { gte: new Date(from), lte: new Date(to + 'T23:59:59') }
    }

    const events = await prisma.event.findMany({
      where,
      orderBy: { startAt: 'asc' },
    })
    return apiSuccess(events)
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED') return apiError('認証が必要です', 401)
    return apiError('サーバーエラー', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req)
    const { title, startAt, endAt } = await req.json()

    if (!title || !startAt || !endAt) {
      return apiError('title / startAt / endAt は必須です', 400)
    }

    const event = await prisma.event.create({
      data: {
        userId:  user.userId,
        title,
        startAt: new Date(startAt),
        endAt:   new Date(endAt),
      },
    })
    return apiSuccess(event, 201)
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED') return apiError('認証が必要です', 401)
    return apiError('サーバーエラー', 500)
  }
}
