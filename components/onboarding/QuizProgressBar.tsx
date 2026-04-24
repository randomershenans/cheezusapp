import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

type Props = {
  currentIndex: number;   // 0-based
  total: number;
  onBack?: () => void;
  onSkip?: () => void;
};

export default function QuizProgressBar({ currentIndex, total, onBack, onSkip }: Props) {
  const pct = Math.max(0, Math.min(1, (currentIndex + 1) / total));
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.sideSlot}>
          {currentIndex > 0 && onBack ? (
            <TouchableOpacity onPress={onBack} hitSlop={10} activeOpacity={0.7}>
              <ChevronLeft size={26} color={Colors.text} />
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{currentIndex + 1} of {total}</Text>
        </View>
        <View style={[styles.sideSlot, styles.sideSlotRight]}>
          {onSkip ? (
            <TouchableOpacity onPress={onSkip} hitSlop={10} activeOpacity={0.7}>
              <Text style={styles.skip}>Skip</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Layout.spacing.m,
    paddingTop: Layout.spacing.s,
    paddingBottom: Layout.spacing.m,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Layout.spacing.s,
  },
  sideSlot: {
    width: 60,
    alignItems: 'flex-start',
  },
  sideSlotRight: {
    alignItems: 'flex-end',
  },
  pill: {
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: 6,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 999,
  },
  pillText: {
    fontFamily: Typography.fonts.bodySemiBold,
    fontSize: Typography.sizes.sm,
    color: Colors.text,
  },
  skip: {
    fontFamily: Typography.fonts.bodyMedium,
    fontSize: Typography.sizes.sm,
    color: Colors.subtleText,
    textDecorationLine: 'underline',
  },
  track: {
    height: 4,
    backgroundColor: Colors.divider,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
});
