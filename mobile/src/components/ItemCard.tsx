import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CATEGORY_LABEL } from '@/lib/categories';
import type { ClothingItem } from '@/lib/db';
import { itemThumbUri } from '@/lib/images';
import { colors, radius } from '@/lib/theme';

export function ItemCard({ item, onPress }: { item: ClothingItem; onPress: () => void }) {
  const thumb = itemThumbUri(item.thumbFile);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
      <View style={styles.imageBox}>
        {thumb ? (
          <Image alt={item.name} source={{ uri: thumb }} style={StyleSheet.absoluteFill} contentFit="contain" transition={150} />
        ) : (
          <SymbolView name="tshirt" size={36} tintColor={colors.textFaint} />
        )}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{CATEGORY_LABEL[item.category] ?? item.category}</Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.sub} numberOfLines={1}>{item.color}</Text>
        <View style={styles.footer}>
          <Text style={styles.tags} numberOfLines={1}>
            {item.tags.slice(0, 2).map((t) => `#${t}`).join(' ')}
          </Text>
          {item.wornCount > 0 && <Text style={styles.sub}>{item.wornCount}回</Text>}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  imageBox: {
    aspectRatio: 3 / 4,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: '600', color: colors.textSub },
  body: { padding: 10, gap: 2 },
  name: { fontSize: 14, fontWeight: '600', color: colors.text },
  sub: { fontSize: 12, color: colors.textMuted },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, gap: 6 },
  tags: { fontSize: 11, color: colors.textMuted, flex: 1 },
});
