import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  message?: string;
  icon?:    string;
}

export const EmptyState: React.FC<Props> = ({ message = "You're all caught up." }) => (
  <View style={styles.container}>
    <View style={styles.box}>
      <Text style={styles.icon}>✓</Text>
    </View>
    <Text style={styles.message}>{message}</Text>
    <Text style={styles.sub}>No tasks to show here.</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 10,
  },
  box: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  icon: {
    fontSize: 30,
    fontWeight: '700',
    color: '#15803D',
  },
  message: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C2E1D',
    letterSpacing: -0.2,
    marginTop: 4,
  },
  sub: {
    fontSize: 13,
    color: '#8E9385',
    fontWeight: '500',
  },
});
