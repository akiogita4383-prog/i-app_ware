import Anthropic from '@anthropic-ai/sdk'
import { AiAnalysisResult, ClothingItem, OutfitContext, OutfitHistory, OutfitGenerationResult } from '@/types'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const VISION_SYSTEM_PROMPT = `あなたはファッションAIアシスタントです。
服の画像を分析し、以下のJSON形式のみで返答してください。
マークダウンや説明文は不要です。

{
  "category": "tops|bottoms|outer|shoes|accessories|other",
  "name": "アイテム名（15字以内）",
  "color": "メインカラーの日本語名",
  "material": "素材推定（コットン/ウール/デニム等）",
  "silhouette": "シルエット・特徴（20字以内）",
  "tags": ["タグ1", "タグ2"],
  "confidence": 数値(0-100)
}

タグ候補：カジュアル / きれいめ / オフィス / デート / スポーツ /
          トレンド / ベーシック / アウトドア / フォーマル / ストリート`

function extractJsonObject(input: string): string {
  const cleaned = input
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/g, '')
    .trim()

  const match = cleaned.match(/\{[\s\S]*\}$/m)
  if (match) return match[0]

  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.slice(firstBrace, lastBrace + 1)
  }

  throw new Error(`解析可能なJSONが見つかりませんでした: ${cleaned}`)
}

function safeParseJson<T>(jsonText: string): T {
  try {
    return JSON.parse(jsonText) as T
  } catch (error) {
    const relaxed = jsonText
      .replace(/([,{\s])([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
      .replace(/,(\s*[}\]])/g, '$1')
    return JSON.parse(relaxed) as T
  }
}

export async function analyzeClothingImage(base64Image: string, mimeType: string): Promise<AiAnalysisResult> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 512,
    system: VISION_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: 'この服を分析してください。',
          },
        ],
      },
    ],
  })

  const text = response.content?.[0]?.type === 'text' ? response.content[0].text : ''
  console.debug('[CLAUDE RAW RESPONSE]', text)

  try {
    const jsonText = extractJsonObject(text)
    console.debug('[CLAUDE PARSED JSON]', jsonText)

    const result = safeParseJson<AiAnalysisResult>(jsonText)

    return {
      category: result.category,
      name: result.name,
      color: result.color,
      material: result.material,
      silhouette: result.silhouette,
      tags: Array.isArray(result.tags) ? result.tags : result.tags ? [String(result.tags)] : [],
      confidence: typeof result.confidence === 'number' ? result.confidence : Number(result.confidence) || 0,
    }
  } catch (error) {
    console.error('[CLAUDE PARSE ERROR]', {
      message: error instanceof Error ? error.message : String(error),
      rawText: text,
      content: response.content,
    })
    throw new Error('Claudeの解析結果のパースに失敗しました')
  }
}

function buildLikedDislikedPatterns(histories: OutfitHistory[]): { liked: string; disliked: string } {
  const liked = histories
    .filter((h) => h.rating === 3)
    .map((h) => h.aiTags.join('、'))
    .filter(Boolean)
    .slice(0, 3)
    .join(' / ') || 'なし'

  const disliked = histories
    .filter((h) => h.rating === 1 || h.status === 'skipped')
    .map((h) => h.aiTags.join('、'))
    .filter(Boolean)
    .slice(0, 3)
    .join(' / ') || 'なし'

  return { liked, disliked }
}

export async function generateOutfit(
  context: OutfitContext,
  items: ClothingItem[],
  histories: OutfitHistory[]
): Promise<OutfitGenerationResult> {
  const { liked, disliked } = buildLikedDislikedPatterns(histories)

  const itemsJson = JSON.stringify(
    items.map((i) => ({
      id: i.id,
      category: i.category,
      name: i.name,
      color: i.color,
      tags: i.tags,
      wornCount: i.wornCount,
    })),
    null,
    2
  )

  const historyJson = JSON.stringify(
    histories.slice(0, 10).map((h) => ({
      date: h.date,
      context: h.context,
      aiTitle: h.aiTitle,
      aiTags: h.aiTags,
      status: h.status,
      rating: h.rating,
    })),
    null,
    2
  )

  const systemPrompt = `あなたはプロのパーソナルスタイリストです。

ユーザーの状況：
- 天気：${context.weather}、気温：${context.temperature}
- 予定：${context.schedule}、気分：${context.mood}

クローゼット（${items.length}点）：
${itemsJson}

最近のコーデ履歴と評価（直近10件）：
${historyJson}

---
履歴から学習した好み：
- 好評（★3）が多いパターン：${liked}
- 不評・未着用が多いパターン：${disliked}

以下のJSON形式のみで返答してください：
{
  "title": "コーデタイトル（10字以内）",
  "outfit": [
    { "itemId": "uuid", "category": "...", "name": "...", "reason": "選んだ理由（20字以内）" }
  ],
  "tips": "スタイリングアドバイス（100〜150字）",
  "tags": ["タグ1", "タグ2", "タグ3"]
}`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: systemPrompt,
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned) as OutfitGenerationResult
}
