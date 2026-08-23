import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { theme } from '../suggestionTheme';

/** โครงการ์ดเทาๆ กระพริบระหว่างรอ AI คำนวณรายการซื้อของ */
export default function PurchaseSkeleton({ count = 4 }: { count?: number }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <Animated.View key={i} style={[styles.card, { opacity }]}>
          <View style={styles.headerRow}>
            <View style={[styles.bar, { width: '45%', height: 16 }]} />
            <View style={[styles.bar, { width: 80, height: 22, borderRadius: 11 }]} />
          </View>
          <View style={[styles.bar, { width: '35%', height: 24, marginTop: 14 }]} />
          <View style={[styles.bar, { width: '65%', marginTop: 10 }]} />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.card,
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bar: { height: 12, borderRadius: 6, backgroundColor: theme.border },
});
