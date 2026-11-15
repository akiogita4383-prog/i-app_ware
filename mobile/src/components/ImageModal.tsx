import { Image } from 'expo-image';
import * as Sharing from 'expo-sharing';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { colors, radius } from '@/lib/theme';

/** 画像を大きく表示し、共有（「画像を保存」で写真に保存できる）などの操作を出す */
export function ImageModal({
  uri,
  title,
  onClose,
  primary,
  danger,
}: {
  uri: string | null;
  title: string;
  onClose: () => void;
  primary?: { title: string; onPress: () => void; disabled?: boolean; loading?: boolean };
  danger?: { title: string; onPress: () => void };
}) {
  const share = async () => {
    if (!uri) return;
    try {
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' });
    } catch (e) {
      Alert.alert('共有できませんでした', (e as Error).message);
    }
  };

  return (
    <Modal visible={!!uri} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="閉じる" onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>閉じる</Text>
          </Pressable>
        </View>
        {uri && <Image alt={title} source={{ uri }} style={styles.image} contentFit="contain" />}
        <View style={styles.actions}>
          {primary && (
            <Button
              title={primary.title}
              variant="pink"
              onPress={primary.onPress}
              disabled={primary.disabled}
              loading={primary.loading}
            />
          )}
          <Button title="共有・写真に保存" variant="secondary" onPress={share} />
          {danger && <Button title={danger.title} variant="danger" onPress={danger.onPress} />}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
  close: { fontSize: 16, color: colors.pink, fontWeight: '600' },
  image: { flex: 1, marginHorizontal: 16, borderRadius: radius.lg, backgroundColor: '#fff' },
  actions: { padding: 16, gap: 10 },
});
