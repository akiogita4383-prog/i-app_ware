import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { colors } from '@/lib/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.pink,
        tabBarInactiveTintColor: colors.textMuted,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.bg },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'ホーム',
          headerShown: false,
          tabBarIcon: ({ color }) => <SymbolView name="house" size={24} tintColor={color} />,
        }}
      />
      <Tabs.Screen
        name="closet"
        options={{
          title: 'クローゼット',
          tabBarIcon: ({ color }) => <SymbolView name="hanger" size={24} tintColor={color} />,
        }}
      />
      <Tabs.Screen
        name="dressup"
        options={{
          title: '着せ替え',
          headerShown: false,
          tabBarIcon: ({ color }) => <SymbolView name="figure.stand.dress" size={24} tintColor={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'カレンダー',
          headerShown: false,
          tabBarIcon: ({ color }) => <SymbolView name="calendar" size={24} tintColor={color} />,
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          title: 'ショッピング',
          headerShown: false,
          tabBarIcon: ({ color }) => <SymbolView name="bag" size={24} tintColor={color} />,
        }}
      />
    </Tabs>
  );
}
