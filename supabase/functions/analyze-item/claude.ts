import Anthropic from 'npm:@anthropic-ai/sdk@1.6.0';
import { HttpError } from '../_shared/http.ts';

const client = new Anthropic(); // ANTHROPIC_API_KEY はシークレットから読む

const CATEGORIES = ['tops', 'bottoms', 'outer', 'shoes', 'accessories', 'other'] as const;
const TAGS = [
  'カジュアル', 'きれいめ', 'オフィス', 'デート', 'スポーツ',
  'トレンド', 'ベーシック', 'アウトドア', 'フォーマル', 'ストリート',
] as const;

const SYSTEM = `あなたはファッションアシスタントです。ユーザーのクローゼットに登録する服の写真を分析します。
写真には服が1点写っています（背景は切り抜かれている場合があります）。

- category: tops / bottoms / outer / shoes / accessories / other のいずれか。ワンピースは tops、バッグや帽子は accessories。
- name: 一覧に表示するアイテム名。15字以内の日本語（例: 白のオックスフォードシャツ）。
- color: メインカラーの日本語名（例: ホワイト、ネイビー）。
- material: 見た目から推定した素材（コットン、ウール、デニムなど）。判断できなければ空文字。
- silhouette: シルエットや特徴。20字以内。
- tags: 次の候補から当てはまるものを0〜3個: ${TAGS.join(' / ')}
- confidence: 判定にどれだけ自信があるか（0〜100の整数）。写真が不鮮明・服以外が写っているときは低くする。`;

const SCHEMA = {
  type: 'object',
  properties: {
    category: { type: 'string', enum: [...CATEGORIES] },
    name: { type: 'string' },
    color: { type: 'string' },
    material: { type: 'string' },
    silhouette: { type: 'string' },
    tags: { type: 'array', items: { type: 'string', enum: [...TAGS] } },
    confidence: { type: 'integer' },
  },
  required: ['category', 'name', 'color', 'material', 'silhouette', 'tags', 'confidence'],
  additionalProperties: false,
};

export type ItemAnalysis = {
  category: (typeof CATEGORIES)[number];
  name: string;
  color: string;
  material: string;
  silhouette: string;
  tags: string[];
  confidence: number;
};

export async function analyzeClothing(
  base64: string,
  mediaType: 'image/png' | 'image/jpeg' | 'image/webp',
): Promise<ItemAnalysis> {
  const response = await client.beta.messages.create({
    model: 'claude-sonnet-5-5',
    max_tokens: 4096,
    // 安全分類器で断られた場合に、推奨モデルで自動的にやり直す
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: SCHEMA },
    },
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: 'この服を分析してください。' },
        ],
      },
    ],
  });

  if (response.stop_reason === 'refusal') {
    throw new HttpError(422, 'この写真は解析できませんでした。手入力で登録してください');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('analyze-item: response truncated (max_tokens)');
  }
  const text = response.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') throw new Error('analyze-item: no text block');

  const r = JSON.parse(text.text) as ItemAnalysis;
  return { ...r, confidence: Math.max(0, Math.min(100, Math.round(r.confidence))) };
}
