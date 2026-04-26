import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { ActivityIndicator, View } from 'react-native';

export default function AuthLayout() {
  const { isAuthenticated, isHydrated } = useAuthStore();

  // Wait for hydration before redirecting — prevents flash
  if (!isHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F0F1A' }}>
        <ActivityIndicator color="#10B981" size="large" />
      </View>
    );
  }

  // If already logged in, go to app
  if (isAuthenticated) return <Redirect href="/" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0F0F1A' },
      }}
    />
  );
}
