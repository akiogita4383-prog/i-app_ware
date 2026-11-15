import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * 服の画像は Documents/images（本体）と Documents/thumbs（一覧用）に保存する。
 * iOS ではアプリ更新のたびにコンテナの絶対パスが変わるので、DB にはファイル名だけを持ち、
 * 表示するときに毎回 URI を組み立てる。
 */
const IMAGE_DIR = 'images';
const THUMB_DIR = 'thumbs';
const MAX_SIDE = 1024; // AI解析・保存用の長辺
const THUMB_SIDE = 400;

function ensureDir(name: string): Directory {
  const dir = new Directory(Paths.document, name);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

export function itemImageUri(file: string | null | undefined): string | null {
  return file ? new File(Paths.document, IMAGE_DIR, file).uri : null;
}

export function itemThumbUri(file: string | null | undefined): string | null {
  return file ? new File(Paths.document, THUMB_DIR, file).uri : null;
}

function fitSize(width: number, height: number, maxSide: number) {
  if (Math.max(width, height) <= maxSide) return null;
  return width >= height ? { width: maxSide } : { height: maxSide };
}

export type PreparedImage = {
  uri: string; // キャッシュ上の一時ファイル
  base64: string;
  mediaType: 'image/png' | 'image/jpeg';
  transparent: boolean;
};

/**
 * 撮影/選択した画像を長辺1024pxに縮小し、AI に送れる base64 も作る。
 * 背景除去済み（透過）なら PNG、そうでなければ容量の小さい JPEG。
 */
export async function prepareImage(
  uri: string,
  width: number,
  height: number,
  transparent: boolean,
): Promise<PreparedImage> {
  const ctx = ImageManipulator.manipulate(uri);
  const size = fitSize(width, height, MAX_SIDE);
  if (size) ctx.resize(size);
  const ref = await ctx.renderAsync();
  const saved = await ref.saveAsync({
    format: transparent ? SaveFormat.PNG : SaveFormat.JPEG,
    compress: transparent ? 1 : 0.85,
    base64: true,
  });
  return {
    uri: saved.uri,
    base64: saved.base64 ?? '',
    mediaType: transparent ? 'image/png' : 'image/jpeg',
    transparent,
  };
}

/** 一時ファイルを本保存し、サムネイルも作る。返り値は DB に入れるファイル名 */
export async function storeItemImage(
  id: string,
  prepared: Pick<PreparedImage, 'uri' | 'transparent'>,
): Promise<{ imageFile: string; thumbFile: string }> {
  const ext = prepared.transparent ? 'png' : 'jpg';
  const fileName = `${id}.${ext}`;

  const dest = new File(ensureDir(IMAGE_DIR), fileName);
  if (dest.exists) dest.delete();
  new File(prepared.uri).copySync(dest);

  const ctx = ImageManipulator.manipulate(dest.uri);
  ctx.resize({ width: THUMB_SIDE });
  const ref = await ctx.renderAsync();
  const thumb = await ref.saveAsync({
    format: prepared.transparent ? SaveFormat.PNG : SaveFormat.JPEG,
    compress: 0.8,
  });
  const thumbDest = new File(ensureDir(THUMB_DIR), fileName);
  if (thumbDest.exists) thumbDest.delete();
  new File(thumb.uri).moveSync(thumbDest);

  return { imageFile: fileName, thumbFile: fileName };
}

export function deleteItemImages(imageFile: string | null, thumbFile: string | null): void {
  for (const [dir, name] of [
    [IMAGE_DIR, imageFile],
    [THUMB_DIR, thumbFile],
  ] as const) {
    if (!name) continue;
    try {
      const f = new File(Paths.document, dir, name);
      if (f.exists) f.delete();
    } catch (e) {
      console.warn('[images] delete failed', e);
    }
  }
}
