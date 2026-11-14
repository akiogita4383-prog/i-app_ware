import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { apiSuccess } from '@/lib/utils'

const anthropic = new Anthropic()

const FALLBACKS = [
  '今日のコーデで自分らしさを表現して、素敵な1日に✨',
  '好きな服を着ると気分も上がる！今日も自分を大切に🌸',
  'おしゃれは自分へのご褒美。今日も輝いていこう♡',
  '鏡の前の自分にOKを出して、自信を持って出発しよう✨',
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const weather = searchParams.get('weather') ?? '晴れ'
  const temp    = searchParams.get('temp') ?? '20'
  const day     = searchParams.get('day') ?? '月曜日'

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 80,
      messages: [{
        role: 'user',
        content:
          `今日は${day}、天気は${weather}、気温${temp}℃です。\n` +
          `ファッション好きな女性が今日1日を前向きに過ごせるよう、`+
          `気の利いた短い一言を日本語で返してください。\n` +
          `絵文字を1〜2個含め、40文字以内で。説明なしでメッセージのみ返してください。`,
      }],
    })
    const text = response.content[0].type === 'text'
      ? response.content[0].text.trim()
      : FALLBACKS[0]
    return apiSuccess({ message: text })
  } catch {
    const fallback = FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)]
    return apiSuccess({ message: fallback })
  }
}
