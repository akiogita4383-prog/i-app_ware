import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { liftSubject } from '@modules/subject-lifter';
import { ItemEditor, emptyItemForm, validateItemForm, type ItemFormErrors, type ItemFormValue } from '@/components/ItemEditor';
import { Button } from '@/components/ui';
import { analyzeItemImage } from '@/lib/ai';
import { useAiAvailable } from '@/lib/auth';
import { insertItem, newId } from '@/lib/db';
import { prepareImage, storeItemImage, type PreparedImage } from '@/lib/images';
import { colors, radius } from '@/lib/theme';

const MAX_PHOTOS = 5;

type Draft = {
  key: string;
  status: 'lifting' | 'analyzing' | 'ready';
  image: PreparedImage | null;
  previewUri: string;
  form: ItemFormValue;
  silhouette: string | null;
  confidence: number | null;
  aiError: string | null;
  errors: ItemFormErrors;
};

export default function ScanScreen() {
  const db = useSQLiteContext();
  const aiAvailable = useAiAvailable();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [saving, setSaving] = useState(false);

  const patch = (key: string, p: Partial<Draft>) =>
    setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...p } : d)));

  const processAsset = async (key: string, asset: ImagePicker.ImagePickerAsset) => {
    // 1. 背景除去（iOS Vision）。使えない環境では元の写真のまま
    const lifted = await liftSubject(asset.uri);
    const prepared = lifted
      ? await prepareImage(lifted.uri, lifted.width, lifted.height, true)
      : await prepareImage(asset.uri, asset.width, asset.height, false);
    patch(key, { image: prepared, previewUri: prepared.uri, status: aiAvailable ? 'analyzing' : 'ready' });
    if (!aiAvailable) return;

    // 2. AI 解析（失敗しても手入力で登録できる）
    try {
      const r = await analyzeItemImage(prepared.base64, prepared.mediaType);
      patch(key, {
        status: 'ready',
        silhouette: r.silhouette || null,
        confidence: r.confidence,
        form: { category: r.category, name: r.name, color: r.color, material: r.material, memo: '', tags: r.tags },
      });
    } catch (e) {
      patch(key, { status: 'ready', aiError: (e as Error).message });
    }
  };

  const addAssets = async (assets: ImagePicker.ImagePickerAsset[]) => {
    const room = MAX_PHOTOS - drafts.length;
    const picked = assets.slice(0, room).map((a) => ({ asset: a, key: newId() }));
    setDrafts((ds) => [
      ...ds,
      ...picked.map(({ asset, key }) => ({
        key,
        status: 'lifting' as const,
        image: null,
        previewUri: asset.uri,
        form: emptyItemForm(),
        silhouette: null,
        confidence: null,
        aiError: null,
        errors: {},
      })),
    ]);
    // 順番に処理（端末の負荷と API の同時実行を抑える）
    for (const { asset, key } of picked) {
      try {
        await processAsset(key, asset);
      } catch (e) {
        console.warn('[scan] process failed', e);
        patch(key, { status: 'ready', aiError: '画像の処理に失敗しました' });
      }
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('カメラを使えません', '設定アプリでカメラへのアクセスを許可してください。');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
    if (!res.canceled) await addAssets(res.assets);
  };

  const pickPhotos = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - drafts.length,
      quality: 1,
    });
    if (!res.canceled) await addAssets(res.assets);
  };

  const busy = drafts.some((d) => d.status !== 'ready');

  const saveAll = async () => {
    let hasError = false;
    const checked = drafts.map((d) => {
      const errors = validateItemForm(d.form);
      if (Object.keys(errors).length) hasError = true;
      return { ...d, errors };
    });
    setDrafts(checked);
    if (hasError) return;

    setSaving(true);
    try {
      for (const d of checked) {
        const id = newId();
        const files = d.image ? await storeItemImage(id, d.image) : { imageFile: null, thumbFile: null };
        await insertItem(db, {
          id,
          category: d.form.category,
          name: d.form.name.trim(),
          color: d.form.color.trim(),
          material: d.form.material.trim() || null,
          silhouette: d.silhouette,
          tags: d.form.tags,
          aiConfidence: d.confidence,
          ...files,
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      Alert.alert('保存できませんでした', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {drafts.length === 0 && (
          <View style={styles.intro}>
            <SymbolView name="camera.viewfinder" size={56} tintColor={colors.pink} />
            <Text style={styles.introTitle}>服の写真を撮るか選んでください</Text>
            <Text style={styles.introSub}>
              背景を自動で切り抜き{aiAvailable ? '、AI が種類や色を判定します' : 'ます'}。一度に{MAX_PHOTOS}枚まで。
            </Text>
          </View>
        )}

        {drafts.map((d, i) => (
          <View key={d.key} style={styles.draft}>
            <View style={styles.draftHead}>
              <View style={styles.preview}>
                <Image alt={`アイテム ${i + 1} の写真`} source={{ uri: d.previewUri }} style={StyleSheet.absoluteFill} contentFit="contain" />
                {d.status !== 'ready' && (
                  <View style={styles.overlay}>
                    <ActivityIndicator color={colors.pink} />
                  </View>
                )}
              </View>
              <View style={styles.flex}>
                <Text style={styles.draftTitle}>アイテム {i + 1}</Text>
                <Text style={styles.status}>
                  {d.status === 'lifting'
                    ? '背景を切り抜いています…'
                    : d.status === 'analyzing'
                      ? 'AI で解析しています…'
                      : d.aiError
                        ? d.aiError
                        : d.confidence != null
                          ? `信頼度 ${d.confidence}%`
                          : '内容を入力してください'}
                </Text>
                {d.confidence != null && d.confidence < 70 && (
                  <Text style={styles.warn}>精度低め・要確認</Text>
                )}
              </View>
              <Button
                title="外す"
                small
                variant="secondary"
                disabled={d.status !== 'ready'}
                onPress={() => setDrafts((ds) => ds.filter((x) => x.key !== d.key))}
              />
            </View>
            {d.status === 'ready' && (
              <ItemEditor
                value={d.form}
                onChange={(form) => patch(d.key, { form })}
                errors={d.errors}
                showMemo={false}
              />
            )}
          </View>
        ))}

        {drafts.length < MAX_PHOTOS && (
          <View style={styles.row}>
            <Button title="カメラで撮る" variant="secondary" style={styles.flex} onPress={takePhoto} disabled={saving} />
            <Button title="写真から選ぶ" variant="secondary" style={styles.flex} onPress={pickPhotos} disabled={saving} />
          </View>
        )}

        {drafts.length > 0 && (
          <Button
            title={`${drafts.length}点をクローゼットに追加`}
            variant="pink"
            loading={saving}
            disabled={busy}
            onPress={saveAll}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 20, gap: 20 },
  intro: { alignItems: 'center', gap: 10, paddingVertical: 32 },
  introTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  introSub: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19 },
  draft: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 16,
  },
  draftHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  preview: {
    width: 72,
    height: 90,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  status: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  warn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    color: colors.warnText,
    backgroundColor: colors.warnBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', gap: 12 },
});
