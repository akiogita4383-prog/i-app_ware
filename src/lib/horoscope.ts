// lib/horoscope.ts
// 外部APIに依存しない星座占いロジック。
// 「生年月日 → 星座判定」と「星座 + 日付をシードにした決定論的な運勢生成」で構成。
// 同じ星座・同じ日付なら常に同じ結果になる（リロードしても変わらない）。

import { format } from "date-fns";

export type ZodiacSign = {
  /** 内部キー（シードや画像名に使う英語名） */
  key: string;
  /** 日本語表示名 */
  name: string;
  /** 星座記号 */
  symbol: string;
  /** 期間の表示用ラベル */
  range: string;
};

export const ZODIAC_SIGNS: ZodiacSign[] = [
  { key: "aries", name: "牡羊座", symbol: "♈", range: "3/21 - 4/19" },
  { key: "taurus", name: "牡牛座", symbol: "♉", range: "4/20 - 5/20" },
  { key: "gemini", name: "双子座", symbol: "♊", range: "5/21 - 6/21" },
  { key: "cancer", name: "蟹座", symbol: "♋", range: "6/22 - 7/22" },
  { key: "leo", name: "獅子座", symbol: "♌", range: "7/23 - 8/22" },
  { key: "virgo", name: "乙女座", symbol: "♍", range: "8/23 - 9/22" },
  { key: "libra", name: "天秤座", symbol: "♎", range: "9/23 - 10/23" },
  { key: "scorpio", name: "蠍座", symbol: "♏", range: "10/24 - 11/22" },
  { key: "sagittarius", name: "射手座", symbol: "♐", range: "11/23 - 12/21" },
  { key: "capricorn", name: "山羊座", symbol: "♑", range: "12/22 - 1/19" },
  { key: "aquarius", name: "水瓶座", symbol: "♒", range: "1/20 - 2/18" },
  { key: "pisces", name: "魚座", symbol: "♓", range: "2/19 - 3/20" },
];

/** 生年月日（Date）から星座を判定する。 */
export function getZodiacSign(date: Date): ZodiacSign {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // 月日を「通し番号(MMDD)」にして範囲判定するとシンプル。
  const md = month * 100 + day;
  if (md >= 321 && md <= 419) return findSign("aries");
  if (md >= 420 && md <= 520) return findSign("taurus");
  if (md >= 521 && md <= 621) return findSign("gemini");
  if (md >= 622 && md <= 722) return findSign("cancer");
  if (md >= 723 && md <= 822) return findSign("leo");
  if (md >= 823 && md <= 922) return findSign("virgo");
  if (md >= 923 && md <= 1023) return findSign("libra");
  if (md >= 1024 && md <= 1122) return findSign("scorpio");
  if (md >= 1123 && md <= 1221) return findSign("sagittarius");
  if (md >= 1222 || md <= 119) return findSign("capricorn");
  if (md >= 120 && md <= 218) return findSign("aquarius");
  return findSign("pisces"); // 2/19 - 3/20
}

function findSign(key: string): ZodiacSign {
  return ZODIAC_SIGNS.find((s) => s.key === key)!;
}

// ---- 決定論的な疑似乱数（シードから安定した値を作る）----

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** シード文字列から 0〜1 の乱数を返す関数を作る。 */
function seededRandom(seed: string): () => number {
  const seedFn = xmur3(seed);
  return mulberry32(seedFn());
}

// ---- 運勢のコンテンツ（自由に編集・追加してください）----

const MESSAGES: string[] = [
  "新しい一歩を踏み出すのに最適な日。直感を信じて動くと道が開けます。",
  "周囲との調和がカギ。聞き役に回ることで思わぬ幸運が舞い込みます。",
  "ペースを落として丁寧に。焦らず積み重ねた努力が実を結びます。",
  "好奇心が冴える一日。気になっていたことに手を伸ばしてみましょう。",
  "感謝を言葉にすると運気が巡ります。身近な人への一言を大切に。",
  "選択を迫られたら、心がワクワクする方を選んで正解。",
  "整理整頓が運気アップの近道。身の回りを片付けると気持ちも軽くなります。",
  "誰かのサポートが追い風に。素直に頼ることで前進できます。",
  "ひらめきが冴える日。メモを取る習慣が幸運を引き寄せます。",
  "無理は禁物。休息を取ることが明日の活力につながります。",
  "笑顔がお守りに。明るく振る舞うほど良い縁が集まってきます。",
  "じっくり考える時間を持つと吉。答えはあなたの中にあります。",
];

const LUCKY_COLORS = [
  "ゴールド", "スカイブルー", "ラベンダー", "コーラルピンク", "エメラルド",
  "アイボリー", "ターコイズ", "サニーイエロー", "ロイヤルパープル", "ミントグリーン",
];

const LUCKY_ITEMS = [
  "お気に入りのマグカップ", "新しいペン", "観葉植物", "手書きのメモ帳", "アロマキャンドル",
  "ヘッドフォン", "小さな鏡", "ハーブティー", "シルバーアクセサリー", "ポストカード",
];

const CATEGORIES = ["恋愛運", "仕事運", "金運", "健康運"] as const;
export type FortuneCategory = (typeof CATEGORIES)[number];

export type DailyFortune = {
  sign: ZodiacSign;
  dateLabel: string; // 例: 2026-05-31
  rank: number; // 1〜12（1が最も良い）
  overall: number; // 総合運の星 1〜5
  message: string;
  luckyColor: string;
  luckyItem: string;
  luckyNumber: number; // 1〜9
  scores: Record<FortuneCategory, number>; // 各 1〜5
};

/**
 * 指定した星座・日付の「今日の運勢」を生成する。
 * 同じ (sign, date) なら必ず同じ結果を返す。
 */
export function getDailyFortune(sign: ZodiacSign, date: Date = new Date()): DailyFortune {
  const dateLabel = format(date, "yyyy-MM-dd");
  const rand = seededRandom(`${sign.key}-${dateLabel}`);

  const overall = 1 + Math.floor(rand() * 5); // 1〜5
  const message = MESSAGES[Math.floor(rand() * MESSAGES.length)];
  const luckyColor = LUCKY_COLORS[Math.floor(rand() * LUCKY_COLORS.length)];
  const luckyItem = LUCKY_ITEMS[Math.floor(rand() * LUCKY_ITEMS.length)];
  const luckyNumber = 1 + Math.floor(rand() * 9); // 1〜9

  const scores = CATEGORIES.reduce((acc, c) => {
    acc[c] = 1 + Math.floor(rand() * 5);
    return acc;
  }, {} as Record<FortuneCategory, number>);

  // ランキングは総合運とランダム要素から擬似的に算出（1〜12）
  const rank = 1 + Math.floor((1 - overall / 6 + rand() * 0.4) * 11);

  return {
    sign,
    dateLabel,
    rank: Math.min(12, Math.max(1, rank)),
    overall,
    message,
    luckyColor,
    luckyItem,
    luckyNumber,
    scores,
  };
}

export { CATEGORIES };
