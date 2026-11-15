import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';
import type { ClothingItem } from '@/lib/db';
import { itemThumbUri } from '@/lib/images';
import { colors, radius } from '@/lib/theme';

/** コーデのアイテムを小さなサムネイルで横に並べる */
export function OutfitThumbs({ items, size = 56, max = 5 }: { items: ClothingItem[]; size?: number; max?: number }) {
  if (items.length === 0) return <Text style={styles.empty}>アイテムなし</Text>;
  return (
    <View style={styles.row}>
      {items.slice(0, max).map((item) => {
        const uri = itemThumbUri(item.thumbFile);
        return (
          <View key={item.id} style={[styles.box, { width: size, height: size * 1.2 }]}>
            {uri ? (
              <Image alt={item.name} source={{ uri }} style={StyleSheet.absoluteFill} contentFit="contain" />
            ) : (
              <View style={styles.placeholder}>
                <SymbolView name="tshirt" size={size * 0.35} tintColor={colors.textFaint} />
                <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
              </View>
            )}
          </View>
        );
      })}
      {items.length > max && <Text style={styles.more}>+{items.length - max}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  box: {
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 2, gap: 2 },
  name: { fontSize: 8, color: colors.textMuted, textAlign: 'center' },
  more: { fontSize: 12, color: colors.textMuted },
  empty: { fontSize: 12, color: colors.textMuted },
});
