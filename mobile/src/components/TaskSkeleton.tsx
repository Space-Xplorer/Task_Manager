import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { C, shadow } from '@/lib/theme';

const SkeletonBlock = ({ w, h, style }: { w: number | string; h: number; style?: object }) => (
  <View style={[{ width: w as any, height: h, backgroundColor: '#E9EAEC', borderRadius: 6 }, style]} />
);

export const TaskSkeleton: React.FC = () => {
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1,   duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.card, { opacity: pulse }]}>
        {/* Status strip placeholder */}
        <View style={styles.strip} />
        {/* Top row */}
        <View style={styles.topRow}>
          <SkeletonBlock w={84} h={22} style={{ borderRadius: 20 }} />
          <SkeletonBlock w={44} h={13} style={{ borderRadius: 6 }} />
        </View>
        {/* Title */}
        <SkeletonBlock w="82%" h={18} style={{ marginBottom: 6 }} />
        <SkeletonBlock w="55%" h={18} style={{ marginBottom: 14 }} />
        {/* Description */}
        <SkeletonBlock w="100%" h={12} style={{ marginBottom: 5 }} />
        <SkeletonBlock w="70%"  h={12} style={{ marginBottom: 20 }} />
        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.avatarRow}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.avatar, { marginLeft: i > 0 ? -10 : 0 }]} />
            ))}
          </View>
          <SkeletonBlock w={52} h={22} style={{ borderRadius: 20 }} />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginHorizontal: 24, marginBottom: 16 },
  card: {
    backgroundColor: C.SURFACE,
    borderRadius: 20,
    padding: 18,
    paddingLeft: 22,
    overflow: 'hidden',
    ...shadow.sm,
  },
  strip: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 4,
    backgroundColor: '#E9EAEC',
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 28, height: 28,
    borderRadius: 14,
    backgroundColor: '#E9EAEC',
    borderWidth: 2, borderColor: C.SURFACE,
  },
});
