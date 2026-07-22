import { useEffect, useState } from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SplashScreen } from 'expo-router';
import * as Linking from 'expo-linking';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { AppState } from 'react-native';
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { supabase } from '@/lib/supabase';
import { Analytics } from '@/lib/analytics';
import PushNotificationHandler from '@/components/PushNotificationHandler';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Marks that this install has been opened at least once, so app_first_open fires
// exactly once per install rather than never (previously) or on every launch.
const FIRST_OPEN_KEY = 'analytics:first_open_at';

export default function RootLayout() {
  useFrameworkReady();
  const router = useRouter();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'SpaceGrotesk-Regular': SpaceGrotesk_400Regular,
    'SpaceGrotesk-Medium': SpaceGrotesk_500Medium,
    'SpaceGrotesk-SemiBold': SpaceGrotesk_600SemiBold,
    'SpaceGrotesk-Bold': SpaceGrotesk_700Bold,
  });

  // Hide splash screen once fonts are loaded
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Track app open on mount and foreground.
  //
  // The cold-start call has to decide whether this is the very FIRST open on this
  // install, because that flag is the sole trigger for the app_first_open event.
  // It was previously hardcoded to false, so app_first_open never fired even once
  // and installs-to-signup conversion could not be computed at all.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      let isFirstOpen = false;
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const seen = await AsyncStorage.getItem(FIRST_OPEN_KEY);
        if (!seen) {
          isFirstOpen = true;
          await AsyncStorage.setItem(FIRST_OPEN_KEY, new Date().toISOString());
        }
      } catch (err) {
        // If storage is unavailable, fall back to treating this as a normal open.
        // Over-reporting first opens would corrupt the acquisition funnel far worse
        // than under-reporting a rare edge case.
        console.warn('[Analytics] first-open check failed:', err);
      }
      if (!cancelled) Analytics.trackAppOpen(isFirstOpen);
    })();

    // Foregrounding is never a first open.
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        Analytics.trackAppOpen(false);
      }
    });
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  // Handle deep links
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      // Skip localhost URLs - these are normal web navigation, not deep links
      if (url.includes('localhost') || url.includes('127.0.0.1')) {
        return;
      }
      
      console.log('Deep link received:', url);
      
      /**
       * Handle the email confirmation deep link.
       *
       * THE ACTUAL SHAPE, confirmed by asking Supabase for a real signup link
       * rather than guessing at it: the Site URL is `cheezus://`, so the email
       * button goes to
       *   <project>.supabase.co/auth/v1/verify?token=...&type=signup&redirect_to=cheezus://
       * and after verifying, Supabase redirects to the bare app scheme. The
       * website is not in this flow at ALL, which is why fixing cheezus.co
       * three times changed nothing.
       *
       * And because lib/supabase.ts sets flowType 'pkce', what lands is
       *   cheezus://?code=<uuid>
       * a PKCE authorisation code in the QUERY. Not a hash, not a token_hash.
       * None of the tests below matched it, so the link fell through every
       * branch, nothing ran, and the app just sat on the feed signed out.
       *
       * detectSessionInUrl is false on that client, so supabase-js will not
       * pick this up on its own. It has to be done here.
       *
       * The PKCE verifier lives in THIS app's storage, which is also why the
       * website could never have redeemed the code even if it were involved.
       */
      const isEmailConfirmation =
        url.includes('type=signup') ||
        url.includes('type=email') ||
        url.includes('type=magiclink') ||
        url.includes('auth/confirm') ||
        // A PKCE code with no path is a signup confirmation, because the Site
        // URL is the bare scheme. Recovery arrives on the auth/callback path
        // instead (resetPasswordForEmail sends people via cheezus.co), carries
        // no type of its own, and must NOT be treated as a confirmation or the
        // person resetting a password gets signed in and dropped into
        // onboarding rather than the reset screen.
        (url.includes('code=') &&
          !url.includes('type=recovery') &&
          !url.includes('auth/callback')) ||
        (url.includes('access_token') && !url.includes('type=recovery'));
      
      if (isEmailConfirmation) {
        console.log('Email confirmation deep link detected:', url);

        /**
         * Consume whatever the link carries. Do not throw it away.
         *
         * Clicking confirm IS the sign-in, so this has to end with a session or
         * it has failed. There are two payload shapes and they arrive in
         * different parts of the URL, which is what made this so easy to get
         * wrong:
         *
         *   ?code=<uuid>                          a PKCE code. THIS IS THE REAL ONE.
         *   #access_token=...&refresh_token=...   an already-minted session
         *   ?token_hash=...&type=signup           a one-shot token to redeem
         *
         * All three are handled because the shape depends on Supabase config
         * that can change from a dashboard without anyone touching this file,
         * and every previous attempt at this bug failed by handling exactly one
         * of them and assuming.
         */
        const [beforeHash, hashPart] = url.split('#');
        const queryIndex = beforeHash.indexOf('?');
        const query = new URLSearchParams(queryIndex >= 0 ? beforeHash.slice(queryIndex + 1) : '');
        const hashParams = new URLSearchParams(hashPart ?? '');

        const pkceCode = query.get('code') ?? hashParams.get('code');
        const accessToken = hashParams.get('access_token') ?? query.get('access_token');
        const refreshToken = hashParams.get('refresh_token') ?? query.get('refresh_token');
        const tokenHash = query.get('token_hash') ?? hashParams.get('token_hash');
        const otpType = query.get('type') ?? hashParams.get('type');

        let signedIn = false;

        if (pkceCode) {
          // The verifier that pairs with this code was stored by THIS app when
          // it called signUp, so this is the only place it can be redeemed.
          const { data, error } = await supabase.auth.exchangeCodeForSession(pkceCode);
          if (!error && data.session) {
            console.log('Email confirmed via PKCE code:', data.session.user?.id);
            signedIn = true;
          } else {
            console.error('Could not exchange the confirmation code:', error?.message);
          }
        } else if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!error && data.session) {
            console.log('Email confirmed and signed in:', data.session.user?.id);
            signedIn = true;
          } else {
            console.error('Could not sign in from the confirmation link:', error?.message);
          }
        } else if (tokenHash) {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType === 'magiclink' ? 'magiclink' : otpType === 'email' ? 'email' : 'signup',
          });
          if (!error && data.session) {
            console.log('Email confirmed via token_hash:', data.session.user?.id);
            signedIn = true;
          } else {
            console.error('Could not redeem the confirmation token:', error?.message);
          }
        }

        if (signedIn) {
          // Straight into onboarding. This is a brand new account by
          // definition, and the router guard would otherwise have to race
          // the profile load to work it out.
          setTimeout(() => router.replace('/onboarding/quiz'), 100);
          return;
        }

        // No usable tokens, or the server rejected them: an expired or reused
        // link. Login is the right destination, but only as the fallback.
        setTimeout(() => {
          router.replace('/auth/login');
        }, 100);
        return;
      }
      
      /**
       * Handle the password recovery deep link.
       *
       * Two shapes again, for the same reason as confirmation. The classic one
       * is cheezus://#access_token=...&type=recovery. But resetPasswordForEmail
       * sends people to https://cheezus.co/auth/callback, and under PKCE that
       * arrives as ?code=<uuid> with no type at all, relayed on to
       * cheezus://auth/callback?code=... by the website. Handling only the hash
       * would leave a password reset as dead as the signup confirmation was.
       */
      const recoveryCode = (() => {
        if (!url.includes('auth/callback')) return null;
        const before = url.split('#')[0];
        const qi = before.indexOf('?');
        if (qi < 0) return null;
        return new URLSearchParams(before.slice(qi + 1)).get('code');
      })();

      if (url.includes('type=recovery') || url.includes('recovery') || recoveryCode) {
        console.log('Password recovery deep link detected');

        if (recoveryCode) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(recoveryCode);
          if (!error && data.session) {
            router.replace('/auth/reset-password');
            return;
          }
          console.error('Could not exchange the recovery code:', error?.message);
          setTimeout(() => router.replace('/auth/login'), 100);
          return;
        }

        // Extract tokens from the URL hash fragment
        // Supabase redirects with tokens in the hash: #access_token=...&refresh_token=...&type=recovery
        const hashPart = url.split('#')[1];
        if (hashPart) {
          const params = new URLSearchParams(hashPart);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          
          if (accessToken && refreshToken) {
            // Set the session with the tokens from the URL
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (error) {
              console.error('Error setting session from recovery link:', error);
            } else {
              console.log('Session set successfully, navigating to reset password');
              router.replace('/auth/reset-password');
              return;
            }
          }
        }
        
        // Fallback: try navigating anyway in case session was set another way
        setTimeout(() => {
          router.replace('/auth/reset-password');
        }, 500);
        return;
      }
      
      // UUID regex pattern
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      // Handle cheezus://profile/username or cheezus://profile?username=xxx
      const profileMatch = url.match(/profile\/([^/?]+)/);
      if (profileMatch) {
        const username = profileMatch[1];
        
        // If it's already a UUID, navigate directly
        if (uuidPattern.test(username)) {
          router.push(`/profile/${username}`);
          return;
        }
        
        // Look up user by vanity_url
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('vanity_url', username)
          .maybeSingle();
        
        if (profile) {
          router.push(`/profile/${profile.id}`);
        } else {
          // Try treating it as a user ID directly
          router.push(`/profile/${username}`);
        }
        return;
      }

      // Handle https://cheezus.co/@username
      const vanityMatch = url.match(/@([^/?]+)/);
      if (vanityMatch) {
        const username = vanityMatch[1];
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('vanity_url', username)
          .maybeSingle();
        
        if (profile) {
          router.push(`/profile/${profile.id}`);
        }
        return;
      }

      // Handle cheese deep links: cheezus://cheese/[id] or https://cheezus.co/cheese/[id]
      const cheeseMatch = url.match(/cheese\/([^/?]+)/);
      if (cheeseMatch) {
        const cheeseId = cheeseMatch[1];
        if (uuidPattern.test(cheeseId)) {
          router.push(`/producer-cheese/${cheeseId}`);
        }
        return;
      }
    };

    // Handle initial URL (app opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // Handle URL when app is already open
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => subscription.remove();
  }, [router]);

  // Return null to keep splash screen visible while fonts load
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AuthProvider>
      <PushNotificationHandler />
      <OnboardingRouterGuard />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/signup" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="add-cheese" options={{ headerShown: false }} />
        <Stack.Screen name="cheese/new" options={{ headerShown: false }} />
        <Stack.Screen name="cheezopedia/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="pairing/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="badges" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </AuthProvider>
  );
}

