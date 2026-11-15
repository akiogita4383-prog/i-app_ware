// 手持ちの服（アプリから送られた一覧）から、AI がコーデを提案する。
// 服の情報はこの関数のメモリ上で扱うだけで、どこにも保存しない。
import { consumeQuota, requireUser } from '../_shared/auth.ts';
import { askHaikuJson } from '../_shared/claude.ts';
import { errorResponse, HttpError, json } from '../_shared/http.ts';

const CATEGORIES = ['tops', 'bottoms', 'outer', 'shoes', 'accessories', 'other'];

type Item = { id: string; category: string; name: string; color: string; tags: string[]; wornCount: number };
type WeatherInput = { label: string; temp: number; tempMax: number; tempMin: number; precipProb: number };

type Outfit = {
  title: string;
  reason: string;
  tips: string;
  tags: string[];
  items: { itemId: string; reason: string }[];
};

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const strList = (v: unknown, maxLen: number, maxItems: number) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, maxItems).map((x) => x.slice(0, maxLen)) : [];

function parseItems(v: unknown): Item[] {
  if (!Array.isArray(v)) throw new HttpError(400, 'アイテムがありません');
  const items = v.slice(0, 300).flatMap((raw): Item[] => {
    const id = str(raw?.id, 64);
    const category = str(raw?.category, 20);
    if (!id || !CATEGORIES.includes(category)) return [];
    return [{
      id,
      category,
      name: str(raw?.name, 60),
      color: str(raw?.color, 30),
      tags: strList(raw?.tags, 20, 5),
      wornCount: num(raw?.wornCount) ?? 0,
    }];
  });
  if (items.length === 0) throw new HttpError(400, 'クローゼットにアイテムを登録してください');
  return items;
}

function parseWeather(v: unknown): WeatherInput | null {
  if (!v || typeof v !== 'object') return null;
  const w = v as Record<string, unknown>;
  const temp = num(w.temp);
  if (temp === null) return null;
  return {
    label: str(w.label, 20),
    temp,
    tempMax: num(w.tempMax) ?? temp,
    tempMin: num(w.tempMin) ?? temp,
    precipProb: num(w.precipProb) ?? 0,
  };
}

const SYSTEM = `あなたはプロのパーソナルスタイリストです。ユーザーのクローゼットにある服だけを使って、コーディネートを提案します。

ルール:
- items には、クローゼット一覧にある id だけを使う。存在しない id は絶対に使わない。
- 1つのコーデには、tops と bottoms など複数のカテゴリを組み合わせる（ワンピースは tops として登録されている）。同じカテゴリは原則1点まで（accessories は2点まで可）。
- 天気・気温があれば必ず考慮する。最低気温が15℃未満か降水確率50%以上ならアウターを含め、暑い日はアウターを外す。
- 予定や気分があれば、それに合うテイストにする。
- 「好評だった傾向」を優先し、「避けたい傾向」は避ける。
- 着用回数が少ない服も、似合うなら積極的に使う。
- 複数提案するときは、それぞれ違うスタイル（カジュアル・きれいめ・トレンドなど）にする。
- title は10字以内、reason は40字以内、各アイテムの reason は20字以内、tips は100〜150字、tags は2〜3個。すべて日本語。`;

function outfitSchema(withMessage: boolean) {
  const outfit = {
    type: 'object',
    properties: {
      title: { type: 'string' },
      reason: { type: 'string' },
      tips: { type: 'string' },
      tags: { type: 'array', items: { type: 'string' } },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: { itemId: { type: 'string' }, reason: { type: 'string' } },
          required: ['itemId', 'reason'],
          additionalProperties: false,
        },
      },
    },
    required: ['title', 'reason', 'tips', 'tags', 'items'],
    additionalProperties: false,
  };
  const properties: Record<string, unknown> = { outfits: { type: 'array', items: outfit } };
  const required = ['outfits'];
  if (withMessage) {
    properties.message = { type: 'string' };
    required.push('message');
  }
  return { type: 'object', properties, required, additionalProperties: false };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);
  try {
    const user = await requireUser(req);
    const body = await req.json().catch(() => null);

    const items = parseItems(body?.items);
    const mode = body?.mode === 'conditions' ? 'conditions' : 'daily';
    const count = mode === 'daily' ? 3 : 1;
    const weather = parseWeather(body?.weather);
    const conditions = body?.conditions && typeof body.conditions === 'object'
      ? Object.fromEntries(
          ['weather', 'temperature', 'schedule', 'mood'].map((k) => [k, str(body.conditions[k], 20)]),
        )
      : null;
    const events = strList(body?.events, 40, 5);
    const liked = strList(body?.preferences?.liked, 60, 5);
    const disliked = strList(body?.preferences?.disliked, 60, 5);
    const avoid = strList(body?.avoid, 60, 10);
    const day = str(body?.day, 10);

    await consumeQuota(user, 'suggest-outfits', { anonymous: 20, signedIn: 60 },
      '今日の AI コーデ提案の上限に達しました。明日また試してください');

    const lines = [
      day && `今日は${day}です。`,
      weather &&
        `天気: ${weather.label}（現在${Math.round(weather.temp)}℃、最高${Math.round(weather.tempMax)}℃・最低${Math.round(weather.tempMin)}℃、降水確率${weather.precipProb}%）`,
      conditions && `条件: 天気=${conditions.weather}、気温=${conditions.temperature}、予定=${conditions.schedule}、気分=${conditions.mood}`,
      events.length > 0 && `今日の予定: ${events.join(' / ')}`,
      `好評だった傾向: ${liked.join(' / ') || 'なし'}`,
      `避けたい傾向: ${disliked.join(' / ') || 'なし'}`,
      avoid.length > 0 && `さっき見送った提案（同じ組み合わせは避ける）: ${avoid.join(' / ')}`,
      '',
      `クローゼット（${items.length}点）:`,
      JSON.stringify(items),
      '',
      mode === 'daily'
        ? `今日おすすめのコーデを${count}パターン提案してください。message には、ファッション好きな人が今日を前向きに過ごせる一言（絵文字1〜2個、40字以内）を入れてください。`
        : 'この条件に合うコーデを1パターン提案してください。',
    ].filter((l) => l !== false && l !== null && l !== '');

    const result = await askHaikuJson<{ outfits: Outfit[]; message?: string }>({
      system: SYSTEM,
      user: lines.join('\n'),
      schema: outfitSchema(mode === 'daily'),
      refusalMessage: 'この内容ではコーデを提案できませんでした',
    });

    // 存在しない id やカテゴリの重複を取り除く
    const byId = new Map(items.map((i) => [i.id, i]));
    const outfits = result.outfits
      .map((o) => {
        const seen = new Set<string>();
        const picked = o.items.filter((it) => {
          const item = byId.get(it.itemId);
          if (!item || seen.has(it.itemId)) return false;
          seen.add(it.itemId);
          return true;
        });
        return { ...o, tags: o.tags.slice(0, 3), items: picked };
      })
      .filter((o) => o.items.length > 0)
      .slice(0, count);

    if (outfits.length === 0) throw new HttpError(422, 'うまく組み合わせを作れませんでした。服を増やしてもう一度試してください');
    return json({ outfits, message: result.message ?? null });
  } catch (e) {
    return errorResponse(e, 'コーデの提案に失敗しました');
  }
});
