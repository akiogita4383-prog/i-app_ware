import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req)
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')

    const items = await prisma.clothingItem.findMany({
      where: {
        userId: user.userId,
        ...(category && category !== 'all' ? { category } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })

    return apiSuccess(items)
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED') return apiError('認証が必要です', 401)
    console.error(e)
    return apiError('サーバーエラーが発生しました', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req)
    const body = await req.json()

    const { category, name, color, material, silhouette, tags, memo, imageUrl, thumbnailUrl, aiConfidence } = body

    if (!category || !name || !color) {
      return apiError('カテゴリ、アイテム名、色は必須です', 400)
    }
    if (!['tops', 'bottoms', 'outer', 'shoes', 'accessories', 'other'].includes(category)) {
      return apiError('無効なカテゴリです', 400)
    }

    const item = await prisma.clothingItem.create({
      data: {
        userId: user.userId,
        category,
        name,
        color,
        material: material || null,
        silhouette: silhouette || null,
        tags: tags || [],
        memo: memo || null,
        imageUrl: imageUrl || null,
        thumbnailUrl: thumbnailUrl || null,
        aiConfidence: aiConfidence || null,
      },
    })

    return apiSuccess(item, 201)
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED') return apiError('認証が必要です', 401)
    console.error(e)
    return apiError('サーバーエラーが発生しました', 500)
  }
}
