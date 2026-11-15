import { File, Paths } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ImageModal } from '@/components/ImageModal';
import { Button, Card, Chip } from '@/components/ui';
import { generateCoordinate, searchShopping, type Product, type ShoppingGroup } from '@/lib/aiFeatures';
import { useAiAvailable } from '@/lib/auth';
import { avatarBase64 } from '@/lib/avatars';
import { CATEGORY_LABEL, type Category } from '@/lib/categories';
import { listItems, newId, type ClothingItem } from '@/lib/db';
import { itemThumbUri } from '@/lib/images';
import { saveLiked } from '@/lib/liked';
import { loadPrefs, personalColorLabels, type Prefs } from '@/lib/prefs';
import { colors, radius } from '@/lib/theme';

type SearchCategory = Exclude<Category, 'other'>;
const SEARCH_CATEGORIES: { value: SearchCategory; label: string }[] = [
  { value: 'tops', label: 'トップス' },
  { value: 'bottoms', label: 'ボトムス' },
  { value: 'outer', label: 'アウター' },
  { value: 'shoes', label: 'シューズ' },
  { value: 'accessories', label: 'バッグ・小物' },
];

type Owned = Partial<Record<Category, ClothingItem>>;

export default function ShoppingScreen() {
  const db = useSQLiteContext();
  const aiAvailable = useAiAvailable();
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [owned, setOwned] = useState<Owned>({});
  const [category, setCategory] = useState<SearchCategory | null>('bottoms');
  const [groups, setGroups] = useState<ShoppingGroup[]>([]);
  const [source, setSource] = useState<'yahoo' | 'keywords' | null>(null);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<Record<number, string>>({});
  const [generatingIdx, setGeneratingIdx] = useState<number | null>(null);
  const [generated, setGenerated] = useState<{ uri: string; base64: string; label: string } | null>(null);
  const [likedSaved, setLikedSaved] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [all, p] = await Promise.all([listItems(db), loadPrefs(db)]);
        setItems(all);
        setPrefs(p);
        const ids = new Set(all.map((i) => i.id));
        setOwned((prev) => {
          const next: Owned = {};
          for (const [cat, item] of Object.entries(prev) as [Category, ClothingItem][]) {
            if (ids.has(item.id)) next[cat] = item;
          }
          return next;
        });
      })();
    }, [db]),
  );

  const toggleOwned = (item: ClothingItem) => {
    Haptics.selectionAsync();
    const removing = owned[item.category]?.id === item.id;
    const next = { ...owned };
    if (removing) delete next[item.category];
    else next[item.category] = item;
    setOwned(next);
    if (!removing && category === item.category) setCategory(null);
  };

  const search = async () => {
    if (!category) return;
    setSearching(true);
    setPicked({});
    try {
      const res = await searchShopping({
        category,
        owned: Object.values(owned).filter((i): i is ClothingItem => !!i),
        personalColors: personalColorLabels(prefs?.personalColors ?? []),
      });
      setGroups(res.groups);
      setSource(res.source);
    } catch (e) {
      Alert.alert('検索できませんでした', (e as Error).message);
    } finally {
      setSearching(false);
    }
  };

  const generate = async (idx: number, product: Product) => {
    if (!category || !prefs) return;
    setGeneratingIdx(idx);
    try {
      const base64 = await generateCoordinate({
        avatarBase64: await avatarBase64(prefs.avatarId),
        items: Object.values(owned).filter((i): i is ClothingItem => !!i),
        product: { ...product, category },
      });
      const file = new File(Paths.cache, `coordinate-${newId()}.png`);
      file.write(base64, { encoding: 'base64' });
      setLikedSaved(false);
      setGenerated({ uri: file.uri, base64, label: product.name.slice(0, 40) });
    } catch (e) {
      Alert.alert('イラストを作れませんでした', (e as Error).message);
    } finally {
      setGeneratingIdx(null);
    }
  };

  const open = (url: string) => Linking.openURL(url).catch(() => Alert.alert('ページを開けませんでした'));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View>
          <Text style={styles.title}>ショッピング</Text>
          <Text style={styles.sub}>手持ちの服に合うアイテムを見つけよう</Text>
        </View>

        {!aiAvailable ? (
          <Card>
            <Text style={styles.muted}>設定で「AI 機能」をオンにすると、手持ちの服に合うアイテムを AI が探します。</Text>
            <Button title="設定を開く" small variant="secondary" onPress={() => router.push('/settings')} />
          </Card>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                持っているアイテムを選ぶ <Text style={styles.muted}>（カテゴリごとに1点）</Text>
              </Text>
              {items.length === 0 ? (
                <Text style={styles.muted}>クローゼットに服を登録すると、ここから選べます。</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
                  {items.map((item) => {
                    const on = owned[item.category]?.id === item.id;
                    const uri = itemThumbUri(item.thumbFile);
                    return (
                      <Pressable
                        key={item.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        accessibilityLabel={item.name}
                        onPress={() => toggleOwned(item)}
                        style={styles.stripItem}
                      >
                        <View style={[styles.stripImage, on && styles.stripImageOn]}>
                          {uri ? (
                            <Image alt={item.name} source={{ uri }} style={StyleSheet.absoluteFill} contentFit="contain" />
                          ) : (
                            <SymbolView name="tshirt" size={24} tintColor={colors.textFaint} />
                          )}
                        </View>
                        <Text style={styles.stripName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.stripCat}>{CATEGORY_LABEL[item.category]}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>探したいアイテム</Text>
              <View style={styles.chips}>
                {SEARCH_CATEGORIES.map((c) => {
                  const isOwned = !!owned[c.value];
                  return (
                    <Chip
                      key={c.value}
                      label={isOwned ? `${c.label}（選択中）` : c.label}
                      selected={category === c.value}
                      onPress={() => !isOwned && setCategory(c.value)}
                    />
                  );
                })}
              </View>
              <Button
                title={searching ? 'AI が探しています…' : 'AI で探す'}
                variant="pink"
                loading={searching}
                disabled={!category}
                onPress={search}
              />
            </View>

            {groups.map((g, gi) => {
              const selectedId = picked[gi] ?? g.products[0]?.id;
              const selected = g.products.find((p) => p.id === selectedId);
              return (
                <Card key={`${g.keyword}-${gi}`}>
                  <Text style={styles.kwLabel}>探しているアイテム</Text>
                  <Text style={styles.keyword}>「{g.keyword}」</Text>
                  {g.products.length === 0 ? (
                    <Button
                      title="Yahoo!ショッピングで探す"
                      small
                      variant="secondary"
                      onPress={() => open(g.searchUrl)}
                    />
                  ) : (
                    <>
                      {g.products.map((p) => {
                        const on = p.id === selectedId;
                        return (
                          <Pressable
                            key={p.id}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: on }}
                            onPress={() => setPicked((prev) => ({ ...prev, [gi]: p.id }))}
                            style={[styles.product, on && styles.productOn]}
                          >
                            <View style={[styles.radio, on && styles.radioOn]} />
                            <Image alt={p.name} source={{ uri: p.imageUrl }} style={styles.productImage} contentFit="contain" />
                            <View style={styles.flex}>
                              <Text style={styles.productName} numberOfLines={2}>{p.name}</Text>
                              {!!p.brand && <Text style={styles.brand} numberOfLines={1}>{p.brand}</Text>}
                              <Text style={styles.price}>¥{p.price.toLocaleString()}</Text>
                            </View>
                            <Pressable accessibilityRole="link" onPress={() => open(p.url)} style={styles.buy} hitSlop={6}>
                              <Text style={styles.buyText}>購入</Text>
                            </Pressable>
                          </Pressable>
                        );
                      })}
                      <Button
                        title={generatingIdx === gi ? '生成中…' : '✨ このコーデを AI でイラスト化'}
                        small
                        variant="pink"
                        loading={generatingIdx === gi}
                        disabled={!selected || generatingIdx !== null}
                        onPress={() => selected && generate(gi, selected)}
                      />
                    </>
                  )}
                </Card>
              );
            })}
            {generatingIdx !== null && <Text style={styles.muted}>イラストの生成には30秒〜1分ほどかかります。</Text>}
            {source === 'yahoo' && (
              <Pressable onPress={() => open('https://developer.yahoo.co.jp/sitemap/')}>
                <Text style={styles.credit}>Web Services by Yahoo! JAPAN</Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>

      <ImageModal
        uri={generated?.uri ?? null}
        title="✨ AI コーデ"
        onClose={() => setGenerated(null)}
        primary={{
          title: likedSaved ? '♥ Like に保存済み' : '♡ Like に保存',
          disabled: likedSaved,
          onPress: async () => {
            if (!generated) return;
            await saveLiked(db, generated.base64, generated.label);
            setLikedSaved(true);
          },
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 16, gap: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  sub: { fontSize: 13, color: colors.textMuted },
  muted: { fontSize: 12, lineHeight: 18, color: colors.textMuted, fontWeight: '400' },
  section: { gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  strip: { gap: 10, paddingRight: 16 },
  stripItem: { width: 72, gap: 2 },
  stripImage: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: colors.border,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripImageOn: { borderColor: colors.pink },
  stripName: { fontSize: 10, color: colors.textSub, textAlign: 'center' },
  stripCat: { fontSize: 9, color: colors.textMuted, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kwLabel: { fontSize: 11, fontWeight: '700', color: colors.pink },
  keyword: { fontSize: 15, fontWeight: '700', color: colors.text },
  product: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: radius.md },
  productOn: { backgroundColor: '#FDF2F8', borderWidth: 1, borderColor: '#F9A8D4' },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.textFaint },
  radioOn: { borderColor: colors.pink, backgroundColor: colors.pink },
  productImage: { width: 52, height: 52, borderRadius: radius.sm, backgroundColor: '#fff' },
  flex: { flex: 1 },
  productName: { fontSize: 12, fontWeight: '600', color: colors.text },
  brand: { fontSize: 11, color: colors.textMuted },
  price: { fontSize: 13, fontWeight: '700', color: colors.pink },
  buy: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  buyText: { fontSize: 11, fontWeight: '700', color: colors.textSub },
  credit: { fontSize: 11, color: colors.textMuted, textAlign: 'center', textDecorationLine: 'underline' },
});
