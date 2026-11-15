import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/ui';
import { colors, radius } from '@/lib/theme';

const OPTIONS = [
  { value: 3, label: '⭐⭐⭐ 最高だった' },
  { value: 2, label: '⭐⭐ 良かった' },
  { value: 1, label: '⭐ まあまあ' },
  { value: 0, label: '👎 着なかった' },
] as const;

export type RatingValue = (typeof OPTIONS)[number]['value'];

export function RatingModal({
  visible,
  title = 'このコーデはどうでしたか？',
  onSubmit,
  onClose,
}: {
  visible: boolean;
  title?: string;
  onSubmit: (rating: RatingValue, note?: string) => Promise<void> | void;
  onClose: () => void;
}) {
  const [rating, setRating] = useState<RatingValue | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const close = () => {
    setRating(null);
    setNote('');
    onClose();
  };

  const submit = async () => {
    if (rating === null) return;
    setSaving(true);
    try {
      await onSubmit(rating, note.trim() || undefined);
      setRating(null);
      setNote('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.sub}>評価すると、次からの AI の提案に反映されます</Text>
          <View style={styles.options}>
            {OPTIONS.map((o) => (
              <Pressable
                key={o.value}
                accessibilityRole="radio"
                accessibilityState={{ selected: rating === o.value }}
                onPress={() => setRating(o.value)}
                style={[styles.option, rating === o.value && styles.optionActive]}
              >
                <Text style={[styles.optionText, rating === o.value && styles.optionTextActive]}>{o.label}</Text>
              </Pressable>
            ))}
          </View>
          {rating === 0 && (
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="理由（任意）"
              placeholderTextColor={colors.textFaint}
              style={styles.input}
            />
          )}
          <View style={styles.actions}>
            <Button title="あとで" variant="secondary" style={styles.flex} onPress={close} />
            <Button title="送信" style={styles.flex} disabled={rating === null} loading={saving} onPress={submit} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end', padding: 16 },
  sheet: { backgroundColor: '#fff', borderRadius: radius.lg, padding: 20, gap: 12, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  sub: { fontSize: 13, color: colors.textMuted },
  options: { gap: 8 },
  option: { paddingVertical: 13, paddingHorizontal: 16, borderRadius: radius.md, backgroundColor: colors.bg },
  optionActive: { backgroundColor: colors.text },
  optionText: { fontSize: 15, fontWeight: '500', color: colors.text },
  optionTextActive: { color: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  flex: { flex: 1 },
});
