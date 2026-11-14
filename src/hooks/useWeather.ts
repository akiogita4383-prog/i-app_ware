// hooks/useWeather.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import type { Coords, WeatherData } from "@/lib/weather";
import { TOKYO_COORDS } from "@/lib/weather";

async function getWeather(coords: Coords): Promise<WeatherData> {
  const params = new URLSearchParams({
    lat: String(coords.latitude),
    lon: String(coords.longitude),
  });
  const res = await fetch(`/api/weather?${params.toString()}`);
  if (!res.ok) {
    throw new Error("天気の取得に失敗しました");
  }
  return res.json();
}

/**
 * 指定座標の天気を取得する。coords を省略すると東京を表示。
 * 座標が変わると自動で再取得する（位置情報ボタンと組み合わせて使う）。
 */
export function useWeather(coords: Coords = TOKYO_COORDS) {
  return useQuery({
    queryKey: ["weather", coords.latitude, coords.longitude],
    queryFn: () => getWeather(coords),
    staleTime: 1000 * 60 * 10, // 10分
    refetchOnWindowFocus: false,
  });
}
