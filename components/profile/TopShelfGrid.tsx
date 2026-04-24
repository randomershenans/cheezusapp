import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Star } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';
import type { TopShelfCheese } from '@/lib/profile-service';

type Props = {
  cheeses: TopShelfCheese[];
  totalCheeseCount: number;
  isOwnProfile?: boolean;
};

export default function TopShelfGrid({ cheeses, totalCheeseCount, isOwnProfile }: Props) {
  const router = useRouter();

  if (!cheeses || cheeses.length === 0) {
    return (
      <View style={styles.container}>
        <SectionHeader title="Top Shelf" />
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No rated cheeses yet</Text>
          <Text style={styles.emptyBody}>
            {isOwnProfile
              ? 'Rate a cheese 4★ or higher to see it here.'
              : 'Their top-rated cheeses will show up here.'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <SectionHeader title="Top Shelf" />
        {totalCheeseCount > 4 ? (
          <Text style={styles.seeAll}>See all {totalCheeseCount}</Text>
        ) : null}
      </View>

      <View style={styles.grid}>
        {cheeses.slice(0, 4).map((cheese) => (
          <TouchableOpacity
            key={cheese.cheese_id}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => router.push(`/producer-cheese/${cheese.cheese_id}`)}
          >
            {cheese.image_url ? (
              <Image source={{ uri: cheese.image_url }} style={styles.image} />
            ) : (
              <View style={[styles.image, styles.imageFallback]}>
                <Text style={styles.imageFallbackEmoji}>🧀</Text>
              </View>
            )}

            {cheese.rating != null ? (
              <View style={styles.ratingBadge}>
                <Star size={11} color="#FFD700" fill="#FFD700" />
                <Text style={styles.ratingText}>
                  {Number(cheese.rating) % 1 === 0
                    ? Number(cheese.rating).toFixed(0)
                    : Number(cheese.rating).toFixed(1)}
                </Text>
              </View>
            ) : null}

            <View style={styles.caption}>
              <Text style={styles.name} numberOfLines={1}>{cheese.name}</Text>
              {cheese.producer_name ? (
                <Text style={styles.producer} numberOfLines={1}>{cheese.producer_name}</Text>
              ) : null}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Layout.spacing.m,
    marginTop: Layout.spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Layout.spacing.m,
  },
  sectionTitle: {
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.s,
  },
  card: {
    width: '48.5%',
    borderRadius: Layout.borderRadius.large,
    backgroundColor: '#FFFEF7',
    overflow: 'hidden',
    ...Layout.shadow.small,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
  },
  imageFallback: {
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageFallbackEmoji: {
    fontSize: 56,
  },
  ratingBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    gap: 3,
  },
  ratingText: {
    fontSize: 11,
    fontFamily: Typography.fonts.bodyBold,
    color: '#FFF',
  },
  caption: {
    paddingHorizontal: Layout.spacing.s,
    paddingVertical: Layout.spacing.s,
  },
  name: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
  },
  producer: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  emptyCard: {
    padding: Layout.spacing.l,
    backgroundColor: '#FFFEF7',
    borderRadius: Layout.borderRadius.large,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
  },
  emptyBody: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
});
