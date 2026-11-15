import type { SQLiteDatabase } from 'expo-sqlite';
import { Directory, File, Paths } from 'expo-file-system';
import { newId, now } from './db';

/** AI が生成したコーデ画像（Like）。画像は Documents/liked に置き、DB にはファイル名だけ持つ */
const DIR = 'liked';

export interface LikedImage {
  id: string;
  uri: string;
  label: string | null;
  createdAt: string;
}

export function likedUri(file: string): string {
  return new File(Paths.document, DIR, file).uri;
}

export async function saveLiked(db: SQLiteDatabase, base64Png: string, label: string | null): Promise<void> {
  const dir = new Directory(Paths.document, DIR);
  if (!dir.exists) dir.create({ intermediates: true });
  const id = newId();
  const fileName = `${id}.png`;
  new File(dir, fileName).write(base64Png, { encoding: 'base64' });
  const t = now();
  await db.runAsync(
    'INSERT INTO liked_images (id, image_file, label, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    id,
    fileName,
    label,
    t,
    t,
  );
}

export async function listLiked(db: SQLiteDatabase): Promise<LikedImage[]> {
  const rows = await db.getAllAsync<{ id: string; image_file: string; label: string | null; created_at: string }>(
    'SELECT id, image_file, label, created_at FROM liked_images WHERE deleted_at IS NULL ORDER BY created_at DESC',
  );
  return rows.map((r) => ({ id: r.id, uri: likedUri(r.image_file), label: r.label, createdAt: r.created_at }));
}

export async function deleteLiked(db: SQLiteDatabase, id: string): Promise<void> {
  const row = await db.getFirstAsync<{ image_file: string }>('SELECT image_file FROM liked_images WHERE id = ?', id);
  const t = now();
  await db.runAsync('UPDATE liked_images SET deleted_at = ?, updated_at = ? WHERE id = ?', t, t, id);
  if (row) {
    try {
      const f = new File(Paths.document, DIR, row.image_file);
      if (f.exists) f.delete();
    } catch (e) {
      console.warn('[liked] delete failed', e);
    }
  }
}
