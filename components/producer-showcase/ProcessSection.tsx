import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';
import type { ProcessStep } from '@/lib/producer-sections-service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STEP_CARD_WIDTH = SCREEN_WIDTH * 0.72;

interface ProcessSectionProps {
  title?: string;
  subtitle?: string;
  steps: ProcessStep[];
}

export default function ProcessSection({ title, subtitle, steps }: ProcessSectionProps) {
  if (!steps || steps.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {subtitle && <Text style={styles.superTitle}>{subtitle}</Text>}
        <Text style={styles.title}>{title || 'The Process'}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={STEP_CARD_WIDTH + Layout.spacing.m}
      >
        {steps
          .sort((a, b) => a.step - b.step)
          .map((step, index) => (
            <View key={index} style={styles.stepCard}>
              {step.image_url && (
                <Image source={{ uri: step.image_url }} style={styles.stepImage} />
              )}
              <View style={styles.stepContent}>
                <View style={styles.stepNumberContainer}>
                  <Text style={styles.stepNumber}>{String(step.step).padStart(2, '0')}</Text>
                </View>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
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
    backgroundColor: Colors.backgroundSecondary,
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
  stepCard: {
    width: STEP_CARD_WIDTH,
    backgroundColor: Colors.card,
    borderRadius: Layout.borderRadius.large,
    overflow: 'hidden',
    ...Layout.shadow.medium,
  },
  stepImage: {
    width: '100%',
    height: 180,
    backgroundColor: Colors.lightGray,
  },
  stepContent: {
    padding: Layout.spacing.m,
  },
  stepNumberContainer: {
    marginBottom: Layout.spacing.s,
  },
  stepNumber: {
    fontSize: Typography.sizes['4xl'],
    fontFamily: Typography.fonts.heading,
    color: Colors.primaryDark,
    opacity: 0.3,
  },
  stepTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
    marginBottom: Layout.spacing.s,
  },
  stepDescription: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.textSecondary,
    lineHeight: Typography.sizes.sm * 1.6,
  },
});
