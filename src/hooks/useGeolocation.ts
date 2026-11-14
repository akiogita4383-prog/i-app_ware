// hooks/useGeolocation.ts
"use client";

import { useCallback, useState } from "react";
import type { Coords } from "@/lib/weather";

type GeolocationState = {
  coords: Coords | null;
  loading: boolean;
  error: string | null;
};

/**
 * ブラウザの Geolocation API をラップしたフック。
 * request() を呼ぶと現在地の座標を取得する（ユーザーの許可が必要）。
 */
export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    coords: null,
    loading: false,
    error: null,
  });

  const request = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setState({ coords: null, loading: false, error: "この端末では位置情報を利用できません" });
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          coords: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          },
          loading: false,
          error: null,
        });
      },
      (err) => {
        const message =
          err.code === err.PERMISSION_DENIED
            ? "位置情報の利用が許可されませんでした"
            : "位置情報を取得できませんでした";
        setState({ coords: null, loading: false, error: message });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 1000 * 60 * 5 }
    );
  }, []);

  return { ...state, request };
}
