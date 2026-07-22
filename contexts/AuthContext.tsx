import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { removePushToken } from '@/lib/push-notifications';
import { router } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import type { User, Session } from '@supabase/supabase-js';
// Keeps analytics events attributed to the right user. Without this, every event
// whose call site does not explicitly thread a userId is written with user_id null.
import { setAnalyticsUser, Analytics } from '@/lib/analytics';

// Configure Google Sign In once. webClientId must match the one registered
// with your Supabase Google provider (Supabase → Auth → Providers → Google).
// Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in your env / EAS secrets.
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
if (Platform.OS !== 'web' && GOOGLE_WEB_CLIENT_ID) {
  try {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
      offlineAccess: false,
      scopes: ['profile', 'email'],
    });
  } catch (err) {
    console.warn('[Auth] GoogleSignin.configure failed:', err);
  }
}

interface UserProfile {
  id: string;
  name: string | null;
  tagline: string | null;
  location: string | null;
  avatar_url: string | null;
  vanity_url: string | null;
  onboarding_quiz_completed_at: string | null;
  /** Used by the onboarding router guard to tell a new account from one that
      pre-dates the quiz. */
  created_at: string | null;
}

/**
 * Result of a native OAuth attempt.
 *
 * Cancellation is NOT an error and must not be reported as one, but it is also
 * emphatically not a success: previously both sign-in methods returned void and
 * swallowed cancellation with a bare `return`, so callers could not tell the two
 * apart. Every caller fired an oauth_success event and navigated as though the
 * user were signed in, stranding them in authenticated-only screens.
 *
 * A plain string field rather than a discriminated union, because this project
 * compiles with `strict` unset and TypeScript cannot narrow unions without it.
 */
export type OAuthOutcome = { status: 'success' | 'cancelled' };

/**
 * How recently an account must have been created for an OAuth sign-in to count as a
 * SIGNUP rather than a returning login.
 *
 * Evaluated immediately after signInWithIdToken resolves, so a genuinely new account
 * is seconds old at this point; the window only needs to absorb clock skew between
 * the device and Supabase. This is analytics attribution only - nothing about the
 * user's experience depends on it, unlike the onboarding routing decision.
 */
const NEW_ACCOUNT_WINDOW_MS = 60_000;

/**
 * Emit a signup event for a native OAuth sign-in.
 *
 * trackSignup previously fired from exactly one place - the email signup screen,
 * hardcoded to method 'email' - so every Apple and Google signup was missing from
 * acquisition entirely. Social users appeared as pure activation with no acquisition
 * row, which meant every signup-to-activation rate was computed against the wrong
 * denominator.
 */
