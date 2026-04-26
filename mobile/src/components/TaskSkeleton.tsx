import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

const SkeletonBlock = ({ w, h, style }: { w: number | string; h: number; style?: object }) => (
  <View style={[{ width: w as any, height: h, backgroundColor: '#E5E7EB', borderRadius: 6 }, style]} />
);

export const TaskSkeleton: React.FC = () => {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1,   duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.card, { opacity: pulse }]}>
        {/* Top row */}
        <View style={styles.topRow}>
          <SkeletonBlock w={80} h={22} style={{ borderRadius: 11 }} />
          <SkeletonBlock w={48} h={14} />
        </View>
        {/* Title */}
        <SkeletonBlock w="85%" h={20} style={{ marginBottom: 6 }} />
        <SkeletonBlock w="60%" h={20} style={{ marginBottom: 16 }} />
        {/* Description */}
        <SkeletonBlock w="100%" h={13} style={{ marginBottom: 4 }} />
        <SkeletonBlock w="75%"  h={13} style={{ marginBottom: 20 }} />
        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.avatarRow}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.avatar, { marginLeft: i > 0 ? -10 : 0 }]} />
            ))}
          </View>
          <SkeletonBlock w={50} h={13} />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginHorizontal: 24, marginBottom: 20 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 28, height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    borderWidth: 2, borderColor: '#FFFFFF',
  },
});
