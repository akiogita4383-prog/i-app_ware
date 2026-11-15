import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

/**
 * 天気は Open-Meteo（API キー不要・無料）から端末が直接取得する。
 * 位置情報は「おおよそ」で十分なので、許可がなければ東京の天気を使う。
 */
export const TOKYO = { latitude: 35.6762, longitude: 139.6503 };

export type Weather = {
  isDay: boolean;
  temperature: number;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipProb: number;
  placeLabel: string;
};

export function describeWeatherCode(code: number, isDay = true): { label: string; icon: string } {
  const sun = isDay ? '☀️' : '🌙';
  if (code === 0) return { label: '快晴', icon: sun };
  if (code === 1) return { label: '晴れ', icon: isDay ? '🌤️' : '☁️' };
  if (code === 2) return { label: '一部曇り', icon: '⛅' };
  if (code === 3) return { label: '曇り', icon: '☁️' };
  if (code === 45 || code === 48) return { label: '霧', icon: '🌫️' };
  if (code >= 51 && code <= 57) return { label: '霧雨', icon: '🌦️' };
  if (code >= 61 && code <= 67) return { label: '雨', icon: '🌧️' };
  if (code >= 71 && code <= 77) return { label: '雪', icon: '❄️' };
  if (code >= 80 && code <= 82) return { label: 'にわか雨', icon: '🌦️' };
  if (code === 85 || code === 86) return { label: 'にわか雪', icon: '🌨️' };
  if (code >= 95) return { label: '雷雨', icon: '⛈️' };
  return { label: '不明', icon: '❓' };
}

type OpenMeteo = {
  current: { temperature_2m: number; is_day: number; weather_code: number };
  daily: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
  };
};

async function fetchWeather(coords: { latitude: number; longitude: number }, placeLabel: string): Promise<Weather> {
  const params = new URLSearchParams({
    latitude: coords.latitude.toFixed(2),
    longitude: coords.longitude.toFixed(2),
    current: 'temperature_2m,is_day,weather_code',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: '1',
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`天気を取得できませんでした（${res.status}）`);
  const json = (await res.json()) as OpenMeteo;
  return {
    isDay: json.current.is_day === 1,
    temperature: json.current.temperature_2m,
    weatherCode: json.current.weather_code,
    tempMax: json.daily.temperature_2m_max[0],
    tempMin: json.daily.temperature_2m_min[0],
    precipProb: json.daily.precipitation_probability_max[0] ?? 0,
    placeLabel,
  };
}

async function currentCoords(): Promise<{ coords: { latitude: number; longitude: number }; label: string }> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.granted) {
      const pos =
        (await Location.getLastKnownPositionAsync()) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest }));
      if (pos) return { coords: pos.coords, label: '現在地' };
    }
  } catch {
    // 位置情報が使えなければ東京
  }
  return { coords: TOKYO, label: '東京' };
}

let cache: { at: number; value: Weather } | null = null;
const TTL = 10 * 60 * 1000;

/** 10分以内に取った天気があればそれを返す */
async function getWeather(force: boolean): Promise<Weather> {
  if (!force && cache && Date.now() - cache.at < TTL) return cache.value;
  const { coords, label } = await currentCoords();
  const value = await fetchWeather(coords, label);
  cache = { at: Date.now(), value };
  return value;
}

export function useWeather() {
  const [weather, setWeather] = useState<Weather | null>(cache?.value ?? null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (force = false) => {
    try {
      const value = await getWeather(force);
      setWeather(value);
      setError(null);
      return value;
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    getWeather(false)
      .then((value) => !cancelled && setWeather(value))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  return { weather, error, reload };
}
