import { FunctionsHttpError } from '@supabase/supabase-js';
import { isCategory, type Category } from './categories';
import { supabase } from './supabase';

export type ItemAnalysis = {
  category: Category;
  name: string;
  color: string;
  material: string;
  silhouette: string;
  tags: string[];
  confidence: number;
};

export async function errorMessage(error: unknown, fallback: string): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (typeof body?.error === 'string') return body.error;
    } catch {
      // JSON でなければ既定のメッセージ
    }
  }
  return fallback;
}

/** 服の写真を AI で解析する（写真はサーバーに保存されない） */
export async function analyzeItemImage(
  base64: string,
  mediaType: 'image/png' | 'image/jpeg',
): Promise<ItemAnalysis> {
  if (!supabase) throw new Error('サーバーが設定されていません');
  const { data, error } = await supabase.functions.invoke('analyze-item', {
    body: { image: base64, mediaType },
  });
  if (error) throw new Error(await errorMessage(error, '画像の解析に失敗しました'));
  const r = data as Partial<ItemAnalysis>;
  return {
    category: isCategory(r.category) ? r.category : 'other',
    name: r.name ?? '',
    color: r.color ?? '',
    material: r.material ?? '',
    silhouette: r.silhouette ?? '',
    tags: Array.isArray(r.tags) ? r.tags.filter((t): t is string => typeof t === 'string') : [],
    confidence: typeof r.confidence === 'number' ? r.confidence : 0,
  };
}
