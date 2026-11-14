import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/utils'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req)
    const { id } = await params

    const history = await prisma.outfitHistory.findFirst({
      where: { id, userId: user.userId },
    })
    if (!history) return apiError('履歴が見つかりません', 404)

    const updated = await prisma.outfitHistory.update({
      where: { id },
      data: { status: 'skipped' },
    })

    return apiSuccess(updated)
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED') return apiError('認証が必要です', 401)
    return apiError('サーバーエラーが発生しました', 500)
  }
}
