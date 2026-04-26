import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';
import { getTokens } from '@/lib/tokens';
import { apiClient } from '@/api/client';

// Attempt to hydrate auth state from stored tokens on app boot
const HydrationGate = ({ children }: { children: React.ReactNode }) => {
  const { setHydrated, clearAuth } = useAuthStore();

  useEffect(() => {
    const hydrate = async () => {
      try {
        const { refreshToken } = await getTokens();
        if (!refreshToken) {
          clearAuth();
          return;
        }
        // Use raw axios (no interceptors) to avoid recursion
        const { data } = await apiClient.post('/auth/refresh', { refreshToken });
        setHydrated(data.user, data.accessToken);
      } catch {
        clearAuth();
      }
    };
    hydrate();
  }, []);

  return <>{children}</>;
};

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <HydrationGate>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </HydrationGate>
    </QueryClientProvider>
  );
}
