import React from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  Alert, ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useTasks } from '@/hooks/useTasks';
import { getAvatarUrl } from '@/lib/avatar';
import { apiLogout } from '@/api/endpoints';
import { getTokens } from '@/lib/tokens';
import { C, shadow } from '@/lib/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const user   = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { data: tasks } = useTasks();
  const [signingOut, setSigningOut] = React.useState(false);

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Session needs refresh</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.emptyButtonText}>Go to Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isAdmin   = user.role === 'admin';
  const avatarUrl = getAvatarUrl(user, 120);

  const myTasks = tasks?.filter((t) => {
    const raw = Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo];
    return raw.some((a) => (typeof a === 'object' ? a._id : String(a)) === user.id);
  }) ?? [];
  const myActive    = myTasks.filter((t) => t.status !== 'completed').length;
  const myCompleted = myTasks.filter((t) => t.status === 'completed').length;

  const allTasks      = tasks ?? [];
  const allPending    = allTasks.filter((t) => t.status === 'pending').length;
  const allInProgress = allTasks.filter((t) => t.status === 'in_progress').length;
  const allCompleted  = allTasks.filter((t) => t.status === 'completed').length;

  const performLogout = async () => {
    if (signingOut) return;

    setSigningOut(true);
    try {
      try {
        const { refreshToken } = await getTokens();
        if (refreshToken) await apiLogout(refreshToken);
      } catch {
        // Best-effort server logout; local logout should still proceed.
      }

      await logout();
      router.replace('/(auth)/login');
    } finally {
      setSigningOut(false);
    }
  };

  const handleLogout = () => {
    // React Native Web's Alert API can be inconsistent with multi-action dialogs,
    // so use a native browser confirm on web.
    if (Platform.OS === 'web') {
      const shouldLogout = typeof window !== 'undefined'
        ? window.confirm('Are you sure you want to sign out?')
        : true;
      if (!shouldLogout) return;
      void performLogout();
      return;
    }

    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            void performLogout();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Page header ──────────────────────────────────────── */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Profile.</Text>
            <Text style={styles.pageSubtitle}>YOUR ACCOUNT</Text>
          </View>
        </View>

        {/* ── Hero card ─────────────────────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.avatarRing}>
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatar}
              defaultSource={require('../../assets/icon.png')}
            />
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <View style={[styles.roleBadge, isAdmin ? styles.roleBadgeAdmin : styles.roleBadgeUser]}>
            <Feather
              name={isAdmin ? 'shield' : 'user'}
              size={11}
              color={isAdmin ? '#D97706' : C.PRIMARY}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.roleText, isAdmin ? styles.roleTextAdmin : styles.roleTextUser]}>
              {isAdmin ? 'Admin' : 'Member'}
            </Text>
          </View>
        </View>

        {/* ── My task stats ──────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>My Tasks</Text>
        <View style={styles.statsRow}>
          <StatCard label="Total"  value={myTasks.length} color={C.TEXT2}   bg={C.SURFACE2} />
          <StatCard label="Active" value={myActive}       color="#2563EB"   bg="#EFF6FF" />
          <StatCard label="Done"   value={myCompleted}    color="#16A34A"   bg="#F0FDF4" />
        </View>

        {/* ── Admin only: all tasks overview ─────────────────────── */}
        {isAdmin && (
          <>
            <Text style={styles.sectionLabel}>All Tasks Overview</Text>
            <View style={styles.adminGrid}>
              <AdminStatCard label="Total"       value={allTasks.length} color={C.TEXT}    bg={C.SURFACE2}  />
              <AdminStatCard label="Pending"     value={allPending}      color="#EA580C"   bg="#FFF7ED"     />
              <AdminStatCard label="In Progress" value={allInProgress}   color="#2563EB"   bg="#EFF6FF"     />
              <AdminStatCard label="Completed"   value={allCompleted}    color="#16A34A"   bg="#F0FDF4"     />
            </View>
          </>
        )}

        {/* ── Sign out ──────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.logoutBtn, signingOut && styles.logoutBtnDisabled]}
          onPress={handleLogout}
          activeOpacity={0.8}
          disabled={signingOut}
        >
          <Feather name="log-out" size={16} color={C.DANGER} style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>{signingOut ? 'Signing Out...' : 'Sign Out'}</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const StatCard = ({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) => (
  <View style={[styles.statCard, { backgroundColor: bg }, shadow.sm]}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const AdminStatCard = ({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) => (
  <View style={[styles.adminStatCard, { backgroundColor: bg }, shadow.sm]}>
    <Text style={[styles.adminStatValue, { color }]}>{value}</Text>
    <Text style={styles.adminStatLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.BG },
  content:   { padding: 24, paddingBottom: 48, gap: 16 },

  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  pageTitle:  { fontSize: 30, fontWeight: '800', color: C.TEXT, letterSpacing: -0.8 },
  pageSubtitle:{ fontSize: 11, fontWeight: '700', color: C.TEXT3, letterSpacing: 1, marginTop: 2 },

  heroCard: {
    backgroundColor: C.SURFACE,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 6,
    ...shadow.md,
  },
  avatarRing: {
    width: 108, height: 108, borderRadius: 54,
    backgroundColor: C.SURFACE2,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 3,
    borderColor: C.PRIMARY_L,
  },
  avatar:    { width: 96, height: 96, borderRadius: 48 },
  name:      { fontSize: 22, fontWeight: '800', color: C.TEXT, letterSpacing: -0.3 },
  email:     { fontSize: 14, color: C.TEXT3, fontWeight: '400', marginBottom: 4 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginTop: 4 },
  roleBadgeAdmin: { backgroundColor: '#FEF3C7' },
  roleBadgeUser:  { backgroundColor: C.PRIMARY_L },
  roleText:       { fontSize: 12, fontWeight: '700' },
  roleTextAdmin:  { color: '#D97706' },
  roleTextUser:   { color: C.PRIMARY },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.TEXT3,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: -4,
  },

  statsRow:  { flexDirection: 'row', gap: 10 },
  statCard:  { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 26, fontWeight: '800' },
  statLabel: { fontSize: 11, color: C.TEXT3, fontWeight: '600' },

  adminGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  adminStatCard: { width: '47%', borderRadius: 16, padding: 16, alignItems: 'center', gap: 4 },
  adminStatValue:{ fontSize: 30, fontWeight: '800' },
  adminStatLabel:{ fontSize: 12, color: C.TEXT3, fontWeight: '600' },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.DANGER_L,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
  },
  logoutBtnDisabled: { opacity: 0.7 },
  logoutText: { fontSize: 15, fontWeight: '700', color: C.DANGER },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.TEXT },
  emptyButton: {
    backgroundColor: C.PRIMARY,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  emptyButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
