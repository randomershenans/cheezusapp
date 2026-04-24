import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

type Props = {
  cheeseCount: number;
  countryCount: number;
  avgRating: number | null;
};

/**
 * Three flex stats, no boxes, thin dividers between.
 * Intentionally excludes "Following" count — not a flex.
 * Followers count lives on the profile header near Follow button if > 0.
 */
export default function ProfileStatsTrio({ cheeseCount, countryCount, avgRating }: Props) {
  return (
    <View style={styles.row}>
      <StatItem value={cheeseCount.toString()} label={cheeseCount === 1 ? 'Cheese' : 'Cheeses'} />
      <Divider />
      <StatItem value={countryCount.toString()} label={countryCount === 1 ? 'Country' : 'Countries'} />
      <Divider />
      <StatItem
        value={avgRating != null ? `★ ${avgRating.toFixed(1)}` : '—'}
        label="Avg Rating"
      />
    </View>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: Layout.spacing.l,
    paddingHorizontal: Layout.spacing.m,
    marginHorizontal: Layout.spacing.m,
    backgroundColor: '#FFFEF7',
    borderRadius: Layout.borderRadius.large,
    marginTop: -28,
    ...Layout.shadow.small,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: Typography.sizes['3xl'],
    fontFamily: Typography.fonts.heading,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.textSecondary,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
});
