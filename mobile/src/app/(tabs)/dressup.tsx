import * as Haptics from 'expo-haptics';
import { File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  type GestureResponderEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { ImageModal } from '@/components/ImageModal';
import { Button, Card, Chip } from '@/components/ui';
import { generateCoordinate } from '@/lib/aiFeatures';
import { useAiAvailable } from '@/lib/auth';
import { AVATAR_ASPECT, AVATARS, avatarBase64, avatarById, DEFAULT_FITS, LAYER_ORDER } from '@/lib/avatars';
import { CATEGORIES, CATEGORY_LABEL, type Category } from '@/lib/categories';
import { fromYmd, jaDate, ymd } from '@/lib/dates';
import { listItems, newId, setItemFit, type ClothingItem, type Fit } from '@/lib/db';
import { itemImageUri, itemThumbUri } from '@/lib/images';
import { deleteLiked, listLiked, saveLiked, type LikedImage } from '@/lib/liked';
import { adoptOutfit, getOutfitForDate } from '@/lib/outfits';
import { loadPrefs, savePref } from '@/lib/prefs';
import { colors, radius } from '@/lib/theme';

type Selection = Partial<Record<Category, ClothingItem>>;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export default function DressUpScreen() {
  const db = useSQLiteContext();
  const aiAvailable = useAiAvailable();
  const params = useLocalSearchParams<{ date?: string }>();
  const date = params.date ?? ymd();
  const { width: screenW } = useWindowDimensions();
  const stageW = screenW - 32;
  const stageH = stageW / AVATAR_ASPECT;

  const [items, setItems] = useState<ClothingItem[]>([]);
  const [avatarId, setAvatarId] = useState('default');
  const [selection, setSelection] = useState<Selection>({});
  const [draftFits, setDraftFits] = useState<Record<string, Fit>>({});
  const [active, setActive] = useState<Category | null>(null);
  const [filter, setFilter] = useState<Category>('tops');
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<{ uri: string; base64: string } | null>(null);
  const [likedSaved, setLikedSaved] = useState(false);
  const [liked, setLiked] = useState<LikedImage[]>([]);
  const [viewing, setViewing] = useState<LikedImage | null>(null);

  const stageRef = useRef<React.ComponentRef<typeof View>>(null);
  const loadedFor = useRef<string | null>(null);

  const load = useCallback(async () => {
    const [all, prefs, likes] = await Promise.all([listItems(db), loadPrefs(db), listLiked(db)]);
    setItems(all);
    setAvatarId(prefs.avatarId);
    setLiked(likes);
    // 開いた日付のコーデがあれば、最初にそれを着せる
    if (loadedFor.current !== date) {
      loadedFor.current = date;
      const outfit = await getOutfitForDate(db, date);
      const next: Selection = {};
      for (const item of outfit?.items ?? []) next[item.category] = item;
      setSelection(next);
      setActive(null);
    } else {
      // 編集・削除された服を反映
      const map = new Map(all.map((i) => [i.id, i]));
      setSelection((prev) => {
        const next: Selection = {};
        for (const [cat, item] of Object.entries(prev) as [Category, ClothingItem][]) {
          const fresh = map.get(item.id);
          if (fresh && fresh.category === cat) next[cat] = fresh;
        }
        return next;
      });
    }
  }, [db, date]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const fitOf = useCallback(
    (item: ClothingItem): Fit => draftFits[item.id] ?? item.fit ?? DEFAULT_FITS[item.category],
    [draftFits],
  );

  const toggleItem = (item: ClothingItem) => {
    Haptics.selectionAsync();
    const removing = selection[item.category]?.id === item.id;
    setSelection((prev) => {
      const next = { ...prev };
      if (removing) delete next[item.category];
      else next[item.category] = item;
      return next;
    });
    setActive(removing ? (active === item.category ? null : active) : item.category);
  };

  const updateFit = useCallback((item: ClothingItem, fit: Fit) => {
    setDraftFits((prev) => ({ ...prev, [item.id]: fit }));
  }, []);

  const persistFit = useCallback(
    async (item: ClothingItem, fit: Fit | null) => {
      await setItemFit(db, item.id, fit);
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, fit } : i)));
      setSelection((prev) => (prev[item.category]?.id === item.id ? { ...prev, [item.category]: { ...item, fit } } : prev));
      setDraftFits((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    },
    [db],
  );

  const activeItem = active ? selection[active] : undefined;
  const adjust = (change: Partial<Fit>) => {
    if (!activeItem) return;
    const cur = fitOf(activeItem);
    const fit = {
      ...cur,
      ...change,
      width: clamp(change.width ?? cur.width, 6, 100),
      rotation: ((change.rotation ?? cur.rotation) + 360) % 360,
    };
    persistFit(activeItem, fit);
  };

  const selectedItems = useMemo(
    () => LAYER_ORDER.map((c) => selection[c]).filter((i): i is ClothingItem => !!i),
    [selection],
  );
  const filtered = items.filter((i) => i.category === filter);

  const adopt = async () => {
    if (selectedItems.length === 0) return Alert.alert('アイテムを選んでください');
    setSaving(true);
    try {
      await adoptOutfit(db, { date, itemIds: selectedItems.map((i) => i.id), title: 'マイコーデ' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('保存しました', `${jaDate(fromYmd(date))}のコーデにしました。`);
    } catch (e) {
      Alert.alert('保存できませんでした', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const shareSnapshot = async () => {
    setActive(null);
    try {
      // 選択枠が消えてから撮る
      await new Promise((r) => setTimeout(r, 50));
      const uri = await captureRef(stageRef as never, { format: 'png', quality: 1, result: 'tmpfile' });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' });
    } catch (e) {
      Alert.alert('画像を作れませんでした', (e as Error).message);
    }
  };

  const generate = async () => {
    if (selectedItems.length === 0) return Alert.alert('アイテムを選んでください');
    setGenerating(true);
    try {
      const base64 = await generateCoordinate({ avatarBase64: await avatarBase64(avatarId), items: selectedItems });
      // 共有シートに渡せるよう、一時ファイルにも書き出しておく
      const file = new File(Paths.cache, `coordinate-${newId()}.png`);
      file.write(base64, { encoding: 'base64' });
      setLikedSaved(false);
      setGenerated({ uri: file.uri, base64 });
    } catch (e) {
      Alert.alert('イラストを作れませんでした', (e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const changeAvatar = async () => {
    const idx = AVATARS.findIndex((a) => a.id === avatarId);
    const next = AVATARS[(idx + 1) % AVATARS.length].id;
    setAvatarId(next);
    await savePref(db, 'avatarId', next);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} scrollEnabled={!dragging}>
        <View style={styles.header}>
          <View style={styles.flex}>
            <Text style={styles.title}>着せ替え</Text>
            <Text style={styles.sub}>{jaDate(fromYmd(date))}のコーデ</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={changeAvatar} style={styles.avatarButton}>
            <SymbolView name="person.crop.circle" size={18} tintColor={colors.textSub} />
            <Text style={styles.avatarLabel}>{avatarById(avatarId).label}</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => setActive(null)}>
          <View ref={stageRef} collapsable={false} style={[styles.stage, { width: stageW, height: stageH }]}>
            <Image
              alt="アバター"
              source={avatarById(avatarId).source}
              style={StyleSheet.absoluteFill}
              contentFit="contain"
            />
            {LAYER_ORDER.map((cat) => {
              const item = selection[cat];
              if (!item) return null;
              return (
                <Layer
                  key={item.id}
                  item={item}
                  fit={fitOf(item)}
                  stageW={stageW}
                  stageH={stageH}
                  active={active === cat}
                  onActivate={() => setActive(cat)}
                  onDragState={setDragging}
                  onMove={updateFit}
                  onRelease={persistFit}
                />
              );
            })}
          </View>
        </Pressable>

        {activeItem ? (
          <Card style={styles.controls}>
            <Text style={styles.controlTitle} numberOfLines={1}>
              {CATEGORY_LABEL[activeItem.category]}：{activeItem.name}
            </Text>
            <Text style={styles.hint}>ドラッグで位置を動かせます</Text>
            <View style={styles.controlRow}>
              <ControlButton icon="minus.magnifyingglass" label="小さく" onPress={() => adjust({ width: fitOf(activeItem).width - 3 })} />
              <ControlButton icon="plus.magnifyingglass" label="大きく" onPress={() => adjust({ width: fitOf(activeItem).width + 3 })} />
              <ControlButton icon="rotate.left" label="左へ" onPress={() => adjust({ rotation: fitOf(activeItem).rotation - 5 })} />
              <ControlButton icon="rotate.right" label="右へ" onPress={() => adjust({ rotation: fitOf(activeItem).rotation + 5 })} />
              <ControlButton icon="arrow.counterclockwise" label="元に戻す" onPress={() => persistFit(activeItem, null)} />
              <ControlButton icon="xmark" label="外す" onPress={() => toggleItem(activeItem)} />
            </View>
          </Card>
        ) : (
          <Text style={styles.hint}>
            服をタップすると、位置や大きさを調整できます。背景を切り抜いた写真だと、きれいに重なります。
          </Text>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {CATEGORIES.map((c) => (
            <Chip key={c.value} label={c.label} selected={filter === c.value} onPress={() => setFilter(c.value)} />
          ))}
        </ScrollView>
        {filtered.length === 0 ? (
          <Pressable onPress={() => router.push('/closet')}>
            <Text style={styles.empty}>このカテゴリの服はまだありません。クローゼットで追加できます。</Text>
          </Pressable>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
            {filtered.map((item) => {
              const uri = itemThumbUri(item.thumbFile);
              const on = selection[item.category]?.id === item.id;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={item.name}
                  onPress={() => toggleItem(item)}
                  style={styles.stripItem}
                >
                  <View style={[styles.stripImage, on && styles.stripImageOn]}>
                    {uri ? (
                      <Image alt={item.name} source={{ uri }} style={StyleSheet.absoluteFill} contentFit="contain" />
                    ) : (
                      <SymbolView name="tshirt" size={26} tintColor={colors.textFaint} />
                    )}
                    {on && (
                      <View style={styles.check}>
                        <SymbolView name="checkmark" size={11} tintColor="#fff" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.stripName} numberOfLines={1}>{item.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <Button
          title={`${jaDate(fromYmd(date), 'M/d')}のコーデにする`}
          loading={saving}
          disabled={selectedItems.length === 0}
          onPress={adopt}
        />
        <View style={styles.row}>
          <Button title="画像を保存・共有" variant="secondary" style={styles.flex} disabled={selectedItems.length === 0} onPress={shareSnapshot} />
          {aiAvailable && (
            <Button
              title={generating ? '生成中…' : '✨ AI でイラスト化'}
              variant="pink"
              style={styles.flex}
              loading={generating}
              disabled={selectedItems.length === 0}
              onPress={generate}
            />
          )}
        </View>
        {generating && <Text style={styles.hint}>イラストの生成には30秒〜1分ほどかかります。</Text>}

        {liked.length > 0 && (
          <View style={styles.likedSection}>
            <Text style={styles.sectionTitle}>♡ Like（{liked.length}件）</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
              {liked.map((l) => (
                <Pressable key={l.id} onPress={() => setViewing(l)} style={styles.likedItem}>
                  <Image alt={l.label ?? 'AI コーデ'} source={{ uri: l.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                </Pressable>
              ))}
            </ScrollView>
          </View>
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
            await saveLiked(db, generated.base64, selectedItems.map((i) => i.name).join('・').slice(0, 40));
            setLikedSaved(true);
            setLiked(await listLiked(db));
          },
        }}
      />
      <ImageModal
        uri={viewing?.uri ?? null}
        title={viewing?.label ?? 'AI コーデ'}
        onClose={() => setViewing(null)}
        danger={{
          title: '削除する',
          onPress: async () => {
            if (!viewing) return;
            await deleteLiked(db, viewing.id);
            setViewing(null);
            setLiked(await listLiked(db));
          },
        }}
      />
    </SafeAreaView>
  );
}

function Layer({
  item,
  fit,
  stageW,
  stageH,
  active,
  onActivate,
  onDragState,
  onMove,
  onRelease,
}: {
  item: ClothingItem;
  fit: Fit;
  stageW: number;
  stageH: number;
  active: boolean;
  onActivate: () => void;
  onDragState: (dragging: boolean) => void;
  onMove: (item: ClothingItem, fit: Fit) => void;
  onRelease: (item: ClothingItem, fit: Fit) => void;
}) {
  // ドラッグ開始時の指の位置と配置を覚えておき、移動量を % に直して動かす
  const start = useRef<{ pageX: number; pageY: number; fit: Fit } | null>(null);
  const latestFit = useRef<Fit | null>(null);

  const onGrant = (e: GestureResponderEvent) => {
    start.current = { pageX: e.nativeEvent.pageX, pageY: e.nativeEvent.pageY, fit };
    latestFit.current = null;
    onActivate();
    onDragState(true);
  };
  const onMoveTouch = (e: GestureResponderEvent) => {
    const s = start.current;
    if (!s) return;
    const next = {
      ...s.fit,
      x: clamp(s.fit.x + ((e.nativeEvent.pageX - s.pageX) / stageW) * 100, 0, 100),
      y: clamp(s.fit.y + ((e.nativeEvent.pageY - s.pageY) / stageH) * 100, 0, 100),
    };
    latestFit.current = next;
    onMove(item, next);
  };
  const onEnd = () => {
    onDragState(false);
    start.current = null;
    // ほぼ動かしていなければ選択だけ
    if (latestFit.current) onRelease(item, latestFit.current);
    latestFit.current = null;
  };

  const uri = itemImageUri(item.imageFile) ?? itemThumbUri(item.thumbFile);
  const size = (fit.width / 100) * stageW;
  return (
    <View
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={onGrant}
      onResponderMove={onMoveTouch}
      onResponderRelease={onEnd}
      onResponderTerminate={onEnd}
      accessibilityLabel={item.name}
      style={[
        styles.layer,
        {
          width: size,
          height: size,
          left: (fit.x / 100) * stageW - size / 2,
          top: (fit.y / 100) * stageH - size / 2,
          transform: [{ rotate: `${fit.rotation}deg` }],
        },
        active && styles.layerActive,
      ]}
    >
      {uri ? (
        <Image alt={item.name} source={{ uri }} style={StyleSheet.absoluteFill} contentFit="contain" />
      ) : (
        <View style={styles.layerPlaceholder}>
          <Text style={styles.layerText} numberOfLines={2}>{item.name}</Text>
        </View>
      )}
    </View>
  );
}

function ControlButton({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.controlButton}>
      <SymbolView name={icon as never} size={18} tintColor={colors.text} />
      <Text style={styles.controlLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 16, gap: 12, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  sub: { fontSize: 13, color: colors.textMuted },
  avatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarLabel: { fontSize: 13, color: colors.textSub, fontWeight: '600' },
  stage: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  layer: { position: 'absolute' },
  layerActive: { borderWidth: 1.5, borderColor: colors.pink, borderStyle: 'dashed', borderRadius: 8 },
  layerPlaceholder: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  layerText: { fontSize: 10, color: colors.textSub, textAlign: 'center' },
  controls: { padding: 12, gap: 6 },
  controlTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  controlRow: { flexDirection: 'row', justifyContent: 'space-between' },
  controlButton: { alignItems: 'center', gap: 3, paddingVertical: 4, minWidth: 48 },
  controlLabel: { fontSize: 10, color: colors.textSub },
  hint: { fontSize: 12, lineHeight: 18, color: colors.textMuted },
  chips: { gap: 8, paddingRight: 16 },
  strip: { gap: 10, paddingRight: 16 },
  stripItem: { width: 72, gap: 4 },
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
  check: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripName: { fontSize: 10, color: colors.textSub, textAlign: 'center' },
  empty: { fontSize: 13, color: colors.textMuted, paddingVertical: 12 },
  row: { flexDirection: 'row', gap: 10 },
  likedSection: { gap: 8, marginTop: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  likedItem: { width: 96, aspectRatio: 2 / 3, borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#fff' },
});
