import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Share,
  Animated,
  Easing,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Share2, ArrowRight } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Analytics } from '@/lib/analytics';
import { derivePersonalityTagline } from '@/lib/taste-personality';
import { CURATED_FLAVOR_TAGS } from '@/constants/FlavorTags';
import type { QuizAnswers } from '@/lib/taste-seed-service';
import TasteRevealAnimation from '@/components/onboarding/TasteRevealAnimation';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

const PROFILE_URL = 'https://cheezus.co';

/**
 * Parse the `answers` param (JSON-stringified from /onboarding/quiz) back
 * into a QuizAnswers object. Degrades to an empty object on any parse error.
 */
function parseAnswersParam(raw: unknown): QuizAnswers {
  if (typeof raw !== 'string') return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as QuizAnswers) : {};
  } catch {
    return {};
  }
}

/**
 * Attempt to use the shared card generator (owned by another agent in
 * lib/shareCard.ts). Falls back to native text Share if the module isn't
 * available or the call throws.
 */
async function shareTasteResult(args: {
  tagline: string;
  flavorTags: string[];
  fingerprint: Record<string, number>;
}) {
  const fallbackText =
    `My cheese taste: ${args.tagline}. Figure out yours on Cheezus → ${PROFILE_URL}`;

  try {
    // Dynamic import keeps us resilient to the module not existing yet.
    const mod: unknown = await import('@/lib/shareCard').catch(() => null);
    type GenAndShare = (
      cardType: string,
      props: Record<string, unknown>,
    ) => Promise<unknown>;

    const fn =
      mod && typeof mod === 'object' && 'generateAndShare' in (mod as Record<string, unknown>)
        ? ((mod as Record<string, unknown>).generateAndShare as GenAndShare | undefined)
        : undefined;

    if (typeof fn === 'function') {
      await fn('taste_result', {
        tagline: args.tagline,
        flavorTags: args.flavorTags,
        fingerprint: args.fingerprint,
      });
      return;
    }
  } catch (err) {
    console.warn('[result] shareCard.generateAndShare failed, falling back:', err);
  }

  try {
    await Share.share({ message: fallbackText, url: PROFILE_URL });
  } catch (err) {
    console.warn('[result] text share failed:', err);
  }
}

/**
 * Build a simplified 6-axis fingerprint from the user's picked flavors.
 * Selected axes → 1, others → 0.25 as a baseline. The shared fingerprint
 * structure is compatible with the future TasteFingerprint radar component.
 */
function buildMiniFingerprint(favoriteFlavors: string[] | undefined): Record<string, number> {
  const axes = CURATED_FLAVOR_TAGS.map((t) => t.name);
  const out: Record<string, number> = {};
  for (const axis of axes) {
    out[axis] = favoriteFlavors?.includes(axis) ? 1 : 0.25;
  }
  return out;
}

