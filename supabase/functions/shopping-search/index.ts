// 手持ちの服に合うアイテムを探す。AI が検索キーワードを考え、Yahoo!ショッピングで商品を探す。
// YAHOO_SHOPPING_APP_ID が未設定なら、キーワードだけを返す（アプリ側で検索リンクを出す）。
import { consumeQuota, requireUser } from '../_shared/auth.ts';
import { askHaikuJson } from '../_shared/claude.ts';
import { errorResponse, HttpError, json } from '../_shared/http.ts';

const SEARCH_CATEGORIES = {
  tops: { label: 'トップス', genreId: 36861 },
  bottoms: { label: 'ボトムス', genreId: 36913 },
  outer: { label: 'アウター', genreId: 37019 },
  shoes: { label: 'シューズ', genreId: 1729 },
  accessories: { label: 'バッグ・アクセサリー', genreId: 1591 },
} as const;
type SearchCategory = keyof typeof SEARCH_CATEGORIES;

const CATEGORY_LABEL: Record<string, string> = {
  tops: 'トップス', bottoms: 'ボトムス', outer: 'アウター', shoes: 'シューズ', accessories: 'アクセサリー', other: 'その他',
};

const TAXONOMY = `【カテゴリー（サブカテゴリー／詳細）】
トップス: Tシャツ、シャツ、ブラウス、ニット、カーディガン、スウェット、パーカー、ベスト、キャミソール
ボトムス: スカート（タイト／フレア／プリーツ／マーメイド）、パンツ（ストレート／ワイド／テーパード／スキニー／フレア）
ワンピース: Aライン／フレア／マーメイド／シャツ／タイト
アウター: ジャケット（テーラード／ノーカラー）、コート（トレンチ／チェスター／ダウン）、ブルゾン、ジレ
シューズ: パンプス（ヒール／フラット）、ローファー、スニーカー、サンダル、ブーツ（ショート／ロング）
バッグ・アクセサリー: ショルダーバッグ、トートバッグ、ネックレス、ピアス、帽子、ストール
【色】ホワイト・ブラック・グレー・ベージュ・ブラウン・ネイビー・ブルー・ピンク・レッド・グリーン・イエロー・パープル
【素材】ニット・デニム・レザー・レース・シフォン・サテン・ツイード・コーデュロイ・スウェット
【テイスト】きれいめ・カジュアル・フェミニン・モード・オフィス・ガーリー`;

const SYSTEM = `あなたはファッションのショッピングアシスタントです。
ユーザーが持っている服とコーデしやすいアイテムを探すため、Yahoo!ショッピングの検索キーワードを3つ考えます。
各キーワードは、次の分類から「サブカテゴリー名＋色＋素材やディテール」を組み合わせた具体的な語にしてください（例: フレアスカート ベージュ シフォン）。
3つはそれぞれ違う方向性（定番・きれいめ・トレンドなど）にしてください。

${TAXONOMY}`;

const SCHEMA = {
  type: 'object',
  properties: { keywords: { type: 'array', items: { type: 'string' } } },
  required: ['keywords'],
  additionalProperties: false,
};

type Product = { id: string; name: string; brand: string; price: number; imageUrl: string; url: string };

type YahooHit = {
  index: number;
  name: string;
  price: number;
  url: string;
  image?: { medium?: string };
  brand?: { name?: string };
};

async function searchYahoo(keyword: string, category: SearchCategory, appId: string): Promise<Product[]> {
  const url = new URL('https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch');
  url.searchParams.set('appid', appId);
  url.searchParams.set('query', keyword.includes('レディース') ? keyword : `レディース ${keyword}`);
  url.searchParams.set('genre_category_id', String(SEARCH_CATEGORIES[category].genreId));
  url.searchParams.set('results', '4');
  url.searchParams.set('in_stock', 'true');
  url.searchParams.set('sort', '-score');
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    console.warn('[shopping-search] yahoo', res.status);
    return [];
  }
  const data = (await res.json()) as { hits?: YahooHit[] };
  return (data.hits ?? [])
    .filter((h) => h.image?.medium && typeof h.price === 'number' && h.url)
    .map((h) => ({
      id: `${keyword}-${h.index}`,
      name: h.name,
      brand: h.brand?.name ?? '',
      price: h.price,
      imageUrl: h.image!.medium!,
      url: h.url,
    }));
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);
  try {
    const user = await requireUser(req);
    const body = await req.json().catch(() => null);

    const category = body?.category as SearchCategory;
    if (!(category in SEARCH_CATEGORIES)) throw new HttpError(400, '探したいアイテムを選んでください');
    const owned = (Array.isArray(body?.owned) ? body.owned : [])
      .slice(0, 6)
      .map((o: Record<string, unknown>) => {
        const name = typeof o?.name === 'string' ? o.name.slice(0, 60) : '';
        const color = typeof o?.color === 'string' ? o.color.slice(0, 30) : '';
        const cat = CATEGORY_LABEL[String(o?.category)] ?? 'その他';
        return name ? `- ${cat}: ${name}${color ? `（${color}）` : ''}` : null;
      })
      .filter(Boolean) as string[];
    const colors = (Array.isArray(body?.personalColors) ? body.personalColors : [])
      .filter((c: unknown): c is string => typeof c === 'string')
      .slice(0, 10)
      .map((c: string) => c.slice(0, 20));

    await consumeQuota(user, 'shopping-search', { anonymous: 20, signedIn: 50 },
      '今日のショッピング検索の上限に達しました。明日また試してください');

    const prompt = [
      `ユーザーの持っているアイテム:\n${owned.join('\n') || '（指定なし）'}`,
      `探したいカテゴリ: ${SEARCH_CATEGORIES[category].label}`,
      colors.length > 0 ? `好きな色（パーソナルカラー）: ${colors.join('・')}。できるだけキーワードに反映してください。` : '',
    ].filter(Boolean).join('\n\n');

    const { keywords } = await askHaikuJson<{ keywords: string[] }>({
      system: SYSTEM,
      user: prompt,
      schema: SCHEMA,
      refusalMessage: 'この内容では検索キーワードを作れませんでした',
      maxTokens: 2000,
    });
    const top = keywords.map((k) => k.trim().slice(0, 40)).filter(Boolean).slice(0, 3);

    const appId = Deno.env.get('YAHOO_SHOPPING_APP_ID')?.trim();
    const groups = await Promise.all(
      top.map(async (keyword) => ({
        keyword,
        searchUrl: `https://shopping.yahoo.co.jp/search?p=${encodeURIComponent(keyword)}`,
        products: appId ? await searchYahoo(keyword, category, appId).catch(() => []) : [],
      })),
    );
    return json({ groups, source: appId ? 'yahoo' : 'keywords' });
  } catch (e) {
    return errorResponse(e, 'アイテムの検索に失敗しました');
  }
});
