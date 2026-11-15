import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabaseConfigured } from '@/lib/supabase';
import { colors, radius } from '@/lib/theme';

export default function Welcome() {
  const { appleAvailable, signInWithApple, continueWithoutAccount, completeOnboarding } = useAuth();
  const [consent, setConsent] = useState(true);
  const [busy, setBusy] = useState(false);

  const finish = async () => {
    await completeOnboarding(supabaseConfigured && consent);
    router.replace('/home');
  };

  const onApple = async () => {
    setBusy(true);
    try {
      const ok = await signInWithApple();
      if (ok) await finish();
    } catch (e) {
      Alert.alert('サインインできませんでした', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onSkip = async () => {
    setBusy(true);
    try {
      await continueWithoutAccount();
    } catch (e) {
      // 通信できなくても端末内の機能は使えるので先に進む
      console.warn('[welcome] anonymous sign-in failed', e);
    }
    try {
      await finish();
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.logo}>my coordy♡</Text>
          <Text style={styles.lead}>手持ちの服から、毎日のコーデを。</Text>
        </View>

        <View style={styles.points}>
          <Point icon="iphone" text="服の写真とデータはこの iPhone の中に保存されます" />
          <Point icon="sparkles" text="写真を撮るだけで、AI が服の種類や色を判定します" />
          <Point icon="icloud" text="iPhone の iCloud バックアップで引き継げます" />
        </View>

        {supabaseConfigured && (
          <Pressable style={styles.consent} onPress={() => setConsent((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: consent }}>
            <SymbolView
              name={consent ? 'checkmark.square.fill' : 'square'}
              size={22}
              tintColor={consent ? colors.pink : colors.textMuted}
            />
            <Text style={styles.consentText}>
              AI 機能を使う。服の解析・コーデ提案・ショッピング検索・イラスト生成のため、服の写真と情報（名前・色など）、天気や予定の内容が外部の AI サービス（Anthropic・OpenAI）に送信されます。サーバーには保存されません。設定からいつでも変更できます。
            </Text>
          </Pressable>
        )}

        <View style={styles.actions}>
          {appleAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={radius.md}
              style={[styles.apple, busy && { opacity: 0.5 }]}
              onPress={busy ? () => {} : onApple}
            />
          )}
          <Button
            title={appleAvailable ? 'サインインせずに始める' : 'はじめる'}
            variant={appleAvailable ? 'secondary' : 'pink'}
            onPress={onSkip}
            loading={busy && !appleAvailable}
            disabled={busy}
          />
          {appleAvailable && (
            <Text style={styles.note}>サインインしなくてもすべての機能を使えます。あとから設定で Apple ID と紐づけられます。</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Point({ icon, text }: { icon: 'iphone' | 'sparkles' | 'icloud'; text: string }) {
  return (
    <View style={styles.point}>
      <View style={styles.pointIcon}>
        <SymbolView name={icon} size={20} tintColor={colors.pink} />
      </View>
      <Text style={styles.pointText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 24, gap: 28, flexGrow: 1, justifyContent: 'center' },
  hero: { alignItems: 'center', gap: 8, marginTop: 24 },
  logo: { fontSize: 34, fontWeight: '700', fontStyle: 'italic', color: colors.pink },
  lead: { fontSize: 15, color: colors.textSub },
  points: { gap: 14 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pointIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.pinkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointText: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 },
  consent: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  consentText: { flex: 1, fontSize: 12, lineHeight: 18, color: colors.textSub },
  actions: { gap: 12 },
  apple: { height: 50, width: '100%' },
  note: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
});
