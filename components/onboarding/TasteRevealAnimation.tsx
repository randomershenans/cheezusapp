import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated, Easing } from 'react-native';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

type Props = {
  onDone: () => void;
};

/**
 * "Tuning your feed..." reveal animation played before showing the result
 * headline. Cycles through status messages for ~2.4s then calls onDone.
 *
 * Keep this lightweight — pure opacity + scale, no heavy libs.
 */
const STATUS_LINES = [
  'Tuning your feed…',
  'Matching cheeses to your palate…',
  'Plotting your first board…',
];

export default function TasteRevealAnimation({ onDone }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const lineOpacity = useRef(new Animated.Value(0)).current;
  const [lineIdx, setLineIdx] = React.useState(0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.2)),
      }),
    ]).start();

    let cancelled = false;
    const show = (idx: number) => {
      if (cancelled) return;
      setLineIdx(idx);
      Animated.sequence([
        Animated.timing(lineOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.delay(520),
        Animated.timing(lineOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(() => {
        if (idx + 1 < STATUS_LINES.length) {
          show(idx + 1);
        } else {
          // Animation done — brief hold then signal parent.
          setTimeout(() => { if (!cancelled) onDone(); }, 260);
        }
      });
    };
    show(0);

    return () => { cancelled = true; };
  }, [opacity, scale, lineOpacity, onDone]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.wheel, { opacity, transform: [{ scale }] }]}>
        <Text style={styles.wheelEmoji}>🧀</Text>
      </Animated.View>
      <Animated.Text style={[styles.status, { opacity: lineOpacity }]}>
        {STATUS_LINES[lineIdx]}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Layout.spacing.xl,
  },
  wheel: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Layout.spacing.xl,
    ...Layout.shadow.large,
  },
  wheelEmoji: {
    fontSize: 84,
  },
  status: {
    fontFamily: Typography.fonts.headingMedium,
    fontSize: Typography.sizes.lg,
    color: Colors.text,
    textAlign: 'center',
  },
});
