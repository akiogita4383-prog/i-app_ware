import { requireOptionalNativeModule } from 'expo';

export type LiftResult = { uri: string; width: number; height: number };

type SubjectLifterNative = {
  isSupported(): boolean;
  liftAsync(uri: string): Promise<LiftResult>;
};

// Expo Go や iOS 以外ではネイティブモジュールが無いので null になる
const native = requireOptionalNativeModule<SubjectLifterNative>('SubjectLifter');

/** この端末で背景除去が使えるか（開発ビルド/本番ビルド かつ iOS 17 以上） */
export function isLiftSupported(): boolean {
  return native?.isSupported() ?? false;
}

/** 写真から服を切り抜く。使えない端末・失敗時は null を返す（元画像のまま使う） */
export async function liftSubject(uri: string): Promise<LiftResult | null> {
  if (!native || !native.isSupported()) return null;
  try {
    return await native.liftAsync(uri);
  } catch (e) {
    console.warn('[subject-lifter]', e);
    return null;
  }
}
