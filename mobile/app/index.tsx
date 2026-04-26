import React from 'react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '@/stores/authStore';

// Root index — send user to auth or app based on hydrated auth state
export default function Index() {
  const { isAuthenticated, isHydrated } = useAuthStore();

  if (!isHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F0F1A' }}>
        <ActivityIndicator color="#1C2E1D" size="large" />
      </View>
    );
  }

  return isAuthenticated ? <Redirect href="/(app)" /> : <Redirect href="/(auth)/login" />;
}
