import { Asset } from 'expo-asset';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { Category } from './categories';
import type { Fit } from './db';
import avatarBob from '../../assets/avatars/bob.png';
import avatarDark from '../../assets/avatars/dark.jpg';
import avatarDefault from '../../assets/avatars/default.jpg';
import avatarStraight from '../../assets/avatars/straight.png';

export const AVATARS = [
  { id: 'default', label: 'ナチュラル', source: avatarDefault },
  { id: 'dark', label: 'ダークヘア', source: avatarDark },
  { id: 'straight', label: 'ストレート', source: avatarStraight },
  { id: 'bob', label: 'ボブ', source: avatarBob },
] as const;

/** アバター画像の縦横比（width / height）。素材は 1024x1536 と 1086x1448 が混在するので 3:4 の枠に収める */
export const AVATAR_ASPECT = 3 / 4;

export function avatarById(id: string) {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}

/** カテゴリごとの初期配置（アバターのポーズに合わせた目安） */
export const DEFAULT_FITS: Record<Category, Fit> = {
  tops: { x: 50, y: 33, width: 38, rotation: 0 },
  bottoms: { x: 50, y: 54, width: 36, rotation: 0 },
  outer: { x: 50, y: 32, width: 46, rotation: 0 },
  shoes: { x: 50, y: 90, width: 26, rotation: 0 },
  accessories: { x: 50, y: 21, width: 16, rotation: 0 },
  other: { x: 68, y: 60, width: 22, rotation: 0 },
};

/** 下のレイヤーから順に描く */
export const LAYER_ORDER: Category[] = ['bottoms', 'tops', 'outer', 'shoes', 'other', 'accessories'];

/** AI 画像生成に送るため、アバター画像を JPEG の base64 にする */
export async function avatarBase64(id: string): Promise<string> {
  const asset = Asset.fromModule(avatarById(id).source);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  const ctx = ImageManipulator.manipulate(uri);
  ctx.resize({ height: 1024 });
  const ref = await ctx.renderAsync();
  const saved = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.85, base64: true });
  return saved.base64 ?? '';
}
