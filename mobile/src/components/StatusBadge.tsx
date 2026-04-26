import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Status = 'pending' | 'in_progress' | 'completed';

const CONFIG: Record<Status, { label: string; bg: string; color: string }> = {
  pending:     { label: 'Pending',     bg: '#FFF7ED', color: '#C2410C' },
  in_progress: { label: 'In Progress', bg: '#EFF6FF', color: '#2563EB' },
  completed:   { label: 'Completed',   bg: '#F0FDF4', color: '#15803D' },
};

export const StatusBadge: React.FC<{ status: Status }> = ({ status }) => {
  const cfg = CONFIG[status] ?? CONFIG.pending;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.label, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
});
