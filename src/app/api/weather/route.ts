// app/api/weather/route.ts
// GET /api/weather?lat=35.6762&lon=139.6503
// Open-Meteo をサーバー側でプロキシし、整形済みの天気データを返す。
// キーが不要なので環境変数の設定も不要。

import { NextRequest, NextResponse } from "next/server";
import { fetchWeather, TOKYO_COORDS } from "@/lib/weather";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lon = parseFloat(searchParams.get("lon") ?? "");

  const coords = {
    latitude: Number.isFinite(lat) ? lat : TOKYO_COORDS.latitude,
    longitude: Number.isFinite(lon) ? lon : TOKYO_COORDS.longitude,
  };

  try {
    const data = await fetchWeather(coords);
    return NextResponse.json(data, {
      headers: {
        // CDN / ブラウザに10分キャッシュさせる
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800",
      },
    });
  } catch (err) {
    console.error("[/api/weather]", err);
    return NextResponse.json({ error: "天気の取得に失敗しました" }, { status: 502 });
  }
}
