import type { SQLiteDatabase } from 'expo-sqlite';
import { kvGet, kvSet } from './db';

/** 端末内に保存するユーザー設定（星座占い用の誕生日、パーソナルカラー、着せ替えのアバター） */
export type Prefs = {
  birthday: string | null; // yyyy-MM-dd
  personalColors: string[]; // PERSONAL_COLORS の id
  avatarId: string;
  displayName: string | null;
};

export async function loadPrefs(db: SQLiteDatabase): Promise<Prefs> {
  const [birthday, colors, avatarId, displayName] = await Promise.all([
    kvGet(db, 'birthday'),
    kvGet(db, 'personalColors'),
    kvGet(db, 'avatarId'),
    kvGet(db, 'displayName'),
  ]);
  let personalColors: string[] = [];
  try {
    const v = JSON.parse(colors ?? '[]');
    if (Array.isArray(v)) personalColors = v.filter((x): x is string => typeof x === 'string');
  } catch {
    // 既定値のまま
  }
  return { birthday: birthday || null, personalColors, avatarId: avatarId || 'default', displayName };
}

export async function savePref<K extends keyof Prefs>(db: SQLiteDatabase, key: K, value: Prefs[K]): Promise<void> {
  const text = Array.isArray(value) ? JSON.stringify(value) : (value ?? '');
  await kvSet(db, key, String(text));
}

export const PERSONAL_COLORS = [
  { id: 'white', label: 'ホワイト', hex: '#FAFAFA' },
  { id: 'ivory', label: 'アイボリー', hex: '#FFFFF0' },
  { id: 'beige', label: 'ベージュ', hex: '#E8DCCA' },
  { id: 'camel', label: 'キャメル', hex: '#C19A6B' },
  { id: 'brown', label: 'ブラウン', hex: '#92400E' },
  { id: 'black', label: 'ブラック', hex: '#1F2937' },
  { id: 'gray', label: 'グレー', hex: '#9CA3AF' },
  { id: 'navy', label: 'ネイビー', hex: '#1E3A5F' },
  { id: 'blue', label: 'ブルー', hex: '#3B82F6' },
  { id: 'skyblue', label: 'スカイブルー', hex: '#87CEEB' },
  { id: 'pink', label: 'ピンク', hex: '#F472B6' },
  { id: 'rose', label: 'ローズ', hex: '#E11D48' },
  { id: 'red', label: 'レッド', hex: '#EF4444' },
  { id: 'orange', label: 'オレンジ', hex: '#F97316' },
  { id: 'yellow', label: 'イエロー', hex: '#EAB308' },
  { id: 'green', label: 'グリーン', hex: '#22C55E' },
  { id: 'khaki', label: 'カーキ', hex: '#6B7C3B' },
  { id: 'lavender', label: 'ラベンダー', hex: '#C084FC' },
  { id: 'purple', label: 'パープル', hex: '#7C3AED' },
  { id: 'turquoise', label: 'ターコイズ', hex: '#0D9488' },
] as const;

export function personalColorLabels(ids: string[]): string[] {
  return ids
    .map((id): string | undefined => PERSONAL_COLORS.find((c) => c.id === id)?.label)
    .filter((l): l is string => !!l);
}
