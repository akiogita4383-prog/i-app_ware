// 服の写真を Claude で解析して、カテゴリ・名前・色などを返す。
// 写真はこの関数のメモリ上で扱うだけで、どこにも保存しない。
import { consumeQuota, requireUser } from '../_shared/auth.ts';
import { errorResponse, HttpError, json } from '../_shared/http.ts';
import { analyzeClothing } from './claude.ts';

const MEDIA_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
type MediaType = (typeof MEDIA_TYPES)[number];
const MAX_BASE64_LENGTH = 6_500_000; // 約 4.8MB（Claude の画像上限 5MB 未満）

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);
  try {
    const user = await requireUser(req);

    const body = await req.json().catch(() => null);
    const image: unknown = body?.image;
    const mediaType: unknown = body?.mediaType;
    if (typeof image !== 'string' || !image) throw new HttpError(400, '画像がありません');
    if (!MEDIA_TYPES.includes(mediaType as MediaType)) {
      throw new HttpError(400, 'JPEG / PNG / WebP の画像のみ対応しています');
    }
    if (image.length > MAX_BASE64_LENGTH) throw new HttpError(413, '画像が大きすぎます');

    await consumeQuota(user, 'analyze-item', { anonymous: 30, signedIn: 100 });
    const result = await analyzeClothing(image, mediaType as MediaType);
    return json(result);
  } catch (e) {
    return errorResponse(e, '画像の解析に失敗しました');
  }
});
