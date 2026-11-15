export type Category = 'tops' | 'bottoms' | 'outer' | 'shoes' | 'accessories' | 'other';

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'tops', label: 'トップス' },
  { value: 'bottoms', label: 'ボトムス' },
  { value: 'outer', label: 'アウター' },
  { value: 'shoes', label: 'シューズ' },
  { value: 'accessories', label: 'アクセ' },
  { value: 'other', label: 'その他' },
];

export const CATEGORY_LABEL: Record<Category, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label]),
) as Record<Category, string>;

export const TAG_OPTIONS = [
  'カジュアル', 'きれいめ', 'オフィス', 'デート', 'スポーツ',
  'トレンド', 'ベーシック', 'アウトドア', 'フォーマル', 'ストリート',
] as const;

export function isCategory(v: unknown): v is Category {
  return typeof v === 'string' && CATEGORIES.some((c) => c.value === v);
}
