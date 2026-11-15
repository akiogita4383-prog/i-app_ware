import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/lib/auth';
import { DB_NAME, migrate } from '@/lib/db';
import { colors } from '@/lib/theme';

// 共有シートなどからアプリ内の画面へ直接開いたときも、下にタブ画面を置く（閉じるとホームに戻れる）
export const unstable_settings = { initialRouteName: '(tabs)' };

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName={DB_NAME} onInit={migrate}>
        <AuthProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.text,
              headerBackButtonDisplayMode: 'minimal',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="welcome" options={{ gestureEnabled: false }} />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="item/scan" options={{ presentation: 'modal', headerShown: true, title: '画像から登録' }} />
            <Stack.Screen name="expo-sharing" options={{ animation: 'none' }} />
            <Stack.Screen name="item/new" options={{ presentation: 'modal', headerShown: true, title: '手動で追加' }} />
            <Stack.Screen name="item/[id]" options={{ headerShown: true, title: 'アイテム' }} />
            <Stack.Screen name="settings" options={{ headerShown: true, title: '設定' }} />
            <Stack.Screen name="outfit" options={{ presentation: 'modal', headerShown: true, title: '条件を選んで提案' }} />
            <Stack.Screen name="event/new" options={{ presentation: 'modal', headerShown: true, title: '予定を追加' }} />
          </Stack>
        </AuthProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
