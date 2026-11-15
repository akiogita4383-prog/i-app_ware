import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, SectionLabel } from '@/components/ui';
import { suggestOutfits, type OutfitConditions, type SuggestedOutfit } from '@/lib/aiFeatures';
import { useAiAvailable } from '@/lib/auth';
import { fromYmd, jaDate, ymd } from '@/lib/dates';
import { listItems, type ClothingItem } from '@/lib/db';
import { itemThumbUri } from '@/lib/images';
import { adoptOutfit, preferenceSummary, recordSkipped } from '@/lib/outfits';
import { colors, radius } from '@/lib/theme';

const OPTIONS: { key: keyof OutfitConditions; label: string; values: string[] }[] = [
  { key: 'weather', label: '天気', values: ['☀️ 晴れ', '☁️ 曇り', '🌧️ 雨', '❄️ 雪'] },
  { key: 'temperature', label: '気温', values: ['〜10℃', '10〜16℃', '16〜22℃', '22〜27℃', '27℃〜'] },
  {
    key: 'schedule',
    label: '予定',
    values: ['🏢 オフィス', '☕ カジュアル打合せ', '💼 重要商談', '🍽️ ランチ', '💕 デート', '🌿 休日', '🏠 在宅'],
  },
  { key: 'mood', label: '気分', values: ['✨ きれいめ', '😊 カジュアル', '⬜ ミニマル', '🔥 トレンド', '😴 ラク', '🖤 モード'] },
];

// 絵文字を外した値を AI に渡す
const plain = (v: string) => v.replace(/^[^\p{L}\p{N}〜]+/u, '').trim();

export default function OutfitScreen() {
  const db = useSQLiteContext();
  const aiAvailable = useAiAvailable();
  const params = useLocalSearchParams<{ date?: string }>();
  const date = params.date ?? ymd();

  const [items, setItems] = useState<ClothingItem[]>([]);
  const [conditions, setConditions] = useState<Partial<OutfitConditions>>({});
  const [result, setResult] = useState<SuggestedOutfit | null>(null);
  const [avoid, setAvoid] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listItems(db).then(setItems);
  }, [db]);

  const complete = OPTIONS.every((o) => !!conditions[o.key]);
  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const generate = async (avoidList = avoid) => {
    if (!complete) return;
    setLoading(true);
    try {
      const c = Object.fromEntries(OPTIONS.map((o) => [o.key, plain(conditions[o.key]!)])) as OutfitConditions;
      const res = await suggestOutfits({
        mode: 'conditions',
        items,
        conditions: c,
        preferences: await preferenceSummary(db),
        avoid: avoidList,
      });
      setResult(res.outfits[0] ?? null);
    } catch (e) {
      Alert.alert('提案できませんでした', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const toInput = (o: SuggestedOutfit) => ({
    date,
    itemIds: o.items.map((i) => i.itemId),
    title: o.title,
    tips: o.tips,
    tags: o.tags,
    reasons: Object.fromEntries(o.items.map((i) => [i.itemId, i.reason])),
    context: Object.fromEntries(OPTIONS.map((opt) => [opt.key, plain(conditions[opt.key] ?? '')])),
  });

  const skip = async () => {
    if (!result) return;
    await recordSkipped(db, { ...toInput(result), date: ymd() });
    const next = [...avoid, `${result.title}（${result.items.map((i) => itemMap.get(i.itemId)?.name).join('・')}）`];
    setAvoid(next);
    generate(next);
  };

  const adopt = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await adoptOutfit(db, toInput(result));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      Alert.alert('保存できませんでした', (e as Error).message);
      setSaving(false);
    }
  };

  if (!aiAvailable) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.container}>
        <Card>
          <Text style={styles.muted}>AI のコーデ提案を使うには、設定で「AI 機能」をオンにしてください。</Text>
          <Button title="設定を開く" variant="secondary" onPress={() => router.replace('/settings')} />
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.container}>
      <Text style={styles.dateLabel}>{jaDate(fromYmd(date))} のコーデ</Text>

      {!result ? (
        <>
          <Card>
            {OPTIONS.map((o) => (
              <View key={o.key} style={styles.group}>
                <SectionLabel>{o.label}</SectionLabel>
                <View style={styles.chips}>
                  {o.values.map((v) => (
                    <Chip
                      key={v}
                      label={v}
                      selected={conditions[o.key] === v}
                      onPress={() => setConditions((prev) => ({ ...prev, [o.key]: v }))}
                    />
                  ))}
                </View>
              </View>
            ))}
          </Card>
          {items.length < 2 && (
            <Text style={styles.warn}>クローゼットに服を2点以上登録すると、コーデを提案できます。</Text>
          )}
          <Button
            title={loading ? 'AI が考えています…' : 'コーデを提案してもらう'}
            variant="pink"
            loading={loading}
            disabled={!complete || items.length < 2}
            onPress={() => generate()}
          />
        </>
      ) : (
        <>
          <Card>
            <Text style={styles.title}>{result.title} ✨</Text>
            <Text style={styles.tags}>{result.tags.map((t) => `#${t}`).join(' ')}</Text>
            <View style={styles.grid}>
              {result.items.map((it) => {
                const item = itemMap.get(it.itemId);
                if (!item) return null;
                const uri = itemThumbUri(item.thumbFile);
                return (
                  <View key={it.itemId} style={styles.itemCell}>
                    <View style={styles.itemImage}>
                      {uri && <Image alt={item.name} source={{ uri }} style={StyleSheet.absoluteFill} contentFit="contain" />}
                    </View>
                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.itemReason} numberOfLines={2}>{it.reason}</Text>
                  </View>
                );
              })}
            </View>
            <View style={styles.tipsBox}>
              <Text style={styles.tipsLabel}>スタイリングのコツ</Text>
              <Text style={styles.tipsText}>{result.tips}</Text>
            </View>
          </Card>
          <View style={styles.row}>
            <Button title="↺ 別の提案" variant="secondary" style={styles.flex} loading={loading} onPress={skip} />
            <Button title="✓ このコーデにする" style={styles.flex} loading={saving} disabled={loading} onPress={adopt} />
          </View>
          <Button title="条件を変更する" variant="secondary" small onPress={() => setResult(null)} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14, paddingBottom: 40 },
  dateLabel: { fontSize: 14, color: colors.textMuted },
  group: { gap: 8, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  warn: {
    fontSize: 13,
    color: colors.warnText,
    backgroundColor: colors.warnBg,
    padding: 12,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  muted: { fontSize: 13, lineHeight: 19, color: colors.textSub },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  tags: { fontSize: 12, color: colors.pink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  itemCell: { width: '48%', gap: 3 },
  itemImage: { aspectRatio: 3 / 4, backgroundColor: colors.bg, borderRadius: radius.md, overflow: 'hidden' },
  itemName: { fontSize: 13, fontWeight: '600', color: colors.text },
  itemReason: { fontSize: 11, color: colors.textMuted },
  tipsBox: { backgroundColor: colors.bg, borderRadius: radius.md, padding: 12, gap: 4 },
  tipsLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  tipsText: { fontSize: 14, lineHeight: 21, color: colors.textSub },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
