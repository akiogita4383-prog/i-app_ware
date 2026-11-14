import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/utils'
import { deleteFromS3 } from '@/lib/s3'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req)
    const { id } = await params

    const item = await prisma.clothingItem.findFirst({
      where: { id, userId: user.userId },
    })
    if (!item) return apiError('アイテムが見つかりません', 404)

    return apiSuccess(item)
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED') return apiError('認証が必要です', 401)
    return apiError('サーバーエラーが発生しました', 500)
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req)
    const { id } = await params
    const body = await req.json()

    const existing = await prisma.clothingItem.findFirst({
      where: { id, userId: user.userId },
    })
    if (!existing) return apiError('アイテムが見つかりません', 404)

    const { category, name, color, material, silhouette, tags, memo } = body

    if (category && !['tops', 'bottoms', 'outer', 'shoes', 'accessories', 'other'].includes(category)) {
      return apiError('無効なカテゴリです', 400)
    }

    const updated = await prisma.clothingItem.update({
      where: { id },
      data: {
        ...(category ? { category } : {}),
        ...(name ? { name } : {}),
        ...(color ? { color } : {}),
        ...(material !== undefined ? { material } : {}),
        ...(silhouette !== undefined ? { silhouette } : {}),
        ...(tags !== undefined ? { tags } : {}),
        ...(memo !== undefined ? { memo } : {}),
      },
    })

    return apiSuccess(updated)
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED') return apiError('認証が必要です', 401)
    return apiError('サーバーエラーが発生しました', 500)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req)
    const { id } = await params

    const item = await prisma.clothingItem.findFirst({
      where: { id, userId: user.userId },
    })
    if (!item) return apiError('アイテムが見つかりません', 404)

    if (item.imageUrl) {
      try { await deleteFromS3(item.imageUrl) } catch {}
    }
    if (item.thumbnailUrl && item.thumbnailUrl !== item.imageUrl) {
      try { await deleteFromS3(item.thumbnailUrl) } catch {}
    }

    await prisma.clothingItem.delete({ where: { id } })

    return apiSuccess({ message: '削除しました' })
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED') return apiError('認証が必要です', 401)
    return apiError('サーバーエラーが発生しました', 500)
  }
}
