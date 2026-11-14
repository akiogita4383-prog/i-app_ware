import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req)
    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month')
    const rating = searchParams.get('rating')

    let dateFilter = {}
    if (month) {
      const [year, mon] = month.split('-').map(Number)
      const start = new Date(year, mon - 1, 1)
      const end = new Date(year, mon, 0, 23, 59, 59)
      dateFilter = { date: { gte: start, lte: end } }
    }

    let ratingFilter = {}
    if (rating === 'favorite') ratingFilter = { rating: 3 }
    else if (rating === 'skipped') ratingFilter = { status: 'skipped' }

    const histories = await prisma.outfitHistory.findMany({
      where: {
        userId: user.userId,
        ...dateFilter,
        ...ratingFilter,
      },
      orderBy: { date: 'desc' },
    })

    const allItemIds = [...new Set(histories.flatMap((h: { itemIds: string[] }) => h.itemIds))]
    const items = await prisma.clothingItem.findMany({
      where: { id: { in: allItemIds } },
    })
    type ItemRow = (typeof items)[0]
    const itemMap: Record<string, ItemRow> = Object.fromEntries(items.map((i: ItemRow) => [i.id, i]))

    type HistoryRow = (typeof histories)[0]
    const result = histories.map((h: HistoryRow) => ({
      ...h,
      items: h.itemIds.map((id: string) => itemMap[id]).filter(Boolean),
    }))

    return apiSuccess(result)
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED') return apiError('認証が必要です', 401)
    return apiError('サーバーエラーが発生しました', 500)
  }
}
