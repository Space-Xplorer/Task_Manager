import React from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { useTasks } from '@/hooks/useTasks';
import { getAvatarUrl } from '@/lib/avatar';

export default function ProfileScreen() {
  const user   = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { data: tasks } = useTasks();

  if (!user) return null;

  const isAdmin   = user.role === 'admin';
  const avatarUrl = getAvatarUrl(user, 120);

  // Personal task stats (tasks assigned to this user)
  const myTasks     = tasks?.filter((t) => {
    const raw = Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo];
    return raw.some((a) => (typeof a === 'object' ? a._id : String(a)) === user.id);
  }) ?? [];
  const myActive    = myTasks.filter((t) => t.status !== 'completed').length;
  const myCompleted = myTasks.filter((t) => t.status === 'completed').length;

  // Admin-only: overall stats
  const allTasks      = tasks ?? [];
  const allPending    = allTasks.filter((t) => t.status === 'pending').length;
  const allInProgress = allTasks.filter((t) => t.status === 'in_progress').length;
  const allCompleted  = allTasks.filter((t) => t.status === 'completed').length;

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Avatar + name + role ──────────────────────────── */}
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
            <Text style={[styles.roleText, isAdmin ? styles.roleTextAdmin : styles.roleTextUser]}>
              {isAdmin ? 'Admin' : 'Member'}
            </Text>
          </View>
        </View>

        {/* ── My task stats ─────────────────────────────────── */}
        <Text style={styles.sectionLabel}>My Tasks</Text>
        <View style={styles.statsRow}>
          <StatCard label="Total"     value={myTasks.length} color="#6B7280" bg="#F9FAFB" />
          <StatCard label="Active"    value={myActive}       color="#2563EB" bg="#EFF6FF" />
          <StatCard label="Done"      value={myCompleted}    color="#15803D" bg="#F0FDF4" />
        </View>

        {/* ── Admin-only: all tasks overview ────────────────── */}
        {isAdmin && (
          <>
            <Text style={styles.sectionLabel}>All Tasks Overview</Text>
            <View style={styles.adminStatsGrid}>
              <AdminStatCard label="Total"       value={allTasks.length} color="#374151" bg="#F9FAFB" />
              <AdminStatCard label="Pending"     value={allPending}      color="#C2410C" bg="#FFF7ED" />
              <AdminStatCard label="In Progress" value={allInProgress}   color="#2563EB" bg="#EFF6FF" />
              <AdminStatCard label="Completed"   value={allCompleted}    color="#15803D" bg="#F0FDF4" />
            </View>
          </>
        )}

        {/* ── Sign out ─────────────────────────────────────── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const StatCard = ({
  label, value, color, bg,
}: { label: string; value: number; color: string; bg: string }) => (
  <View style={[styles.statCard, { backgroundColor: bg }]}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const AdminStatCard = ({
  label, value, color, bg,
}: { label: string; value: number; color: string; bg: string }) => (
  <View style={[styles.adminStatCard, { backgroundColor: bg }]}>
    <Text style={[styles.adminStatValue, { color }]}>{value}</Text>
    <Text style={styles.adminStatLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F5F0' },
  content:   { padding: 24, paddingBottom: 48, gap: 20 },

  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  avatarRing: {
    width: 108, height: 108, borderRadius: 54,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  name:  { fontSize: 22, fontWeight: '700', color: '#111827', letterSpacing: -0.3 },
  email: { fontSize: 14, color: '#6B7280', fontWeight: '400', marginBottom: 4 },
  roleBadge:      { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 5, marginTop: 4 },
  roleBadgeAdmin: { backgroundColor: '#FEF3C7' },
  roleBadgeUser:  { backgroundColor: '#EFF6FF' },
  roleText:       { fontSize: 12, fontWeight: '700' },
  roleTextAdmin:  { color: '#D97706' },
  roleTextUser:   { color: '#2563EB' },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: -8,
  },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },

  adminStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  adminStatCard: {
    width: '47%',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  adminStatValue: { fontSize: 28, fontWeight: '700' },
  adminStatLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },

  logoutBtn: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
});
