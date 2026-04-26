import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Analytics } from '@/lib/analytics';
import SignInPromptSheet from '@/components/auth/SignInPromptSheet';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

type Props = {
  /** Where the banner is surfaced — affects analytics + default copy. */
  placement?: 'home_feed' | 'profile' | 'cheese_detail' | 'producer_detail';
};

const PLACEMENT_COPY: Record<NonNullable<Props['placement']>, { headline: string; sub: string }> = {
  home_feed:       { headline: 'Sign up to unlock your taste',        sub: 'Log cheeses, build your profile, share with friends.' },
  profile:         { headline: 'Start your own cheese journey',       sub: 'Free account · 60 seconds to set up.' },
  cheese_detail:   { headline: 'Save this cheese to your list',       sub: 'Join Cheezus to rate, save, and log your cheeses.' },
  producer_detail: { headline: 'Follow this producer',                sub: 'Sign up to follow producers and see their new cheeses.' },
};

export default function SignedOutCTABanner({ placement = 'home_feed' }: Props) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [promptVisible, setPromptVisible] = useState(false);

  if (loading || user) return null;
  const copy = PLACEMENT_COPY[placement];

  const handleTap = () => {
    Analytics.trackSignedOutCtaTapped(placement);
    setPromptVisible(true);
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.container}
        onPress={handleTap}
      >
        <View style={styles.left}>
          <Text style={styles.emoji}>🧀</Text>
          <View style={styles.copy}>
            <Text style={styles.headline} numberOfLines={1}>{copy.headline}</Text>
            <Text style={styles.sub} numberOfLines={1}>{copy.sub}</Text>
          </View>
        </View>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>Join</Text>
        </View>
      </TouchableOpacity>

      <SignInPromptSheet
        visible={promptVisible}
        onDismiss={() => setPromptVisible(false)}
        context="generic"
        onAuthenticated={() => {
          setPromptVisible(false);
          router.replace('/(tabs)');
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2C3E50',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: Layout.spacing.m,
    marginTop: Layout.spacing.s,
    marginBottom: Layout.spacing.s,
    ...Layout.shadow.medium,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emoji: {
    fontSize: 32,
    marginRight: 12,
  },
  copy: {
    flex: 1,
  },
  headline: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyBold,
    color: '#FFFFFF',
  },
  sub: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  cta: {
    backgroundColor: '#FCD95B',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: 8,
    borderRadius: 999,
    marginLeft: Layout.spacing.s,
  },
  ctaText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyBold,
    color: '#1F2937',
  },
});
