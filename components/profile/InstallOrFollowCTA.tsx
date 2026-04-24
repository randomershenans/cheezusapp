import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Platform, Linking } from 'react-native';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

type Props = {
  isOwnProfile: boolean;
  isFollowing: boolean;
  followLoading: boolean;
  onToggleFollow: () => void;
  onShare: () => void;
  profileName: string | null;
  isLoggedIn: boolean;
};

// Published app store URLs.
// apple-itunes-app meta in app/+html.tsx uses the same numeric App Store ID.
const APP_STORE_URL = 'https://apps.apple.com/app/id6756271218';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.cheezus.app';

/**
 * Surface-aware CTA for the profile page.
 *
 * - Web, logged-out viewer: "Get Cheezus to follow" + App Store / Play badges
 * - Web, logged-in viewer:  Follow + Share (copy link)
 * - Mobile, own profile:    Share Profile
 * - Mobile, other profile:  Follow / Following + Share
 */
export default function InstallOrFollowCTA(props: Props) {
  const { isOwnProfile, isFollowing, followLoading, onToggleFollow, onShare, profileName, isLoggedIn } = props;
  const isWeb = Platform.OS === 'web';

  if (isWeb && !isLoggedIn) {
    return <WebInstallCTA profileName={profileName} />;
  }

  return (
    <View style={styles.row}>
      {!isOwnProfile ? (
        <TouchableOpacity
          style={[styles.primary, isFollowing && styles.primaryMuted]}
          onPress={onToggleFollow}
          disabled={followLoading}
          activeOpacity={0.85}
        >
          {followLoading ? (
            <ActivityIndicator size="small" color={isFollowing ? Colors.text : '#1F2937'} />
          ) : (
            <Text style={[styles.primaryText, isFollowing && styles.primaryTextMuted]}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          )}
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity style={styles.secondary} onPress={onShare} activeOpacity={0.85}>
        <Text style={styles.secondaryText}>
          {isWeb ? 'Copy link' : 'Share'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function WebInstallCTA({ profileName }: { profileName: string | null }) {
  const nameText = profileName ? `${profileName}` : 'this profile';
  return (
    <View style={styles.webCtaWrap}>
      <Text style={styles.webCtaHeadline}>Follow {nameText} on Cheezus</Text>
      <Text style={styles.webCtaSub}>
        Get the app to follow, log your own cheeses, and see what else is trending.
      </Text>

      <View style={styles.storeRow}>
        <TouchableOpacity
          style={[styles.storeBadge, styles.appleBadge]}
          onPress={() => Linking.openURL(APP_STORE_URL)}
          activeOpacity={0.85}
        >
          <Text style={styles.storeBadgeSmall}>Download on the</Text>
          <Text style={styles.storeBadgeLarge}>App Store</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.storeBadge, styles.playBadge]}
          onPress={() => Linking.openURL(PLAY_STORE_URL)}
          activeOpacity={0.85}
        >
          <Text style={styles.storeBadgeSmall}>Get it on</Text>
          <Text style={styles.storeBadgeLarge}>Google Play</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Web-only sticky bottom install bar. Shown on scroll. Renders nothing on native.
 */
export function StickyInstallBar({ profileName }: { profileName: string | null }) {
  if (Platform.OS !== 'web') return null;

  return (
    <View style={styles.stickyBar}>
      <View style={styles.stickyInner}>
        <Text style={styles.stickyText} numberOfLines={1}>
          Follow {profileName || 'along'} on Cheezus
        </Text>
        <TouchableOpacity
          style={styles.stickyCta}
          onPress={() => Linking.openURL(APP_STORE_URL)}
          activeOpacity={0.85}
        >
          <Text style={styles.stickyCtaText}>Get the App</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Layout.spacing.s,
    paddingHorizontal: Layout.spacing.m,
    marginTop: Layout.spacing.m,
  },
  primary: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: Layout.borderRadius.large,
    alignItems: 'center',
  },
  primaryMuted: {
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  primaryText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyBold,
    color: '#1F2937',
  },
  primaryTextMuted: { color: Colors.text },
  secondary: {
    paddingVertical: 14,
    paddingHorizontal: Layout.spacing.l,
    borderRadius: Layout.borderRadius.large,
    backgroundColor: '#FFFEF7',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  secondaryText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
  },

  // Web install CTA
  webCtaWrap: {
    paddingHorizontal: Layout.spacing.m,
    marginTop: Layout.spacing.l,
    alignItems: 'center',
  },
  webCtaHeadline: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.heading,
    color: Colors.text,
    textAlign: 'center',
  },
  webCtaSub: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 360,
    lineHeight: 20,
  },
  storeRow: {
    flexDirection: 'row',
    gap: Layout.spacing.m,
    marginTop: Layout.spacing.m,
  },
  storeBadge: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    ...Layout.shadow.small,
  },
  appleBadge: {
    backgroundColor: '#000',
  },
  playBadge: {
    backgroundColor: '#000',
  },
  storeBadgeSmall: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.75)',
    fontFamily: Typography.fonts.body,
    letterSpacing: 0.3,
  },
  storeBadgeLarge: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: Typography.fonts.bodyBold,
    marginTop: -2,
  },

  // Sticky install bar
  stickyBar: {
    position: 'absolute' as any,
    // RN Web supports 'fixed', but position typing doesn't. Cast used above.
    left: 0, right: 0, bottom: 0,
    zIndex: 100,
    backgroundColor: '#2C3E50',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    ...Layout.shadow.large,
  },
  stickyInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.m,
    gap: Layout.spacing.m,
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },
  stickyText: {
    flex: 1,
    color: '#FFF',
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
  },
  stickyCta: {
    backgroundColor: '#FCD95B',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: 10,
    borderRadius: 999,
  },
  stickyCtaText: {
    color: '#1F2937',
    fontFamily: Typography.fonts.bodyBold,
    fontSize: Typography.sizes.sm,
  },
});
