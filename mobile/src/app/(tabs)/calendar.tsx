import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OutfitThumbs } from '@/components/OutfitThumbs';
import { RatingModal } from '@/components/RatingModal';
import { Button, Card, Chip, Segmented } from '@/components/ui';
import { fromYmd, hm, jaDate, ymd } from '@/lib/dates';
import { deleteEvent, eventsByDate, type CalendarEvent } from '@/lib/events';
import {
  deleteOutfit,
  listHistory,
  outfitsByDate,
  rateOutfit,
  toggleFavorite,
  weeklyStats,
  type HistoryFilter,
  type OutfitRecord,
  type WeeklyStats,
} from '@/lib/outfits';
import { colors, radius } from '@/lib/theme';

const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日'];
const stars = (r: number | null) => (r ? '⭐'.repeat(r) : '');

type Tab = 'calendar' | 'history';

export default function CalendarScreen() {
  const db = useSQLiteContext();
  const [tab, setTab] = useState<Tab>('calendar');
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [selected, setSelected] = useState(ymd());
  const [events, setEvents] = useState<Record<string, CalendarEvent[]>>({});
  const [outfits, setOutfits] = useState<Record<string, OutfitRecord>>({});
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [history, setHistory] = useState<OutfitRecord[]>([]);
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [rating, setRating] = useState<OutfitRecord | null>(null);

  const gridStart = startOfWeek(month, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });

  const load = useCallback(async () => {
    const from = ymd(gridStart);
    const to = ymd(gridEnd);
    const [ev, out, hist, st] = await Promise.all([
      eventsByDate(db, from, to),
      outfitsByDate(db, from, to),
      listHistory(db, filter),
      weeklyStats(db),
    ]);
    setEvents(ev);
    setOutfits(out);
    setHistory(hist);
    setStats(st);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, month, filter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const todayKey = ymd();
  const selEvents = events[selected] ?? [];
  const selOutfit = outfits[selected] ?? null;

  const confirmDeleteEvent = (e: CalendarEvent) =>
    Alert.alert('予定を削除しますか？', e.title, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => { await deleteEvent(db, e.id); load(); } },
    ]);

  const confirmDeleteOutfit = (o: OutfitRecord) =>
    Alert.alert('このコーデの記録を削除しますか？', '着用回数からも外れます。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => { await deleteOutfit(db, o.id); load(); } },
    ]);

  const favorite = async (o: OutfitRecord) => {
    await toggleFavorite(db, o.id);
    load();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.top}>
        <Segmented
          options={[
            { value: 'calendar', label: 'カレンダー' },
            { value: 'history', label: '履歴' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      {tab === 'calendar' ? (
        <ScrollView contentContainerStyle={styles.container}>
          <Card style={styles.calendar}>
            <View style={styles.monthNav}>
              <Pressable accessibilityLabel="前の月" hitSlop={12} onPress={() => setMonth((m) => addMonths(m, -1))}>
                <Text style={styles.navArrow}>‹</Text>
              </Pressable>
              <Text style={styles.monthTitle}>{jaDate(month, 'yyyy年M月')}</Text>
              <Pressable accessibilityLabel="次の月" hitSlop={12} onPress={() => setMonth((m) => addMonths(m, 1))}>
                <Text style={styles.navArrow}>›</Text>
              </Pressable>
            </View>
            <View style={styles.week}>
              {WEEKDAYS.map((d, i) => (
                <Text key={d} style={[styles.weekday, i === 5 && styles.sat, i === 6 && styles.sun]}>{d}</Text>
              ))}
            </View>
            <View style={styles.days}>
              {days.map((day, i) => {
                const key = ymd(day);
                const isSel = key === selected;
                const isToday = key === todayKey;
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityLabel={jaDate(day)}
                    onPress={() => setSelected(key)}
                    style={[styles.day, isSel && styles.daySel, !isSel && isToday && styles.dayToday]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        !isSameMonth(day, month) && styles.dayOut,
                        i % 7 === 5 && styles.sat,
                        i % 7 === 6 && styles.sun,
                        isToday && styles.todayText,
                        isSel && styles.daySelText,
                      ]}
                    >
                      {day.getDate()}
                    </Text>
                    <View style={styles.dots}>
                      {(events[key]?.length ?? 0) > 0 && <View style={[styles.dotMark, { backgroundColor: isSel ? '#fff' : '#F472B6' }]} />}
                      {outfits[key] && <View style={[styles.dotMark, { backgroundColor: isSel ? '#fff' : '#A78BFA' }]} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.legend}>
              <View style={[styles.dotMark, { backgroundColor: '#F472B6' }]} />
              <Text style={styles.legendText}>予定</Text>
              <View style={[styles.dotMark, { backgroundColor: '#A78BFA' }]} />
              <Text style={styles.legendText}>コーデ</Text>
            </View>
          </Card>

          <Text style={styles.selTitle}>{jaDate(fromYmd(selected))}</Text>

          <Card>
            <View style={styles.rowBetween}>
              <Text style={styles.cardLabel}>予定</Text>
              <Pressable onPress={() => router.push({ pathname: '/event/new', params: { date: selected } })}>
                <Text style={styles.link}>＋ 予定を追加</Text>
              </Pressable>
            </View>
            {selEvents.length === 0 ? (
              <Text style={styles.muted}>予定なし</Text>
            ) : (
              selEvents.map((e) => (
                <Pressable key={e.id} onLongPress={() => confirmDeleteEvent(e)} style={styles.eventRow}>
                  <View style={styles.eventTimes}>
                    <Text style={styles.eventTime}>{hm(e.startAt)}</Text>
                    <Text style={styles.eventTimeEnd}>{hm(e.endAt)}</Text>
                  </View>
                  <View style={styles.eventBar} />
                  <Text style={styles.eventTitle}>{e.title}</Text>
                </Pressable>
              ))
            )}
            {selEvents.length > 0 && <Text style={styles.hint}>予定を長押しすると削除できます</Text>}
          </Card>

          <Card>
            <View style={styles.rowBetween}>
              <Text style={styles.cardLabel}>コーデ</Text>
              {selOutfit && (
                <Pressable accessibilityLabel="お気に入り" hitSlop={10} onPress={() => favorite(selOutfit)}>
                  <Text style={[styles.heart, selOutfit.isFavorite && styles.heartOn]}>{selOutfit.isFavorite ? '♥' : '♡'}</Text>
                </Pressable>
              )}
            </View>
            {selOutfit ? (
              <>
                <Text style={styles.outfitTitle}>{selOutfit.title || 'マイコーデ'}</Text>
                <OutfitThumbs items={selOutfit.items} />
                {selOutfit.rating ? (
                  <Text style={styles.rating}>{stars(selOutfit.rating)}</Text>
                ) : null}
                <View style={styles.row}>
                  {selected <= todayKey && !selOutfit.rating && (
                    <Button title="評価する" small variant="secondary" style={styles.flex} onPress={() => setRating(selOutfit)} />
                  )}
                  <Button
                    title="着せ替えで変更"
                    small
                    variant="secondary"
                    style={styles.flex}
                    onPress={() => router.push({ pathname: '/dressup', params: { date: selected } })}
                  />
                  <Button title="削除" small variant="danger" onPress={() => confirmDeleteOutfit(selOutfit)} />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.muted}>この日のコーデはまだありません</Text>
                <View style={styles.row}>
                  <Button
                    title="着せ替えで組む"
                    small
                    variant="secondary"
                    style={styles.flex}
                    onPress={() => router.push({ pathname: '/dressup', params: { date: selected } })}
                  />
                  <Button
                    title="AI に提案してもらう"
                    small
                    variant="pink"
                    style={styles.flex}
                    onPress={() => router.push({ pathname: '/outfit', params: { date: selected } })}
                  />
                </View>
              </>
            )}
          </Card>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          {stats && (
            <Card>
              <Text style={styles.cardLabel}>今週のまとめ</Text>
              <View style={styles.stats}>
                <Stat icon="📅" label="着用日数" value={`${stats.wornDays}日`} />
                <Stat icon="👕" label="よく着たカテゴリ" value={stats.topCategory ?? '-'} />
                <Stat icon="📊" label="クローゼット活用率" value={`${stats.utilizationRate}%`} />
                <Stat icon="⭐" label="平均評価" value={stats.avgRating ? `${stats.avgRating} / 3` : '-'} />
              </View>
            </Card>
          )}
          <View style={styles.row}>
            <Chip label="すべて" selected={filter === 'all'} onPress={() => setFilter('all')} />
            <Chip label="⭐ お気に入り" selected={filter === 'favorite'} onPress={() => setFilter('favorite')} />
            <Chip label="👎 着なかった" selected={filter === 'skipped'} onPress={() => setFilter('skipped')} />
          </View>
          {history.length === 0 ? (
            <Text style={[styles.muted, styles.empty]}>履歴がありません</Text>
          ) : (
            history.map((h) => (
              <Card key={h.id}>
                <View style={styles.rowBetween}>
                  <Text style={styles.histDate}>
                    {jaDate(fromYmd(h.date))}
                    {h.status === 'skipped' ? '・見送り' : ''}
                  </Text>
                  {h.status === 'adopted' && (
                    <Pressable accessibilityLabel="お気に入り" hitSlop={10} onPress={() => favorite(h)}>
                      <Text style={[styles.heart, h.isFavorite && styles.heartOn]}>{h.isFavorite ? '♥' : '♡'}</Text>
                    </Pressable>
                  )}
                </View>
                <Text style={styles.outfitTitle}>{h.title || 'コーデ'}</Text>
                {h.tags.length > 0 && <Text style={styles.tags}>{h.tags.map((t) => `#${t}`).join(' ')}</Text>}
                <OutfitThumbs items={h.items} size={44} />
                {h.status === 'adopted' &&
                  (h.rating ? (
                    <Text style={styles.rating}>{stars(h.rating)}</Text>
                  ) : (
                    <Pressable onPress={() => setRating(h)}>
                      <Text style={styles.link}>評価する</Text>
                    </Pressable>
                  ))}
                {!!h.ratingNote && <Text style={styles.muted}>メモ: {h.ratingNote}</Text>}
              </Card>
            ))
          )}
        </ScrollView>
      )}

      <RatingModal
        visible={!!rating}
        onClose={() => setRating(null)}
        onSubmit={async (value, note) => {
          if (!rating) return;
          await rateOutfit(db, rating.id, value, note);
          setRating(null);
          load();
        }}
      />
    </SafeAreaView>
  );
}

function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  top: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  container: { padding: 16, gap: 12, paddingBottom: 32 },
  calendar: { padding: 12, gap: 6 },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8 },
  navArrow: { fontSize: 28, color: colors.textSub, paddingHorizontal: 8 },
  monthTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.textMuted },
  days: { flexDirection: 'row', flexWrap: 'wrap' },
  day: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 6, borderRadius: 10, gap: 3 },
  daySel: { backgroundColor: '#F472B6' },
  dayToday: { backgroundColor: colors.pinkSoft },
  dayText: { fontSize: 14, fontWeight: '600', color: colors.text },
  dayOut: { opacity: 0.3 },
  todayText: { color: colors.pink },
  daySelText: { color: '#fff' },
  sat: { color: '#3B82F6' },
  sun: { color: '#F43F5E' },
  dots: { flexDirection: 'row', gap: 3, height: 6 },
  dotMark: { width: 6, height: 6, borderRadius: 3 },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, paddingTop: 4 },
  legendText: { fontSize: 10, color: colors.textMuted, marginRight: 8 },
  selTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  flex: { flex: 1 },
  cardLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  link: { fontSize: 13, fontWeight: '600', color: colors.pink },
  muted: { fontSize: 13, color: colors.textMuted },
  hint: { fontSize: 11, color: colors.textFaint },
  empty: { textAlign: 'center', paddingVertical: 40 },
  eventRow: { flexDirection: 'row', alignItems: 'stretch', gap: 10 },
  eventTimes: { width: 42, alignItems: 'flex-end' },
  eventTime: { fontSize: 12, color: colors.textSub, fontVariant: ['tabular-nums'] },
  eventTimeEnd: { fontSize: 11, color: colors.textFaint, fontVariant: ['tabular-nums'] },
  eventBar: { width: 3, borderRadius: 2, backgroundColor: '#FBCFE8' },
  eventTitle: { fontSize: 15, color: colors.text, flex: 1, paddingVertical: 2 },
  heart: { fontSize: 22, color: colors.textFaint },
  heartOn: { color: colors.pink },
  outfitTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  tags: { fontSize: 12, color: colors.textMuted },
  rating: { fontSize: 14 },
  histDate: { fontSize: 13, color: colors.textMuted },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { width: '48%', flexGrow: 1, backgroundColor: colors.bg, borderRadius: radius.md, padding: 12, gap: 2 },
  statIcon: { fontSize: 18 },
  statValue: { fontSize: 18, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted },
});
