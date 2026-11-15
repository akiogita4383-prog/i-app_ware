import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';

// 起動時の振り分け。サインイン状態に関係なく必ず存在する "/" ルート
export default function Index() {
  const { ready, onboarded } = useAuth();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.pink} />
      </View>
    );
  }
  return <Redirect href={onboarded ? '/home' : '/welcome'} />;
}
