import axios from 'axios';
import Constants from 'expo-constants';
import { getTokens, saveTokens } from '@/lib/tokens';
import { useAuthStore } from '@/stores/authStore';

// Auto-detect Local IP instead of hardcoding 10.0.2.2 or relying on static .env
const hostUri = Constants.expoConfig?.hostUri;
const localIp = hostUri ? hostUri.split(':')[0] : null;
const FALLBACK_URL = localIp ? `http://${localIp}:3000/api` : 'http://10.0.2.2:3000/api';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || FALLBACK_URL;

export const apiClient = axios.create({ baseURL: BASE_URL });

// ─── Request interceptor — attach current access token ─────────────────────
apiClient.interceptors.request.use(async (config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Response interceptor — refresh token on 401 ──────────────────────────
let isRefreshing = false;
let pendingQueue: Array<(token: string) => void> = [];

const processQueue = (token: string) => {
  pendingQueue.forEach((cb) => cb(token));
  pendingQueue = [];
};

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue concurrent requests until refresh completes
      return new Promise<void>((resolve) => {
        pendingQueue.push((token: string) => {
          original.headers.Authorization = `Bearer ${token}`;
          resolve(apiClient(original));
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const { refreshToken } = await getTokens();
      if (!refreshToken) throw new Error('No refresh token');

      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
      await saveTokens(data.accessToken, data.refreshToken);
      useAuthStore.getState().setAccessToken(data.accessToken);
      processQueue(data.accessToken);
      return apiClient(original);
    } catch {
      await useAuthStore.getState().logout();
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  }
);
