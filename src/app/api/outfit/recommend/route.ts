import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/utils'
import { describeWeatherCode } from '@/lib/weather'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface RawRecommendation {
  title: string
  reason: string
  itemIds: string[]
  tags: string[]
}

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req)
    const { searchParams } = new URL(req.url)

    const weatherCode = parseInt(searchParams.get('weatherCode') ?? '0')
    const temp = parseFloat(searchParams.get('temp') ?? '20')
    const tempMax = parseFloat(searchParams.get('tempMax') ?? '22')
    const tempMin = parseFloat(searchParams.get('tempMin') ?? '15')
    const precipProb = parseInt(searchParams.get('precipProb') ?? '0')
    const isDay = searchParams.get('isDay') !== 'false'

    const items = await prisma.clothingItem.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
    })

    if (items.length === 0) {
      return apiSuccess([])
    }

    const weatherInfo = describeWeatherCode(weatherCode, isDay)
    const weatherDesc = `${weatherInfo.label}（気温${Math.round(temp)}℃、最高${Math.round(tempMax)}℃・最低${Math.round(tempMin)}℃、降水確率${precipProb}%）`
    const needsOuter = tempMin < 15 || precipProb >= 50

    const itemsSummary = items.map((i) => ({
      id: i.id,
      category: i.category,
      name: i.name,
      color: i.color,
      tags: i.tags,
    }))

    const prompt = `今日の天気：${weatherDesc}

ユーザーのクローゼット（${items.length}点）：
${JSON.stringify(itemsSummary, null, 2)}

上記の天気とクローゼットを考慮して、今日おすすめのコーデを3パターン提案してください。
各パターンはtops・bottomsなど複数カテゴリのアイテムを必ず組み合わせてください。
${needsOuter ? 'アウターや上着を含めることを推奨します（気温が低いまたは雨天のため）。' : '気温が高いのでアウターは不要です。'}
itemIdsには必ず上記リストに存在するidのみを使用してください。存在しないidは絶対に使わないでください。
3パターンはそれぞれ異なるスタイル（カジュアル・きれいめ・トレンドなど）で提案してください。

以下のJSON配列のみで返答してください（マークダウン・説明文は不要）：
[
  {
    "title": "コーデタイトル（10字以内）",
    "reason": "天気・気温を踏まえたおすすめ理由（40字以内）",
    "itemIds": ["存在するitem-id-1", "存在するitem-id-2"],
    "tags": ["タグ1", "タグ2"]
  }
]`

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let recs: RawRecommendation[]
    try {
      recs = JSON.parse(cleaned)
    } catch {
      console.error('[recommend] parse error', cleaned)
      return apiError('AI応答の解析に失敗しました', 500)
    }

    const itemMap = new Map(items.map((i) => [i.id, i]))
    const populated = recs.map((rec) => ({
      title: rec.title,
      reason: rec.reason,
      tags: rec.tags,
      itemIds: rec.itemIds,
      items: rec.itemIds.map((id) => itemMap.get(id)).filter(Boolean),
    }))

    return apiSuccess(populated)
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED') return apiError('認証が必要です', 401)
    console.error(e)
    return apiError('サーバーエラーが発生しました', 500)
  }
}
