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
      
      // Handle email confirmation deep link (from Supabase signup email)
      // URL formats can vary:
      // - cheezus://#access_token=...&type=signup
      // - cheezus://auth/confirm?token=...&type=signup
      // - https://cheezus.co/auth/confirm#access_token=...&type=signup
      const isEmailConfirmation = 
        url.includes('type=signup') || 
        url.includes('type=email') ||
        url.includes('type=magiclink') ||
        url.includes('auth/confirm') ||
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
         *   #access_token=...&refresh_token=...   an already-minted session
         *   ?token_hash=...&type=signup           a one-shot code to redeem
         *
         * Reading only the hash meant the second shape fell straight through to
         * the login screen, and since the token can only be redeemed once and
         * the web page had already handed it over, nothing else could redeem it
         * either. The account stayed unconfirmed and the person was bounced
         * back to a login they could not complete.
         */
        const [beforeHash, hashPart] = url.split('#');
        const queryIndex = beforeHash.indexOf('?');
        const query = new URLSearchParams(queryIndex >= 0 ? beforeHash.slice(queryIndex + 1) : '');
        const hashParams = new URLSearchParams(hashPart ?? '');

        const accessToken = hashParams.get('access_token') ?? query.get('access_token');
        const refreshToken = hashParams.get('refresh_token') ?? query.get('refresh_token');
        const tokenHash = query.get('token_hash') ?? hashParams.get('token_hash');
        const otpType = query.get('type') ?? hashParams.get('type');

        let signedIn = false;

        if (accessToken && refreshToken) {
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
      
      // Handle password recovery deep link (from Supabase email)
      // URL format: cheezus://#access_token=...&type=recovery
      if (url.includes('type=recovery') || url.includes('recovery')) {
        console.log('Password recovery deep link detected');
        
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