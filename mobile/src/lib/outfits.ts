import type { SQLiteDatabase } from 'expo-sqlite';
import { addDays, startOfWeek } from 'date-fns';
import { CATEGORY_LABEL, type Category } from './categories';
import { ymd } from './dates';
import { getItemsByIds, newId, now, parseJsonArray, type ClothingItem } from './db';

/**
 * コーデの記録。
 * - adopted: その日に着る（着た）コーデ。1日に1件だけ持ち、選び直すと前のものは消える
 * - skipped: AI の提案を見送った、または「着なかった」と評価したもの（AI の好み学習に使う）
 */
export type OutfitStatus = 'adopted' | 'skipped';

export type OutfitContext = Record<string, string>;

export interface OutfitRecord {
  id: string;
  date: string; // yyyy-MM-dd
  context: OutfitContext;
  itemIds: string[];
  itemReasons: Record<string, string>;
  title: string | null;
  tips: string | null;
  tags: string[];
  status: OutfitStatus;
  rating: number | null; // 1〜3
  ratingNote: string | null;
  isFavorite: boolean;
  createdAt: string;
  items: ClothingItem[];
}

type Row = {
  id: string;
  date: string;
  context: string;
  item_ids: string;
  item_reasons: string;
  ai_title: string | null;
  ai_tips: string | null;
  ai_tags: string;
  status: string;
  rating: number | null;
  rating_note: string | null;
  is_favorite: number;
  created_at: string;
};

function parseObject(text: string): Record<string, string> {
  try {
    const v = JSON.parse(text);
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, string>) : {};
  } catch {
    return {};
  }
}

async function hydrate(db: SQLiteDatabase, rows: Row[]): Promise<OutfitRecord[]> {
  const parsed = rows.map((r) => ({ r, ids: parseJsonArray(r.item_ids) }));
  const all = await getItemsByIds(db, [...new Set(parsed.flatMap((p) => p.ids))]);
  const map = new Map(all.map((i) => [i.id, i]));
  return parsed.map(({ r, ids }) => ({
    id: r.id,
    date: r.date,
    context: parseObject(r.context),
    itemIds: ids,
    itemReasons: parseObject(r.item_reasons),
    title: r.ai_title,
    tips: r.ai_tips,
    tags: parseJsonArray(r.ai_tags),
    status: r.status === 'skipped' ? 'skipped' : 'adopted',
    rating: r.rating,
    ratingNote: r.rating_note,
    isFavorite: r.is_favorite === 1,
    createdAt: r.created_at,
    items: ids.map((id) => map.get(id)).filter((i): i is ClothingItem => !!i),
  }));
}

/** 着用回数と最終着用日を、記録から計算し直す（今日までの adopted だけを数える） */
async function recalcWorn(db: SQLiteDatabase, itemIds: string[]): Promise<void> {
  const today = ymd();
  for (const id of new Set(itemIds)) {
    const row = await db.getFirstAsync<{ n: number; last: string | null }>(
      `SELECT COUNT(*) AS n, MAX(h.date) AS last
         FROM outfit_histories h, json_each(h.item_ids) j
        WHERE j.value = ? AND h.status = 'adopted' AND h.deleted_at IS NULL AND h.date <= ?`,
      id,
      today,
    );
    await db.runAsync(
      'UPDATE items SET worn_count = ?, last_worn_at = ? WHERE id = ?',
      row?.n ?? 0,
      row?.last ?? null,
      id,
    );
  }
}

export type OutfitInput = {
  date: string;
  itemIds: string[];
  title?: string | null;
  tips?: string | null;
  tags?: string[];
  reasons?: Record<string, string>;
  context?: OutfitContext;
};

