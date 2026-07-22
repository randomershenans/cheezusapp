import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Analytics } from '@/lib/analytics';
import {
  getOnboardingSuggestions,
  addCheeseToWishlist,
  type SuggestedCheese,
} from '@/lib/onboarding-suggestions';
import { maybeAskForReview } from '@/lib/review-prompt';
import {
  canAskForPushPermission,
  hasAskedForPush,
  markAskedForPush,
} from '@/lib/push-notifications';
import PushPrimerModal from '@/components/PushPrimerModal';
import type { QuizAnswers } from '@/lib/taste-seed-service';
import CheesePickerGrid from '@/components/onboarding/CheesePickerGrid';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

/**
 * Onboarding step 4: add something to your wishlist.
 *
 * Lower friction than logging - it asks what you WANT to try rather than what you have
 * eaten, so it also catches users who skipped step 3 because nothing came to mind.
 *
 * Excludes whatever they just logged, so the screen does not look like a repeat of the
 * previous one.
 *
 * This is the last onboarding step, so it owns the exit into the app and is where the
 * review prompt is offered - by this point the user has answered eight questions, seen a
 * personalised result and (usually) logged a cheese, which is a genuine value
 * demonstration rather than an ask from a standing start.
 */
export default function OnboardingWishlistScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ answers?: string; logged?: string }>();
  const { user } = useAuth();

  const [suggestions, setSuggestions] = useState<SuggestedCheese[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [showPushPrimer, setShowPushPrimer] = useState(false);
  const writingRef = useRef(false);
  const exitingRef = useRef(false);

  const answers: QuizAnswers = (() => {
    try {
      return params.answers ? JSON.parse(params.answers) : {};
    } catch {
      return {};
    }
  })();

  const alreadyLogged = (params.logged || '').split(',').filter(Boolean);

  useEffect(() => {
    Analytics.trackOnboardingStepViewed('wishlist', user?.id);
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const results = await getOnboardingSuggestions(answers, {
        limit: 6,
        excludeCheeseIds: alreadyLogged,
      });
      if (!cancelled) {
        setSuggestions(results);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Leave onboarding for the app.
   *
   * Fires onboarding_completed - the single activation event that the whole new-user
   * funnel joins against - then offers the review prompt. maybeAskForReview does all its
   * own gating (threshold, annual cap, availability) and never throws, so this is
   * fire-and-forget and cannot delay or block the exit.
   */
  /** Leave onboarding. Called from every exit path, and must always land. */
  const leave = () => {
    if (user) {
      // Lifetime count is at least what they logged in step 3. The helper re-checks its
      // own thresholds; passing the known floor avoids another round trip here.
      void maybeAskForReview('cheese_logged', alreadyLogged.length, user.id);
    }
    router.replace('/(tabs)');
  };

  const finish = (via: 'saved' | 'skipped') => {
    if (exitingRef.current) return;
    exitingRef.current = true;

    Analytics.trackOnboardingCompleted(via === 'saved' ? 'full' : 'partial', false, user?.id);
    Analytics.trackFirstFeedViewAfterQuiz(user?.id);

    /**
     * The end of onboarding is the best moment we will ever get to ask about
     * notifications, and it only works if they actually logged something in
     * step 3, because otherwise there is nothing to promise them news about.
     *
     * The permission prompt used to fire at app launch instead, before anyone
     * knew what Cheezus was, and only 21% said yes. On iOS that answer is
     * final, so where we ask is the whole ballgame.
     *
     * This must never be able to trap someone in onboarding. Two checks, both
     * fast and local, both wrapped: any failure at all falls through to the
     * exit rather than swallowing it.
     */
    if (user && alreadyLogged.length > 0) {
      void (async () => {
        try {
          if (!(await hasAskedForPush()) && (await canAskForPushPermission())) {
            await markAskedForPush();
            setShowPushPrimer(true);
            return;
          }
        } catch {
          // Fall through and leave.
        }
        leave();
      })();
      return;
    }

    leave();
  };

  const handleSelect = async (cheese: SuggestedCheese) => {
    if (writingRef.current || !user) return;
    writingRef.current = true;
    setBusyId(cheese.id);

    const result = await addCheeseToWishlist(user.id, cheese.id);

    setBusyId(null);
    writingRef.current = false;

    if (!result.ok) {
      Analytics.trackOnboardingStepViewed('wishlist_save_failed', user.id);
      return;
    }

    setSavedIds((prev) => [...prev, cheese.id]);
    setTimeout(() => finish('saved'), 550);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.badge}>Wishlist</Text>
        <Text style={styles.title}>What do you want to try?</Text>
        <Text style={styles.subtitle}>
          Save one for later and we will remind you when you are near somewhere that has it.
        </Text>
      </View>

      {loading ? (
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : suggestions.length === 0 ? (
        <View style={styles.centre}>
          <Text style={styles.emptyText}>
            Nothing to suggest right now. You can build your wishlist any time from a
            cheese page.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <CheesePickerGrid
            cheeses={suggestions}
            busyId={busyId}
            doneIds={savedIds}
            onSelect={handleSelect}
          />
        </ScrollView>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.skipButton}
          activeOpacity={0.7}
          onPress={() => finish('skipped')}
        >
          <Text style={styles.skipText}>
            {savedIds.length ? 'Continue' : 'Skip for now'}
          </Text>
          <ArrowRight size={16} color={Colors.subtleText} />
        </TouchableOpacity>
      </View>

      {/* Asked here because they have just logged a cheese and saved a wishlist,
          which is the only point where "we will tell you when" means anything.
          Resolving it either way always leaves onboarding. */}
      {user?.id ? (
        <PushPrimerModal visible={showPushPrimer} userId={user.id} onResolved={leave} />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Layout.spacing.l,
    paddingTop: Layout.spacing.l,
    paddingBottom: Layout.spacing.m,
  },
  badge: {
    fontFamily: Typography.fonts.bodySemiBold,
    fontSize: Typography.sizes.xs,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Colors.subtleText,
    marginBottom: Layout.spacing.xs,
  },
  title: {
    fontFamily: Typography.fonts.heading,
    fontSize: Typography.sizes['3xl'],
    color: Colors.text,
    marginBottom: Layout.spacing.xs,
  },
  subtitle: {
    fontFamily: Typography.fonts.body,
    fontSize: Typography.sizes.base,
    color: Colors.subtleText,
    lineHeight: 22,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Layout.spacing.l,
    paddingBottom: Layout.spacing.l,
  },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Layout.spacing.xl,
  },
  emptyText: {
    fontFamily: Typography.fonts.body,
    fontSize: Typography.sizes.base,
    color: Colors.subtleText,
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: {
    paddingHorizontal: Layout.spacing.l,
    paddingBottom: Layout.spacing.l,
    paddingTop: Layout.spacing.s,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Layout.spacing.m,
  },
  skipText: {
    fontFamily: Typography.fonts.bodyMedium,
    fontSize: Typography.sizes.base,
    color: Colors.subtleText,
  },
});
