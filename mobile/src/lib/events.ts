import type { SQLiteDatabase } from 'expo-sqlite';
import { ymd } from './dates';
import { newId, now } from './db';

export interface CalendarEvent {
  id: string;
  title: string;
  startAt: string; // ISO
  endAt: string; // ISO
}

type Row = { id: string; title: string; start_at: string; end_at: string };

const toEvent = (r: Row): CalendarEvent => ({ id: r.id, title: r.title, startAt: r.start_at, endAt: r.end_at });

/** from〜to（どちらも yyyy-MM-dd、ローカル日付）の予定を、日付ごとにまとめて返す */
export async function eventsByDate(
  db: SQLiteDatabase,
  from: string,
  to: string,
): Promise<Record<string, CalendarEvent[]>> {
  // start_at は ISO（UTC）なので、前後1日広めに取ってからローカル日付で振り分ける
  const rows = await db.getAllAsync<Row>(
    `SELECT id, title, start_at, end_at FROM events
      WHERE deleted_at IS NULL AND start_at >= date(?, '-1 day') AND start_at < date(?, '+2 day')
      ORDER BY start_at`,
    from,
    to,
  );
  const result: Record<string, CalendarEvent[]> = {};
  for (const e of rows.map(toEvent)) {
    const key = ymd(new Date(e.startAt));
    if (key < from || key > to) continue;
    (result[key] ??= []).push(e);
  }
  return result;
}

export async function addEvent(db: SQLiteDatabase, title: string, startAt: Date, endAt: Date): Promise<void> {
  const t = now();
  await db.runAsync(
    `INSERT INTO events (id, title, start_at, end_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
    newId(),
    title,
    startAt.toISOString(),
    endAt.toISOString(),
    t,
    t,
  );
}

export async function deleteEvent(db: SQLiteDatabase, id: string): Promise<void> {
  const t = now();
  await db.runAsync('UPDATE events SET deleted_at = ?, updated_at = ? WHERE id = ?', t, t, id);
}
