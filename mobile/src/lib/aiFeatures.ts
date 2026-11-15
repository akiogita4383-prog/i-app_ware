import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { errorMessage } from './ai';
import type { Category } from './categories';
import type { ClothingItem } from './db';
import { itemImageUri } from './images';
import { supabase } from './supabase';
import type { Weather } from './weather';
import { describeWeatherCode } from './weather';

async function invoke<T>(fn: string, body: Record<string, unknown>, fallback: string): Promise<T> {
  if (!supabase) throw new Error('サーバーが設定されていません');
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) throw new Error(await errorMessage(error, fallback));
  return data as T;
}

// ── コーデ提案 ──────────────────────────────────────────────

export type SuggestedOutfit = {
  title: string;
  reason: string;
  tips: string;
  tags: string[];
  items: { itemId: string; reason: string }[];
};

export type OutfitConditions = { weather: string; temperature: string; schedule: string; mood: string };

export async function suggestOutfits(opts: {
  mode: 'daily' | 'conditions';
  items: ClothingItem[];
  weather?: Weather | null;
  conditions?: OutfitConditions;
  events?: string[];
  preferences: { liked: string[]; disliked: string[] };
  avoid?: string[];
  day?: string;
}): Promise<{ outfits: SuggestedOutfit[]; message: string | null }> {
  const w = opts.weather;
  return invoke(
    'suggest-outfits',
    {
      mode: opts.mode,
      items: opts.items.map((i) => ({
        id: i.id,
        category: i.category,
        name: i.name,
        color: i.color,
        tags: i.tags,
        wornCount: i.wornCount,
      })),
      weather: w
        ? {
            label: describeWeatherCode(w.weatherCode, w.isDay).label,
            temp: w.temperature,
            tempMax: w.tempMax,
            tempMin: w.tempMin,
            precipProb: w.precipProb,
          }
        : null,
      conditions: opts.conditions,
      events: opts.events,
      preferences: opts.preferences,
      avoid: opts.avoid,
      day: opts.day,
    },
    'コーデの提案に失敗しました',
  );
}

// ── ショッピング ────────────────────────────────────────────

export type Product = { id: string; name: string; brand: string; price: number; imageUrl: string; url: string };
export type ShoppingGroup = { keyword: string; searchUrl: string; products: Product[] };

export async function searchShopping(opts: {
  category: Exclude<Category, 'other'>;
  owned: ClothingItem[];
  personalColors: string[];
}): Promise<{ groups: ShoppingGroup[]; source: 'yahoo' | 'keywords' }> {
  return invoke(
    'shopping-search',
    {
      category: opts.category,
      owned: opts.owned.map((i) => ({ category: i.category, name: i.name, color: i.color })),
      personalColors: opts.personalColors,
    },
    'アイテムの検索に失敗しました',
  );
}

// ── AI イラスト生成 ─────────────────────────────────────────

async function itemBase64(item: ClothingItem): Promise<{ image: string; mediaType: string } | null> {
  const uri = itemImageUri(item.imageFile);
  if (!uri) return null;
  const png = item.imageFile?.endsWith('.png') ?? false;
  const ctx = ImageManipulator.manipulate(uri);
  ctx.resize({ width: 768 });
  const ref = await ctx.renderAsync();
  const saved = await ref.saveAsync({ format: png ? SaveFormat.PNG : SaveFormat.JPEG, compress: 0.85, base64: true });
  return saved.base64 ? { image: saved.base64, mediaType: png ? 'image/png' : 'image/jpeg' } : null;
}

/** アバターに服を着せたイラストを生成し、PNG の base64 を返す */
export async function generateCoordinate(opts: {
  avatarBase64: string;
  items: ClothingItem[];
  product?: Product & { category: Category };
}): Promise<string> {
  const items: Record<string, unknown>[] = [];
  for (const item of opts.items) {
    const img = await itemBase64(item);
    items.push({ name: item.name, category: item.category, ...(img ?? {}) });
  }
  if (opts.product) {
    items.push({ name: opts.product.name, category: opts.product.category, imageUrl: opts.product.imageUrl });
  }
  const data = await invoke<{ image: string }>(
    'generate-coordinate',
    { avatar: opts.avatarBase64, items },
    'イラストの生成に失敗しました',
  );
  return data.image;
}
