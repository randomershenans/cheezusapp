import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Analytics } from '@/lib/analytics';
import {
  saveTasteSeed,
  type QuizAnswers,
} from '@/lib/taste-seed-service';
import {
  QUIZ_QUESTIONS,
  QUIZ_QUESTION_COUNT,
  type QuizOption,
  type QuizQuestion,
} from '@/constants/QuizQuestions';
import QuizProgressBar from '@/components/onboarding/QuizProgressBar';
import QuestionPair from '@/components/onboarding/QuestionPair';
import QuestionGrid from '@/components/onboarding/QuestionGrid';
import QuestionMulti from '@/components/onboarding/QuestionMulti';
import QuestionChips from '@/components/onboarding/QuestionChips';
import QuestionChoice from '@/components/onboarding/QuestionChoice';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

const AUTOADVANCE_DELAY_MS = 450;

type SelectionsById = Record<string, QuizOption[]>;

/**
 * Aggregate raw selections (option values) into the shape saveTasteSeed()
 * expects. Each question's `value` may be a plain string/number or a shape
 * like `{ family, type, flavors, intensity, milk, country }` — we fan those
 * out into the flat arrays of the seed table.
 */
function aggregateAnswers(selections: SelectionsById): QuizAnswers {
  const answers: QuizAnswers = {
    favoriteFamilies: [],
    favoriteTypes: [],
    favoriteFlavors: [],
    favoriteCountries: [],
    favoriteMilkTypes: [],
  };

  const push = (key: keyof QuizAnswers, v: unknown) => {
    if (typeof v !== 'string' || !v) return;
    const arr = answers[key] as string[] | undefined;
    if (!arr) return;
    if (!arr.includes(v)) arr.push(v);
  };

  const pushMany = (key: keyof QuizAnswers, vs: unknown) => {
    if (!Array.isArray(vs)) return;
    vs.forEach((v) => push(key, v));
  };

  for (const q of QUIZ_QUESTIONS) {
    const sel = selections[q.id] ?? [];
    for (const opt of sel) {
      const v = opt.value;

      // Simple values: milk types / countries / flavors / adventurousness.
      if (typeof v === 'string') {
        if (q.id === 'milk_types') push('favoriteMilkTypes', v);
        else if (q.id === 'countries') push('favoriteCountries', v);
        else if (q.id === 'flavors') push('favoriteFlavors', v);
        continue;
      }
      if (typeof v === 'number') {
        if (q.id === 'adventurousness') {
          answers.adventurousness = v as 0 | 1 | 2;
        }
        continue;
      }

      // Object values: board hero, pair questions, tiebreaker.
      if (v && typeof v === 'object') {
        const o = v as Record<string, unknown>;
        if (typeof o.family === 'string') push('favoriteFamilies', o.family);
        if (typeof o.type === 'string')   push('favoriteTypes', o.type);
        if (typeof o.milk === 'string')   push('favoriteMilkTypes', o.milk);
        if (typeof o.country === 'string') push('favoriteCountries', o.country);
        if (Array.isArray(o.flavors))     pushMany('favoriteFlavors', o.flavors);
        if (typeof o.intensity === 'number') {
          const n = o.intensity;
          if (n === -1 || n === 0 || n === 1) answers.intensityPreference = n;
        }
      }
    }
  }

  return answers;
}

