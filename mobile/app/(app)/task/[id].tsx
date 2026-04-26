import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTasks, useUpdateStatus } from '@/hooks/useTasks';
import { useAuthStore } from '@/stores/authStore';
import { StatusBadge } from '@/components/StatusBadge';

const STATUS_OPTIONS = [
  { key: 'pending',     label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed',   label: 'Completed' },
] as const;

export default function TaskDetailScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>();
  const router   = useRouter();
  const user     = useAuthStore((s) => s.user);
  const { data: tasks, isLoading } = useTasks();
  const updateStatus = useUpdateStatus();

  const task = tasks?.find((t) => t._id === id);

  const [updating, setUpdating] = useState(false);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color="#1C2E1D" size="large" />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.notFound}>Task not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  let assigneeName = '-';
  if (Array.isArray(task.assignedTo)) {
    assigneeName = task.assignedTo.map(a => typeof a === 'object' ? a.name : String(a)).join(', ');
  } else if (typeof task.assignedTo === 'object') {
    assigneeName = task.assignedTo.name;
  }
  
  const creatorName  = typeof task.createdBy  === 'object' ? task.createdBy.name   : '-';

  // Users can update assigned tasks; admins can update any
  const isAssigned = (() => {
    if (Array.isArray(task.assignedTo)) {
      return task.assignedTo.some(a => (typeof a === 'object' ? a._id : String(a)) === user?.id);
    }
    return (typeof task.assignedTo === 'object' ? task.assignedTo._id : task.assignedTo) === user?.id;
  })();
  const canUpdate    = user?.role === 'admin' || isAssigned;

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === task.status) return;
    setUpdating(true);
    try {
      await updateStatus.mutateAsync({ id: task._id, status: newStatus });
      Alert.alert('Updated', `Status changed to ${newStatus.replace('_', ' ')}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Update failed';
      Alert.alert('Error', msg);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content}>
      {/* Back */}
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      {/* Title + status */}
      <View style={styles.titleRow}>
        <Text style={styles.title}>{task.title}</Text>
        <StatusBadge status={task.status} />
      </View>

      {/* Description */}
      {task.description ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Description</Text>
          <Text style={styles.description}>{task.description}</Text>
        </View>
      ) : null}

      {/* Meta */}
      <View style={styles.metaCard}>
        <MetaRow label="Assigned To" value={assigneeName} />
        <MetaRow label="Created By"  value={creatorName} />
        <MetaRow label="Created"     value={new Date(task.createdAt).toLocaleDateString()} />
        <MetaRow label="Updated"     value={new Date(task.updatedAt).toLocaleDateString()} />
      </View>

      {/* Status update */}
      {canUpdate ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Update Status</Text>
          <View style={styles.statusOptions}>
            {STATUS_OPTIONS.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.statusBtn,
                  task.status === key && styles.statusBtnActive,
                ]}
                onPress={() => handleStatusChange(key)}
                disabled={updating}
                activeOpacity={0.8}
              >
                <View style={[styles.statusIcon, task.status === key && styles.statusIconActive]} />
                <Text style={[styles.statusLabel, task.status === key && styles.statusLabelActive]}>
                  {label}
                </Text>
                {task.status === key && <View style={styles.checkDot} />}
              </TouchableOpacity>
            ))}
          </View>
          {updating && <ActivityIndicator color="#1C2E1D" style={{ marginTop: 12 }} />}
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Update Status</Text>
          <Text style={styles.noAccess}>You don't have permission to update this task.</Text>
        </View>
      )}
    </ScrollView>
    </SafeAreaView>
  );
}

const MetaRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.metaRow}>
    <Text style={styles.metaLabel}>{label}</Text>
    <Text style={styles.metaValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F5F0' },
  content:   { padding: 24, paddingBottom: 48 },
  center:    { justifyContent: 'center', alignItems: 'center' },
  back:      { marginBottom: 16 },
  backText:  { color: '#1C2E1D', fontSize: 16, fontWeight: '700' },
  backBtn:   { marginTop: 12 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
    marginTop: 10,
  },
  title:    { flex: 1, fontSize: 26, fontWeight: '800', color: '#1C2E1D', lineHeight: 32 },
  notFound: { color: '#8E9385', fontSize: 16 },
  section:  { marginBottom: 28 },
  sectionLabel: {
    fontSize: 13,
    color: '#8E9385',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  description: { color: '#4A5B46', fontSize: 16, lineHeight: 24 },
  metaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  metaRow:   { flexDirection: 'row', justifyContent: 'space-between' },
  metaLabel: { color: '#8E9385', fontSize: 14, fontWeight: '500' },
  metaValue: { color: '#1C2E1D', fontSize: 14, fontWeight: '600' },
  statusOptions: { gap: 12 },
  statusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusIcon: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#E2E8F0',
  },
  statusBtnActive: { borderColor: '#1C2E1D', backgroundColor: '#F4F5F0' },
  statusIconActive: { backgroundColor: '#1C2E1D', borderColor: '#1C2E1D' },
  statusLabel:     { flex: 1, fontSize: 16, color: '#8E9385', fontWeight: '600' },
  statusLabelActive: { color: '#1C2E1D' },
  checkDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#1C2E1D', // Switched out the neon dot for dark for better check visibility
  },
  noAccess: { color: '#8E9385', fontSize: 15, lineHeight: 22 },
});
