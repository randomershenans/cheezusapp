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
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ onboarding_quiz_completed_at: now })
      .eq('id', userId);

    if (profileError) {
      // Profile mirror failing is non-fatal — the seed is saved and the user
      // can continue. Router guard falls back to reading user_taste_seed.
      console.warn('[taste-seed] profile mirror update failed (non-fatal):', profileError);
    }
  }
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
