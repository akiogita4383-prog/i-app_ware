import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ItemEditor, validateItemForm, type ItemFormErrors, type ItemFormValue } from '@/components/ItemEditor';
import { Button } from '@/components/ui';
import { getItem, softDeleteItem, updateItem, type ClothingItem } from '@/lib/db';
import { deleteItemImages, itemImageUri } from '@/lib/images';
import { colors, radius } from '@/lib/theme';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const [item, setItem] = useState<ClothingItem | null | undefined>(undefined);
  const [form, setForm] = useState<ItemFormValue | null>(null);
  const [errors, setErrors] = useState<ItemFormErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getItem(db, id).then((it) => {
      setItem(it);
      if (it) {
        setForm({
          category: it.category,
          name: it.name,
          color: it.color,
          material: it.material ?? '',
          memo: it.memo ?? '',
          tags: it.tags,
        });
      }
    });
  }, [db, id]);

  if (item === undefined) {
    return <ActivityIndicator style={{ marginTop: 40 }} color={colors.pink} />;
  }
  if (!item || !form) {
    return <Text style={styles.missing}>このアイテムは見つかりませんでした</Text>;
  }

  const save = async () => {
    const errs = validateItemForm(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      await updateItem(db, item.id, {
        category: form.category,
        name: form.name.trim(),
        color: form.color.trim(),
        material: form.material.trim() || null,
        silhouette: item.silhouette,
        memo: form.memo.trim() || null,
        tags: form.tags,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const remove = () =>
    Alert.alert(`「${item.name}」を削除しますか？`, '写真もこの iPhone から削除されます。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          await softDeleteItem(db, item.id);
          deleteItemImages(item.imageFile, item.thumbFile);
          router.back();
        },
      },
    ]);

  const image = itemImageUri(item.imageFile);

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.flex}>
      <Stack.Screen options={{ title: item.name }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {image && (
          <View style={styles.imageBox}>
            <Image alt={item.name} source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="contain" />
          </View>
        )}
        {item.silhouette ? <Text style={styles.meta}>特徴: {item.silhouette}</Text> : null}
        <ItemEditor value={form} onChange={setForm} errors={errors} />
        <Button title="更新する" loading={saving} onPress={save} />
        <Button title="削除" variant="danger" onPress={remove} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 20, gap: 16 },
  imageBox: {
    aspectRatio: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  meta: { fontSize: 13, color: colors.textMuted },
  missing: { textAlign: 'center', marginTop: 40, color: colors.textMuted },
});
