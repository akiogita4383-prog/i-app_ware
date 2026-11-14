import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { analyzeClothingImage } from '@/lib/claude'
import { uploadImage } from '@/lib/storage'
import { apiError, apiSuccess, isValidMimeType } from '@/lib/utils'

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(req: NextRequest) {
  try {
    requireAuth(req)

    const formData = await req.formData()
    const files = formData.getAll('images').filter(
      (entry): entry is File => entry instanceof File
    )

    if (!files.length) return apiError('画像を選択してください', 400)
    if (files.length > 5) return apiError('一度に処理できる画像は5枚までです', 400)

    for (const file of files) {
      if (!file.type || !isValidMimeType(file.type)) {
        return apiError('JPEG、PNG、WebP形式の画像のみ対応しています', 400)
      }
      if (file.size > MAX_SIZE) {
        return apiError('画像サイズは10MB以下にしてください', 400)
      }
    }

    const results = await Promise.all(
      files.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer())
        const base64 = buffer.toString('base64')

        const [analysis, tempImageUrl] = await Promise.all([
          analyzeClothingImage(base64, file.type),
          uploadImage(buffer, file.type, 'temp'),
        ])

        return { ...analysis, tempImageUrl }
      })
    )

    return apiSuccess(results)
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED') return apiError('認証が必要です', 401)
    console.error(e)
    return apiError('画像の解析に失敗しました', 500)
  }
}
