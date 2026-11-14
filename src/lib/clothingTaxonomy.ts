// 洋服カテゴリー分類・色・素材・テイスト・シーンの定義

export type MainCategory = 'tops' | 'bottoms' | 'dresses' | 'outerwear' | 'shoes'

// ── カテゴリー階層 ─────────────────────────────────────────────────
export interface SubCategoryDef {
  sub: string        // サブカテゴリー名（例: スカート）
  details: string[]  // 詳細カテゴリー（例: タイト, フレア）
}

export const CLOTHING_TAXONOMY: Record<MainCategory, SubCategoryDef[]> = {
  tops: [
    { sub: 'Tシャツ',    details: ['ベーシック'] },
    { sub: 'シャツ',     details: ['ベーシック'] },
    { sub: 'ブラウス',   details: ['ベーシック'] },
    { sub: 'ニット',     details: ['ベーシック'] },
    { sub: 'カーディガン', details: ['ベーシック'] },
    { sub: 'スウェット', details: ['ベーシック'] },
    { sub: 'パーカー',   details: ['ベーシック'] },
    { sub: 'ベスト',     details: ['ベーシック'] },
    { sub: 'キャミソール', details: ['ベーシック'] },
  ],
  bottoms: [
    { sub: 'スカート', details: ['タイト', 'フレア', 'プリーツ', 'マーメイド'] },
    { sub: 'パンツ',   details: ['ストレート', 'ワイド', 'テーパード', 'スキニー', 'フレア'] },
  ],
  dresses: [
    { sub: 'ワンピース', details: ['Aライン', 'フレア', 'マーメイド', 'シャツ', 'タイト'] },
  ],
  outerwear: [
    { sub: 'ジャケット', details: ['テーラード', 'ノーカラー'] },
    { sub: 'コート',     details: ['トレンチ', 'チェスター', 'ダウン'] },
    { sub: 'ブルゾン',   details: ['ベーシック'] },
    { sub: 'ジレ',       details: ['ベーシック'] },
  ],
  shoes: [
    { sub: 'パンプス',   details: ['ヒール', 'フラット'] },
    { sub: 'ローファー', details: ['ベーシック'] },
    { sub: 'スニーカー', details: ['ベーシック'] },
    { sub: 'サンダル',   details: ['ベーシック'] },
    { sub: 'ブーツ',     details: ['ショート', 'ロング'] },
  ],
}

// ── カテゴリー日本語ラベル ──────────────────────────────────────────
export const MAIN_CATEGORY_LABELS: Record<MainCategory, string> = {
  tops:      'トップス',
  bottoms:   'ボトムス',
  dresses:   'ワンピース',
  outerwear: 'アウター',
  shoes:     'シューズ',
}

// 補完カテゴリーの優先順（検索カテゴリーと異なるもの）
export const COMPLEMENT_PRIORITY: MainCategory[] = [
  'outerwear', 'shoes', 'tops', 'bottoms', 'dresses',
]

// ── 色 ────────────────────────────────────────────────────────────
export const COLOR_OPTIONS = [
  'ホワイト', 'ブラック', 'グレー', 'ベージュ', 'ブラウン',
  'ネイビー', 'ブルー', 'ピンク', 'レッド', 'グリーン',
  'イエロー', 'パープル', 'その他',
] as const
export type ColorOption = typeof COLOR_OPTIONS[number]

// ── 素材 ──────────────────────────────────────────────────────────
export const MATERIAL_OPTIONS = [
  'ニット', 'デニム', 'レザー', 'レース', 'シフォン',
  'サテン', 'ツイード', 'コーデュロイ', 'スウェット', 'その他',
] as const
export type MaterialOption = typeof MATERIAL_OPTIONS[number]

// ── テイスト ──────────────────────────────────────────────────────
export const TASTE_OPTIONS = [
  'きれいめ', 'カジュアル', 'フェミニン', 'モード', 'オフィス', 'ガーリー',
] as const
export type TasteOption = typeof TASTE_OPTIONS[number]

// ── シーン ────────────────────────────────────────────────────────
export const SCENE_OPTIONS = [
  '通勤', '休日', 'デート', '旅行', 'フォーマル',
] as const
export type SceneOption = typeof SCENE_OPTIONS[number]

// ── AI プロンプト用テキスト生成 ────────────────────────────────────
export function buildTaxonomyPrompt(): string {
  const lines: string[] = ['【カテゴリー分類（サブカテゴリー／詳細）】']
  for (const [main, subs] of Object.entries(CLOTHING_TAXONOMY) as [MainCategory, SubCategoryDef[]][]) {
    const label = MAIN_CATEGORY_LABELS[main]
    for (const { sub, details } of subs) {
      if (details.length === 1 && details[0] === 'ベーシック') {
        lines.push(`  ${label} › ${sub}`)
      } else {
        lines.push(`  ${label} › ${sub}（${details.join('／')}）`)
      }
    }
  }
  lines.push('')
  lines.push(`【色】${COLOR_OPTIONS.join('・')}`)
  lines.push(`【素材】${MATERIAL_OPTIONS.join('・')}`)
  lines.push(`【テイスト】${TASTE_OPTIONS.join('・')}`)
  lines.push(`【シーン】${SCENE_OPTIONS.join('・')}`)
  return lines.join('\n')
}
