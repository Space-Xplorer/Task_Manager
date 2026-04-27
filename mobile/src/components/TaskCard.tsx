import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Image, Pressable,
  PanResponder, Animated, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Task } from '@/api/endpoints';
import { StatusBadge } from './StatusBadge';
import { getAvatarUrlByEmail } from '@/lib/avatar';
import { C, STATUS_CONFIG, shadow } from '@/lib/theme';
import { useAuthStore } from '@/stores/authStore';

const SWIPE_THRESHOLD = 72;

interface Props {
  task:            Task;
  onPress?:        () => void;
  onStatusChange?: (id: string, newStatus: string) => void;
  onEdit?:         (task: Task) => void;
  onDelete?:       (task: Task) => void;
  isHighlighted?:  boolean;
  isNew?:          boolean;
}

export const TaskCard = React.memo(function TaskCard({
  task, onPress, onStatusChange, onEdit, onDelete, isHighlighted, isNew,
}: Props) {
  const user = useAuthStore((s) => s.user);
  const swipeX    = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isHighlighted) return;
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 0.55, duration: 120, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 1,    duration: 500, useNativeDriver: true }),
    ]).start();
  }, [isHighlighted]);

  const statusRef           = useRef(task.status);
  statusRef.current         = task.status;
  const onStatusChangeRef   = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gs) =>
      Math.abs(gs.dx) > 8 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,

    onPanResponderMove: (_, gs) => { swipeX.setValue(gs.dx * 0.28); },

    onPanResponderRelease: (_, gs) => {
      Animated.spring(swipeX, { toValue: 0, useNativeDriver: true, tension: 200, friction: 14 }).start();
      const cb = onStatusChangeRef.current;
      if (!cb) return;
      if (gs.dx > SWIPE_THRESHOLD && statusRef.current !== 'completed') {
        Alert.alert('Mark as Done?', 'Confirm this task is fully completed.', [
          { text: 'Not yet', style: 'cancel' },
          { text: 'Done', onPress: () => cb(task._id, 'completed') },
        ]);
      } else if (gs.dx < -SWIPE_THRESHOLD && statusRef.current !== 'in_progress') {
        cb(task._id, 'in_progress');
      }
    },

    onPanResponderTerminate: () => {
      Animated.spring(swipeX, { toValue: 0, useNativeDriver: true }).start();
    },
  })).current;

  const animatePress = (down: boolean) => {
    Animated.spring(scaleAnim, {
      toValue: down ? 0.97 : 1,
      useNativeDriver: true, speed: 60, bounciness: 0,
    }).start();
  };

  // ── Deadline + urgency ─────────────────────────────────────────────────
  const urgency = (() => {
    if (!task.deadline || task.status === 'completed') return 'none' as const;
    const d = new Date(task.deadline);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(todayStart); todayEnd.setDate(todayEnd.getDate() + 1);
    if (d < todayStart)  return 'overdue' as const;
    if (d < todayEnd)    return 'today'   as const;
    return 'none' as const;
  })();

  const stripBg = task.status === 'completed'
    ? STATUS_CONFIG.completed.strip
    : urgency === 'overdue' ? C.DANGER
    : urgency === 'today'   ? '#F59E0B'
    : STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG]?.strip ?? '#D1D5DB';

  const deadline = (() => {
    if (!task.deadline) return null;
    const d        = new Date(task.deadline);
    const now      = new Date(); now.setHours(0, 0, 0, 0);
    const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
    const isToday    = d.toDateString() === now.toDateString();
    const isTomorrow = d.toDateString() === tomorrow.toDateString();
    const overdue    = d < now && !isToday;
    const label = isToday    ? 'Today'
                : isTomorrow ? 'Tomorrow'
                : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return { label, overdue };
  })();

  const assignees = (() => {
    const raw = Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo];
    return raw.map((a) =>
      typeof a === 'object'
        ? { id: a._id, name: a.name, email: a.email ?? a.name }
        : { id: String(a), name: '?', email: String(a) }
    );
  })();

  const isAdminCard = user?.role === 'admin' && !!(onEdit || onDelete);

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { transform: [{ translateX: swipeX }, { scale: scaleAnim }], opacity: flashAnim },
      ]}
      {...(onStatusChange ? panResponder.panHandlers : {})}
    >
      <Pressable
        style={styles.card}
        onPress={onPress}
        onPressIn={() => animatePress(true)}
        onPressOut={() => animatePress(false)}
      >
        {/* Left urgency / status strip */}
        <View style={[styles.statusStrip, { backgroundColor: stripBg }]} />

        {/* Highlight bar (SSE notification) */}
        {isHighlighted && <View style={styles.highlightBar} />}

        {/* Top row: badges + date */}
        <View style={styles.topRow}>
          <View style={styles.topBadges}>
            <StatusBadge status={task.status as any} />
            {isNew && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            )}
            {urgency === 'overdue' && (
              <View style={styles.urgentBadge}>
                <Feather name="alert-triangle" size={9} color={C.DANGER} />
                <Text style={styles.urgentText}>Overdue</Text>
              </View>
            )}
            {urgency === 'today' && (
              <View style={styles.todayBadge}>
                <Text style={styles.todayText}>Due Today</Text>
              </View>
            )}
          </View>
          <Text style={styles.dateText}>
            {new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </Text>
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>{task.title}</Text>

        {/* Description */}
        {task.description ? (
          <Text style={styles.desc} numberOfLines={2}>{task.description}</Text>
        ) : null}

        {/* Footer: avatars + deadline */}
        <View style={styles.footer}>
          <View style={styles.avatarStack}>
            {assignees.slice(0, 3).map((a, i) => (
              <View key={a.id} style={[styles.avatarWrap, { marginLeft: i > 0 ? -10 : 0, zIndex: 3 - i }]}>
                <Image
                  source={{ uri: getAvatarUrlByEmail(a.email) }}
                  style={styles.avatar}
                  defaultSource={require('../../assets/icon.png')}
                />
              </View>
            ))}
            {assignees.length > 3 && (
              <View style={[styles.avatarWrap, styles.avatarMore, { marginLeft: -10, zIndex: 0 }]}>
                <Text style={styles.avatarMoreText}>+{assignees.length - 3}</Text>
              </View>
            )}
          </View>

          {deadline && (
            <View style={[styles.deadlineBadge, deadline.overdue && styles.deadlineOverdue]}>
              <Text style={[styles.deadlineText, deadline.overdue && styles.deadlineTextOverdue]}>
                {deadline.overdue ? '⚠ ' : ''}{deadline.label}
              </Text>
            </View>
          )}
        </View>

        {/* Admin actions */}
        {isAdminCard && (
          <View style={styles.adminRow}>
            {onEdit && (
              <Pressable style={styles.editBtn} onPress={() => onEdit(task)}>
                <Feather name="edit-2" size={12} color={C.TEXT2} />
                <Text style={styles.editBtnText}>Edit</Text>
              </Pressable>
            )}
            {onDelete && (
              <Pressable style={styles.deleteBtn} onPress={() => onDelete(task)}>
                <Feather name="trash-2" size={12} color={C.DANGER} />
                <Text style={styles.deleteBtnText}>Delete</Text>
              </Pressable>
            )}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrapper: { marginBottom: 12 },

  card: {
    backgroundColor: C.SURFACE,
    borderRadius: 20,
    padding: 18,
    paddingLeft: 22,
    overflow: 'hidden',
    ...shadow.md,
  },

  statusStrip: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 4,
  },

  highlightBar: {
    height: 3,
    backgroundColor: C.PRIMARY,
    marginBottom: 12,
    marginHorizontal: -22,
    marginTop: -18,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  topBadges: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, flexWrap: 'wrap' },
  dateText:  { fontSize: 11, fontWeight: '600', color: C.TEXT3, letterSpacing: 0.2 },

  newBadge: {
    backgroundColor: C.PRIMARY,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  newBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },

  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: C.DANGER_L,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  urgentText: { fontSize: 9, fontWeight: '700', color: C.DANGER },

  todayBadge: {
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  todayText: { fontSize: 9, fontWeight: '700', color: '#D97706' },

  title: {
    fontSize: 16,
    fontWeight: '700',
    color: C.TEXT,
    letterSpacing: -0.2,
    lineHeight: 23,
    marginBottom: 5,
  },

  desc: {
    fontSize: 13,
    color: C.TEXT2,
    lineHeight: 19,
    fontWeight: '400',
    marginBottom: 14,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },

  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  avatarWrap: {
    width: 28, height: 28,
    borderRadius: 14,
    borderWidth: 2, borderColor: C.SURFACE,
    overflow: 'hidden',
    backgroundColor: C.BORDER,
  },
  avatar: { width: '100%', height: '100%' },
  avatarMore: {
    backgroundColor: C.SURFACE2,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarMoreText: { color: C.TEXT2, fontSize: 9, fontWeight: '700' },

  deadlineBadge: {
    borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3,
    backgroundColor: C.SURFACE2,
  },
  deadlineOverdue:     { backgroundColor: C.DANGER_L },
  deadlineText:        { fontSize: 11, fontWeight: '600', color: C.TEXT2 },
  deadlineTextOverdue: { color: C.DANGER },

  adminRow: {
    flexDirection: 'row', gap: 8,
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: C.BORDER2,
  },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: C.BORDER,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 10, backgroundColor: C.SURFACE2,
  },
  editBtnText:   { fontSize: 12, fontWeight: '600', color: C.TEXT2 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: '#FECACA',
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 10, backgroundColor: C.DANGER_L,
  },
  deleteBtnText: { fontSize: 12, fontWeight: '600', color: C.DANGER },
});
