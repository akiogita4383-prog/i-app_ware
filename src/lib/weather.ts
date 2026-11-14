// lib/weather.ts
// Open-Meteo（APIキー不要・無料）を使うための型とユーティリティ。
// https://open-meteo.com/  ※緯度・経度を渡すだけなので位置情報と相性が良い。

/** 東京（千代田区付近）の座標をデフォルトに使う。 */
export const TOKYO_COORDS = { latitude: 35.6762, longitude: 139.6503 } as const;

export type Coords = {
  latitude: number;
  longitude: number;
};

/** API ルートが返す整形済みの天気データ。 */
export type WeatherData = {
  latitude: number;
  longitude: number;
  /** 観測時刻（ISO文字列） */
  time: string;
  isDay: boolean;
  temperature: number; // ℃
  apparentTemperature: number; // 体感温度 ℃
  humidity: number; // %
  windSpeed: number; // km/h
  precipitation: number; // mm
  weatherCode: number; // WMO weather code
  daily: {
    weatherCode: number;
    tempMax: number;
    tempMin: number;
    precipitationProbabilityMax: number; // %
  };
};

/** WMO weather code → 日本語の説明と絵文字アイコン。 */
export function describeWeatherCode(code: number, isDay = true): { label: string; icon: string } {
  const sun = isDay ? "☀️" : "🌙";
  const partly = isDay ? "🌤️" : "☁️";
  switch (true) {
    case code === 0:
      return { label: "快晴", icon: sun };
    case code === 1:
      return { label: "晴れ", icon: partly };
    case code === 2:
      return { label: "一部曇り", icon: "⛅" };
    case code === 3:
      return { label: "曇り", icon: "☁️" };
    case code === 45 || code === 48:
      return { label: "霧", icon: "🌫️" };
    case code >= 51 && code <= 55:
      return { label: "霧雨", icon: "🌦️" };
    case code === 56 || code === 57:
      return { label: "着氷性の霧雨", icon: "🌧️" };
    case code >= 61 && code <= 65:
      return { label: "雨", icon: "🌧️" };
    case code === 66 || code === 67:
      return { label: "着氷性の雨", icon: "🌧️" };
    case code >= 71 && code <= 75:
      return { label: "雪", icon: "❄️" };
    case code === 77:
      return { label: "霧雪", icon: "🌨️" };
    case code >= 80 && code <= 82:
      return { label: "にわか雨", icon: "🌦️" };
    case code === 85 || code === 86:
      return { label: "にわか雪", icon: "🌨️" };
    case code === 95:
      return { label: "雷雨", icon: "⛈️" };
    case code === 96 || code === 99:
      return { label: "雹を伴う雷雨", icon: "⛈️" };
    default:
      return { label: "不明", icon: "❓" };
  }
}

/** Open-Meteo の生レスポンス（必要部分のみ）。 */
type OpenMeteoResponse = {
  latitude: number;
  longitude: number;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
  };
};

/**
 * Open-Meteo から天気を取得して整形する。
 * サーバー（API ルート）からもブラウザからも呼べる（Open-Meteo は CORS 許可済み）。
 */
export async function fetchWeather(coords: Coords): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(coords.latitude),
    longitude: String(coords.longitude),
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "auto", // 位置情報に応じてタイムゾーンを自動設定
    forecast_days: "1",
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const res = await fetch(url, { next: { revalidate: 600 } }); // 10分キャッシュ（API ルート経由時）
  if (!res.ok) {
    throw new Error(`Open-Meteo request failed: ${res.status}`);
  }
  const json = (await res.json()) as OpenMeteoResponse;

  return {
    latitude: json.latitude,
    longitude: json.longitude,
    time: json.current.time,
    isDay: json.current.is_day === 1,
    temperature: json.current.temperature_2m,
    apparentTemperature: json.current.apparent_temperature,
    humidity: json.current.relative_humidity_2m,
    windSpeed: json.current.wind_speed_10m,
    precipitation: json.current.precipitation,
    weatherCode: json.current.weather_code,
    daily: {
      weatherCode: json.daily.weather_code[0],
      tempMax: json.daily.temperature_2m_max[0],
      tempMin: json.daily.temperature_2m_min[0],
      precipitationProbabilityMax: json.daily.precipitation_probability_max[0],
    },
  };
}
