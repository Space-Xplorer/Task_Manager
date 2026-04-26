import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  Animated, TextInput, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTasks, useUpdateStatus } from '@/hooks/useTasks';
import { useSSEStore } from '@/stores/sseStore';
import { TaskCard } from '@/components/TaskCard';
import { TaskSkeleton } from '@/components/TaskSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { Task } from '@/api/endpoints';

const FILTERS = [
  { key: undefined,     label: 'All'         },
  { key: 'pending',     label: 'Pending'     },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed',   label: 'Completed'   },
] as const;

// ─── Toast notification ──────────────────────────────────────────────────────
const Toast: React.FC<{ message: string | null }> = ({ message }) => {
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
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
};

export default function TaskListScreen() {
  const router  = useRouter();
  const [filter, setFilter]               = useState<string | undefined>(undefined);
  const [search, setSearch]               = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: tasks, isLoading, isError, refetch, isFetching } = useTasks();
  const updateStatus   = useUpdateStatus();
  const notification   = useSSEStore((s) => s.notification);
  const highlightedIds = useSSEStore((s) => s.highlightedIds);

  const handleSearchChange = (text: string) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(text), 300);
  };

  const clearSearch = () => {
    setSearch('');
    setDebouncedSearch('');
    if (searchTimer.current) clearTimeout(searchTimer.current);
  };

  const handleStatusChange = (id: string, status: string) => updateStatus.mutate({ id, status });

  const allTasks    = tasks ?? [];
  const activeCount = allTasks.filter((t) => t.status !== 'completed').length;

  const filteredTasks = allTasks.filter((t) => {
    if (filter && t.status !== filter) return false;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      if (!t.title.toLowerCase().includes(q) && !t.description?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header activeCount={null} />
        <SearchBar value={search} onChange={handleSearchChange} onClear={clearSearch} />
        <FilterRow filter={filter} setFilter={setFilter} tasks={[]} />
        {[0, 1, 2].map((i) => <TaskSkeleton key={i} />)}
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header activeCount={null} />
        <View style={styles.errorBox}>
          <View style={styles.errorInner}>
            <Text style={styles.errorTitle}>Failed to load</Text>
            <Text style={styles.errorSub}>Could not fetch your tasks.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Toast message={notification} />
      <Header activeCount={activeCount} />
      <SearchBar value={search} onChange={handleSearchChange} onClear={clearSearch} />
      <FilterRow filter={filter} setFilter={setFilter} tasks={allTasks} />

      <FlatList
        data={filteredTasks}
        keyExtractor={(t) => t._id}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onPress={() => router.push(`/(app)/task/${item._id}`)}
            onStatusChange={handleStatusChange}
            isHighlighted={!!highlightedIds[item._id]}
          />
        )}
        ListEmptyComponent={<EmptyState message="You're all caught up." />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor="#10B981"
          />
        }
      />
    </SafeAreaView>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const Header = ({ activeCount }: { activeCount: number | null }) => (
  <View style={styles.headerRow}>
    <Text style={styles.heading}>My Tasks</Text>
    {activeCount !== null && activeCount > 0 && (
      <Text style={styles.activeCount}>{activeCount} active</Text>
    )}
  </View>
);

const SearchBar = ({
  value, onChange, onClear,
}: { value: string; onChange: (s: string) => void; onClear: () => void }) => (
  <View style={styles.searchWrap}>
    <Feather name="search" size={15} color="#9CA3AF" style={styles.searchIcon} />
    <TextInput
      style={styles.searchInput}
      placeholder="Search tasks..."
      placeholderTextColor="#9CA3AF"
      value={value}
      onChangeText={onChange}
      autoCapitalize="none"
    />
    {value.length > 0 && (
      <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Feather name="x" size={15} color="#9CA3AF" />
      </TouchableOpacity>
    )}
  </View>
);

const FilterRow = ({
  filter, setFilter, tasks,
}: {
  filter: string | undefined;
  setFilter: (k: string | undefined) => void;
  tasks: Task[];
}) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.filterScroll}
  >
    {FILTERS.map(({ key, label }) => {
      const active = filter === key;
      const count  = tasks.filter((t) => !key || t.status === key).length;
      return (
        <TouchableOpacity
          key={label}
          style={[styles.filterChip, active && styles.filterChipActive]}
          onPress={() => setFilter(key as string | undefined)}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
          {active && count > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{count}</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F5F0' },

  toast: {
    position: 'absolute',
    top: 56,
    alignSelf: 'center',
    zIndex: 100,
    backgroundColor: '#1C2E1D',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  toastText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 14,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  activeCount: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon:  { marginRight: 8 },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 14,
    color: '#111827',
  },

  filterScroll: {
    paddingHorizontal: 24,
    gap: 8,
    paddingBottom: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  filterChipActive: { backgroundColor: '#1C2E1D' },
  filterText:       { fontSize: 12, fontWeight: '600', color: '#374151' },
  filterTextActive: { color: '#FFFFFF' },
  filterBadge: {
    backgroundColor: '#D6FF38',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
  },
  filterBadgeText: { fontSize: 10, fontWeight: '700', color: '#1C2E1D' },

  list: { paddingHorizontal: 24, paddingBottom: 100, paddingTop: 4 },

  errorBox:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorInner: {
    borderRadius: 20, padding: 28, alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF', width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 3,
  },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  errorSub:   { fontSize: 14, color: '#6B7280' },
  retryBtn:   { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#1C2E1D', marginTop: 4 },
  retryText:  { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
});
