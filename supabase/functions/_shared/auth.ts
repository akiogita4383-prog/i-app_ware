import { createClient } from 'npm:@supabase/supabase-js@2.109.0';
import { HttpError } from './http.ts';

export const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

export type AppUser = { id: string; isAnonymous: boolean };

export async function requireUser(req: Request): Promise<AppUser> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'サインインが必要です');
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'サインインが必要です');
  return { id: data.user.id, isAnonymous: data.user.is_anonymous ?? false };
}

/**
 * 1日（直近24時間）あたりの AI 利用回数を制限する。上限内なら利用を記録する。
 * Apple ID 連携ユーザーは匿名ユーザーより上限を高くしている。
 */
export async function consumeQuota(
  user: AppUser,
  fn: string,
  limits: { anonymous: number; signedIn: number },
): Promise<void> {
  const limit = user.isAnonymous ? limits.anonymous : limits.signedIn;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await admin
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('fn', fn)
    .gte('created_at', since);
  if (error) throw error;
  if ((count ?? 0) >= limit) {
    throw new HttpError(429, '今日の AI 解析の上限に達しました。明日また試すか、手入力で登録してください');
  }
  const ins = await admin.from('ai_usage').insert({ user_id: user.id, fn });
  if (ins.error) throw ins.error;
}
