import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { User } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';
import type { TeamMember } from '@/lib/producer-sections-service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MEMBER_CARD_WIDTH = SCREEN_WIDTH * 0.42;

interface TeamSectionProps {
  title?: string;
  subtitle?: string;
  members: TeamMember[];
}

export default function TeamSection({ title, subtitle, members }: TeamSectionProps) {
  if (!members || members.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {subtitle && <Text style={styles.superTitle}>{subtitle}</Text>}
        <Text style={styles.title}>{title || 'The People'}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={MEMBER_CARD_WIDTH + Layout.spacing.m}
      >
        {members.map((member, index) => (
          <View key={index} style={styles.memberCard}>
            {member.image_url ? (
              <Image source={{ uri: member.image_url }} style={styles.memberImage} />
            ) : (
              <View style={[styles.memberImage, styles.memberImagePlaceholder]}>
                <User size={40} color={Colors.subtleText} />
              </View>
            )}
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={styles.memberRole}>{member.role}</Text>
              {member.bio && (
                <Text style={styles.memberBio} numberOfLines={3}>{member.bio}</Text>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Layout.spacing.xl,
    backgroundColor: Colors.background,
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
    color: Colors.text,
  },
  scrollContent: {
    paddingHorizontal: Layout.spacing.l,
    gap: Layout.spacing.m,
  },
  memberCard: {
    width: MEMBER_CARD_WIDTH,
    backgroundColor: Colors.card,
    borderRadius: Layout.borderRadius.large,
    overflow: 'hidden',
    ...Layout.shadow.small,
  },
  memberImage: {
    width: '100%',
    height: MEMBER_CARD_WIDTH * 1.15,
    backgroundColor: Colors.lightGray,
  },
  memberImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberInfo: {
    padding: Layout.spacing.m,
  },
  memberName: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
    marginBottom: 2,
  },
  memberRole: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Layout.spacing.s,
  },
  memberBio: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.textSecondary,
    lineHeight: Typography.sizes.xs * 1.5,
  },
});
