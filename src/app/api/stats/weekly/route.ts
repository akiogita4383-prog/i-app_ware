import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req)

    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    const [weekHistories, totalItems] = await Promise.all([
      prisma.outfitHistory.findMany({
        where: {
          userId: user.userId,
          date: { gte: weekStart, lte: weekEnd },
          status: 'adopted',
        },
      }),
      prisma.clothingItem.count({ where: { userId: user.userId } }),
    ])

    type HistoryRow = typeof weekHistories[0]
    const wornItemIds = [...new Set(weekHistories.flatMap((h: HistoryRow) => h.itemIds))]
    const wornDays = new Set(weekHistories.map((h: HistoryRow) => h.date.toISOString().split('T')[0])).size

    const categoryCount: Record<string, number> = {}
    for (const id of wornItemIds) {
      const item = await prisma.clothingItem.findUnique({ where: { id }, select: { category: true } })
      if (item) {
        categoryCount[item.category] = (categoryCount[item.category] || 0) + 1
      }
    }

    const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

    const ratedHistories = weekHistories.filter((h: HistoryRow) => h.rating !== null)
    const avgRating = ratedHistories.length
      ? ratedHistories.reduce((sum: number, h: HistoryRow) => sum + (h.rating ?? 0), 0) / ratedHistories.length
      : null

    const wornItems = await prisma.clothingItem.count({
      where: { userId: user.userId, wornCount: { gt: 0 } },
    })
    const utilizationRate = totalItems > 0 ? Math.round((wornItems / totalItems) * 100) : 0

    return apiSuccess({
      wornDays,
      topCategory,
      utilizationRate,
      avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
    })
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED') return apiError('認証が必要です', 401)
    return apiError('サーバーエラーが発生しました', 500)
  }
}
