import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OutfitThumbs } from '@/components/OutfitThumbs';
import { RatingModal } from '@/components/RatingModal';
import { Button, Card } from '@/components/ui';
import { suggestOutfits, type SuggestedOutfit } from '@/lib/aiFeatures';
import { useAiAvailable } from '@/lib/auth';
import { fromYmd, hm, jaDate, ymd } from '@/lib/dates';
import { kvGet, kvSet, listItems, type ClothingItem } from '@/lib/db';
import { eventsByDate, type CalendarEvent } from '@/lib/events';
import { getDailyFortune, signFromBirthday } from '@/lib/horoscope';
import {
  adoptOutfit,
  dismissRating,
  findUnrated,
  getOutfitForDate,
  preferenceSummary,
  rateOutfit,
  type OutfitRecord,
} from '@/lib/outfits';
import { loadPrefs, type Prefs } from '@/lib/prefs';
import { colors, radius } from '@/lib/theme';
import { describeWeatherCode, useWeather, type Weather } from '@/lib/weather';

const FALLBACK_MESSAGES = [
  '好きな服を着ると気分も上がる！今日も自分を大切に🌸',
  'おしゃれは自分へのご褒美。今日も輝いていこう♡',
  '鏡の前の自分にOKを出して、自信を持って出発しよう✨',
];

type DailyCache = { date: string; itemsKey: string; outfits: SuggestedOutfit[]; message: string | null };

const itemsKeyOf = (items: ClothingItem[]) => `${items.length}:${items.map((i) => i.updatedAt).sort().at(-1) ?? ''}`;

