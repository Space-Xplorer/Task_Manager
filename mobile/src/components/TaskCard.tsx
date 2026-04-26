import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Image, Pressable,
  PanResponder, Animated, Alert,
} from 'react-native';
import { Task } from '@/api/endpoints';
import { StatusBadge } from './StatusBadge';
import { getAvatarUrlByEmail } from '@/lib/avatar';

const SWIPE_THRESHOLD = 72;

interface Props {
  task:            Task;
  onPress?:        () => void;
  onStatusChange?: (id: string, newStatus: string) => void;
  onEdit?:         (task: Task) => void;
  onDelete?:       (task: Task) => void;
  isHighlighted?:  boolean;
}

export const TaskCard: React.FC<Props> = ({
  task, onPress, onStatusChange, onEdit, onDelete, isHighlighted,
}) => {
  // ─── Animations ─────────────────────────────────────────────────────────────
  const swipeX    = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isHighlighted) return;
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 0.6, duration: 120, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 1,   duration: 500, useNativeDriver: true }),
    ]).start();
  }, [isHighlighted]);

  // ─── Stable refs so PanResponder callbacks never stale-close ────────────────
  const statusRef           = useRef(task.status);
  statusRef.current         = task.status;
  const onStatusChangeRef   = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  // ─── Swipe gesture ──────────────────────────────────────────────────────────
  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gs) =>
      Math.abs(gs.dx) > 8 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,

    onPanResponderMove: (_, gs) => {
      swipeX.setValue(gs.dx * 0.28);
    },

    onPanResponderRelease: (_, gs) => {
      Animated.spring(swipeX, { toValue: 0, useNativeDriver: true, tension: 200, friction: 14 }).start();

      const cb = onStatusChangeRef.current;
      if (!cb) return;

      if (gs.dx > SWIPE_THRESHOLD && statusRef.current !== 'completed') {
        Alert.alert(
          'Mark as Done?',
          'Confirm this task is fully completed.',
          [
            { text: 'Not yet', style: 'cancel' },
            { text: 'Done', onPress: () => cb(task._id, 'completed') },
          ],
        );
      } else if (gs.dx < -SWIPE_THRESHOLD && statusRef.current !== 'in_progress') {
        cb(task._id, 'in_progress');
      }
    },

    onPanResponderTerminate: () => {
      Animated.spring(swipeX, { toValue: 0, useNativeDriver: true }).start();
    },
  })).current;

  // ─── Press: card scales down slightly ───────────────────────────────────────
  const animatePress = (down: boolean) => {
    Animated.spring(scaleAnim, {
      toValue: down ? 0.97 : 1,
      useNativeDriver: true,
      speed: 60,
      bounciness: 0,
    }).start();
  };

  // ─── Deadline display ───────────────────────────────────────────────────────
  const deadline = (() => {
    if (!task.deadline) return null;
    const d   = new Date(task.deadline);
    const now = new Date(); now.setHours(0, 0, 0, 0);
    return { label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), overdue: d < now };
  })();

  // ─── Assignees ──────────────────────────────────────────────────────────────
  const assignees = (() => {
    const raw = Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo];
    return raw.map((a) =>
      typeof a === 'object'
        ? { id: a._id, name: a.name, email: a.email ?? a.name }
        : { id: String(a), name: '?', email: String(a) }
    );
  })();

  const isAdmin = !!(onEdit || onDelete);

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
        {/* Highlight accent */}
        {isHighlighted && <View style={styles.highlightBar} />}

        {/* ── Top row: status + date ──────────────────────────── */}
        <View style={styles.topRow}>
          <StatusBadge status={task.status} />
          <Text style={styles.dateText}>
            {new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </Text>
        </View>

        {/* ── Title ────────────────────────────────────────────── */}
        <Text style={styles.title} numberOfLines={2}>{task.title}</Text>

        {/* ── Description ──────────────────────────────────────── */}
        {task.description ? (
          <Text style={styles.desc} numberOfLines={2}>{task.description}</Text>
        ) : null}

        {/* ── Footer: avatars + deadline ───────────────────────── */}
        <View style={styles.footer}>
          <View style={styles.avatarStack}>
            {assignees.slice(0, 3).map((a, i) => (
              <View
                key={a.id}
                style={[styles.avatarWrap, { marginLeft: i > 0 ? -10 : 0, zIndex: 3 - i }]}
              >
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

          {deadline ? (
            <View style={[styles.deadlineBadge, deadline.overdue && styles.deadlineOverdue]}>
              <Text style={[styles.deadlineText, deadline.overdue && styles.deadlineTextOverdue]}>
                {deadline.overdue ? '⚠ ' : ''}{deadline.label}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── Admin inline actions ─────────────────────────────── */}
        {isAdmin && (
          <View style={styles.adminRow}>
            {onEdit && (
              <Pressable style={styles.editBtn} onPress={() => onEdit(task)}>
                <Text style={styles.editBtnText}>Edit</Text>
              </Pressable>
            )}
            {onDelete && (
              <Pressable style={styles.deleteBtn} onPress={() => onDelete(task)}>
                <Text style={styles.deleteBtnText}>Delete</Text>
              </Pressable>
            )}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },

  highlightBar: {
    height: 3,
    backgroundColor: '#4ADE80',
    marginBottom: 12,
    marginHorizontal: -18,
    marginTop: -18,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.2,
  },

  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
    lineHeight: 25,
    marginBottom: 6,
  },

  desc: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
    fontWeight: '400',
    marginBottom: 16,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },

  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  avatarWrap: {
    width: 30, height: 30,
    borderRadius: 15,
    borderWidth: 2, borderColor: '#FFFFFF',
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  avatar: { width: '100%', height: '100%' },
  avatarMore: {
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMoreText: { color: '#6B7280', fontSize: 10, fontWeight: '700' },

  deadlineBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#F3F4F6',
  },
  deadlineOverdue: { backgroundColor: '#FEF2F2' },
  deadlineText:    { fontSize: 11, fontWeight: '600', color: '#374151' },
  deadlineTextOverdue: { color: '#EF4444' },

  adminRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  editBtn: {
    borderWidth: 1, borderColor: '#D1D5DB',
    paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  editBtnText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  deleteBtn: {
    borderWidth: 1, borderColor: '#FECACA',
    paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  deleteBtnText: { fontSize: 12, fontWeight: '600', color: '#EF4444' },
});
