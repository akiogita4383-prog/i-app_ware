import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/utils'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user  = requireAuth(req)
    const { id } = await params

    const event = await prisma.event.findUnique({ where: { id } })
    if (!event || event.userId !== user.userId) return apiError('Not found', 404)

    await prisma.event.delete({ where: { id } })
    return apiSuccess({ id })
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED') return apiError('認証が必要です', 401)
    return apiError('サーバーエラー', 500)
  }
}
