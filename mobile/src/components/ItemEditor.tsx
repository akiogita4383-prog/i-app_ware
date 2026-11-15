import { StyleSheet, View } from 'react-native';
import { CATEGORIES, TAG_OPTIONS, type Category } from '@/lib/categories';
import { Chip, Field, SectionLabel } from './ui';

export type ItemFormValue = {
  category: Category;
  name: string;
  color: string;
  material: string;
  memo: string;
  tags: string[];
};

export const emptyItemForm = (): ItemFormValue => ({
  category: 'tops',
  name: '',
  color: '',
  material: '',
  memo: '',
  tags: [],
});

export type ItemFormErrors = Partial<Record<'name' | 'color', string>>;

export function validateItemForm(v: ItemFormValue): ItemFormErrors {
  const errs: ItemFormErrors = {};
  if (!v.name.trim()) errs.name = 'アイテム名を入力してください';
  else if (v.name.length > 50) errs.name = '50文字以内で入力してください';
  if (!v.color.trim()) errs.color = '色を入力してください';
  return errs;
}

type Props = {
  value: ItemFormValue;
  onChange: (v: ItemFormValue) => void;
  errors?: ItemFormErrors;
  showMemo?: boolean;
};

export function ItemEditor({ value, onChange, errors = {}, showMemo = true }: Props) {
  const set = <K extends keyof ItemFormValue>(k: K, v: ItemFormValue[K]) => onChange({ ...value, [k]: v });
  const toggleTag = (tag: string) =>
    set('tags', value.tags.includes(tag) ? value.tags.filter((t) => t !== tag) : [...value.tags, tag]);

  return (
    <View style={styles.wrap}>
      <View style={styles.group}>
        <SectionLabel>カテゴリ</SectionLabel>
        <View style={styles.chips}>
          {CATEGORIES.map((c) => (
            <Chip key={c.value} label={c.label} selected={value.category === c.value} onPress={() => set('category', c.value)} />
          ))}
        </View>
      </View>
      <Field label="アイテム名" value={value.name} onChangeText={(v) => set('name', v)} placeholder="白シャツ" error={errors.name} />
      <View style={styles.row}>
        <View style={styles.flex}>
          <Field label="色" value={value.color} onChangeText={(v) => set('color', v)} placeholder="ホワイト" error={errors.color} />
        </View>
        <View style={styles.flex}>
          <Field label="素材（任意）" value={value.material} onChangeText={(v) => set('material', v)} placeholder="コットン" />
        </View>
      </View>
      {showMemo && (
        <Field label="メモ（任意）" value={value.memo} onChangeText={(v) => set('memo', v)} placeholder="お気に入りの一枚" />
      )}
      <View style={styles.group}>
        <SectionLabel>タグ（任意）</SectionLabel>
        <View style={styles.chips}>
          {TAG_OPTIONS.map((t) => (
            <Chip key={t} label={t} selected={value.tags.includes(t)} onPress={() => toggleTag(t)} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  group: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
});
