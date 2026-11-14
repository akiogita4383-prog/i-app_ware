import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { generateOutfit } from '@/lib/claude'
import { apiError, apiSuccess } from '@/lib/utils'
import { OutfitContext } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req)
    const context = await req.json() as OutfitContext

    if (!context.weather || !context.temperature || !context.schedule || !context.mood) {
      return apiError('天気、気温、予定、気分は必須です', 400)
    }

    const [items, histories] = await Promise.all([
      prisma.clothingItem.findMany({ where: { userId: user.userId } }),
      prisma.outfitHistory.findMany({
        where: { userId: user.userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ])

    if (!items.length) {
      return apiError('クローゼットにアイテムを登録してください', 400)
    }

    const serializedItems = items.map((i: typeof items[0]) => ({
      ...i,
      tags: i.tags as string[],
      lastWornAt: i.lastWornAt?.toISOString() ?? undefined,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    }))

    const serializedHistories = histories.map((h: typeof histories[0]) => ({
      ...h,
      date: h.date.toISOString(),
      context: h.context as unknown as OutfitContext,
      itemReasons: h.itemReasons as unknown as Record<string, string>,
      aiTags: h.aiTags as unknown as string[],
      wornAt: h.wornAt?.toISOString() ?? undefined,
      createdAt: h.createdAt.toISOString(),
    }))

    const result = await generateOutfit(context, serializedItems as any, serializedHistories as any)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const history = await prisma.outfitHistory.create({
      data: {
        userId: user.userId,
        date: today,
        context: JSON.parse(JSON.stringify(context)),
        itemIds: result.outfit.map((o) => o.itemId),
        itemReasons: Object.fromEntries(result.outfit.map((o) => [o.itemId, o.reason])),
        aiTitle: result.title,
        aiTips: result.tips,
        aiTags: result.tags,
        status: 'draft',
      },
    })

    return apiSuccess({ ...result, historyId: history.id })
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED') return apiError('認証が必要です', 401)
    console.error(e)
    return apiError('コーデの生成に失敗しました', 500)
  }
}
