import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { ItemEditor, emptyItemForm, validateItemForm, type ItemFormErrors } from '@/components/ItemEditor';
import { Button } from '@/components/ui';
import { insertItem } from '@/lib/db';

export default function NewItemScreen() {
  const db = useSQLiteContext();
  const [form, setForm] = useState(emptyItemForm);
  const [errors, setErrors] = useState<ItemFormErrors>({});
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const errs = validateItemForm(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      await insertItem(db, {
        category: form.category,
        name: form.name.trim(),
        color: form.color.trim(),
        material: form.material.trim() || null,
        memo: form.memo.trim() || null,
        tags: form.tags,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <ItemEditor value={form} onChange={setForm} errors={errors} />
        <View style={styles.actions}>
          <Button title="キャンセル" variant="secondary" style={styles.flex} onPress={() => router.back()} />
          <Button title="追加する" style={styles.flex} loading={saving} onPress={save} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 20, gap: 24 },
  actions: { flexDirection: 'row', gap: 12 },
});
