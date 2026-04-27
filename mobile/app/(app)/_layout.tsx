import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { useAdminStore } from '@/stores/adminStore';
import { C, shadow } from '@/lib/theme';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const insets     = useSafeAreaInsets();
  const user       = useAuthStore((s) => s.user);
  const openCreate = useAdminStore((s) => s.openCreate);
  const isAdmin    = user?.role === 'admin';

  const currentName = state.routes[state.index]?.name;

  const goTo = (name: string) => {
    const route = state.routes.find((r) => r.name === name);
    if (!route) return;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (currentName !== name && !event.defaultPrevented) navigation.navigate(name as never);
  };

  const color = (name: string) => (currentName === name ? C.PRIMARY : C.TEXT3);

  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {/* Tasks */}
      <TouchableOpacity style={styles.tabItem} onPress={() => goTo('index')} activeOpacity={0.7}>
        <Feather name="check-square" size={22} color={color('index')} />
        <Text style={[styles.tabLabel, { color: color('index') }]}>TASKS</Text>
      </TouchableOpacity>

      {/* FAB — admin only, lifts above bar */}
      <View style={styles.fabWrap}>
        {isAdmin && (
          <TouchableOpacity style={styles.fab} onPress={openCreate} activeOpacity={0.85}>
            <Feather name="plus" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Profile */}
      <TouchableOpacity style={styles.tabItem} onPress={() => goTo('profile')} activeOpacity={0.7}>
        <Feather name="user" size={22} color={color('profile')} />
        <Text style={[styles.tabLabel, { color: color('profile') }]}>PROFILE</Text>
      </TouchableOpacity>
    </View>
  );
}

function AppTabs() {
  return (
    <Tabs tabBar={(props) => <AppTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="admin" options={{ href: null }} />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="task/[id]" options={{ href: null }} />
    </Tabs>
  );
}

export default function AppLayout() {
  const { user, isAuthenticated, isHydrated } = useAuthStore();

  if (!isHydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={C.PRIMARY} size="large" />
      </View>
    );
  }

  if (!isAuthenticated || !user) return <Redirect href="/(auth)/login" />;
  return <AppTabs />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.BG },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: C.SURFACE,
    borderTopWidth: 1,
    borderTopColor: C.BORDER,
    paddingTop: 10,
    ...shadow.sm,
  },

  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingBottom: 4,
  },

  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },

  fabWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },

  fab: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: C.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -26,
    ...shadow.md,
  },
});
