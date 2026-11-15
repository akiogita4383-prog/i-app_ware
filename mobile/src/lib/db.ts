import type { SQLiteDatabase } from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';
import type { Category } from './categories';

export const DB_NAME = 'ware.db';

/**
 * スキーマ定義。端末内 SQLite（Documents/SQLite/ware.db）に保存され、iCloud バックアップの対象になる。
 * 将来の複数端末同期に備えて、全テーブルを UUID + updated_at + deleted_at（論理削除）で持つ。
 * 変更するときは配列の末尾に追加する（既存の要素は書き換えない）。
 */
const MIGRATIONS: string[] = [
  `
  CREATE TABLE items (
    id            TEXT PRIMARY KEY NOT NULL,
    category      TEXT NOT NULL,
    name          TEXT NOT NULL,
    color         TEXT NOT NULL,
    material      TEXT,
    silhouette    TEXT,
    tags          TEXT NOT NULL DEFAULT '[]',
    image_file    TEXT,
    thumb_file    TEXT,
    ai_confidence INTEGER,
    worn_count    INTEGER NOT NULL DEFAULT 0,
    last_worn_at  TEXT,
    memo          TEXT,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    deleted_at    TEXT
  );
  CREATE INDEX items_category ON items (category) WHERE deleted_at IS NULL;

  CREATE TABLE outfit_histories (
    id           TEXT PRIMARY KEY NOT NULL,
    date         TEXT NOT NULL,
    context      TEXT NOT NULL DEFAULT '{}',
    item_ids     TEXT NOT NULL DEFAULT '[]',
    item_reasons TEXT NOT NULL DEFAULT '{}',
    ai_title     TEXT,
    ai_tips      TEXT,
    ai_tags      TEXT NOT NULL DEFAULT '[]',
    status       TEXT NOT NULL DEFAULT 'draft',
    rating       INTEGER,
    rating_note  TEXT,
    is_favorite  INTEGER NOT NULL DEFAULT 0,
    worn_at      TEXT,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL,
    deleted_at   TEXT
  );
  CREATE INDEX outfit_histories_date ON outfit_histories (date) WHERE deleted_at IS NULL;

  CREATE TABLE kv (
    key   TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
  // 2: カレンダーの予定、AI コーデ画像（Like）、着せ替えでの位置調整
  `
  ALTER TABLE items ADD COLUMN fit TEXT;

  CREATE TABLE events (
    id         TEXT PRIMARY KEY NOT NULL,
    title      TEXT NOT NULL,
    start_at   TEXT NOT NULL,
    end_at     TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );
  CREATE INDEX events_start ON events (start_at) WHERE deleted_at IS NULL;

  CREATE TABLE liked_images (
    id         TEXT PRIMARY KEY NOT NULL,
    image_file TEXT NOT NULL,
    label      TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );
  `,
];

export async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    const sql = MIGRATIONS[version];
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.execAsync(sql);
    });
    version += 1;
    await db.execAsync(`PRAGMA user_version = ${version}`);
  }
}

export const now = () => new Date().toISOString();

// ── key-value（設定・フラグ） ──────────────────────────────

export async function kvGet(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', key);
  return row?.value ?? null;
}

export async function kvSet(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value,
  );
}

// ── items（服） ────────────────────────────────────────────

export interface ClothingItem {
  id: string;
  category: Category;
  name: string;
  color: string;
  material: string | null;
  silhouette: string | null;
  tags: string[];
  imageFile: string | null;
  thumbFile: string | null;
  aiConfidence: number | null;
  wornCount: number;
  lastWornAt: string | null;
  memo: string | null;
  /** 着せ替え画面で調整した位置・大きさ（未調整なら null） */
  fit: Fit | null;
  createdAt: string;
  updatedAt: string;
}

/** 着せ替えの配置。x / y はアバター枠内の中心位置（%）、width は枠の幅に対する%、rotation は角度 */
export type Fit = { x: number; y: number; width: number; rotation: number };

export type ItemInput = {
  category: Category;
  name: string;
  color: string;
  material?: string | null;
  silhouette?: string | null;
  tags?: string[];
  memo?: string | null;
  aiConfidence?: number | null;
};

type ItemRow = {
  id: string;
  category: string;
  name: string;
  color: string;
  material: string | null;
  silhouette: string | null;
  tags: string;
  image_file: string | null;
  thumb_file: string | null;
  ai_confidence: number | null;
  worn_count: number;
  last_worn_at: string | null;
  memo: string | null;
  fit: string | null;
  created_at: string;
  updated_at: string;
};

export function parseJsonArray(text: string | null | undefined): string[] {
  if (!text) return [];
  try {
    const v = JSON.parse(text);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function toItem(r: ItemRow): ClothingItem {
  return {
    id: r.id,
    category: r.category as Category,
    name: r.name,
    color: r.color,
    material: r.material,
    silhouette: r.silhouette,
    tags: parseJsonArray(r.tags),
    imageFile: r.image_file,
    thumbFile: r.thumb_file,
    aiConfidence: r.ai_confidence,
    wornCount: r.worn_count,
    lastWornAt: r.last_worn_at,
    memo: r.memo,
    fit: parseFit(r.fit),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function parseFit(text: string | null): Fit | null {
  if (!text) return null;
  try {
    const v = JSON.parse(text) as Partial<Fit>;
    if ([v.x, v.y, v.width].every((n) => typeof n === 'number')) {
      return { x: v.x!, y: v.y!, width: v.width!, rotation: typeof v.rotation === 'number' ? v.rotation : 0 };
    }
  } catch {
    // 壊れていたら未調整扱い
  }
  return null;
}

export async function getItemsByIds(db: SQLiteDatabase, ids: string[]): Promise<ClothingItem[]> {
  if (ids.length === 0) return [];
  const rows = await db.getAllAsync<ItemRow>(
    `SELECT * FROM items WHERE deleted_at IS NULL AND id IN (${ids.map(() => '?').join(',')})`,
    ...ids,
  );
  const map = new Map(rows.map((r) => [r.id, toItem(r)]));
  return ids.map((id) => map.get(id)).filter((i): i is ClothingItem => !!i);
}

export async function setItemFit(db: SQLiteDatabase, id: string, fit: Fit | null): Promise<void> {
  await db.runAsync('UPDATE items SET fit = ?, updated_at = ? WHERE id = ?', fit ? JSON.stringify(fit) : null, now(), id);
}

export function newId(): string {
  return randomUUID();
}

export async function listItems(db: SQLiteDatabase, category?: Category): Promise<ClothingItem[]> {
  const rows = category
    ? await db.getAllAsync<ItemRow>(
        'SELECT * FROM items WHERE deleted_at IS NULL AND category = ? ORDER BY created_at DESC',
        category,
      )
    : await db.getAllAsync<ItemRow>(
        'SELECT * FROM items WHERE deleted_at IS NULL ORDER BY created_at DESC',
      );
  return rows.map(toItem);
}

export async function getItem(db: SQLiteDatabase, id: string): Promise<ClothingItem | null> {
  const row = await db.getFirstAsync<ItemRow>(
    'SELECT * FROM items WHERE id = ? AND deleted_at IS NULL',
    id,
  );
  return row ? toItem(row) : null;
}

export async function insertItem(
  db: SQLiteDatabase,
  input: ItemInput & { id?: string; imageFile?: string | null; thumbFile?: string | null },
): Promise<string> {
  const id = input.id ?? newId();
  const t = now();
  await db.runAsync(
    `INSERT INTO items
      (id, category, name, color, material, silhouette, tags, image_file, thumb_file,
       ai_confidence, memo, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.category,
    input.name,
    input.color,
    input.material ?? null,
    input.silhouette ?? null,
    JSON.stringify(input.tags ?? []),
    input.imageFile ?? null,
    input.thumbFile ?? null,
    input.aiConfidence ?? null,
    input.memo ?? null,
    t,
    t,
  );
  return id;
}

export async function updateItem(db: SQLiteDatabase, id: string, input: ItemInput): Promise<void> {
  await db.runAsync(
    `UPDATE items SET category = ?, name = ?, color = ?, material = ?, silhouette = ?,
       tags = ?, memo = ?, updated_at = ? WHERE id = ?`,
    input.category,
    input.name,
    input.color,
    input.material ?? null,
    input.silhouette ?? null,
    JSON.stringify(input.tags ?? []),
    input.memo ?? null,
    now(),
    id,
  );
}

/** 論理削除。画像ファイルは呼び出し側で消す */
export async function softDeleteItem(db: SQLiteDatabase, id: string): Promise<void> {
  const t = now();
  await db.runAsync(
    'UPDATE items SET deleted_at = ?, updated_at = ?, image_file = NULL, thumb_file = NULL WHERE id = ?',
    t,
    t,
    id,
  );
}

export async function countItems(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM items WHERE deleted_at IS NULL',
  );
  return row?.n ?? 0;
}
