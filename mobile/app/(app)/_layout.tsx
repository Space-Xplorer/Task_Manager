import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import { useAdminStore } from '@/stores/adminStore';
import { useSSE } from '@/hooks/useSSE';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const ICON_MAP: Record<string, string> = {
  index:   'check-square',
  admin:   'sliders',
  profile: 'user',
};
const TAB_LABELS: Record<string, string> = {
  index:   'TASKS',
  admin:   'ADMIN',
  profile: 'PROFILE',
};

// ─── Custom tab bar ───────────────────────────────────────────────────────────
function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const insets     = useSafeAreaInsets();
  const user       = useAuthStore((s) => s.user);
  const openCreate = useAdminStore((s) => s.openCreate);
  const isAdmin    = user?.role === 'admin';

  // Admin sees: Tasks | Admin | Profile (with FAB gap between Tasks and Admin)
  // Non-admin sees: Tasks | Profile
  const visibleRoutes = state.routes.filter((r) => {
    if (!ICON_MAP[r.name]) return false;
    if (r.name === 'admin' && !isAdmin) return false;
    return true;
  });

  return (
    <View style={{ backgroundColor: '#0F0F1A' }}>
      {/* Admin FAB — pops up above the gap between Tasks and Admin */}
      {isAdmin && (
        <View style={styles.fabWrapper} pointerEvents="box-none">
          <TouchableOpacity style={styles.fab} onPress={openCreate} activeOpacity={0.85}>
            <Feather name="plus" size={24} color="#1C2E1D" />
          </TouchableOpacity>
        </View>
      )}

      {/* Tab bar */}
      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        {visibleRoutes.map((route, idx) => {
          const isFocused = state.routes[state.index]?.name === route.name;
          const iconName  = ICON_MAP[route.name] as any;
          const label     = TAB_LABELS[route.name] ?? route.name;
          const color     = isFocused ? '#D6FF38' : '#6B6B8A';
          const isFirst   = idx === 0;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };

          return (
            <React.Fragment key={route.key}>
              <TouchableOpacity style={styles.tabItem} onPress={onPress} activeOpacity={0.7}>
                <View style={[styles.activeBar, { backgroundColor: isFocused ? '#D6FF38' : 'transparent' }]} />
                <Feather name={iconName} size={21} color={color} />
                <Text style={[styles.tabLabel, { color }]}>{label}</Text>
              </TouchableOpacity>

              {/* Gap spacer for FAB — only for admin, after the first tab */}
              {isAdmin && isFirst && <View style={styles.fabGap} />}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

// ─── Inner component — hooks run after auth check ─────────────────────────────
function AppTabs() {
  useSSE();
  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="admin" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="task/[id]" options={{ href: null }} />
    </Tabs>
  );
}

// ─── Auth guard ───────────────────────────────────────────────────────────────
export default function AppLayout() {
  const { isAuthenticated, isHydrated } = useAuthStore();

  if (!isHydrated) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#10B981" size="large" />
      </View>
    );
  }

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  return <AppTabs />;
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F0F1A' },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0F0F1A',
    borderTopWidth: 1,
    borderTopColor: '#1A1A2E',
    paddingTop: 0,
  },

  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 0,
    paddingBottom: 4,
    gap: 4,
  },

  activeBar: {
    height: 2,
    width: '50%',
    borderRadius: 1,
    marginBottom: 8,
  },

  tabLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },

  fabGap: { width: 72 },

  fabWrapper: {
    position: 'absolute',
    top: -28,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },

  fab: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#D6FF38',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
});
