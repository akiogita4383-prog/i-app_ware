import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

/** 端末のローカル日付で 'yyyy-MM-dd'。コーデ履歴の日付はこの形で持つ */
export function ymd(d: Date = new Date()): string {
  return format(d, 'yyyy-MM-dd');
}

/** 'yyyy-MM-dd' をローカル時刻の 0:00 として Date にする */
export function fromYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function jaDate(d: Date, pattern = 'M月d日(E)'): string {
  return format(d, pattern, { locale: ja });
}

export function hm(iso: string): string {
  return format(new Date(iso), 'H:mm');
}
