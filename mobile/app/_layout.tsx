import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';
import { getTokens, saveTokens } from '@/lib/tokens';
import { apiClient } from '@/api/client';

const parseJwtPayload = (token: string): { id?: string; email?: string; role?: 'admin' | 'user' } | null => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    if (typeof atob !== 'function') return null;
    const decoded = JSON.parse(atob(padded));
    return {
      id: typeof decoded.id === 'string' ? decoded.id : undefined,
      email: typeof decoded.email === 'string' ? decoded.email : undefined,
      role: decoded.role === 'admin' ? 'admin' : 'user',
    };
  } catch {
    return null;
  }
};

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
        await saveTokens(data.accessToken, data.refreshToken);

        const hydratedUser = data.user ?? (() => {
          const payload = parseJwtPayload(data.accessToken);
          if (!payload?.id || !payload?.email) return null;
          return {
            id: payload.id,
            name: payload.email.split('@')[0],
            email: payload.email,
            role: payload.role ?? 'user',
          };
        })();

        if (!hydratedUser) {
          clearAuth();
          return;
        }

        setHydrated(hydratedUser, data.accessToken);
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
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }} />
      </HydrationGate>
    </QueryClientProvider>
  );
}
