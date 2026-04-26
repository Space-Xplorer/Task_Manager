import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useAdminStore } from '@/stores/adminStore';
import { useTasks, useCreateTask, useDeleteTask, useEditTask, useUpdateStatus } from '@/hooks/useTasks';
import { useUsers } from '@/hooks/useUsers';
import { TaskCard } from '@/components/TaskCard';
import { EmptyState } from '@/components/EmptyState';
import { Task } from '@/api/endpoints';

export default function AdminScreen() {
  const router = useRouter();
  const user   = useAuthStore((s) => s.user);

  if (user?.role !== 'admin') return <Redirect href="/(app)" />;

  const { data: tasks,  isLoading, refetch, isFetching } = useTasks();
  const { data: users,  isLoading: usersLoading }         = useUsers();
  const createMutation = useCreateTask();
  const deleteMutation = useDeleteTask();
  const editMutation   = useEditTask();
  const updateStatus   = useUpdateStatus();

  const { isCreateOpen, closeCreate } = useAdminStore();
  const [createVisible, setCreateVisible] = useState(false);

  useEffect(() => {
    if (isCreateOpen) setCreateVisible(true);
  }, [isCreateOpen]);

  const [cTitle,    setCTitle]    = useState('');
  const [cDesc,     setCDesc]     = useState('');
  const [cDeadline, setCDeadline] = useState('');
  const [cUsers,    setCUsers]    = useState<string[]>([]);
  const [cPicker,   setCPicker]   = useState(false);

  const closeCreateModal = () => {
    setCTitle(''); setCDesc(''); setCDeadline(''); setCUsers([]);
    setCreateVisible(false);
    closeCreate();
  };

  const [editVisible,  setEditVisible]  = useState(false);
  const [editingTask,  setEditingTask]  = useState<Task | null>(null);
  const [eTitle,       setETitle]       = useState('');
  const [eDesc,        setEDesc]        = useState('');
  const [eDeadline,    setEDeadline]    = useState('');
  const [eUsers,       setEUsers]       = useState<string[]>([]);
  const [ePicker,      setEPicker]      = useState(false);

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setETitle(task.title);
    setEDesc(task.description ?? '');
    setEDeadline(task.deadline ? task.deadline.slice(0, 10) : '');
    const assignees = Array.isArray(task.assignedTo)
      ? task.assignedTo.map(a => typeof a === 'object' ? a._id : a)
      : task.assignedTo ? [typeof task.assignedTo === 'object' ? task.assignedTo._id : String(task.assignedTo)] : [];
    setEUsers(assignees);
    setEditVisible(true);
  };

  const closeEditModal = () => {
    setEditingTask(null); setETitle(''); setEDesc(''); setEDeadline(''); setEUsers([]);
    setEditVisible(false);
  };

  const toggleUser = (id: string, selected: string[], setSelected: (v: string[]) => void) => {
    setSelected(selected.includes(id) ? selected.filter(u => u !== id) : [...selected, id]);
  };

  const userNames = (ids: string[]) =>
    users?.filter(u => ids.includes(u._id)).map(u => u.name).join(', ') || 'Select users';

  const parseDeadline = (s: string): string | null => {
    if (!s.trim()) return null;
    const d = new Date(s.trim());
    return isNaN(d.getTime()) ? null : d.toISOString();
  };

  const handleCreate = async () => {
    if (!cTitle.trim() || cUsers.length === 0) {
      Alert.alert('Error', 'Title and at least one assignee are required');
      return;
    }
    try {
      await createMutation.mutateAsync({
        title: cTitle.trim(), description: cDesc,
        assignedTo: cUsers, deadline: parseDeadline(cDeadline),
      });
      closeCreateModal();
    } catch (err: unknown) {
      Alert.alert('Error', (err as any)?.response?.data?.error ?? 'Failed to create task');
    }
  };

  const handleEdit = async () => {
    if (!editingTask || !eTitle.trim() || eUsers.length === 0) {
      Alert.alert('Error', 'Title and at least one assignee are required');
      return;
    }
    try {
      await editMutation.mutateAsync({
        id: editingTask._id, title: eTitle.trim(), description: eDesc,
        assignedTo: eUsers, deadline: parseDeadline(eDeadline),
      });
      closeEditModal();
    } catch (err: unknown) {
      Alert.alert('Error', (err as any)?.response?.data?.error ?? 'Failed to edit task');
    }
  };

  const handleDelete = (task: Task) => {
    Alert.alert('Delete Task', `Delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(task._id) },
    ]);
  };

  const handleStatusChange = (id: string, status: string) => updateStatus.mutate({ id, status });

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]} edges={['top']}>
        <ActivityIndicator color="#10B981" size="large" />
      </SafeAreaView>
    );
  }

  // ─── User picker sub-modal ─────────────────────────────────────────────────
  const UserPickerModal = ({
    visible, onClose, selected, setSelected,
  }: { visible: boolean; onClose: () => void; selected: string[]; setSelected: (v: string[]) => void }) => (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Users</Text>
          {usersLoading
            ? <ActivityIndicator color="#10B981" />
            : (
              <ScrollView>
                {(users ?? []).map((u) => {
                  const isSel = selected.includes(u._id);
                  return (
                    <TouchableOpacity
                      key={u._id}
                      style={[styles.userRow, isSel && styles.userRowSel]}
                      onPress={() => toggleUser(u._id, selected, setSelected)}
                    >
                      <View>
                        <Text style={styles.userName}>{u.name}</Text>
                        <Text style={styles.userEmail}>{u.email}</Text>
                      </View>
                      <View style={styles.checkbox}>
                        {isSel && <View style={styles.checkboxInner} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )
          }
          <TouchableOpacity style={styles.confirmBtn} onPress={onClose}>
            <Text style={styles.confirmText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Admin</Text>
      </View>

      <FlatList
        data={tasks ?? []}
        keyExtractor={(t) => t._id}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onPress={() => router.push(`/(app)/task/${item._id}`)}
            onStatusChange={handleStatusChange}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        )}
        ListEmptyComponent={<EmptyState message="No tasks yet. Tap + to create one." />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor="#10B981"
          />
        }
      />

      {/* ── Create Task Modal ─────────────────────────────────────────────── */}
      <Modal visible={createVisible} transparent animationType="slide" onRequestClose={closeCreateModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Task</Text>

            <Text style={styles.label}>Title *</Text>
            <TextInput style={styles.input} placeholder="Task title" placeholderTextColor="#9CA3AF" value={cTitle} onChangeText={setCTitle} />

            <Text style={styles.label}>Description</Text>
            <TextInput style={[styles.input, styles.textarea]} placeholder="Optional description" placeholderTextColor="#9CA3AF" value={cDesc} onChangeText={setCDesc} multiline numberOfLines={3} />

            <Text style={styles.label}>Deadline (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} placeholder="e.g. 2025-12-31" placeholderTextColor="#9CA3AF" value={cDeadline} onChangeText={setCDeadline} keyboardType="numbers-and-punctuation" />

            <Text style={styles.label}>Assign To *</Text>
            <TouchableOpacity style={styles.picker} onPress={() => setCPicker(true)}>
              <Text style={{ color: cUsers.length > 0 ? '#111827' : '#9CA3AF' }} numberOfLines={1}>
                {userNames(cUsers)}
              </Text>
            </TouchableOpacity>

            <UserPickerModal visible={cPicker} onClose={() => setCPicker(false)} selected={cUsers} setSelected={setCUsers} />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeCreateModal}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, createMutation.isPending && { opacity: 0.6 }]}
                onPress={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.confirmText}>Create</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Edit Task Modal ───────────────────────────────────────────────── */}
      <Modal visible={editVisible} transparent animationType="slide" onRequestClose={closeEditModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Task</Text>

            <Text style={styles.label}>Title *</Text>
            <TextInput style={styles.input} placeholder="Task title" placeholderTextColor="#9CA3AF" value={eTitle} onChangeText={setETitle} />

            <Text style={styles.label}>Description</Text>
            <TextInput style={[styles.input, styles.textarea]} placeholder="Optional description" placeholderTextColor="#9CA3AF" value={eDesc} onChangeText={setEDesc} multiline numberOfLines={3} />

            <Text style={styles.label}>Deadline (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} placeholder="e.g. 2025-12-31" placeholderTextColor="#9CA3AF" value={eDeadline} onChangeText={setEDeadline} keyboardType="numbers-and-punctuation" />

            <Text style={styles.label}>Assign To *</Text>
            <TouchableOpacity style={styles.picker} onPress={() => setEPicker(true)}>
              <Text style={{ color: eUsers.length > 0 ? '#111827' : '#9CA3AF' }} numberOfLines={1}>
                {userNames(eUsers)}
              </Text>
            </TouchableOpacity>

            <UserPickerModal visible={ePicker} onClose={() => setEPicker(false)} selected={eUsers} setSelected={setEUsers} />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeEditModal}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, editMutation.isPending && { opacity: 0.6 }]}
                onPress={handleEdit}
                disabled={editMutation.isPending}
              >
                {editMutation.isPending
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.confirmText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F5F0' },
  center:    { justifyContent: 'center', alignItems: 'center' },

  headerRow: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },

  list: { paddingHorizontal: 24, paddingBottom: 100, paddingTop: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, gap: 8, maxHeight: '85%',
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8, letterSpacing: -0.3 },
  label:      { fontSize: 13, color: '#6B7280', fontWeight: '600', marginTop: 6, marginBottom: 2 },
  input: {
    backgroundColor: '#F9FAFB', borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    color: '#111827', fontSize: 15,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  textarea: { height: 88, textAlignVertical: 'top' },
  picker: {
    backgroundColor: '#F9FAFB', borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 14, paddingVertical: 15,
  },
  userRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  userRowSel:   { backgroundColor: '#F0FDF4', paddingHorizontal: 10, borderRadius: 12, borderBottomWidth: 0, marginVertical: 2 },
  userName:     { color: '#111827', fontSize: 15, fontWeight: '600' },
  userEmail:    { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
  checkbox:     { width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center' },
  checkboxInner:{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#1C2E1D' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn:    { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#F9FAFB', alignItems: 'center' },
  cancelText:   { color: '#374151', fontSize: 14, fontWeight: '600' },
  confirmBtn:   { flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: '#1C2E1D', alignItems: 'center' },
  confirmText:  { color: '#fff', fontSize: 14, fontWeight: '600' },
});
