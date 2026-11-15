import DateTimePicker from '@react-native-community/datetimepicker';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/ui';
import { fromYmd, ymd } from '@/lib/dates';
import { signFromBirthday } from '@/lib/horoscope';
import { loadPrefs, PERSONAL_COLORS, savePref, type Prefs } from '@/lib/prefs';
import { useAuth } from '@/lib/auth';
import { supabaseConfigured } from '@/lib/supabase';
import { colors, radius } from '@/lib/theme';
import { isLiftSupported } from '@modules/subject-lifter';

export default function SettingsScreen() {
  const auth = useAuth();
  const db = useSQLiteContext();
  const [busy, setBusy] = useState(false);
  const [prefs, setPrefs] = useState<Prefs | null>(null);

  useEffect(() => {
    loadPrefs(db).then(setPrefs);
  }, [db]);

  const update = async <K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs((p) => (p ? { ...p, [key]: value } : p));
    await savePref(db, key, value);
  };

  const toggleColor = (id: string) => {
    if (!prefs) return;
    const list = prefs.personalColors.includes(id)
      ? prefs.personalColors.filter((c) => c !== id)
      : [...prefs.personalColors, id];
    update('personalColors', list);
  };

  const sign = signFromBirthday(prefs?.birthday ?? null);

  const run = async (fn: () => Promise<unknown>, failTitle: string) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      Alert.alert(failTitle, (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () =>
    Alert.alert(
      'アカウントを削除しますか？',
      'サーバー上のアカウント情報（Apple ID との紐づけ・利用履歴）を削除します。この iPhone 内の服のデータは消えません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: () =>
            run(async () => {
              await auth.deleteAccount();
              router.replace('/welcome');
            }, '削除できませんでした'),
        },
      ],
    );

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {prefs && (
        <Section title="プロフィール（この iPhone 内にだけ保存）">
          <View style={styles.row}>
            <Text style={styles.label}>呼び名</Text>
            <TextInput
              value={prefs.displayName ?? ''}
              onChangeText={(v) => setPrefs({ ...prefs, displayName: v })}
              onEndEditing={(e) => update('displayName', e.nativeEvent.text.trim().slice(0, 20) || null)}
              placeholder="ホームのあいさつに使います"
              placeholderTextColor={colors.textFaint}
              style={styles.nameInput}
              maxLength={20}
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>誕生日</Text>
            {prefs.birthday ? (
              <View style={styles.birthday}>
                <DateTimePicker
                  value={fromYmd(prefs.birthday)}
                  mode="date"
                  display="compact"
                  locale="ja-JP"
                  maximumDate={new Date()}
                  onChange={(_, d) => d && update('birthday', ymd(d))}
                />
                <Pressable accessibilityLabel="誕生日を消す" hitSlop={8} onPress={() => update('birthday', null)}>
                  <Text style={styles.clear}>消す</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => update('birthday', '2000-01-01')}>
                <Text style={styles.link}>設定する</Text>
              </Pressable>
            )}
          </View>
          <Text style={styles.muted}>
            {sign ? `${sign.symbol} ${sign.name}。ホームに今日の運勢が表示されます。` : '誕生日を入れると、ホームに星座占いが表示されます。'}
          </Text>
          <Text style={styles.label}>パーソナルカラー（好きな色）</Text>
          <View style={styles.colors}>
            {PERSONAL_COLORS.map((c) => {
              const on = prefs.personalColors.includes(c.id);
              return (
                <Pressable
                  key={c.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={c.label}
                  onPress={() => toggleColor(c.id)}
                  style={[styles.colorChip, on && styles.colorChipOn]}
                >
                  <View style={[styles.swatch, { backgroundColor: c.hex }]} />
                  <Text style={[styles.colorText, on && styles.colorTextOn]}>{c.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.muted}>ショッピングで、選んだ色のアイテムを優先して探します。</Text>
        </Section>
      )}

      <Section title="アカウント">
        {!supabaseConfigured ? (
          <Text style={styles.muted}>サーバー未設定のため、アカウント機能はオフです。</Text>
        ) : auth.appleLinked ? (
          <>
            <Row label="Apple ID" value={auth.email ?? 'サインイン済み'} />
            <Button title="サインアウト" variant="secondary" small loading={busy} onPress={() => run(auth.signOut, 'サインアウトできませんでした')} />
          </>
        ) : (
          <>
            <Text style={styles.muted}>
              サインインせずに利用中です。Apple ID と紐づけると、今後の有料プランや機種変更時の引き継ぎに使えます。
            </Text>
            {auth.appleAvailable && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={radius.sm}
                style={styles.apple}
                onPress={() => run(auth.signInWithApple, 'サインインできませんでした')}
              />
            )}
          </>
        )}
      </Section>

      <Section title="AI 機能">
        <View style={styles.switchRow}>
          <Text style={styles.label}>AI 機能を使う</Text>
          <Switch
            value={auth.aiConsent}
            disabled={!supabaseConfigured}
            onValueChange={(v) => auth.setAiConsent(v)}
            trackColor={{ true: colors.pink }}
          />
        </View>
        <Text style={styles.muted}>
          服の解析・コーデ提案・ショッピング検索・イラスト生成に使います。オンにすると、服の写真と情報（名前・色など）、天気や予定の内容が外部の AI サービス（Anthropic・OpenAI）に送信されます。サーバーには保存されません。
        </Text>
        <Row label="背景の自動切り抜き" value={isLiftSupported() ? '利用できます' : 'この環境では利用できません'} />
      </Section>

      <Section title="データの保存先">
        <Text style={styles.muted}>
          服の写真と記録はすべてこの iPhone 内に保存されています。iCloud バックアップをオンにしておくと、機種変更時に復元できます。アプリを削除するとデータも削除されます。
        </Text>
      </Section>

      {supabaseConfigured && auth.session && (
        <Section title="">
          <Button title="アカウントを削除" variant="danger" loading={busy} onPress={confirmDelete} />
        </Section>
      )}
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      {!!title && <Text style={styles.sectionTitle}>{title}</Text>}
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 20 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginLeft: 4 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 15, color: colors.text },
  value: { fontSize: 14, color: colors.textMuted, flexShrink: 1 },
  muted: { fontSize: 13, lineHeight: 19, color: colors.textSub },
  apple: { height: 44, width: '100%' },
  nameInput: { flex: 1, textAlign: 'right', fontSize: 15, color: colors.text, paddingVertical: 4 },
  birthday: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clear: { fontSize: 13, color: colors.textMuted },
  link: { fontSize: 15, color: colors.pink, fontWeight: '600' },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  colorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  colorChipOn: { borderColor: colors.pink, backgroundColor: '#FDF2F8' },
  swatch: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  colorText: { fontSize: 12, color: colors.textSub },
  colorTextOn: { color: colors.pink, fontWeight: '600' },
});
