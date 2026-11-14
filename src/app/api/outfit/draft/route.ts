import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const draft = await prisma.outfitHistory.findFirst({
      where: {
        userId: user.userId,
        date: { gte: today, lt: tomorrow },
        status: 'draft',
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!draft) return apiSuccess(null)

    const items = await prisma.clothingItem.findMany({
      where: { id: { in: draft.itemIds } },
    })

    return apiSuccess({ ...draft, items })
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED') return apiError('認証が必要です', 401)
    return apiError('サーバーエラーが発生しました', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req)
    const { itemIds, title, tips, tags, context, date: dateParam } = await req.json()

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return apiError('アイテムを1つ以上選択してください', 400)
    }

    const items = await prisma.clothingItem.findMany({
      where: { id: { in: itemIds }, userId: user.userId },
    })

    if (items.length !== itemIds.length) {
      return apiError('選択したアイテムの一部が見つかりませんでした', 400)
    }

    const targetDate = dateParam ? new Date(dateParam) : new Date()
    targetDate.setHours(0, 0, 0, 0)

    const history = await prisma.outfitHistory.create({
      data: {
        userId: user.userId,
        date: targetDate,
        context: context ?? {},
        itemIds,
        itemReasons: Object.fromEntries(itemIds.map((id: string) => [id, '手動で選択されたアイテム'])),
        aiTitle: title || 'マイコーデ',
        aiTips: tips || '手動で保存したコーデです',
        aiTags: tags || [],
        status: 'draft',
      },
    })

    return apiSuccess(history, 201)
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED') return apiError('認証が必要です', 401)
    console.error(e)
    return apiError('保存に失敗しました', 500)
  }
}
