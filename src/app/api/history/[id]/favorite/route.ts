import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/utils'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user   = requireAuth(req)
    const { id } = await params

    const history = await prisma.outfitHistory.findUnique({ where: { id } })
    if (!history || history.userId !== user.userId) return apiError('Not found', 404)

    const updated = await prisma.outfitHistory.update({
      where: { id },
      data:  { isFavorite: !history.isFavorite },
    })
    return apiSuccess({ isFavorite: updated.isFavorite })
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED') return apiError('認証が必要です', 401)
    return apiError('サーバーエラー', 500)
  }
}
