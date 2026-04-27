import { create } from 'zustand';
import { saveTokens, clearTokens } from '@/lib/tokens';
import { queryClient } from '@/lib/queryClient';
import { useSSEStore } from '@/stores/sseStore';

export interface AuthUser {
  id:    string;
  name:  string;
  email: string;
  role:  'admin' | 'user';
}

interface AuthState {
  user:            AuthUser | null;
  accessToken:     string | null;
  isAuthenticated: boolean;
  isHydrated:      boolean;

  login:          (user: AuthUser, accessToken: string, refreshToken: string) => Promise<void>;
  logout:         () => Promise<void>;
  setAccessToken: (token: string) => void;
  setHydrated:    (user: AuthUser, accessToken: string) => void;
  clearAuth:      () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user:            null,
  accessToken:     null,
  isAuthenticated: false,
  isHydrated:      false,

  login: async (user, accessToken, refreshToken) => {
    await saveTokens(accessToken, refreshToken);
    set({ user, accessToken, isAuthenticated: true, isHydrated: true });
  },

  logout: async () => {
    try {
      await clearTokens();
    } finally {
      queryClient.clear();
      useSSEStore.getState().reset();
      set({ user: null, accessToken: null, isAuthenticated: false, isHydrated: true });
    }
  },

  setAccessToken: (token) => set({ accessToken: token }),

  setHydrated: (user, accessToken) =>
    set({ user, accessToken, isAuthenticated: true, isHydrated: true }),

  clearAuth: () =>
    set({ user: null, accessToken: null, isAuthenticated: false, isHydrated: true }),
}));
