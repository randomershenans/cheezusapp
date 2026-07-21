/**
 * In-app store review prompts.
 *
 * Context: 651 profiles had produced 3 ratings, because nothing in the app had ever
 * asked anyone. This module asks, at moments where the user has just succeeded at
 * something.
 *
 * DESIGN NOTE - threshold, not milestone.
 * The obvious hook was the existing checkMilestone() helper, but that requires EXACT
 * equality with 5/10/25/50/100. Measured against live data, exactly 4 users sit on 10
 * logged cheeses and 0 on 25 or more than 50, so a milestone trigger would have fired
 * for almost nobody. A ">= N lifetime logs" threshold reaches 161 users at N=3 and 106
 * at N=5, and makes the existing engaged base eligible immediately rather than making
 * them wait to cross a boundary.
 *
 * POLICY. Apple caps SKStoreReviewController at 3 prompts per user per 365 days and may
 * silently show nothing at all; Google throttles similarly. Neither store permits
 * gating, incentivising, or pre-filtering reviews ("do you like the app?" before
 * asking) - so this module never conditions the ask on predicted sentiment. It only
 * asks after a genuine success, and treats the prompt as fire-and-forget because the OS
 * does not tell us whether the user reviewed, or even whether a dialog appeared.
 */
import { Platform } from 'react-native';
import * as StoreReview from 'expo-store-review';
import { Analytics } from './analytics';

/** Where the ask came from. Kept small so the analytics breakdown stays groupable. */
export type ReviewTrigger = 'cheese_logged' | 'share_completed' | 'scan_succeeded';

/** Lifetime logged cheeses before we consider asking. See DESIGN NOTE above. */
const MIN_LIFETIME_LOGS = 3;

/** Our own cap, below Apple's 3/365 so we never burn the OS budget on repeats. */
const MAX_ATTEMPTS_PER_YEAR = 2;

/** Minimum gap between attempts. */
const MIN_DAYS_BETWEEN_ATTEMPTS = 90;

const STATE_KEY = 'cheezus_review_prompt_state';
const DAY_MS = 24 * 60 * 60 * 1000;

type ReviewState = {
  /** ISO timestamps of past attempts, most recent last. */
  attempts: string[];
};

const EMPTY_STATE: ReviewState = { attempts: [] };

function storage() {
  // Lazily required to match the pattern used elsewhere in the app and to avoid
  // importing native storage on web.
  return require('@react-native-async-storage/async-storage').default;
}

/**
 * Serialises all read-modify-write access to the state key.
 *
 * Every mutation goes through here. Without it, two triggers firing close together
 * (logging a cheese then immediately sharing it) can both read the same state, and the
 * second write silently discards the first attempt - which would let us exceed the
 * annual cap.
 */
let queue: Promise<unknown> = Promise.resolve();
function serialise<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  // Keep the chain alive regardless of individual failures.
  queue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function readState(): Promise<ReviewState> {
  try {
    const raw = await storage().getItem(STATE_KEY);
    if (!raw) return { ...EMPTY_STATE };
    const parsed = JSON.parse(raw);
    return { attempts: Array.isArray(parsed?.attempts) ? parsed.attempts : [] };
  } catch {
    return { ...EMPTY_STATE };
  }
}

async function writeState(state: ReviewState): Promise<void> {
  try {
    await storage().setItem(STATE_KEY, JSON.stringify(state));
  } catch (err) {
    // Non-fatal, but it means the cap is not enforced next time. Worth logging.
    console.warn('[review] could not persist prompt state:', err);
  }
}

/** Attempts within the trailing 365 days. */
function recentAttempts(state: ReviewState, now: number): string[] {
  return state.attempts.filter((iso) => {
    const t = Date.parse(iso);
    return !Number.isNaN(t) && now - t < 365 * DAY_MS;
  });
}

/**
 * Ask for a review if this is a good moment and we are within our own limits.
 *
 * Safe to call from any success path - all gating lives here. Never throws; a review
 * prompt failing must never disrupt the action the user actually took.
 *
 * @param trigger      what the user just accomplished
 * @param lifetimeLogs their total logged cheeses, used for the threshold gate
 * @param userId       threaded through so the events are attributable
 */
export async function maybeAskForReview(
  trigger: ReviewTrigger,
  lifetimeLogs: number,
  userId?: string
): Promise<void> {
  try {
    if (Platform.OS === 'web') return;
    if (lifetimeLogs < MIN_LIFETIME_LOGS) {
      Analytics.trackReviewPromptSkipped(trigger, 'below_threshold', userId);
      return;
    }

    // isAvailableAsync is ASYNC. Calling it without awaiting yields a Promise, which
    // is always truthy, so an unawaited guard here would never actually gate anything.
    const available = await StoreReview.isAvailableAsync();
    if (!available) {
      Analytics.trackReviewPromptSkipped(trigger, 'unavailable', userId);
      return;
    }

    await serialise(async () => {
      const now = Date.now();
      const state = await readState();
      const recent = recentAttempts(state, now);

      if (recent.length >= MAX_ATTEMPTS_PER_YEAR) {
        Analytics.trackReviewPromptSkipped(trigger, 'annual_cap', userId);
        return;
      }

      const last = recent.length ? Date.parse(recent[recent.length - 1]) : 0;
      if (last && now - last < MIN_DAYS_BETWEEN_ATTEMPTS * DAY_MS) {
        Analytics.trackReviewPromptSkipped(trigger, 'too_soon', userId);
        return;
      }

      // Record BEFORE asking. If the app is backgrounded by the OS dialog and never
      // resumes cleanly, we would rather have over-counted one attempt than lost the
      // record and asked again tomorrow.
      await writeState({ attempts: [...recent, new Date(now).toISOString()] });

      Analytics.trackReviewPromptShown(trigger, userId);
      await StoreReview.requestReview();
    });
  } catch (err) {
    // Deliberately coarse: raw exception text would give the skip-reason breakdown
    // unbounded cardinality and make it ungroupable.
    Analytics.trackReviewPromptSkipped(trigger, 'error', userId);
    console.warn('[review] prompt failed:', err);
  }
}

/**
 * Open the store listing directly, for an explicit "Rate Cheezus" action the user
 * chose to tap.
 *
 * Not subject to the caps above - the user asked for this. Returns false if no store
 * URL is configured, so callers can hide the entry point rather than opening nothing.
 */
export async function openStoreReviewPage(userId?: string): Promise<boolean> {
  try {
    const url = StoreReview.storeUrl();
    // A placeholder or unset value must not be treated as success.
    if (!url || url.includes('<') || !/^https?:\/\//.test(url)) {
      console.warn('[review] no valid store URL configured');
      return false;
    }
    const { Linking } = require('react-native');
    await Linking.openURL(url);
    // Tracked only after the open actually succeeded.
    Analytics.trackReviewStoreOpened(userId);
    return true;
  } catch (err) {
    console.warn('[review] could not open store listing:', err);
    return false;
  }
}
