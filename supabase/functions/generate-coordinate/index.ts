// アバターと服の画像から、コーデを着たイラストを AI（OpenAI gpt-image-1）で生成する。
// 画像はこの関数のメモリ上で扱うだけで、どこにも保存しない。OPENAI_API_KEY が未設定なら 503。
import { consumeQuota, requireUser } from '../_shared/auth.ts';
import { errorResponse, HttpError, json } from '../_shared/http.ts';

const CATEGORY_LABEL: Record<string, string> = {
  tops: 'トップス', bottoms: 'ボトムス', outer: 'アウター', shoes: '靴', accessories: 'アクセサリー', other: '小物',
};
const MAX_BASE64 = 3_000_000; // 1枚あたり約2.2MB
// 商品画像はサーバーから取りに行くので、Yahoo!ショッピングの画像サーバーだけに限る
const ALLOWED_IMAGE_HOST = /(^|\.)yimg\.jp$/;

type ItemInput = { name: string; category: string; image?: string; mediaType?: string; imageUrl?: string };

function base64ToBlob(base64: string, type: string): Blob {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

async function fetchProductImage(url: string): Promise<Blob | null> {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' || !ALLOWED_IMAGE_HOST.test(u.hostname)) return null;
    const res = await fetch(u, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const type = (res.headers.get('content-type') ?? '').split(';')[0].trim();
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) return null;
    const blob = await res.blob();
    return blob.size < 4_000_000 ? new Blob([blob], { type }) : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);
  try {
    const user = await requireUser(req);
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) throw new HttpError(503, 'AI イラスト生成はまだ準備中です');

    const body = await req.json().catch(() => null);
    const avatar: unknown = body?.avatar;
    if (typeof avatar !== 'string' || !avatar || avatar.length > MAX_BASE64) {
      throw new HttpError(400, 'アバター画像がありません');
    }
    const items: ItemInput[] = (Array.isArray(body?.items) ? body.items : []).slice(0, 6);
    if (items.length === 0) throw new HttpError(400, 'アイテムを選んでください');

    await consumeQuota(user, 'generate-coordinate', { anonymous: 3, signedIn: 10 },
      '今日の AI イラスト生成の上限に達しました。明日また試してください');

    const form = new FormData();
    form.append('image[]', base64ToBlob(avatar, 'image/jpeg'), 'model.jpg');
    const described: string[] = [];
    for (const [i, item] of items.entries()) {
      const name = String(item?.name ?? '').slice(0, 60);
      const label = CATEGORY_LABEL[String(item?.category)] ?? '服';
      if (name) described.push(`${label}「${name}」`);
      let blob: Blob | null = null;
      if (typeof item?.image === 'string' && item.image.length <= MAX_BASE64) {
        const type = item.mediaType === 'image/png' ? 'image/png' : 'image/jpeg';
        blob = base64ToBlob(item.image, type);
      } else if (typeof item?.imageUrl === 'string') {
        blob = await fetchProductImage(item.imageUrl);
      }
      if (blob) form.append('image[]', blob, `item-${i}.${blob.type === 'image/png' ? 'png' : 'jpg'}`);
    }

    form.append('model', 'gpt-image-1');
    form.append('size', '1024x1536');
    form.append('quality', 'medium');
    form.append(
      'prompt',
      [
        '1枚目の画像の女性モデルに、2枚目以降の画像の服を着せたファッションイラストを作ってください。',
        `コーディネート: ${described.join('、')}。`,
        'モデルの顔立ち・髪型・ポーズはそのまま。服の色・柄・素材感・シルエットを忠実に再現する。',
        '全身が入る縦長構図、白またはクリーム色のシンプルな背景、ファッション誌風の上品なタッチ。',
      ].join(''),
    );

    const res = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(140_000),
    });
    if (!res.ok) {
      console.error('[generate-coordinate] openai', res.status, await res.text().catch(() => ''));
      if (res.status === 400) throw new HttpError(422, 'この組み合わせではイラストを作れませんでした');
      throw new Error(`openai ${res.status}`);
    }
    const data = (await res.json()) as { data?: { b64_json?: string }[] };
    const image = data.data?.[0]?.b64_json;
    if (!image) throw new Error('openai: no image');
    return json({ image });
  } catch (e) {
    return errorResponse(e, 'イラストの生成に失敗しました');
  }
});