function reportOAuthSignup(provider: 'apple' | 'google', authUser?: User | null) {
  if (!authUser?.created_at) return;
  const ageMs = Date.now() - new Date(authUser.created_at).getTime();
  if (ageMs >= 0 && ageMs <= NEW_ACCOUNT_WINDOW_MS) {
    Analytics.trackSignup(provider, undefined, authUser.id);
  }
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  /** True on iOS 13+ where Apple Sign In is available. */
  appleSignInAvailable: boolean;
  /**
   * true  = user has finished the onboarding taste quiz
   * false = user has NOT finished and should be routed to /onboarding/quiz
   * null  = unknown (still loading / no user)
   *
   * A session-local "skipped this session" flag is layered on top via
   * `skipOnboardingForSession()` to stop the router guard from re-looping
   * users who intentionally hit Skip.
   */
  /** True only if the quiz was actually COMPLETED. A skip leaves this false, so
   *  TuneYourFeedBanner can still invite the user back. */
  hasCompletedOnboarding: boolean | null;
  /** True if the quiz has been completed OR offered and declined. Only the router
   *  guard should use this - it is what prevents re-forcing the quiz on a skipper
   *  every cold start, without suppressing the banner. */
  onboardingResolved: boolean | null;
  skipOnboardingForSession: () => void;
  refreshOnboardingStatus: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Native Google Sign In via @react-native-google-signin, returning an id_token
   *  we exchange with Supabase via signInWithIdToken. Falls back to web OAuth
   *  on web or if the native SDK isn't configured.
   *  Resolves with status 'cancelled' when the user dismisses the sheet - callers
   *  MUST check this before treating the call as a successful sign-in. */
  signInWithGoogle: () => Promise<OAuthOutcome>;
  /** Native Apple Sign In (iOS 13+). Uses Apple's identityToken with Supabase's
   *  signInWithIdToken. Apple doesn't expose email on subsequent logins, so we
   *  pass the display name through once on first sign-in.
   *  Resolves with status 'cancelled' when the user dismisses the sheet. */
  signInWithApple: () => Promise<OAuthOutcome>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [skipOnboardingSession, setSkipOnboardingSession] = useState(false);
  const [appleSignInAvailable, setAppleSignInAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync()
      .then(setAppleSignInAvailable)
      .catch(() => setAppleSignInAvailable(false));
  }, []);

  // Backoff between attempts to read a freshly-created profile row, in ms.
  // A first OAuth sign-in races the handle_new_user trigger, so the row may not
  // exist for a moment. Previously there were only two attempts (immediate, then
  // 800ms); if both missed, `profile` stayed null for the whole session, which
  // left hasCompletedOnboarding as null and made the onboarding router guard
  // silently never fire - so the new user skipped the taste quiz entirely.
  const PROFILE_RETRY_DELAYS_MS = [400, 800, 1600, 3200];

  const fetchProfile = async (userId: string) => {
    // maybeSingle: no throw when the row is absent, so a missing row is a retry
    // condition rather than an error.
    const fetchOnce = async () => {
      const { data } = await supabase
        .from('profiles')
        .select(
          // created_at is here for the onboarding router guard, which decides
          // whether an account pre-dates the quiz. Without it the guard cannot
          // classify anyone and silently never fires.
          'id, name, tagline, location, avatar_url, vanity_url, onboarding_quiz_completed_at, created_at'
        )
        .eq('id', userId)
        .maybeSingle();
      return data;
    };

    try {
      let data = await fetchOnce();
      for (const delay of PROFILE_RETRY_DELAYS_MS) {
        if (data) break;
        await new Promise((r) => setTimeout(r, delay));
        data = await fetchOnce();
      }
      if (data) {
        setProfile(data as UserProfile);
      } else {
        // Six seconds and still nothing. Either handle_new_user is broken or RLS
        // is blocking the read. Worth being loud: the user is now in a state where
        // onboarding cannot be evaluated.
        console.warn(`[Auth] No profiles row for ${userId} after ${PROFILE_RETRY_DELAYS_MS.length + 1} attempts.`);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const refreshOnboardingStatus = async () => {
    if (user) await fetchProfile(user.id);
  };

  // Persisted per-user record that the quiz was offered and declined.
  //
  // Skipping deliberately does NOT write profiles.onboarding_quiz_completed_at (that
  // column means "completed", and TuneYourFeedBanner keys off it to invite the user
  // back). But the router guard fires on hasCompletedOnboarding === false, so without
  // a durable record of the skip the user is pushed into the quiz again on every cold
  // start. Device-local is the right scope: a reinstall re-offering the quiz is fine.
  const skipKey = (userId: string) => `onboarding_skipped:${userId}`;

  const skipOnboardingForSession = () => {
    setSkipOnboardingSession(true);
    const uid = user?.id;
    if (!uid || Platform.OS === 'web') return;
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      void AsyncStorage.setItem(skipKey(uid), '1');
    } catch (err) {
      // Falls back to session-only behaviour: they get asked again next launch.
      console.warn('[Auth] could not persist onboarding skip:', err);
    }
  };

  // Restore the persisted skip whenever the signed-in user changes.
  useEffect(() => {
    const uid = user?.id;
    if (!uid || Platform.OS === 'web') return;
    let cancelled = false;
    (async () => {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const skipped = await AsyncStorage.getItem(skipKey(uid));
        if (!cancelled && skipped === '1') setSkipOnboardingSession(true);
      } catch {
        // Non-fatal; worst case the quiz is offered again.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    /**
     * Restore the session on cold start, and do NOT take the first "no" for an
     * answer.
     *
     * getSession() reads the stored session and refreshes it if the access
     * token has expired. On a cold start that refresh is a network call made at
     * the worst possible moment: the app has just launched, and after an app
     * UPDATE it launches into a fresh process with connectivity still settling.
     * When that call fails, getSession() returns null, and the old code took
     * that as "signed out" and set loading false. The user then sat looking at
     * "loading feed" with no profile, still holding a perfectly valid refresh
     * token on disk.
     *
     * So: if there is no session but a persisted one EXISTS in storage, retry
     * before concluding anything. Only genuinely empty storage, or a refresh
     * the server actively rejects, means signed out.
     */
    let cancelled = false;

    const hasStoredSession = async () => {
      if (Platform.OS === 'web') return false;
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const keys: string[] = await AsyncStorage.getAllKeys();
        // supabase-js persists under sb-<project-ref>-auth-token.
        return keys.some((k) => k.startsWith('sb-') && k.includes('auth-token'));
      } catch {
        return false;
      }
    };

    const applySession = async (session: Session | null) => {
      if (cancelled) return;
      setSession(session);
      setUser(session?.user ?? null);
      setAnalyticsUser(session?.user?.id ?? null);
      if (session?.user) await fetchProfile(session.user.id);
    };

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          console.log('[Auth] Initial session loaded:', data.session.user?.id);
          await applySession(data.session);
          if (!cancelled) setLoading(false);
          return;
        }

        // No session in hand. Is that because there is genuinely none?
        const stored = await hasStoredSession();
        if (!stored) {
          console.log('[Auth] No session and nothing stored: signed out.');
          if (!cancelled) setLoading(false);
          return;
        }

        // There IS a stored session, so the restore failed rather than the user
        // being logged out. Back off and try again; connectivity on launch
        // usually settles within a couple of seconds.
        for (const delay of [500, 1500, 4000]) {
          if (cancelled) return;
          await new Promise((r) => setTimeout(r, delay));
          const { data: retry, error } = await supabase.auth.refreshSession();
          if (cancelled) return;
          if (retry.session) {
            console.log('[Auth] Session recovered on retry.');
            await applySession(retry.session);
            if (!cancelled) setLoading(false);
            return;
          }
          // A refresh token the server REJECTS is a real sign-out. Anything
          // else is a network problem and deserves another attempt.
          if (error && /invalid|expired|revoked|not found/i.test(error.message)) {
            console.warn('[Auth] Stored session rejected by the server:', error.message);
            break;
          }
        }
        console.warn('[Auth] Could not restore the stored session.');
        if (!cancelled) setLoading(false);
      } catch (error) {
        console.error('[Auth] Error getting initial session:', error);
        if (!cancelled) setLoading(false);
      }
    })();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event);

      // A null session does NOT always mean the user signed out.
      //
      // supabase-js emits events with session === null transiently whenever a
      // token refresh fails - most commonly when the app returns to the
      // foreground before the network has reconnected. This handler used to
      // treat every such event as a sign-out: setUser(null) plus
      // setProfile(null), which wiped the user's data and left the feed empty
      // until they force-quit the app and cold-started it. That is exactly the
      // "come back later and everything is gone" bug.
      //
      // So only an EXPLICIT sign-out clears state. Anything else with a null
      // session is treated as a temporary blip and the existing session is kept;
      // the foreground handler below will recover it.
      const isExplicitSignOut = event === 'SIGNED_OUT';
      if (!session && !isExplicitSignOut) {
        console.warn(`[Auth] null session on "${event}" - keeping current session`);
        setLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      setAnalyticsUser(session?.user?.id ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }

      setLoading(false);
      
      // Handle password recovery - navigate to reset password screen
      if (event === 'PASSWORD_RECOVERY') {
        console.log('Password recovery event detected, navigating to reset password');
        router.replace('/auth/reset-password');
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // On native, re-check the session when the app returns to the foreground.
  // Tokens can expire while the app is backgrounded; without an explicit refresh
  // the first queries after resume fail with 401 until the user force-quits.
  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', async (nextState) => {
      const wasBackground = appStateRef.current.match(/inactive|background/);
      appStateRef.current = nextState;
      if (nextState !== 'active' || !wasBackground) return;
      try {
        // getSession() alone is not enough: it reads the locally stored session,
        // and while the app was backgrounded auto-refresh was stopped, so that
        // token may already be expired. The session object still looks valid, so
        // the app carried on and every query then failed with a 401 - the feed
        // simply never loaded.
        const { data: { session: stored } } = await supabase.auth.getSession();
        if (!stored) return; // genuinely signed out; nothing to recover

        // Refresh if the token is expired or close to it. expires_at is seconds.
        const expiresAt = (stored.expires_at ?? 0) * 1000;
        const needsRefresh = !expiresAt || expiresAt - Date.now() < 60_000;

        let live = stored;
        if (needsRefresh) {
          const { data, error } = await supabase.auth.refreshSession();
          if (error || !data.session) {
            // Refresh failed, usually because the network has not come back yet.
            // Do NOT clear the user: keep the stored session so the UI stays
            // intact, and let auto-refresh retry once connectivity returns.
            console.warn('[Auth] foreground refresh failed, keeping session:', error?.message);
            return;
          }
          live = data.session;
        }

        setSession(live);
        setUser(live.user);
        setAnalyticsUser(live.user?.id ?? null);
        // Re-fetch the profile too. Without this, a resumed session restored the
        // user but left `profile` stale or null, so onboarding state and the
        // banner could both be wrong after a resume.
        await fetchProfile(live.user.id);
      } catch (error) {
        console.error('[Auth] Error refreshing session on foreground:', error);
      }
    });
    return () => sub.remove();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, name?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
        },
      },
    });
    if (error) throw error;
    // Profile is created automatically by database trigger (handle_new_user)
  };

  const signOut = async () => {
    // Remove push token before signing out
    if (user) {
      await removePushToken(user.id);
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const signInWithGoogle = async (): Promise<OAuthOutcome> => {
    // Web: fall back to the browser OAuth flow.
    if (Platform.OS === 'web') {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
      if (error) throw error;
      return { status: 'success' };
    }

    if (!GOOGLE_WEB_CLIENT_ID) {
      throw new Error('Google Sign In is not available right now. Please use email or Apple sign-in.');
    }

    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result: any = await GoogleSignin.signIn();

      // Since v13 the SDK RESOLVES with { type: 'cancelled' } instead of throwing
      // SIGN_IN_CANCELLED. Without this check the cancellation fell through to the
      // "did not return an id_token" throw below and surfaced to the user as a
      // "Sign in failed" error alert. The statusCodes catch further down is kept
      // only for older SDK behaviour.
      if (result?.type === 'cancelled') {
        return { status: 'cancelled' };
      }

      // The new Google Sign In returns { type: 'success', data: {...} } while
      // older versions return the user object directly. Normalise.
      const payload = result?.data ?? result;
      const idToken = payload?.idToken ?? payload?.data?.idToken;
      if (!idToken) {
        throw new Error('Google Sign In did not return an id_token');
      }
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      if (error) throw error;
      reportOAuthSignup('google', data?.user);
      return { status: 'success' };
    } catch (err: any) {
      if (err?.code === statusCodes.SIGN_IN_CANCELLED) return { status: 'cancelled' };
      if (err?.code === statusCodes.IN_PROGRESS) return { status: 'cancelled' };
      console.error('[Auth] Google sign-in failed:', err);
      throw err;
    }
  };

  const signInWithApple = async (): Promise<OAuthOutcome> => {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign In is only available on iOS.');
    }
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        throw new Error('Apple Sign In did not return an identityToken');
      }
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) throw error;
      reportOAuthSignup('apple', data?.user);

      // Apple only exposes the full name on FIRST sign-in. If the name came
      // through and the profile row doesn't have one yet, persist it.
      const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean)
        .join(' ')
        .trim();
      if (fullName) {
        const { data: sess } = await supabase.auth.getSession();
        const uid = sess.session?.user?.id;
        if (uid) {
          const { data: existing } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', uid)
            .maybeSingle();
          if (existing && !existing.name) {
            await supabase.from('profiles').update({ name: fullName }).eq('id', uid);
          }
        }
      }
      return { status: 'success' };
    } catch (err: any) {
      // User cancelled. Not an error, but emphatically not a success either -
      // callers must not navigate as though a session now exists.
      if (err?.code === 'ERR_REQUEST_CANCELED' || err?.code === 'ERR_CANCELED') {
        return { status: 'cancelled' };
      }
      console.error('[Auth] Apple sign-in failed:', err);
      throw err;
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://cheezus.co/auth/callback',
    });
    if (error) throw error;
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
  };

  // Did the user actually COMPLETE the quiz? Skipping does not count.
  // TuneYourFeedBanner keys off this, so a skipper still gets invited back.
  const hasCompletedOnboarding: boolean | null = (() => {
    if (!user) return null;
    if (!profile) return null; // still loading profile
    return Boolean(profile.onboarding_quiz_completed_at);
  })();

  // Has the quiz question been SETTLED one way or the other - completed, or offered
  // and declined? Only the router guard should use this. Keeping it separate from
  // hasCompletedOnboarding is what stops a skip from silently suppressing the banner
  // while also stopping the guard re-forcing the quiz on every cold start.
  const onboardingResolved: boolean | null = (() => {
    if (!user) return null;
    if (skipOnboardingSession) return true;
    if (!profile) return null;
    return Boolean(profile.onboarding_quiz_completed_at);
  })();

  const value = {
    user,
    session,
    profile,
    loading,
    hasCompletedOnboarding,
    onboardingResolved,
    skipOnboardingForSession,
    refreshOnboardingStatus,
    appleSignInAvailable,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    signInWithApple,
    resetPassword,
    updatePassword,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}