export default function HomeScreen() {
  const db = useSQLiteContext();
  const aiAvailable = useAiAvailable();
  const { weather, reload: reloadWeather } = useWeather();

  const [items, setItems] = useState<ClothingItem[]>([]);
  const [today, setToday] = useState<OutfitRecord | null>(null);
  const [unrated, setUnrated] = useState<OutfitRecord | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [daily, setDaily] = useState<DailyCache | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [adoptingIdx, setAdoptingIdx] = useState<number | null>(null);
  const [rating, setRating] = useState<OutfitRecord | null>(null);

  const todayKey = ymd();

  const load = useCallback(async () => {
    const [all, t, u, ev, p, cached] = await Promise.all([
      listItems(db),
      getOutfitForDate(db, todayKey),
      findUnrated(db),
      eventsByDate(db, todayKey, todayKey),
      loadPrefs(db),
      kvGet(db, 'dailySuggest'),
    ]);
    setItems(all);
    setToday(t);
    setUnrated(u);
    setEvents(ev[todayKey] ?? []);
    setPrefs(p);
    try {
      const c = cached ? (JSON.parse(cached) as DailyCache) : null;
      setDaily(c?.date === todayKey ? c : null);
    } catch {
      setDaily(null);
    }
  }, [db, todayKey]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const requestSuggestions = async (w: Weather | null) => {
    if (items.length < 2) {
      Alert.alert('アイテムが足りません', 'クローゼットに服を2点以上登録すると、AI がコーデを提案します。');
      return;
    }
    setSuggesting(true);
    setSuggestError(null);
    try {
      const result = await suggestOutfits({
        mode: 'daily',
        items,
        weather: w,
        events: events.map((e) => e.title),
        preferences: await preferenceSummary(db),
        day: jaDate(new Date(), 'EEEE'),
      });
      const cache: DailyCache = { date: todayKey, itemsKey: itemsKeyOf(items), ...result };
      await kvSet(db, 'dailySuggest', JSON.stringify(cache));
      setDaily(cache);
    } catch (e) {
      setSuggestError((e as Error).message);
    } finally {
      setSuggesting(false);
    }
  };

  const adopt = async (o: SuggestedOutfit, idx: number) => {
    setAdoptingIdx(idx);
    try {
      await adoptOutfit(db, {
        date: todayKey,
        itemIds: o.items.map((i) => i.itemId),
        title: o.title,
        tips: o.tips,
        tags: o.tags,
        reasons: Object.fromEntries(o.items.map((i) => [i.itemId, i.reason])),
        context: weather ? { weather: describeWeatherCode(weather.weatherCode).label, temp: `${Math.round(weather.temperature)}℃` } : {},
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await load();
    } catch (e) {
      Alert.alert('保存できませんでした', (e as Error).message);
    } finally {
      setAdoptingIdx(null);
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'おはようございます' : hour < 18 ? 'こんにちは' : 'こんばんは';
  const name = prefs?.displayName;
  const stale = daily && daily.itemsKey !== itemsKeyOf(items);
  const message = daily?.message || FALLBACK_MESSAGES[new Date().getDate() % FALLBACK_MESSAGES.length];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {
              load();
              reloadWeather(true);
            }}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.flex}>
            <Text style={styles.date}>{jaDate(new Date())}</Text>
            <Text style={styles.greeting}>
              {greeting}
              {name ? `、${name}さん` : ''}♡
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="設定"
            onPress={() => router.push('/settings')}
            style={styles.iconButton}
          >
            <SymbolView name="gearshape" size={20} tintColor={colors.textSub} />
          </Pressable>
        </View>

        {unrated && (
          <Card style={styles.rateCard}>
            <Text style={styles.cardTitle}>{jaDate(fromYmd(unrated.date))}のコーデはどうでしたか？</Text>
            <OutfitThumbs items={unrated.items} size={44} />
            <View style={styles.row}>
              <Button
                title="あとで"
                small
                variant="secondary"
                style={styles.flex}
                onPress={async () => {
                  await dismissRating(db, unrated.id);
                  setUnrated(null);
                }}
              />
              <Button title="評価する" small style={styles.flex} onPress={() => setRating(unrated)} />
            </View>
          </Card>
        )}

        <Card>
          <View style={styles.rowBetween}>
            <Text style={styles.badge}>今日のコーデ</Text>
            {today && (
              <Pressable onPress={() => router.push({ pathname: '/dressup', params: { date: todayKey } })}>
                <Text style={styles.link}>着せ替えで見る</Text>
              </Pressable>
            )}
          </View>
          {today ? (
            <>
              <Text style={styles.outfitTitle}>{today.title || 'マイコーデ'}</Text>
              {today.tags.length > 0 && <Text style={styles.tags}>{today.tags.map((t) => `#${t}`).join(' ')}</Text>}
              <OutfitThumbs items={today.items} />
              {!!today.tips && <Text style={styles.tips}>{today.tips}</Text>}
            </>
          ) : (
            <Text style={styles.muted}>まだ決まっていません。下の提案から選ぶか、着せ替えで組み合わせてみましょう。</Text>
          )}
        </Card>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>♡ 今日のおすすめ</Text>
          {weather && (
            <Text style={styles.muted}>
              {describeWeatherCode(weather.weatherCode, weather.isDay).icon} {Math.round(weather.temperature)}℃
            </Text>
          )}
        </View>

        {!aiAvailable ? (
          <Card>
            <Text style={styles.muted}>
              設定で「AI 機能」をオンにすると、天気と手持ちの服から AI がコーデを提案します。
            </Text>
            <Button title="設定を開く" small variant="secondary" onPress={() => router.push('/settings')} />
          </Card>
        ) : suggesting ? (
          <Card style={styles.center}>
            <ActivityIndicator color={colors.pink} />
            <Text style={styles.muted}>AI がコーデを考えています…</Text>
          </Card>
        ) : daily && daily.outfits.length > 0 ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
              {daily.outfits.map((o, idx) => {
                const outfitItems = o.items.map((i) => itemMap.get(i.itemId)).filter((i): i is ClothingItem => !!i);
                const chosen =
                  !!today &&
                  today.itemIds.length === o.items.length &&
                  o.items.every((i) => today.itemIds.includes(i.itemId));
                return (
                  <View key={idx} style={styles.suggestion}>
                    <Text style={styles.suggestionTitle}>{o.title}</Text>
                    <Text style={styles.tags}>{o.tags.map((t) => `#${t}`).join(' ')}</Text>
                    <OutfitThumbs items={outfitItems} size={46} max={4} />
                    <Text style={styles.reason}>{o.reason}</Text>
                    <Button
                      title={chosen ? '✓ 今日のコーデ' : 'このコーデにする'}
                      small
                      variant={chosen ? 'secondary' : 'pink'}
                      disabled={chosen || outfitItems.length === 0}
                      loading={adoptingIdx === idx}
                      onPress={() => adopt(o, idx)}
                    />
                  </View>
                );
              })}
            </ScrollView>
            {stale && <Text style={styles.muted}>クローゼットが変わりました。更新すると新しい服も提案に入ります。</Text>}
            <View style={styles.row}>
              <Button title="提案を更新" small variant="secondary" style={styles.flex} onPress={() => requestSuggestions(weather)} />
              <Button title="条件を選んで提案" small variant="secondary" style={styles.flex} onPress={() => router.push('/outfit')} />
            </View>
          </>
        ) : (
          <Card>
            {suggestError && <Text style={styles.error}>{suggestError}</Text>}
            <Text style={styles.muted}>今日の天気と予定に合わせて、手持ちの服から3パターン提案します。</Text>
            <Button title="AI に提案してもらう" variant="pink" onPress={() => requestSuggestions(weather)} />
            <Button title="条件を選んで提案" small variant="secondary" onPress={() => router.push('/outfit')} />
          </Card>
        )}

        <View style={styles.grid}>
          <WeatherCard weather={weather} />
          <FortuneCard birthday={prefs?.birthday ?? null} />
        </View>

        <Card>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>📅 今日の予定</Text>
            <Pressable onPress={() => router.push({ pathname: '/event/new', params: { date: todayKey } })}>
              <Text style={styles.link}>＋ 予定を追加</Text>
            </Pressable>
          </View>
          {events.length === 0 ? (
            <Text style={styles.muted}>予定はありません。予定を入れると、AI がそれに合うコーデを考えます。</Text>
          ) : (
            events.map((e) => (
              <View key={e.id} style={styles.eventRow}>
                <Text style={styles.eventTime}>{hm(e.startAt)}</Text>
                <View style={styles.dot} />
                <Text style={styles.eventTitle} numberOfLines={1}>{e.title}</Text>
              </View>
            ))
          )}
        </Card>

        <Card style={styles.messageCard}>
          <Text style={styles.messageLabel}>♡ ひとこと</Text>
          <Text style={styles.message}>{message}</Text>
        </Card>
      </ScrollView>

      <RatingModal
        visible={!!rating}
        onClose={() => setRating(null)}
        onSubmit={async (value, note) => {
          if (!rating) return;
          await rateOutfit(db, rating.id, value, note);
          setRating(null);
          await load();
        }}
      />
    </SafeAreaView>
  );
}

function WeatherCard({ weather }: { weather: Weather | null }) {
  const info = weather ? describeWeatherCode(weather.weatherCode, weather.isDay) : null;
  return (
    <View style={[styles.mini, { backgroundColor: '#F0F9FF', borderColor: '#E0F2FE' }]}>
      <View style={styles.rowBetween}>
        <Text style={[styles.miniTitle, { color: '#0284C7' }]}>今日の天気</Text>
        {weather && <Text style={styles.miniSub}>{weather.placeLabel}</Text>}
      </View>
      {!weather || !info ? (
        <Text style={styles.miniSub}>読み込み中…</Text>
      ) : (
        <>
          <View style={styles.weatherMain}>
            <Text style={styles.weatherIcon}>{info.icon}</Text>
            <View>
              <Text style={styles.temp}>{Math.round(weather.temperature)}℃</Text>
              <Text style={styles.miniSub}>{info.label}</Text>
            </View>
          </View>
          <Text style={styles.miniSub}>
            最高 {Math.round(weather.tempMax)}℃ / 最低 {Math.round(weather.tempMin)}℃
          </Text>
          <Text style={styles.miniSub}>降水確率 {weather.precipProb}%</Text>
        </>
      )}
    </View>
  );
}

function FortuneCard({ birthday }: { birthday: string | null }) {
  const sign = signFromBirthday(birthday);
  if (!sign) {
    return (
      <Pressable
        onPress={() => router.push('/settings')}
        style={[styles.mini, { backgroundColor: '#FFFBEB', borderColor: '#FEF3C7' }]}
      >
        <Text style={[styles.miniTitle, { color: '#D97706' }]}>✨ 今日の運勢</Text>
        <Text style={styles.miniSub}>設定で誕生日を入れると、星座占いが表示されます。</Text>
      </Pressable>
    );
  }
  const f = getDailyFortune(sign);
  return (
    <View style={[styles.mini, { backgroundColor: '#FFFBEB', borderColor: '#FEF3C7' }]}>
      <Text style={[styles.miniTitle, { color: '#D97706' }]}>✨ 今日の運勢</Text>
      <Text style={styles.fortuneSign}>
        {sign.symbol} {sign.name}
      </Text>
      <Text style={styles.stars}>
        {'★'.repeat(f.overall)}
        <Text style={{ color: colors.textFaint }}>{'★'.repeat(5 - f.overall)}</Text>
      </Text>
      <Text style={styles.miniSub}>ラッキーカラー: {f.luckyColor}</Text>
      <Text style={styles.miniSub} numberOfLines={3}>{f.message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 16, gap: 14, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  date: { fontSize: 13, color: colors.textMuted },
  greeting: { fontSize: 22, fontWeight: '700', color: colors.text },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', gap: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  rateCard: { borderColor: colors.pinkSoft },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  badge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  link: { fontSize: 13, fontWeight: '600', color: colors.pink },
  outfitTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  tags: { fontSize: 12, color: colors.pink },
  tips: { fontSize: 13, lineHeight: 20, color: colors.textSub },
  muted: { fontSize: 13, lineHeight: 19, color: colors.textMuted },
  error: { fontSize: 13, color: colors.danger },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.pink },
  center: { alignItems: 'center', paddingVertical: 28 },
  carousel: { gap: 12, paddingRight: 16 },
  suggestion: {
    width: 240,
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.pinkSoft,
    padding: 14,
    gap: 8,
  },
  suggestionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  reason: { fontSize: 12, lineHeight: 18, color: colors.textSub, flex: 1 },
  grid: { flexDirection: 'row', gap: 12 },
  mini: { flex: 1, borderRadius: radius.lg, borderWidth: 1, padding: 12, gap: 4 },
  miniTitle: { fontSize: 12, fontWeight: '700' },
  miniSub: { fontSize: 11, color: colors.textSub, lineHeight: 16 },
  weatherMain: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 2 },
  weatherIcon: { fontSize: 30 },
  temp: { fontSize: 22, fontWeight: '700', color: colors.text },
  fortuneSign: { fontSize: 14, fontWeight: '700', color: colors.text },
  stars: { fontSize: 13, color: '#F59E0B' },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eventTime: { fontSize: 12, color: colors.textMuted, width: 40, fontVariant: ['tabular-nums'] },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F9A8D4' },
  eventTitle: { fontSize: 14, color: colors.text, flex: 1 },
  messageCard: { backgroundColor: '#FFF1F2', borderColor: colors.pinkSoft },
  messageLabel: { fontSize: 12, fontWeight: '700', color: colors.pink },
  message: { fontSize: 14, lineHeight: 21, color: colors.textSub },
});
