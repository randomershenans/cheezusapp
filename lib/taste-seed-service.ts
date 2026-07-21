/**
 * Persistence layer for the onboarding taste quiz.
 *
 * Upserts into `user_taste_seed` (see db/user-taste-seed-schema.sql) and
 * mirrors the completion timestamp onto `profiles.onboarding_quiz_completed_at`
 * so the router guard can answer "has this user seen the quiz?" without a join.
 *
 * Policy:
 *  - Quiz completed       → upsert seed with completed_at=now(), skipped=false
 *                           AND set profiles.onboarding_quiz_completed_at=now()
 *  - Quiz skipped         → upsert seed with completed_at=NULL,  skipped=true
 *                           and DO NOT touch profiles.onboarding_quiz_completed_at.
 *                           (Session-local flag handles re-loop avoidance.)
 *
 * The "Anywhere" country option is normalized to an empty array here so the
 * downstream recommendation query doesn't filter by country at all for that user.
 */

import { supabase } from './supabase';

export type QuizAnswers = {
  favoriteFamilies?: string[];
  favoriteTypes?: string[];
  favoriteFlavors?: string[];
  favoriteCountries?: string[];
  favoriteMilkTypes?: string[];
  /** -1 = fresh/mild, 0 = balanced, +1 = funky/intense. */
  intensityPreference?: -1 | 0 | 1;
  /** 0 = mellow, 1 = balanced, 2 = stinky. */
  adventurousness?: 0 | 1 | 2;
};

/**
 * Sentinel string used by the countries question (see constants/QuizQuestions.ts).
 * When present, the country array is persisted as `[]` so we don't over-constrain
 * personalization.
 */
export const ANYWHERE_COUNTRY_SENTINEL = 'ANYWHERE';

const normalizeCountries = (countries?: string[]): string[] => {
  if (!countries || countries.length === 0) return [];
  if (countries.includes(ANYWHERE_COUNTRY_SENTINEL)) return [];
  return countries;
};

/**
 * Upsert the user's taste seed row. If `skipped` is true, no completion
 * timestamp is written to the profile (user can retry via the banner).
 */
export async function saveTasteSeed(
  userId: string,
  answers: QuizAnswers,
  skipped: boolean
): Promise<void> {
  const now = new Date().toISOString();

  const payload = {
    user_id: userId,
    favorite_families:    answers.favoriteFamilies    ?? [],
    favorite_types:       answers.favoriteTypes       ?? [],
    favorite_flavors:     answers.favoriteFlavors     ?? [],
    favorite_countries:   normalizeCountries(answers.favoriteCountries),
    favorite_milk_types:  answers.favoriteMilkTypes   ?? [],
    intensity_preference: answers.intensityPreference ?? null,
    adventurousness:      answers.adventurousness     ?? null,
    skipped,
    completed_at: skipped ? null : now,
    version: 1,
  };

  const { error: seedError } = await supabase
    .from('user_taste_seed')
    .upsert(payload, { onConflict: 'user_id' });

  if (seedError) {
    console.error('[taste-seed] upsert failed:', seedError);
    throw seedError;
  }

  if (!skipped) {
    await markQuizCompleted(userId, now);
  }
}

/**
 * Write the completion flag to `profiles`, and make sure it actually landed.
 *
 * This is NOT optional, despite a previous comment here claiming the router guard
 * falls back to `user_taste_seed`. It does not: `hasCompletedOnboarding` is derived
 * solely from `profiles.onboarding_quiz_completed_at`, both in AuthContext and in the
 * helper below. If this write is lost, the user is routed back into the quiz on their
 * next cold start and has to do the whole thing again.
 *
 * Two failure modes are handled:
 *  - a transient error, which is retried;
 *  - an update matching ZERO rows, which PostgREST reports as success with no error.
 *    That happens when the profiles row does not exist yet (the handle_new_user race
 *    on a first OAuth sign-in), and previously passed silently. `.select('id')` makes
 *    the affected-row count observable.
 */
async function markQuizCompleted(userId: string, now: string): Promise<void> {
  const RETRY_DELAYS_MS = [0, 500, 1500];
  let lastProblem = '';

  for (const delay of RETRY_DELAYS_MS) {
    if (delay) await new Promise((r) => setTimeout(r, delay));

    const { data, error } = await supabase
      .from('profiles')
      .update({ onboarding_quiz_completed_at: now })
      .eq('id', userId)
      .select('id');

    if (error) {
      lastProblem = error.message;
      continue;
    }
    if (!data || data.length === 0) {
      lastProblem = 'update matched no profiles row';
      continue;
    }
    return; // landed
  }

  // Surface it. finalize() catches this and shows a retry-able error, which is far
  // better than sending the user on and silently re-quizzing them tomorrow.
  console.error('[taste-seed] could not record quiz completion:', lastProblem);
  throw new Error(`Could not save quiz completion: ${lastProblem}`);
}

/**
 * Returns true if the user has completed (not skipped) the onboarding quiz.
 * Used by the router guard and the "Tune your feed" banner.
 */
export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('onboarding_quiz_completed_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.warn('[taste-seed] hasCompletedOnboarding read failed:', error);
    return false;
  }

  return Boolean(data?.onboarding_quiz_completed_at);
}

/**
 * Forces the profile's completion timestamp on (used by retake / manual mark).
 */
export async function markOnboardingComplete(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ onboarding_quiz_completed_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}
