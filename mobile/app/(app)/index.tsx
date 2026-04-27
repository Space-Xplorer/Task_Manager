import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  Animated, TextInput, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTasks, useUpdateStatus, useCreateTask, useEditTask, useDeleteTask } from '@/hooks/useTasks';
import { useUsers } from '@/hooks/useUsers';
import { useAuthStore } from '@/stores/authStore';
import { useAdminStore } from '@/stores/adminStore';
import { useSSEStore } from '@/stores/sseStore';
import { TaskCard } from '@/components/TaskCard';
import { TaskSkeleton } from '@/components/TaskSkeleton';
import { TaskFormSheet, TaskFormData } from '@/components/TaskFormSheet';
import { Task } from '@/api/endpoints';
import { C, shadow } from '@/lib/theme';

// ─── Toast ───────────────────────────────────────────────────────────────────
const Toast = React.memo(({ message }: { message: string | null }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const prev = useRef<string | null>(null);

  useEffect(() => {
    if (message && message !== prev.current) {
      prev.current = message;
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [message]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-48, 0] });
  if (!message) return null;
  return (
    <Animated.View style={[styles.toast, { transform: [{ translateY }], opacity: anim }]}>
      <Feather name="bell" size={13} color="#fff" style={{ marginRight: 6 }} />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
});

// ─── Section header ──────────────────────────────────────────────────────────
const SectionHeader = React.memo(({
  title, count, collapsible, expanded, onToggle,
}: {
  title: string; count: number;
  collapsible?: boolean; expanded?: boolean; onToggle?: () => void;
}) => (
  <TouchableOpacity
    style={styles.sectionHeader}
    onPress={collapsible ? onToggle : undefined}
    activeOpacity={collapsible ? 0.7 : 1}
    disabled={!collapsible}
  >
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionRight}>
      <View style={styles.sectionBadge}>
        <Text style={styles.sectionBadgeText}>{count}</Text>
      </View>
      {collapsible && (
        <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={C.TEXT3} />
      )}
    </View>
  </TouchableOpacity>
));

// ─── Header ──────────────────────────────────────────────────────────────────
const Header = React.memo(({ activeCount }: { activeCount: number | null }) => (
  <View style={styles.headerRow}>
    <View>
      <Text style={styles.heading}>My Tasks.</Text>
      <Text style={styles.subheading}>WORKSPACE</Text>
    </View>
    {activeCount !== null && activeCount > 0 && (
      <View style={styles.activePill}>
        <Text style={styles.activePillText}>{activeCount} active</Text>
      </View>
    )}
  </View>
));