export default function QuizScreen() {
  const router = useRouter();
  const { user, skipOnboardingForSession, refreshOnboardingStatus } = useAuth();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selections, setSelections] = useState<SelectionsById>({});
  const [submitting, setSubmitting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const startTrackedRef = useRef(false);
  // Latches while an auto-advance is pending, so a second tap inside the delay
  // window cannot schedule a second timer. Both timers would have been created by
  // the same render and would therefore both act on the same stale questionIndex,
  // skipping a question and eventually walking past the end of the array.
  const advancingRef = useRef(false);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Authoritative copy of the answers, updated SYNCHRONOUSLY alongside state.
  //
  // finalize() runs from a setTimeout created during the tap that answers the LAST
  // question. That callback closes over the `selections` value from the render it was
  // created in, which does not yet include the answer just given - so the final
  // question's answer was silently dropped from every completed quiz. Reading the ref
  // instead removes the dependency on React having re-rendered first.
  const selectionsRef = useRef<SelectionsById>({});

  // Clamp rather than index raw. If anything ever advances past the last question,
  // QUIZ_QUESTIONS[i] is undefined and the next line throws mid-onboarding, which
  // is unrecoverable for the user because no progress is persisted.
  const safeIndex = Math.min(questionIndex, QUIZ_QUESTION_COUNT - 1);
  const question: QuizQuestion = QUIZ_QUESTIONS[safeIndex];
  const currentSelections = selections[question.id] ?? [];

  // Track quiz_started exactly once on mount.
  useEffect(() => {
    if (startTrackedRef.current) return;
    startTrackedRef.current = true;
    Analytics.trackQuizStarted(user?.id);
  }, [user?.id]);

  // Per-step impression. quiz_question_answered only fires on the way OUT of a
  // question, so without this there is no denominator: a user who abandons on
  // question 3 is indistinguishable from one who never reached it, and the drop-off
  // curve the quiz exists to optimise cannot be drawn.
  useEffect(() => {
    Analytics.trackOnboardingStepViewed(`quiz_${safeIndex + 1}_${question.id}`, user?.id);
  }, [safeIndex, question.id, user?.id]);

  // Fade/slide in whenever the question changes.
  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
    ]).start();
  }, [questionIndex, fadeAnim, slideAnim]);

  // Release the advance latch once the question actually changes, and make sure a
  // pending timer can never fire after this screen unmounts (which would call
  // router.replace on a dead component).
  useEffect(() => {
    advancingRef.current = false;
    return () => {
      if (advanceTimerRef.current) {
        clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = null;
      }
    };
  }, [questionIndex]);

  const goNext = () => {
    Analytics.trackQuizQuestionAnswered(question.id, questionIndex, user?.id);
    if (questionIndex + 1 >= QUIZ_QUESTION_COUNT) {
      void finalize();
    } else {
      setQuestionIndex((i) => i + 1);
    }
  };

  const goBack = () => {
    if (questionIndex > 0) setQuestionIndex((i) => i - 1);
  };

  const handleSingleSelect = (opt: QuizOption) => {
    // Ignore further taps while an advance is already queued. Without this a
    // double tap (or changing your mind inside the delay) queued two advances.
    if (advancingRef.current || submitting) return;
    advancingRef.current = true;
    // Overwrite single-select answer and autoadvance. The ref is updated first and
    // synchronously so finalize() can never read a stale answer set.
    const next = { ...selectionsRef.current, [question.id]: [opt] };
    selectionsRef.current = next;
    setSelections(next);
    advanceTimerRef.current = setTimeout(goNext, AUTOADVANCE_DELAY_MS);
  };

  const handleToggleMulti = (opt: QuizOption) => {
    const cur = selectionsRef.current[question.id] ?? [];
    const already = cur.some((s) => s.value === opt.value);
    let nextForQuestion: QuizOption[];
    if (already) {
      nextForQuestion = cur.filter((s) => s.value !== opt.value);
    } else {
      if (question.maxSelections && cur.length >= question.maxSelections) return;
      nextForQuestion = [...cur, opt];
    }
    const next = { ...selectionsRef.current, [question.id]: nextForQuestion };
    selectionsRef.current = next;
    setSelections(next);
  };

  const finalize = async () => {
    if (!user) {
      // Shouldn't happen (router guard), but fail safe.
      router.replace('/auth/login');
      return;
    }
    setSubmitting(true);
    const answers = aggregateAnswers(selectionsRef.current);
    try {
      await saveTasteSeed(user.id, answers, false);
      Analytics.trackQuizCompleted(user.id);
      // The single activation event for the whole new-user funnel. quiz_completed is
      // quiz-specific; onboarding_completed is the one to join against signup so
      // "installs -> signup -> activated" can be computed end to end.
      Analytics.trackOnboardingCompleted('quiz', false, user.id);
      // Mark complete in session state + refetch profile so the router guard
      // sees hasCompletedOnboarding === true before we navigate away.
      // Without this, the guard fires on /(tabs) and sends the user back to
      // /onboarding/quiz in an infinite loop.
      skipOnboardingForSession();
      await refreshOnboardingStatus();
      // Pass the aggregated answers into the result screen as JSON.
      router.replace({
        pathname: '/onboarding/result',
        params: { answers: JSON.stringify(answers) },
      });
    } catch (err) {
      console.error('[quiz] finalize failed:', err);
      Alert.alert(
        "Couldn't save your answers",
        'Check your connection and try again.',
        [{ text: 'OK' }],
      );
    } finally {
      setSubmitting(false);
      // The advance latch is normally released by the questionIndex effect, but
      // finalize runs on the LAST question, where the index never changes. If the
      // save failed the user is still sitting on that question, so the latch has
      // to be released here or re-tapping an option to retry would do nothing.
      advancingRef.current = false;
    }
  };

  const handleSkip = async () => {
    if (submitting) return;
    if (!user) {
      skipOnboardingForSession();
      router.replace('/(tabs)');
      return;
    }
    setSubmitting(true);
    try {
      const answers = aggregateAnswers(selectionsRef.current); // save partial progress
      await saveTasteSeed(user.id, answers, true);
      Analytics.trackQuizSkipped(questionIndex, user.id);
    } catch (err) {
      // Non-fatal — user still moves on, just without the record.
      console.warn('[quiz] skip save failed:', err);
    } finally {
      skipOnboardingForSession();
      setSubmitting(false);
      router.replace('/(tabs)');
    }
  };

  const continueEnabled = useMemo(() => {
    if (question.type === 'multi' || question.type === 'chips') {
      return currentSelections.length > 0;
    }
    return false;
  }, [question, currentSelections]);

  const renderBody = () => {
    switch (question.type) {
      case 'pair':
        return <QuestionPair options={[...question.options]} onSelect={handleSingleSelect} />;
      case 'grid':
        return <QuestionGrid options={[...question.options]} onSelect={handleSingleSelect} />;
      case 'choice':
        return <QuestionChoice options={[...question.options]} onSelect={handleSingleSelect} />;
      case 'multi':
        return (
          <QuestionMulti
            options={[...question.options]}
            selected={currentSelections}
            maxSelections={question.maxSelections ?? 3}
            onToggle={handleToggleMulti}
          />
        );
      case 'chips':
        return (
          <QuestionChips
            options={[...question.options]}
            selected={currentSelections}
            maxSelections={question.maxSelections ?? 3}
            onToggle={handleToggleMulti}
          />
        );
    }
  };

  const needsContinue = question.type === 'multi' || question.type === 'chips';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <QuizProgressBar
        currentIndex={questionIndex}
        total={QUIZ_QUESTION_COUNT}
        onBack={questionIndex > 0 ? goBack : undefined}
        onSkip={handleSkip}
      />

      <Animated.View
        style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        <View style={styles.questionHeader}>
          <Text style={styles.questionTitle}>{question.question}</Text>
          {question.subtitle ? (
            <Text style={styles.questionSubtitle}>{question.subtitle}</Text>
          ) : null}
        </View>

        <View style={styles.body}>{renderBody()}</View>

        {needsContinue ? (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.continueButton, !continueEnabled && styles.continueButtonDisabled]}
              activeOpacity={0.85}
              disabled={!continueEnabled || submitting}
              onPress={goNext}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        ) : null}
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
  },
  questionHeader: {
    paddingHorizontal: Layout.spacing.l,
    paddingBottom: Layout.spacing.l,
  },
  questionTitle: {
    fontFamily: Typography.fonts.heading,
    fontSize: Typography.sizes['3xl'],
    color: Colors.text,
    lineHeight: Typography.sizes['3xl'] * Typography.lineHeights.tight,
  },
  questionSubtitle: {
    marginTop: Layout.spacing.s,
    fontFamily: Typography.fonts.body,
    fontSize: Typography.sizes.base,
    color: Colors.subtleText,
  },
  body: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: Layout.spacing.l,
    paddingVertical: Layout.spacing.l,
  },
  continueButton: {
    backgroundColor: Colors.primary,
    borderRadius: Layout.borderRadius.large,
    paddingVertical: Layout.spacing.m + 2,
    ...Layout.shadow.medium,
  },
  continueButtonDisabled: {
    backgroundColor: Colors.lightGray,
  },
  continueButtonText: {
    textAlign: 'center',
    color: Colors.text,
    fontFamily: Typography.fonts.bodySemiBold,
    fontSize: Typography.sizes.base,
  },
});