export default function ResultScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const answers = useMemo(() => parseAnswersParam(params.answers), [params.answers]);

  const [revealed, setRevealed] = useState(false);
  const contentFade = React.useRef(new Animated.Value(0)).current;
  const contentSlide = React.useRef(new Animated.Value(24)).current;

  const tagline = useMemo(() => derivePersonalityTagline(answers), [answers]);
  const topFlavors = useMemo(() => (answers.favoriteFlavors ?? []).slice(0, 3), [answers]);
  const fingerprint = useMemo(() => buildMiniFingerprint(answers.favoriteFlavors), [answers]);

  useEffect(() => {
    if (!revealed) return;
    Animated.parallel([
      Animated.timing(contentFade, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(contentSlide, {
        toValue: 0,
        duration: 420,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
    ]).start();
  }, [revealed, contentFade, contentSlide]);

  const onShare = async () => {
    await shareTasteResult({ tagline, flavorTags: topFlavors, fingerprint });
  };

  const onSeeFeed = () => {
    Analytics.trackFirstFeedViewAfterQuiz(user?.id);
    router.replace('/(tabs)');
  };

  if (!revealed) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <TasteRevealAnimation onDone={() => setRevealed(true)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <Animated.View
        style={[styles.content, { opacity: contentFade, transform: [{ translateY: contentSlide }] }]}
      >
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Your cheese taste</Text>
        </View>
        <Text style={styles.tagline}>{tagline}</Text>

        {/* Mini fingerprint preview — placeholder until TasteFingerprint lands. */}
        <View style={styles.fingerprintCard}>
          <Text style={styles.fingerprintLabel}>Taste fingerprint</Text>
          <View style={styles.fingerprintGrid}>
            {Object.entries(fingerprint).map(([axis, v]) => (
              <View key={axis} style={styles.axisRow}>
                <Text style={styles.axisLabel}>{axis}</Text>
                <View style={styles.axisBarTrack}>
                  <View style={[styles.axisBarFill, { width: `${Math.round(v * 100)}%` }]} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {topFlavors.length > 0 ? (
          <View style={styles.flavorsWrap}>
            <Text style={styles.sectionLabel}>Top flavors</Text>
            <View style={styles.flavorChips}>
              {topFlavors.map((f) => {
                const tag = CURATED_FLAVOR_TAGS.find((t) => t.name === f);
                return (
                  <View key={f} style={styles.flavorChip}>
                    {tag?.emoji ? <Text style={styles.flavorEmoji}>{tag.emoji}</Text> : null}
                    <Text style={styles.flavorChipText}>{f}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.shareButton} activeOpacity={0.85} onPress={onShare}>
            <Share2 size={18} color={Colors.text} />
            <Text style={styles.shareButtonText}>Share my taste</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85} onPress={onSeeFeed}>
            <Text style={styles.primaryButtonText}>See your feed</Text>
            <ArrowRight size={18} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: Layout.spacing.l,
    paddingVertical: Layout.spacing.xl,
    justifyContent: 'space-between',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.primaryLight,
    marginBottom: Layout.spacing.m,
  },
  badgeText: {
    fontFamily: Typography.fonts.bodySemiBold,
    fontSize: Typography.sizes.xs,
    color: Colors.text,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tagline: {
    fontFamily: Typography.fonts.heading,
    fontSize: Typography.sizes['4xl'],
    color: Colors.text,
    lineHeight: Typography.sizes['4xl'] * Typography.lineHeights.tight,
    marginBottom: Layout.spacing.xl,
  },
  fingerprintCard: {
    padding: Layout.spacing.l,
    borderRadius: Layout.borderRadius.large,
    backgroundColor: Colors.backgroundSecondary,
    marginBottom: Layout.spacing.l,
  },
  fingerprintLabel: {
    fontFamily: Typography.fonts.bodySemiBold,
    fontSize: Typography.sizes.sm,
    color: Colors.subtleText,
    marginBottom: Layout.spacing.s,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  fingerprintGrid: {
    gap: 6,
  },
  axisRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  axisLabel: {
    width: 72,
    fontFamily: Typography.fonts.body,
    fontSize: Typography.sizes.sm,
    color: Colors.text,
  },
  axisBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.divider,
    borderRadius: 3,
    overflow: 'hidden',
  },
  axisBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  flavorsWrap: {
    marginBottom: Layout.spacing.xl,
  },
  sectionLabel: {
    fontFamily: Typography.fonts.bodySemiBold,
    fontSize: Typography.sizes.sm,
    color: Colors.subtleText,
    marginBottom: Layout.spacing.s,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  flavorChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.s,
  },
  flavorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
    backgroundColor: Colors.primaryLight,
    borderRadius: 999,
  },
  flavorEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  flavorChipText: {
    fontFamily: Typography.fonts.bodySemiBold,
    fontSize: Typography.sizes.sm,
    color: Colors.text,
  },
  actions: {
    gap: Layout.spacing.m,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  shareButtonText: {
    fontFamily: Typography.fonts.bodySemiBold,
    fontSize: Typography.sizes.base,
    color: Colors.text,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Layout.spacing.m + 2,
    borderRadius: Layout.borderRadius.large,
    backgroundColor: Colors.primary,
    ...Layout.shadow.medium,
  },
  primaryButtonText: {
    fontFamily: Typography.fonts.bodySemiBold,
    fontSize: Typography.sizes.base,
    color: Colors.text,
  },
});