async function insert(db: SQLiteDatabase, input: OutfitInput, status: OutfitStatus): Promise<string> {
  const id = newId();
  const t = now();
  await db.runAsync(
    `INSERT INTO outfit_histories
       (id, date, context, item_ids, item_reasons, ai_title, ai_tips, ai_tags, status, worn_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.date,
    JSON.stringify(input.context ?? {}),
    JSON.stringify(input.itemIds),
    JSON.stringify(input.reasons ?? {}),
    input.title ?? null,
    input.tips ?? null,
    JSON.stringify(input.tags ?? []),
    status,
    status === 'adopted' && input.date <= ymd() ? t : null,
    t,
    t,
  );
  return id;
}

/** その日のコーデに決める。同じ日のコーデがあれば置き換える */
export async function adoptOutfit(db: SQLiteDatabase, input: OutfitInput): Promise<string> {
  const previous = await db.getAllAsync<{ id: string; item_ids: string }>(
    `SELECT id, item_ids FROM outfit_histories WHERE date = ? AND status = 'adopted' AND deleted_at IS NULL`,
    input.date,
  );
  let id = '';
  await db.withExclusiveTransactionAsync(async (txn) => {
    const t = now();
    for (const p of previous) {
      await txn.runAsync('UPDATE outfit_histories SET deleted_at = ?, updated_at = ? WHERE id = ?', t, t, p.id);
    }
    id = await insert(txn, input, 'adopted');
  });
  await recalcWorn(db, [...input.itemIds, ...previous.flatMap((p) => parseJsonArray(p.item_ids))]);
  return id;
}

/** AI の提案を見送ったことを記録する（次の提案で同じ傾向を避けるため） */
export async function recordSkipped(db: SQLiteDatabase, input: OutfitInput): Promise<void> {
  await insert(db, input, 'skipped');
}

export async function getOutfitForDate(db: SQLiteDatabase, date: string): Promise<OutfitRecord | null> {
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM outfit_histories
      WHERE date = ? AND status = 'adopted' AND deleted_at IS NULL
      ORDER BY created_at DESC LIMIT 1`,
    date,
  );
  return (await hydrate(db, rows))[0] ?? null;
}

/** 期間内の adopted コーデを日付ごとに返す */
export async function outfitsByDate(
  db: SQLiteDatabase,
  from: string,
  to: string,
): Promise<Record<string, OutfitRecord>> {
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM outfit_histories
      WHERE date BETWEEN ? AND ? AND status = 'adopted' AND deleted_at IS NULL
      ORDER BY created_at`,
    from,
    to,
  );
  const result: Record<string, OutfitRecord> = {};
  for (const o of await hydrate(db, rows)) result[o.date] = o;
  return result;
}

export type HistoryFilter = 'all' | 'favorite' | 'skipped';

export async function listHistory(db: SQLiteDatabase, filter: HistoryFilter, limit = 100): Promise<OutfitRecord[]> {
  const today = ymd();
  const where = {
    all: `status = 'adopted' AND date <= '${today}'`,
    favorite: `status = 'adopted' AND (is_favorite = 1 OR rating = 3)`,
    skipped: `status = 'skipped'`,
  }[filter];
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM outfit_histories WHERE deleted_at IS NULL AND ${where}
      ORDER BY date DESC, created_at DESC LIMIT ?`,
    limit,
  );
  return hydrate(db, rows);
}

/**
 * 評価する。rating 0 は「着なかった」で、着用回数から外して skipped にする。
 */
export async function rateOutfit(db: SQLiteDatabase, id: string, rating: 0 | 1 | 2 | 3, note?: string): Promise<void> {
  const row = await db.getFirstAsync<{ item_ids: string }>('SELECT item_ids FROM outfit_histories WHERE id = ?', id);
  if (rating === 0) {
    await db.runAsync(
      `UPDATE outfit_histories SET status = 'skipped', rating = NULL, rating_note = ?, updated_at = ? WHERE id = ?`,
      note || '着なかった',
      now(),
      id,
    );
    await recalcWorn(db, parseJsonArray(row?.item_ids));
    return;
  }
  await db.runAsync(
    'UPDATE outfit_histories SET rating = ?, rating_note = ?, updated_at = ? WHERE id = ?',
    rating,
    note || null,
    now(),
    id,
  );
}

