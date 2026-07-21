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
  logCheeseToBox,
  type SuggestedCheese,
} from '@/lib/onboarding-suggestions';
import type { QuizAnswers } from '@/lib/taste-seed-service';
import CheesePickerGrid from '@/components/onboarding/CheesePickerGrid';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

/**
 * Onboarding step 3: log your first cheese.
 *
 * THE POINT: 284 of 651 profiles have never logged a single cheese, and the median for
 * those who do is 2. Dropping a new user into the feed and hoping they later find the
 * add flow is what produces that. Here they have just told us what they like, so we can
 * show them real cheeses matching it and make logging one tap.
 *
 * Deliberately writes only { user_id, cheese_id }. No rating, no notes, no photo - a
 * brand-new user may not have eaten the thing yet, and the goal is the row existing.
 * They can enrich it later from the cheese box.
 */
export default function FirstCheeseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ answers?: string }>();
  const { user } = useAuth();

  const [suggestions, setSuggestions] = useState<SuggestedCheese[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loggedIds, setLoggedIds] = useState<string[]>([]);
  // Guards against a second write while one is in flight. State alone is not enough:
  // two taps in the same tick both read the pre-update value.
  const writingRef = useRef(false);

  const answers: QuizAnswers = (() => {
    try {
      return params.answers ? JSON.parse(params.answers) : {};
    } catch {
      return {};
    }
  })();

  useEffect(() => {
    Analytics.trackOnboardingStepViewed('first_cheese', user?.id);
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const results = await getOnboardingSuggestions(answers, { limit: 6 });
      if (!cancelled) {
        setSuggestions(results);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // answers is derived from a param that does not change while mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goNext = () => {
    router.replace({
      pathname: '/onboarding/wishlist',
      params: { answers: params.answers ?? '{}', logged: loggedIds.join(',') },
    });
  };

  const handleSelect = async (cheese: SuggestedCheese) => {
    if (writingRef.current || !user) return;
    writingRef.current = true;
    setBusyId(cheese.id);

    const result = await logCheeseToBox(user.id, cheese.id);

    setBusyId(null);
    writingRef.current = false;

    if (!result.ok) {
      // Not fatal and not worth an alert mid-onboarding: leave them on the screen so
      // they can tap another, and record it so a systemic failure is visible.
      Analytics.trackOnboardingStepViewed('first_cheese_log_failed', user.id);
      return;
    }

    setLoggedIds((prev) => [...prev, cheese.id]);
    // undefined, not null: no rating was given, and the event property should be absent
    // rather than an explicit null in the analytics payload.
    Analytics.trackCheeseAddToBox(cheese.id, undefined, user.id);

    // Move on shortly after the tick lands, so the confirmation is visible.
    setTimeout(goNext, 550);
  };

  const handleSkip = () => {
    Analytics.trackOnboardingStepViewed('first_cheese_skipped', user?.id);
    goNext();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.badge}>Your cheese box</Text>
        <Text style={styles.title}>Add your first cheese</Text>
        <Text style={styles.subtitle}>
          {suggestions.length
            ? 'Based on what you just told us. Tap one you have tried.'
            : 'Tap one you have tried to start your collection.'}
        </Text>
      </View>

      {loading ? (
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : suggestions.length === 0 ? (
        // No suggestions at all (offline, or the query failed). Never dead-end the user:
        // onboarding arrives here via router.replace with gestures disabled, so there is
        // nothing to go back to.
        <View style={styles.centre}>
          <Text style={styles.emptyText}>
            We could not load suggestions just now. You can add cheeses any time from the
            plus button.
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
            doneIds={loggedIds}
            onSelect={handleSelect}
          />
        </ScrollView>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.skipButton} activeOpacity={0.7} onPress={handleSkip}>
          <Text style={styles.skipText}>
            {loggedIds.length ? 'Continue' : "I'll do this later"}
          </Text>
          <ArrowRight size={16} color={Colors.subtleText} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
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
  scroll: {
    flex: 1,
  },
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