/**
 * Mounted inside AuthProvider. Routes signed-in users who haven't completed
 * the taste quiz to /onboarding/quiz, unless they're already on an onboarding
 * or auth route (so we don't fight the initial signup / password recovery
 * flows). The skip path sets a session-local flag in AuthContext so we don't
 * re-loop the same session.
 */
// Accounts created BEFORE the taste quiz shipped belong to pre-existing users, who
// should not be dropped into onboarding retroactively - they get TuneYourFeedBanner
// instead. Accounts created after it shipped are new users and should see the quiz.
//
// This replaces a "created_at is less than 10 minutes old" check. That proxy decayed:
// email signup does not enter the app at all, it sends a confirmation email, so anyone
// confirming and logging in more than 10 minutes later - a lunch break, an evening -
// was classified as pre-existing and NEVER saw the quiz. A fixed cutoff cannot expire,
// so a user who signs up today and confirms on Thursday still gets onboarded.
const ONBOARDING_LAUNCH_AT = Date.parse('2026-07-21T00:00:00Z');

function OnboardingRouterGuard() {
  const router = useRouter();
  const pathname = usePathname();
  // onboardingResolved, NOT hasCompletedOnboarding. A user who skipped has settled the
  // question and must not be pushed back into the quiz on every cold start, but should
  // still see TuneYourFeedBanner - and that banner keys off hasCompletedOnboarding,
  // which a skip deliberately leaves false.
  const { user, loading, profile, onboardingResolved } = useAuth();

  /**
   * Is this a pre-existing account that should skip the quiz?
   *
   * Derived from the profile AuthContext has already loaded, rather than
   * re-reading profiles here. The old version issued its own query and, on any
   * failure, defaulted to "existing" and silently bypassed onboarding forever.
   * That is a bad default: a transient read error should not permanently cost
   * someone the quiz, and it made the guard's behaviour depend on a race
   * between two independent fetches of the same row.
   *
   * null means not known yet, and the guard waits rather than guessing.
   */
  const isExistingUser: boolean | null = (() => {
    if (!user) return null;
    if (!profile?.created_at) return null;
    return Date.parse(profile.created_at) < ONBOARDING_LAUNCH_AT;
  })();

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (onboardingResolved !== false) return; // null = still loading, true = done
    if (isExistingUser !== false) return;     // null = still loading, true = bypass

    const path = pathname ?? '';
    // Onboarding routes obviously, and auth routes because the login screen
    // does its own navigation and the two would fight.
    if (path.startsWith('/onboarding') || path.startsWith('/auth')) return;

    router.replace('/onboarding/quiz');
  }, [user, loading, onboardingResolved, isExistingUser, pathname, router]);

  return null;
}