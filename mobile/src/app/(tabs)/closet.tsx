import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ItemCard } from '@/components/ItemCard';
import { Button, Chip } from '@/components/ui';
import { CATEGORIES, type Category } from '@/lib/categories';
import { listItems, type ClothingItem } from '@/lib/db';
import { colors } from '@/lib/theme';

type Filter = 'all' | Category;

export default function ClosetScreen() {
  const db = useSQLiteContext();
  const [filter, setFilter] = useState<Filter>('all');
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setItems(await listItems(db, filter === 'all' ? undefined : filter));
    setLoading(false);
  }, [db, filter]);

  // 追加・編集のモーダルから戻ったときにも読み直す
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text style={styles.count}>{items.length}点</Text>
        <View style={styles.actions}>
          <Button title="スキャン" small variant="secondary" onPress={() => router.push('/item/scan')} />
          <Button title="手動追加" small onPress={() => router.push('/item/new')} />
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="すべて" selected={filter === 'all'} onPress={() => setFilter('all')} />
        {CATEGORIES.map((c) => (
          <Chip key={c.value} label={c.label} selected={filter === c.value} onPress={() => setFilter(c.value)} />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <FlatList
      data={items}
      keyExtractor={(i) => i.id}
      numColumns={2}
      ListHeaderComponent={header}
      columnWrapperStyle={styles.column}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
      renderItem={({ item }) => (
        <View style={styles.cell}>
          <ItemCard item={item} onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.id } })} />
        </View>
      )}
      ListEmptyComponent={
        loading ? undefined : (
          <View style={styles.empty}>
            <SymbolView name="hanger" size={56} tintColor={colors.textFaint} />
            <Text style={styles.emptyTitle}>アイテムがありません</Text>
            <Text style={styles.emptySub}>写真スキャンまたは手動で追加してください</Text>
          </View>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingTop: 4, gap: 12 },
  header: { gap: 12, marginBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  count: { fontSize: 14, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: 8 },
  chips: { gap: 8, paddingRight: 16 },
  column: { gap: 12 },
  cell: { flex: 1 / 2 },
  empty: { alignItems: 'center', paddingVertical: 64, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: colors.textMuted },
  emptySub: { fontSize: 13, color: colors.textFaint },
});
