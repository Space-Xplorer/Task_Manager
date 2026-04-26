import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_KEY  = 'tm_accessToken';
const REFRESH_KEY = 'tm_refreshToken';

export const saveTokens = async (access: string, refresh: string): Promise<void> => {
  if (Platform.OS === 'web') {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
    return;
  }
  await SecureStore.setItemAsync(ACCESS_KEY, access);
  await SecureStore.setItemAsync(REFRESH_KEY, refresh);
};

export const getTokens = async (): Promise<{ accessToken: string | null; refreshToken: string | null }> => {
  if (Platform.OS === 'web') {
    return {
      accessToken: localStorage.getItem(ACCESS_KEY),
      refreshToken: localStorage.getItem(REFRESH_KEY),
    };
  }
  return {
    accessToken: await SecureStore.getItemAsync(ACCESS_KEY),
    refreshToken: await SecureStore.getItemAsync(REFRESH_KEY),
  };
};

export const clearTokens = async (): Promise<void> => {
  if (Platform.OS === 'web') {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
};
