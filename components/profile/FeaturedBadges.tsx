import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';
import type { FeaturedBadge } from '@/lib/profile-service';

type Props = {
  badges: FeaturedBadge[];
  onBadgePress?: (badge: FeaturedBadge) => void;
  totalBadgeCount?: number;
};

/**
 * Shows up to 4 featured badges — intentionally curated, not the full wall.
 * The RPC already sorts by (name contains 'og' or 'old world' → 0, category special → 1,
 *                          event → 2, achievement → 3, else → 4).
 */
export default function FeaturedBadges({ badges, onBadgePress, totalBadgeCount }: Props) {
  const router = useRouter();

  if (!badges || badges.length === 0) return null;

  const shown = badges.slice(0, 4);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Achievements</Text>
        {totalBadgeCount != null && totalBadgeCount > shown.length ? (
          <TouchableOpacity onPress={() => router.push('/badges')}>
            <Text style={styles.seeAll}>See all {totalBadgeCount}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.badgeRow}>
        {shown.map((badge) => (
          <TouchableOpacity
            key={badge.id}
            style={styles.badge}
            activeOpacity={0.8}
            onPress={() => onBadgePress?.(badge)}
          >
            <View style={styles.badgeImageWrap}>
              {badge.img_url ? (
                <Image source={{ uri: badge.img_url }} style={styles.badgeImage} resizeMode="cover" />
              ) : (
                <Text style={styles.badgeEmoji}>🏅</Text>
              )}
            </View>
            <Text style={styles.badgeName} numberOfLines={2}>
              {badge.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Layout.spacing.xl,
    paddingHorizontal: Layout.spacing.m,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Layout.spacing.m,
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.heading,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  seeAll: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.textSecondary,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Layout.spacing.s,
  },
  badge: {
    flex: 1,
    alignItems: 'center',
  },
  badgeImageWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFEF7',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.shadow.small,
  },
  badgeImage: {
    width: '100%',
    height: '100%',
  },
  badgeEmoji: {
    fontSize: 36,
  },
  badgeName: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
    textAlign: 'center',
    marginTop: Layout.spacing.s,
    minHeight: 28,
  },
});
