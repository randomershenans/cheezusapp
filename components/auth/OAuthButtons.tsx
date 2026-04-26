import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Image,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from '@/contexts/AuthContext';
import { Analytics } from '@/lib/analytics';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

type Props = {
  /** 'login' or 'signup' — controls copy only. */
  mode?: 'login' | 'signup';
  /** Shown above the buttons. Default: "or continue with" */
  dividerLabel?: string;
  /** Fired when OAuth succeeds. Caller decides routing. */
  onSuccess?: () => void;
};

const GOOGLE_LOGO_URI = 'https://developers.google.com/identity/images/g-logo.png';

export default function OAuthButtons({ mode = 'login', dividerLabel, onSuccess }: Props) {
  const { signInWithGoogle, signInWithApple, appleSignInAvailable } = useAuth();
  const [busy, setBusy] = useState<null | 'apple' | 'google'>(null);

  const handleGoogle = async () => {
    if (busy) return;
    setBusy('google');
    try {
      Analytics.trackOAuthStart('google', mode);
      await signInWithGoogle();
      Analytics.trackOAuthSuccess('google', mode);
      onSuccess?.();
    } catch (err: any) {
      const msg = err?.message || 'Google sign-in failed. Please try again.';
      Analytics.trackOAuthFailure('google', msg, mode);
      Alert.alert('Sign in failed', msg);
    } finally {
      setBusy(null);
    }
  };

  const handleApple = async () => {
    if (busy) return;
    setBusy('apple');
    try {
      Analytics.trackOAuthStart('apple', mode);
      await signInWithApple();
      Analytics.trackOAuthSuccess('apple', mode);
      onSuccess?.();
    } catch (err: any) {
      const msg = err?.message || 'Apple sign-in failed. Please try again.';
      Analytics.trackOAuthFailure('apple', msg, mode);
      Alert.alert('Sign in failed', msg);
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>{dividerLabel || 'or continue with'}</Text>
        <View style={styles.dividerLine} />
      </View>

      {Platform.OS === 'ios' && appleSignInAvailable ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={
            mode === 'signup'
              ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
              : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
          }
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={12}
          style={styles.appleButton}
          onPress={handleApple}
        />
      ) : null}

      <TouchableOpacity
        style={styles.googleButton}
        onPress={handleGoogle}
        disabled={busy !== null}
        activeOpacity={0.85}
      >
        {busy === 'google' ? (
          <ActivityIndicator size="small" color={Colors.text} />
        ) : (
          <>
            <Image source={{ uri: GOOGLE_LOGO_URI }} style={styles.googleLogo} />
            <Text style={styles.googleText}>
              {mode === 'signup' ? 'Sign up with Google' : 'Continue with Google'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {busy === 'apple' ? (
        <View style={styles.appleOverlay} pointerEvents="none">
          <ActivityIndicator size="small" color="#FFF" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: Layout.spacing.s,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Layout.spacing.m,
    gap: Layout.spacing.s,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.subtleText,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  appleButton: {
    width: '100%',
    height: 52,
  },
  appleOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButton: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...Layout.shadow.small,
  },
  googleLogo: {
    width: 20,
    height: 20,
  },
  googleText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
  },
});
