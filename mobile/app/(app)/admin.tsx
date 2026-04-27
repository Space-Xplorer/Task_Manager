import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { useAdminStore } from '@/stores/adminStore';
import { useTasks, useCreateTask, useDeleteTask, useEditTask, useUpdateStatus } from '@/hooks/useTasks';
import { useUsers } from '@/hooks/useUsers';
import { TaskCard } from '@/components/TaskCard';
import { EmptyState } from '@/components/EmptyState';
import { Task } from '@/api/endpoints';
import { C, shadow } from '@/lib/theme';

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
    users?.filter(u => ids.includes(u._id)).map(u => u.name).join(', ') || 'Select team members';

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
    if (Platform.OS === 'web') {
      const shouldDelete = typeof window !== 'undefined'
        ? window.confirm(`Delete "${task.title}"?`)
        : true;
      if (!shouldDelete) return;
      deleteMutation.mutate(task._id);
      return;
    }

    Alert.alert('Delete Task', `Delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(task._id) },
    ]);
  };

  const handleStatusChange = (id: string, status: string) => updateStatus.mutate({ id, status });

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]} edges={['top']}>
        <ActivityIndicator color={C.PRIMARY} size="large" />
      </SafeAreaView>
    );
  }

  // ─── User picker modal ─────────────────────────────────────────────────────
  const UserPickerModal = ({
    visible, onClose, selected, setSelected,
  }: { visible: boolean; onClose: () => void; selected: string[]; setSelected: (v: string[]) => void }) => (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: '60%' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Members</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Feather name="x" size={18} color={C.TEXT2} />
            </TouchableOpacity>
          </View>
          {usersLoading
            ? <ActivityIndicator color={C.PRIMARY} style={{ marginVertical: 24 }} />
            : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {(users ?? []).map((u) => {
                  const isSel = selected.includes(u._id);
                  return (
                    <TouchableOpacity
                      key={u._id}
                      style={[styles.userRow, isSel && styles.userRowSel]}
                      onPress={() => toggleUser(u._id, selected, setSelected)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{u.name}</Text>
                        <Text style={styles.userEmail}>{u.email}</Text>
                      </View>
                      <View style={[styles.checkbox, isSel && styles.checkboxActive]}>
                        {isSel && <Feather name="check" size={12} color="#FFFFFF" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )
          }
          <TouchableOpacity style={styles.confirmBtn} onPress={onClose}>
            <Text style={styles.confirmText}>Done  ({selected.length} selected)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.heading}>All Tasks.</Text>
          <Text style={styles.subheading}>ADMIN PANEL</Text>
        </View>
        <View style={styles.countPill}>
          <Text style={styles.countPillText}>{tasks?.length ?? 0} total</Text>
        </View>
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
        ListEmptyComponent={
          <EmptyState
            message="No tasks yet."
            sub="Tap + to create the first task."
          />
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor={C.PRIMARY}
          />
        }
      />

      {/* ── Create Task Modal ──────────────────────────────────────────────── */}
      <Modal visible={createVisible} transparent animationType="slide" onRequestClose={closeCreateModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>New Task.</Text>
                <Text style={styles.modalSub}>ASSIGN A DELIVERABLE</Text>
              </View>
              <TouchableOpacity onPress={closeCreateModal} style={styles.modalCloseBtn}>
                <Feather name="x" size={18} color={C.TEXT2} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>TASK TITLE *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Update landing page copy"
              placeholderTextColor={C.TEXT3}
              value={cTitle}
              onChangeText={setCTitle}
            />

            <Text style={[styles.label, { marginTop: 14 }]}>DESCRIPTION</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Add any context or notes..."
              placeholderTextColor={C.TEXT3}
              value={cDesc}
              onChangeText={setCDesc}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Text style={[styles.label, { marginTop: 14 }]}>DEADLINE</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD  (optional)"
              placeholderTextColor={C.TEXT3}
              value={cDeadline}
              onChangeText={setCDeadline}
              keyboardType="numbers-and-punctuation"
            />

            <Text style={[styles.label, { marginTop: 14 }]}>ASSIGN TO *</Text>
            <TouchableOpacity style={styles.picker} onPress={() => setCPicker(true)} activeOpacity={0.7}>
              <Feather name="users" size={15} color={C.TEXT3} />
              <Text style={[styles.pickerText, { color: cUsers.length > 0 ? C.TEXT : C.TEXT3 }]} numberOfLines={1}>
                {userNames(cUsers)}
              </Text>
              <Feather name="chevron-down" size={15} color={C.TEXT3} />
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
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.confirmText}>Create Task</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Edit Task Modal ────────────────────────────────────────────────── */}
      <Modal visible={editVisible} transparent animationType="slide" onRequestClose={closeEditModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Task.</Text>
                <Text style={styles.modalSub}>UPDATE DELIVERABLE</Text>
              </View>
              <TouchableOpacity onPress={closeEditModal} style={styles.modalCloseBtn}>
                <Feather name="x" size={18} color={C.TEXT2} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>TASK TITLE *</Text>
            <TextInput
              style={styles.input}
              placeholder="Task title"
              placeholderTextColor={C.TEXT3}
              value={eTitle}
              onChangeText={setETitle}
            />

            <Text style={[styles.label, { marginTop: 14 }]}>DESCRIPTION</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Add any context or notes..."
              placeholderTextColor={C.TEXT3}
              value={eDesc}
              onChangeText={setEDesc}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Text style={[styles.label, { marginTop: 14 }]}>DEADLINE</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD  (optional)"
              placeholderTextColor={C.TEXT3}
              value={eDeadline}
              onChangeText={setEDeadline}
              keyboardType="numbers-and-punctuation"
            />

            <Text style={[styles.label, { marginTop: 14 }]}>ASSIGN TO *</Text>
            <TouchableOpacity style={styles.picker} onPress={() => setEPicker(true)} activeOpacity={0.7}>
              <Feather name="users" size={15} color={C.TEXT3} />
              <Text style={[styles.pickerText, { color: eUsers.length > 0 ? C.TEXT : C.TEXT3 }]} numberOfLines={1}>
                {userNames(eUsers)}
              </Text>
              <Feather name="chevron-down" size={15} color={C.TEXT3} />
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
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.confirmText}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.BG },
  center:    { justifyContent: 'center', alignItems: 'center' },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
  },
  heading: {
    fontSize: 30,
    fontWeight: '800',
    color: C.TEXT,
    letterSpacing: -0.8,
  },
  subheading: {
    fontSize: 11,
    fontWeight: '700',
    color: C.TEXT3,
    letterSpacing: 1,
    marginTop: 2,
  },
  countPill: {
    backgroundColor: C.PRIMARY_L,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  countPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.PRIMARY_D,
  },

  list: { paddingHorizontal: 24, paddingBottom: 100, paddingTop: 12 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: C.SURFACE,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24,
    gap: 4,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 22, fontWeight: '800', color: C.TEXT, letterSpacing: -0.5 },
  modalSub:   { fontSize: 11, fontWeight: '700', color: C.TEXT3, letterSpacing: 1, marginTop: 2 },
  modalCloseBtn: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: C.SURFACE2,
    alignItems: 'center', justifyContent: 'center',
  },

  label: {
    fontSize: 11,
    fontWeight: '700',
    color: C.TEXT3,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    backgroundColor: C.BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.BORDER,
    color: C.TEXT,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  textarea: { height: 88 },

  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.BORDER,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  pickerText: { flex: 1, fontSize: 15 },

  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: C.BORDER2,
  },
  userRowSel:  { backgroundColor: C.PRIMARY_L, paddingHorizontal: 10, borderRadius: 12, borderBottomWidth: 0, marginVertical: 2 },
  userInfo:    { flex: 1 },
  userName:    { color: C.TEXT,  fontSize: 15, fontWeight: '600' },
  userEmail:   { color: C.TEXT3, fontSize: 12, marginTop: 2 },
  checkbox: {
    width: 22, height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: C.BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: { backgroundColor: C.PRIMARY, borderColor: C.PRIMARY },

  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn:    { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: C.SURFACE2, alignItems: 'center' },
  cancelText:   { color: C.TEXT2, fontSize: 14, fontWeight: '600' },
  confirmBtn:   { flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: C.PRIMARY, alignItems: 'center', ...shadow.sm },
  confirmText:  { color: '#fff', fontSize: 14, fontWeight: '700' },
});
