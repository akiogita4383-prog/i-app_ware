import * as AppleAuthentication from 'expo-apple-authentication';
import { CryptoDigestAlgorithm, digestStringAsync, randomUUID } from 'expo-crypto';
import { useSQLiteContext } from 'expo-sqlite';
import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { kvGet, kvSet } from './db';
import { supabase, supabaseConfigured } from './supabase';

type AuthContextValue = {
  ready: boolean;
  session: Session | null;
  /** Apple ID と紐づいているか（false なら匿名ユーザー） */
  appleLinked: boolean;
  email: string | null;
  onboarded: boolean;
  aiConsent: boolean;
  appleAvailable: boolean;
  /** Apple でサインイン。キャンセル時は false */
  signInWithApple: () => Promise<boolean>;
  /** サインインせずに始める（裏で匿名ユーザーを作る） */
  continueWithoutAccount: () => Promise<void>;
  completeOnboarding: (aiConsent: boolean) => Promise<void>;
  setAiConsent: (v: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isAppleCancel(e: unknown) {
  return (e as { code?: string })?.code === 'ERR_REQUEST_CANCELED';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [onboarded, setOnboarded] = useState(false);
  const [aiConsent, setAiConsentState] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [ob, consent, apple] = await Promise.all([
        kvGet(db, 'onboarded'),
        kvGet(db, 'aiConsent'),
        AppleAuthentication.isAvailableAsync().catch(() => false),
      ]);
      let current: Session | null = null;
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        current = data.session;
        // オンボーディング済みなのにセッションが無い（期限切れなど）→ 匿名で作り直す
        if (!current && ob === '1') {
          const res = await supabase.auth.signInAnonymously();
          current = res.data.session;
        }
      }
      if (cancelled) return;
      setOnboarded(ob === '1');
      setAiConsentState(consent === '1');
      setAppleAvailable(apple && supabaseConfigured);
      setSession(current);
      setReady(true);
    })().catch((e) => {
      console.warn('[auth] init failed', e);
      if (!cancelled) setReady(true);
    });

    const sub = supabase?.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => {
      cancelled = true;
      sub?.data.subscription.unsubscribe();
    };
  }, [db]);

  const signInWithApple = useCallback(async () => {
    if (!supabase) throw new Error('サーバーが設定されていません');
    const rawNonce = randomUUID();
    const hashedNonce = await digestStringAsync(CryptoDigestAlgorithm.SHA256, rawNonce);
    let credential: AppleAuthentication.AppleAuthenticationCredential;
    try {
      credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
    } catch (e) {
      if (isAppleCancel(e)) return false;
      throw e;
    }
    if (!credential.identityToken) throw new Error('Apple から認証情報を受け取れませんでした');

    // Apple は名前を初回しか返さないので、端末に保存しておく
    const given = credential.fullName?.givenName;
    if (given) await kvSet(db, 'displayName', given);

    const { data: current } = await supabase.auth.getSession();
    const creds = { provider: 'apple', token: credential.identityToken, nonce: rawNonce } as const;
    if (current.session?.user.is_anonymous) {
      // 匿名ユーザーに Apple ID を紐づける。既に別ユーザーに紐づいている（再インストール等）ならそちらでサインイン
      const linked = await supabase.auth.linkIdentity(creds);
      if (!linked.error) return true;
    }
    const { error } = await supabase.auth.signInWithIdToken(creds);
    if (error) throw error;
    return true;
  }, [db]);

  const continueWithoutAccount = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    if (data.session) return;
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
  }, []);

  const completeOnboarding = useCallback(
    async (consent: boolean) => {
      await kvSet(db, 'aiConsent', consent ? '1' : '0');
      await kvSet(db, 'onboarded', '1');
      setAiConsentState(consent);
      setOnboarded(true);
    },
    [db],
  );

  const setAiConsent = useCallback(
    async (v: boolean) => {
      await kvSet(db, 'aiConsent', v ? '1' : '0');
      setAiConsentState(v);
    },
    [db],
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    // データは端末にあるので、サインアウト後も匿名ユーザーとして使い続けられるようにする
    await supabase.auth.signInAnonymously();
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!supabase) return;
    // Apple ID 連携済みなら、Apple 側のトークン取り消し用に authorizationCode を取り直して送る
    let appleAuthorizationCode: string | null = null;
    const { data: current } = await supabase.auth.getSession();
    const linked = current.session?.user.identities?.some((i) => i.provider === 'apple');
    if (linked) {
      try {
        const cred = await AppleAuthentication.signInAsync();
        appleAuthorizationCode = cred.authorizationCode;
      } catch (e) {
        if (isAppleCancel(e)) throw new Error('削除をキャンセルしました');
        throw e;
      }
    }
    const { error } = await supabase.functions.invoke('delete-account', {
      method: 'POST',
      body: { appleAuthorizationCode },
    });
    if (error) throw error;
    await supabase.auth.signOut({ scope: 'local' });
    await kvSet(db, 'onboarded', '0');
    setOnboarded(false);
  }, [db]);

  const value = useMemo<AuthContextValue>(() => {
    const identities = session?.user.identities ?? [];
    return {
      ready,
      session,
      appleLinked: identities.some((i) => i.provider === 'apple'),
      email: session?.user.email ?? null,
      onboarded,
      aiConsent,
      appleAvailable,
      signInWithApple,
      continueWithoutAccount,
      completeOnboarding,
      setAiConsent,
      signOut,
      deleteAccount,
    };
  }, [ready, session, onboarded, aiConsent, appleAvailable, signInWithApple, continueWithoutAccount, completeOnboarding, setAiConsent, signOut, deleteAccount]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}

/** AI 機能が使える状態か（サーバー設定済み・セッションあり・送信に同意済み） */
export function useAiAvailable(): boolean {
  const { session, aiConsent } = useAuth();
  return supabaseConfigured && !!session && aiConsent;
}