export async function toggleFavorite(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(
    'UPDATE outfit_histories SET is_favorite = 1 - is_favorite, updated_at = ? WHERE id = ?',
    now(),
    id,
  );
}

export async function deleteOutfit(db: SQLiteDatabase, id: string): Promise<void> {
  const row = await db.getFirstAsync<{ item_ids: string }>('SELECT item_ids FROM outfit_histories WHERE id = ?', id);
  const t = now();
  await db.runAsync('UPDATE outfit_histories SET deleted_at = ?, updated_at = ? WHERE id = ?', t, t, id);
  await recalcWorn(db, parseJsonArray(row?.item_ids));
}

/** 昨日まで（3日以内）の未評価コーデ。ホームで「どうでしたか？」と聞く */
export async function findUnrated(db: SQLiteDatabase): Promise<OutfitRecord | null> {
  const today = ymd();
  const since = ymd(addDays(new Date(), -3));
  const rows = await db.getAllAsync<Row>(
    `SELECT h.* FROM outfit_histories h
      WHERE h.status = 'adopted' AND h.deleted_at IS NULL AND h.rating IS NULL
        AND h.date < ? AND h.date >= ?
        AND NOT EXISTS (SELECT 1 FROM kv WHERE kv.key = 'rateDismissed:' || h.id)
      ORDER BY h.date DESC LIMIT 1`,
    today,
    since,
  );
  return (await hydrate(db, rows))[0] ?? null;
}

export async function dismissRating(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(`INSERT OR REPLACE INTO kv (key, value) VALUES (?, '1')`, `rateDismissed:${id}`);
}

export type WeeklyStats = {
  wornDays: number;
  topCategory: string | null;
  utilizationRate: number; // %
  avgRating: number | null;
};

/** 今週（月曜はじまり）のまとめ */
export async function weeklyStats(db: SQLiteDatabase): Promise<WeeklyStats> {
  const start = ymd(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const today = ymd();
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM outfit_histories
      WHERE status = 'adopted' AND deleted_at IS NULL AND date BETWEEN ? AND ?`,
    start,
    today,
  );
  const week = await hydrate(db, rows);

  const categoryCount: Partial<Record<Category, number>> = {};
  for (const item of new Map(week.flatMap((o) => o.items).map((i) => [i.id, i])).values()) {
    categoryCount[item.category] = (categoryCount[item.category] ?? 0) + 1;
  }
  const top = (Object.entries(categoryCount) as [Category, number][]).sort((a, b) => b[1] - a[1])[0]?.[0];

  const rated = week.filter((o) => o.rating != null);
  const totals = await db.getFirstAsync<{ total: number; worn: number }>(
    `SELECT COUNT(*) AS total, SUM(CASE WHEN worn_count > 0 THEN 1 ELSE 0 END) AS worn
       FROM items WHERE deleted_at IS NULL`,
  );
  const total = totals?.total ?? 0;
  return {
    wornDays: new Set(week.map((o) => o.date)).size,
    topCategory: top ? CATEGORY_LABEL[top] : null,
    utilizationRate: total > 0 ? Math.round(((totals?.worn ?? 0) / total) * 100) : 0,
    avgRating: rated.length
      ? Math.round((rated.reduce((s, o) => s + (o.rating ?? 0), 0) / rated.length) * 10) / 10
      : null,
  };
}

/** AI に渡す「好み」の要約。好評（★3）と、見送った・着なかったコーデの傾向 */
export async function preferenceSummary(db: SQLiteDatabase): Promise<{ liked: string[]; disliked: string[] }> {
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM outfit_histories WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 40`,
  );
  const describe = (r: Row) => [r.ai_title, ...parseJsonArray(r.ai_tags)].filter(Boolean).join('・');
  const liked = rows.filter((r) => r.rating === 3).map(describe).filter(Boolean).slice(0, 5);
  const disliked = rows
    .filter((r) => r.rating === 1 || r.status === 'skipped')
    .map(describe)
    .filter(Boolean)
    .slice(0, 5);
  return { liked, disliked };
}
