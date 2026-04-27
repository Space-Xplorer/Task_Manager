import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTasks, useUpdateStatus } from '@/hooks/useTasks';
import { useAuthStore } from '@/stores/authStore';
import { C, STATUS_CONFIG, shadow } from '@/lib/theme';

const STATUS_OPTIONS = [
  { key: 'pending',     label: 'Pending'     },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed',   label: 'Completed'   },
] as const;

function formatDeadline(deadline: string | null): { text: string; urgent: boolean; overdue: boolean } | null {
  if (!deadline) return null;
  const d     = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff < 0)  return { text: `Overdue by ${Math.abs(diff)}d`, urgent: true,  overdue: true  };
  if (diff === 0) return { text: 'Due Today',                     urgent: true,  overdue: false };
  if (diff === 1) return { text: 'Due Tomorrow',                  urgent: false, overdue: false };
  return {
    text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    urgent: false,
    overdue: false,
  };
}

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user   = useAuthStore((s) => s.user);
  const { data: tasks, isLoading } = useTasks();
  const updateStatus = useUpdateStatus();
  const [updating, setUpdating] = useState(false);

  const task = tasks?.find((t) => t._id === id);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={C.PRIMARY} size="large" />
      </View>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={[styles.container, styles.center]} edges={['top']}>
        <Feather name="alert-circle" size={40} color={C.TEXT3} />
        <Text style={styles.notFound}>Task not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnCenter}>
          <Text style={styles.backBtnCenterText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const assigneeName = Array.isArray(task.assignedTo)
    ? task.assignedTo.map((a) => (typeof a === 'object' ? a.name : String(a))).join(', ')
    : typeof task.assignedTo === 'object'
      ? task.assignedTo.name
      : '-';

  const creatorName = typeof task.createdBy === 'object' ? task.createdBy.name : '-';

  const isAssigned = Array.isArray(task.assignedTo)
    ? task.assignedTo.some((a) => (typeof a === 'object' ? a._id : String(a)) === user?.id)
    : (typeof task.assignedTo === 'object' ? task.assignedTo._id : task.assignedTo) === user?.id;

  const canUpdate = user?.role === 'admin' || isAssigned;

  const deadline = formatDeadline(task.deadline ?? null);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === task.status) return;
    setUpdating(true);
    try {
      await updateStatus.mutateAsync({ id: task._id, status: newStatus });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Update failed';
      Alert.alert('Error', msg);
    } finally {
      setUpdating(false);
    }
  };

  const cfg = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Back ──────────────────────────────────────────────── */}
        <TouchableOpacity onPress={() => router.back()} style={styles.back} activeOpacity={0.7}>
          <Feather name="chevron-left" size={20} color={C.PRIMARY} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {/* ── Hero ──────────────────────────────────────────────── */}
        <View style={[styles.heroCard, shadow.md]}>
          <View style={[styles.statusStrip, { backgroundColor: cfg?.strip ?? C.PRIMARY }]} />
          <View style={styles.heroContent}>
            <View style={styles.heroBadgeRow}>
              <View style={[styles.statusBadge, { backgroundColor: cfg?.bg ?? C.PRIMARY_L }]}>
                <View style={[styles.statusDot, { backgroundColor: cfg?.color ?? C.PRIMARY }]} />
                <Text style={[styles.statusBadgeText, { color: cfg?.color ?? C.PRIMARY }]}>
                  {cfg?.label ?? task.status}
                </Text>
              </View>
              {deadline && (
                <View style={[
                  styles.deadlineBadge,
                  deadline.overdue  && styles.deadlineBadgeOverdue,
                  deadline.urgent && !deadline.overdue && styles.deadlineBadgeUrgent,
                ]}>
                  <Feather
                    name="clock"
                    size={10}
                    color={deadline.overdue ? C.DANGER : deadline.urgent ? C.WARNING : C.TEXT3}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[
                    styles.deadlineBadgeText,
                    deadline.overdue  && { color: C.DANGER },
                    deadline.urgent && !deadline.overdue && { color: C.WARNING },
                  ]}>
                    {deadline.text}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.title}>{task.title}</Text>
            {task.description ? (
              <Text style={styles.description}>{task.description}</Text>
            ) : null}
          </View>
        </View>

        {/* ── Meta card ─────────────────────────────────────────── */}
        <View style={[styles.metaCard, shadow.sm]}>
          <MetaRow icon="users"    label="Assigned To" value={assigneeName} />
          <View style={styles.metaDivider} />
          <MetaRow icon="user"     label="Created By"  value={creatorName} />
          <View style={styles.metaDivider} />
          <MetaRow icon="calendar" label="Created"     value={new Date(task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} />
          <View style={styles.metaDivider} />
          <MetaRow icon="refresh-cw" label="Updated"  value={new Date(task.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} />
        </View>

        {/* ── Status update ─────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Update Status</Text>
        {canUpdate ? (
          <View style={styles.statusOptions}>
            {STATUS_OPTIONS.map(({ key, label }) => {
              const active  = task.status === key;
              const optCfg  = STATUS_CONFIG[key];
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.statusBtn,
                    active && { borderColor: optCfg.color, backgroundColor: optCfg.bg },
                  ]}
                  onPress={() => handleStatusChange(key)}
                  disabled={updating}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.statusRadio,
                    active
                      ? { backgroundColor: optCfg.color, borderColor: optCfg.color }
                      : { borderColor: C.BORDER },
                  ]}>
                    {active && <Feather name="check" size={11} color="#fff" />}
                  </View>
                  <Text style={[
                    styles.statusLabel,
                    active && { color: optCfg.color, fontWeight: '700' },
                  ]}>
                    {label}
                  </Text>
                  <View style={[styles.statusStripe, { backgroundColor: optCfg.strip }]} />
                </TouchableOpacity>
              );
            })}
            {updating && <ActivityIndicator color={C.PRIMARY} style={{ marginTop: 8 }} />}
          </View>
        ) : (
          <View style={[styles.noAccessCard, shadow.sm]}>
            <Feather name="lock" size={16} color={C.TEXT3} />
            <Text style={styles.noAccess}>You don't have permission to update this task.</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const MetaRow = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <View style={styles.metaRow}>
    <Feather name={icon as any} size={14} color={C.TEXT3} style={{ marginRight: 10 }} />
    <Text style={styles.metaLabel}>{label}</Text>
    <Text style={styles.metaValue} numberOfLines={1}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.BG },
  content:   { padding: 24, paddingBottom: 56, gap: 16 },
  center:    { justifyContent: 'center', alignItems: 'center', gap: 12 },

  back:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  backText: { color: C.PRIMARY, fontSize: 16, fontWeight: '600' },

  notFound: { fontSize: 17, fontWeight: '600', color: C.TEXT2 },
  backBtnCenter: {
    marginTop: 8,
    backgroundColor: C.PRIMARY_L,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backBtnCenterText: { color: C.PRIMARY, fontSize: 14, fontWeight: '700' },

  /* hero card */
  heroCard: {
    backgroundColor: C.SURFACE,
    borderRadius: 20,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  statusStrip: { width: 4 },
  heroContent: { flex: 1, padding: 20, gap: 10 },
  heroBadgeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 5,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },

  deadlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.SURFACE2,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  deadlineBadgeOverdue: { backgroundColor: C.DANGER_L },
  deadlineBadgeUrgent:  { backgroundColor: '#FFF7ED' },
  deadlineBadgeText: { fontSize: 11, fontWeight: '600', color: C.TEXT3 },

  title:       { fontSize: 24, fontWeight: '800', color: C.TEXT, lineHeight: 30, letterSpacing: -0.3 },
  description: { fontSize: 15, color: C.TEXT2, lineHeight: 22 },

  /* meta card */
  metaCard:    { backgroundColor: C.SURFACE, borderRadius: 20, padding: 20, gap: 0 },
  metaDivider: { height: 1, backgroundColor: C.BORDER2, marginVertical: 12 },
  metaRow:     { flexDirection: 'row', alignItems: 'center' },
  metaLabel:   { fontSize: 13, color: C.TEXT3, fontWeight: '500', flex: 1 },
  metaValue:   { fontSize: 13, color: C.TEXT, fontWeight: '600', flex: 1, textAlign: 'right' },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.TEXT3,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: -4,
  },

  /* status options */
  statusOptions: { gap: 10 },
  statusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: C.SURFACE,
    borderWidth: 1.5,
    borderColor: C.BORDER,
    overflow: 'hidden',
  },
  statusRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusLabel:  { flex: 1, fontSize: 15, color: C.TEXT2, fontWeight: '500' },
  statusStripe: { width: 3, height: 20, borderRadius: 2 },

  /* no access */
  noAccessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.SURFACE,
    borderRadius: 16,
    padding: 16,
  },
  noAccess: { color: C.TEXT3, fontSize: 14, lineHeight: 20 },
});
