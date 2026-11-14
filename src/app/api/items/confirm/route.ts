import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { copyImage, deleteImage } from '@/lib/storage'
import { apiError, apiSuccess } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req)
    const items = await req.json() as Array<{
      category: string
      name: string
      color: string
      material?: string
      silhouette?: string
      tags?: string[]
      memo?: string
      aiConfidence?: number
      tempImageUrl?: string
    }>

    if (!Array.isArray(items) || !items.length) {
      return apiError('アイテムデータが必要です', 400)
    }

    const created = await Promise.all(
      items.map(async (item) => {
        let imageUrl: string | null = null
        let thumbnailUrl: string | null = null

        if (item.tempImageUrl) {
          imageUrl     = await copyImage(item.tempImageUrl, 'items')
          thumbnailUrl = await copyImage(item.tempImageUrl, 'thumbnails')
          await deleteImage(item.tempImageUrl)
        }

        return prisma.clothingItem.create({
          data: {
            userId: user.userId,
            category: item.category,
            name: item.name,
            color: item.color,
            material: item.material || null,
            silhouette: item.silhouette || null,
            tags: item.tags || [],
            memo: item.memo || null,
            aiConfidence: item.aiConfidence || null,
            imageUrl,
            thumbnailUrl,
          },
        })
      })
    )

    return apiSuccess(created, 201)
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED') return apiError('認証が必要です', 401)
    console.error(e)
    return apiError('アイテムの保存に失敗しました', 500)
  }
}
