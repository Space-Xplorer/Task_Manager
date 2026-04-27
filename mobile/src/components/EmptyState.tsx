import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { C } from '@/lib/theme';

interface Props {
  message?: string;
  sub?: string;
}

export const EmptyState: React.FC<Props> = ({
  message = 'Nothing here yet.',
  sub = 'Create something new to get started.',
}) => (
  <View style={styles.container}>
    <View style={styles.iconWrap}>
      <Feather name="inbox" size={26} color={C.PRIMARY} />
    </View>
    <Text style={styles.message}>{message}</Text>
    <Text style={styles.sub}>{sub}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 72,
    gap: 8,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: C.PRIMARY_L,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 17,
    fontWeight: '700',
    color: C.TEXT,
    letterSpacing: -0.2,
  },
  sub: {
    fontSize: 13,
    color: C.TEXT3,
    fontWeight: '400',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
