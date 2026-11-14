// アカウント削除（App Store 審査ガイドライン 5.1.1(v)）。
// Apple ID で連携していた場合は、Apple 側のトークンも取り消す（Sign in with Apple の要件）。
import { importPKCS8, SignJWT } from 'npm:jose@5.9.6';
import { admin, requireUser } from '../_shared/auth.ts';
import { errorResponse, json } from '../_shared/http.ts';

const APPLE_TEAM_ID = Deno.env.get('APPLE_TEAM_ID');
const APPLE_KEY_ID = Deno.env.get('APPLE_KEY_ID');
const APPLE_PRIVATE_KEY = Deno.env.get('APPLE_PRIVATE_KEY'); // .p8 の中身
const APPLE_CLIENT_ID = Deno.env.get('APPLE_CLIENT_ID'); // アプリの Bundle ID

async function appleClientSecret(): Promise<string> {
  const key = await importPKCS8(APPLE_PRIVATE_KEY!.replace(/\\n/g, '\n'), 'ES256');
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: APPLE_KEY_ID! })
    .setIssuer(APPLE_TEAM_ID!)
    .setIssuedAt()
    .setExpirationTime('5m')
    .setAudience('https://appleid.apple.com')
    .setSubject(APPLE_CLIENT_ID!)
    .sign(key);
}

/** アプリから受け取った authorizationCode をリフレッシュトークンに交換し、それを取り消す */
async function revokeApple(authorizationCode: string): Promise<void> {
  if (!APPLE_TEAM_ID || !APPLE_KEY_ID || !APPLE_PRIVATE_KEY || !APPLE_CLIENT_ID) {
    console.warn('delete-account: Apple secrets are not set; skipping token revocation');
    return;
  }
  const clientSecret = await appleClientSecret();
  const tokenRes = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: APPLE_CLIENT_ID,
      client_secret: clientSecret,
      code: authorizationCode,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) {
    console.error('delete-account: apple token exchange failed', tokenRes.status, await tokenRes.text());
    return;
  }
  const { refresh_token: refreshToken } = await tokenRes.json();
  if (!refreshToken) return;
  const revokeRes = await fetch('https://appleid.apple.com/auth/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: APPLE_CLIENT_ID,
      client_secret: clientSecret,
      token: refreshToken,
      token_type_hint: 'refresh_token',
    }),
  });
  if (!revokeRes.ok) {
    console.error('delete-account: apple revoke failed', revokeRes.status, await revokeRes.text());
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);
  try {
    const user = await requireUser(req);
    const body = await req.json().catch(() => ({}));
    if (typeof body?.appleAuthorizationCode === 'string' && body.appleAuthorizationCode) {
      await revokeApple(body.appleAuthorizationCode);
    }
    // ai_usage は on delete cascade で一緒に消える
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e, 'アカウントを削除できませんでした');
  }
});