// ─── Search bar ──────────────────────────────────────────────────────────────
const SearchBar = React.memo(({
  value, onChange, onClear,
}: { value: string; onChange: (s: string) => void; onClear: () => void }) => (
  <View style={styles.searchWrap}>
    <Feather name="search" size={15} color={C.TEXT3} style={{ marginRight: 8 }} />
    <TextInput
      style={styles.searchInput}
      placeholder="Search tasks..."
      placeholderTextColor={C.TEXT3}
      value={value}
      onChangeText={onChange}
      autoCapitalize="none"
    />
    {value.length > 0 && (
      <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Feather name="x" size={15} color={C.TEXT3} />
      </TouchableOpacity>
    )}
  </View>
));

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function TaskListScreen() {
  const router  = useRouter();
  const user    = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  const [search,          setSearch]          = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [completedOpen,   setCompletedOpen]   = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: tasks,  isLoading, isError, refetch, isFetching } = useTasks();
  const { data: users,  isLoading: usersLoading } = useUsers(isAdmin);
  const updateStatus   = useUpdateStatus();
  const createMutation = useCreateTask();
  const editMutation   = useEditTask();
  const deleteMutation = useDeleteTask();

  const notification   = useSSEStore((s) => s.notification);
  const highlightedIds = useSSEStore((s) => s.highlightedIds);

  // Create sheet (triggered by FAB via adminStore)
  const { isCreateOpen, closeCreate } = useAdminStore();
  const [createVisible, setCreateVisible] = useState(false);
  useEffect(() => { if (isCreateOpen) setCreateVisible(true); }, [isCreateOpen]);
  const closeCreateSheet = () => { setCreateVisible(false); closeCreate(); };

  // Edit sheet
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const openEdit     = useCallback((task: Task) => setEditingTask(task), []);
  const closeEditSheet = () => setEditingTask(null);

  const handleSearchChange = (text: string) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(text), 300);
  };
  const clearSearch = () => {
    setSearch(''); setDebouncedSearch('');
    if (searchTimer.current) clearTimeout(searchTimer.current);
  };

  const handleStatusChange = useCallback(
    (id: string, status: string) => updateStatus.mutate({ id, status }),
    [updateStatus],
  );

  const handleDelete = useCallback((task: Task) => {
    Alert.alert('Delete Task', `Delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(task._id) },
    ]);
  }, [deleteMutation]);

  const handleCreate = async (data: TaskFormData) => {
    await createMutation.mutateAsync({
      title: data.title, description: data.description,
      assignedTo: data.assignedTo, deadline: data.deadline,
    });
    closeCreateSheet();
  };

  const handleEdit = async (data: TaskFormData) => {
    if (!editingTask) return;
    await editMutation.mutateAsync({
      id: editingTask._id,
      title: data.title, description: data.description,
      assignedTo: data.assignedTo, deadline: data.deadline,
    });
    closeEditSheet();
  };

  // ── Smart grouping ──────────────────────────────────────────────────────
  const allTasks  = tasks ?? [];
  const now       = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(todayStart); todayEnd.setDate(todayEnd.getDate() + 1);
  const oneDayAgo  = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const newTaskIds = new Set(allTasks.filter((t) => new Date(t.createdAt) > oneDayAgo).map((t) => t._id));

  const filtered = debouncedSearch
    ? allTasks.filter((t) => {
        const q = debouncedSearch.toLowerCase();
        return t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q);
      })
    : allTasks;

  const focusTasks:     Task[] = [];
  const ongoingTasks:   Task[] = [];
  const completedTasks: Task[] = [];

  filtered.forEach((t) => {
    if (t.status === 'completed') { completedTasks.push(t); return; }
    const dl       = t.deadline ? new Date(t.deadline) : null;
    const overdue  = dl && dl < todayStart;
    const dueToday = dl && dl >= todayStart && dl < todayEnd;
    const isNew    = newTaskIds.has(t._id);
    if (overdue || dueToday || isNew) focusTasks.push(t);
    else ongoingTasks.push(t);
  });

  const totalActive = allTasks.filter((t) => t.status !== 'completed').length;

  // ── Render helpers ──────────────────────────────────────────────────────
  const renderTask = (t: Task) => (
    <TaskCard
      key={t._id}
      task={t}
      onPress={() => router.push(`/(app)/task/${t._id}`)}
      onStatusChange={handleStatusChange}
      isHighlighted={!!highlightedIds[t._id]}
      isNew={newTaskIds.has(t._id)}
      onEdit={isAdmin ? openEdit : undefined}
      onDelete={isAdmin ? handleDelete : undefined}
    />
  );

  const isEmpty = focusTasks.length === 0 && ongoingTasks.length === 0 && completedTasks.length === 0;

  // ── Loading ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header activeCount={null} />
        <SearchBar value={search} onChange={handleSearchChange} onClear={clearSearch} />
        <View style={styles.skeletonWrap}>
          {[0, 1, 2].map((i) => <TaskSkeleton key={i} />)}
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header activeCount={null} />
        <View style={styles.errorBox}>
          <Feather name="wifi-off" size={36} color={C.TEXT3} />
          <Text style={styles.errorTitle}>Failed to load</Text>
          <Text style={styles.errorSub}>Could not fetch your tasks.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Toast message={notification} />
      <Header activeCount={totalActive} />
      <SearchBar value={search} onChange={handleSearchChange} onClear={clearSearch} />

      <ScrollView
        contentContainerStyle={[styles.content, isEmpty && styles.contentEmpty]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor={C.PRIMARY}
          />
        }
      >
        {isEmpty ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <Feather name="inbox" size={28} color={C.PRIMARY} />
            </View>
            <Text style={styles.emptyTitle}>
              {debouncedSearch ? 'No results found' : "You're all caught up!"}
            </Text>
            <Text style={styles.emptySub}>
              {debouncedSearch ? 'Try a different search term.' : 'No active tasks at the moment.'}
            </Text>
          </View>
        ) : (
          <>
            {/* ── Focus Now ──────────────────────────────────────── */}
            {focusTasks.length > 0 && (
              <View style={styles.section}>
                <SectionHeader title="🔥 Focus Now" count={focusTasks.length} />
                {focusTasks.map(renderTask)}
              </View>
            )}

            {/* ── Ongoing ────────────────────────────────────────── */}
            {ongoingTasks.length > 0 && (
              <View style={styles.section}>
                <SectionHeader title="📌 Ongoing" count={ongoingTasks.length} />
                {ongoingTasks.map(renderTask)}
              </View>
            )}

            {/* ── Completed (collapsible) ────────────────────────── */}
            {completedTasks.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  title="✅ Completed"
                  count={completedTasks.length}
                  collapsible
                  expanded={completedOpen}
                  onToggle={() => setCompletedOpen((v) => !v)}
                />
                {completedOpen && completedTasks.map(renderTask)}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── Admin sheets ─────────────────────────────────────────── */}
      {isAdmin && (
        <>
          <TaskFormSheet
            visible={createVisible}
            onClose={closeCreateSheet}
            onSubmit={handleCreate}
            users={users ?? []}
            usersLoading={usersLoading}
            submitting={createMutation.isPending}
            mode="create"
          />

          <TaskFormSheet
            visible={!!editingTask}
            onClose={closeEditSheet}
            onSubmit={handleEdit}
            users={users ?? []}
            usersLoading={usersLoading}
            submitting={editMutation.isPending}
            mode="edit"
            initialTitle={editingTask?.title ?? ''}
            initialDesc={editingTask?.description ?? ''}
            initialDeadline={editingTask?.deadline}
            initialUsers={
              editingTask
                ? (Array.isArray(editingTask.assignedTo)
                    ? editingTask.assignedTo.map((a) =>
                        typeof a === 'object' ? a._id : String(a)
                      )
                    : editingTask.assignedTo
                      ? [typeof editingTask.assignedTo === 'object'
                          ? editingTask.assignedTo._id
                          : String(editingTask.assignedTo)]
                      : [])
                : []
            }
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.BG },

  toast: {
    position: 'absolute', top: 56, alignSelf: 'center', zIndex: 100,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#18181B', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 9,
    ...shadow.md,
  },
  toastText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16,
  },
  heading:    { fontSize: 30, fontWeight: '800', color: C.TEXT, letterSpacing: -0.8 },
  subheading: { fontSize: 11, fontWeight: '700', color: C.TEXT3, letterSpacing: 1, marginTop: 2 },
  activePill: { backgroundColor: C.PRIMARY_L, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  activePillText: { fontSize: 12, fontWeight: '700', color: C.PRIMARY_D },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 24, marginBottom: 16,
    backgroundColor: C.SURFACE, borderRadius: 14,
    paddingHorizontal: 12, borderWidth: 1, borderColor: C.BORDER,
    ...shadow.sm,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: C.TEXT },

  skeletonWrap: { paddingHorizontal: 24 },

  content:      { paddingHorizontal: 24, paddingBottom: 120 },
  contentEmpty: { flex: 1 },

  section:       { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.TEXT },
  sectionRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionBadge: {
    backgroundColor: C.SURFACE2, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  sectionBadgeText: { fontSize: 12, fontWeight: '600', color: C.TEXT3 },

  errorBox:   { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, padding: 24 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: C.TEXT },
  errorSub:   { fontSize: 14, color: C.TEXT2 },
  retryBtn:   { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 11, backgroundColor: C.PRIMARY, marginTop: 8 },
  retryText:  { fontSize: 13, fontWeight: '600', color: '#fff' },

  emptyWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 80 },
  emptyIcon:  { width: 64, height: 64, borderRadius: 20, backgroundColor: C.PRIMARY_L, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.TEXT },
  emptySub:   { fontSize: 14, color: C.TEXT3 },
});
