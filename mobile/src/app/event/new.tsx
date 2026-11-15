import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Field, SectionLabel } from '@/components/ui';
import { fromYmd } from '@/lib/dates';
import { addEvent } from '@/lib/events';
import { colors } from '@/lib/theme';

function at(base: Date, hour: number): Date {
  const d = new Date(base);
  d.setHours(hour, 0, 0, 0);
  return d;
}

/** 日付は date から、時刻は time から取って1つの Date にする */
function combine(date: Date, time: Date): Date {
  const d = new Date(date);
  d.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return d;
}

export default function NewEventScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ date?: string }>();
  const base = params.date ? fromYmd(params.date) : new Date();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(base);
  const [start, setStart] = useState(at(base, 9));
  const [end, setEnd] = useState(at(base, 10));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) return setError('内容を入力してください');
    const s = combine(date, start);
    const e = combine(date, end);
    if (e <= s) return setError('終了時刻は開始時刻より後にしてください');
    setSaving(true);
    try {
      await addEvent(db, title.trim().slice(0, 60), s, e);
      router.back();
    } catch (err) {
      Alert.alert('保存できませんでした', (err as Error).message);
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Card>
        <Field label="内容" value={title} onChangeText={(v) => { setTitle(v); setError(''); }} placeholder="例：友だちとランチ" />
        <View style={styles.row}>
          <SectionLabel>日付</SectionLabel>
          <DateTimePicker value={date} mode="date" display="compact" locale="ja-JP" onChange={(_, d) => d && setDate(d)} />
        </View>
        <View style={styles.row}>
          <SectionLabel>開始</SectionLabel>
          <DateTimePicker value={start} mode="time" display="compact" locale="ja-JP" minuteInterval={5} onChange={(_, d) => d && setStart(d)} />
        </View>
        <View style={styles.row}>
          <SectionLabel>終了</SectionLabel>
          <DateTimePicker value={end} mode="time" display="compact" locale="ja-JP" minuteInterval={5} onChange={(_, d) => d && setEnd(d)} />
        </View>
        {!!error && <Text style={styles.error}>{error}</Text>}
      </Card>
      <View style={styles.actions}>
        <Button title="キャンセル" variant="secondary" style={styles.flex} onPress={() => router.back()} />
        <Button title="追加する" variant="pink" style={styles.flex} loading={saving} onPress={save} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  error: { fontSize: 13, color: colors.danger },
  actions: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
