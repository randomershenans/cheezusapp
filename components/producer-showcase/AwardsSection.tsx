import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Award } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';
import type { AwardEntry } from '@/lib/producer-sections-service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AWARD_CARD_WIDTH = SCREEN_WIDTH * 0.55;

interface AwardsSectionProps {
  title?: string;
  subtitle?: string;
  awards: AwardEntry[];
}

export default function AwardsSection({ title, subtitle, awards }: AwardsSectionProps) {
  if (!awards || awards.length === 0) return null;

  const getMedalColor = (medal?: string) => {
    if (!medal) return Colors.primaryDark;
    const m = medal.toLowerCase();
    if (m.includes('super gold') || m.includes('platinum')) return '#C9A94E';
    if (m.includes('gold')) return '#FFD700';
    if (m.includes('silver')) return '#C0C0C0';
    if (m.includes('bronze')) return '#CD7F32';
    return Colors.primaryDark;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {subtitle && <Text style={styles.superTitle}>{subtitle}</Text>}
        <Text style={styles.title}>{title || 'Awards & Recognition'}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={AWARD_CARD_WIDTH + Layout.spacing.m}
      >
        {awards.map((award, index) => (
          <View key={index} style={styles.awardCard}>
            {award.image_url ? (
              <Image
                source={{ uri: award.image_url }}
                style={styles.awardImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.awardIconContainer}>
                <Award size={48} color={getMedalColor(award.medal)} />
              </View>
            )}
            {award.medal && (
              <View style={[styles.medalBadge, { backgroundColor: getMedalColor(award.medal) }]}>
                <Text style={styles.medalText}>{award.medal}</Text>
              </View>
            )}
            <Text style={styles.awardName}>{award.name}</Text>
            {award.cheese_name && (
              <Text style={styles.awardCheese}>{award.cheese_name}</Text>
            )}
            {award.year && (
              <Text style={styles.awardYear}>{award.year}</Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Layout.spacing.xl,
    backgroundColor: '#2C1810',
  },
  header: {
    paddingHorizontal: Layout.spacing.l,
    marginBottom: Layout.spacing.l,
  },
  superTitle: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: Layout.spacing.s,
  },
  title: {
    fontSize: Typography.sizes['2xl'],
    fontFamily: Typography.fonts.heading,
    color: '#fff',
  },
  scrollContent: {
    paddingHorizontal: Layout.spacing.l,
    gap: Layout.spacing.m,
  },
  awardCard: {
    width: AWARD_CARD_WIDTH,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: Layout.borderRadius.large,
    padding: Layout.spacing.l,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.15)',
  },
  awardImage: {
    width: 80,
    height: 80,
    marginBottom: Layout.spacing.m,
  },
  awardIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,215,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Layout.spacing.m,
  },
  medalBadge: {
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.borderRadius.large,
    marginBottom: Layout.spacing.m,
  },
  medalText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodySemiBold,
    color: '#2C1810',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  awardName: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.headingMedium,
    color: '#fff',
    textAlign: 'center',
    marginBottom: Layout.spacing.xs,
  },
  awardCheese: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: Layout.spacing.xs,
  },
  awardYear: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: 'rgba(255,255,255,0.5)',
  },
});
