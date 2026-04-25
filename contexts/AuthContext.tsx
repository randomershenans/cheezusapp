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
  hasCompletedOnboarding: boolean | null;
  skipOnboardingForSession: () => void;
  refreshOnboardingStatus: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Native Google Sign In via @react-native-google-signin, returning an id_token
   *  we exchange with Supabase via signInWithIdToken. Falls back to web OAuth
   *  on web or if the native SDK isn't configured. */
  signInWithGoogle: () => Promise<void>;
  /** Native Apple Sign In (iOS 13+). Uses Apple's identityToken with Supabase's
   *  signInWithIdToken. Apple doesn't expose email on subsequent logins, so we
   *  pass the display name through once on first sign-in. */
  signInWithApple: () => Promise<void>;
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

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, tagline, location, avatar_url, vanity_url, onboarding_quiz_completed_at')
        .eq('id', userId)
        .single();
      if (data) setProfile(data as UserProfile);
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

  const skipOnboardingForSession = () => {
    setSkipOnboardingSession(true);
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('[Auth] Initial session loaded:', session ? `User: ${session.user?.id}` : 'No session');
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    }).catch(error => {
      console.error('[Auth] Error getting initial session:', error);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event);
      setSession(session);
      setUser(session?.user ?? null);
      
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

    return () => subscription.unsubscribe();
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
        const { data: { session: refreshed } } = await supabase.auth.getSession();
        if (refreshed?.user) {
          setSession(refreshed);
          setUser(refreshed.user);
        }
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

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) throw error;
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

  const hasCompletedOnboarding: boolean | null = (() => {
    if (!user) return null;
    if (skipOnboardingSession) return true; // treat as complete for this session
    if (!profile) return null;                // still loading profile
    return Boolean(profile.onboarding_quiz_completed_at);
  })();

  const value = {
    user,
    session,
    profile,
    loading,
    hasCompletedOnboarding,
    skipOnboardingForSession,
    refreshOnboardingStatus,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
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