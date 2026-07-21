import React from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Rect, Circle, G } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, MapPin } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';
import type { Tier } from '@/constants/Tiers';

type Props = {
  name: string | null;
  tagline: string | null;
  location: string | null;
  avatarUrl: string | null;
  vanityUrl: string | null;
  tier: Tier;
};

// Content height (below the status bar). Full hero height is this + insets.top
// so the gold bleeds all the way up under the notch/status bar.
const HERO_CONTENT_HEIGHT = 360;

// Subtle wheel-slice pattern — small gold circles radiating behind the avatar.
// Decorative only, no interaction. Extends edge-to-edge including under the
// status bar so the gradient fills the whole top of the screen.
const WheelSlicePattern = ({ totalHeight }: { totalHeight: number }) => (
  <Svg width="100%" height="100%" viewBox={`0 0 400 ${totalHeight}`} style={StyleSheet.absoluteFill} preserveAspectRatio="none">
    <Defs>
      <SvgLinearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%"  stopColor="#FCD95B" stopOpacity="1" />
        <Stop offset="70%" stopColor="#FDE68A" stopOpacity="1" />
        <Stop offset="100%" stopColor="#FFFEF7" stopOpacity="1" />
      </SvgLinearGradient>
    </Defs>
    <Rect x="0" y="0" width="400" height={totalHeight} fill="url(#heroGrad)" />
    {/* Radiating dots — hint of cheese wheel texture */}
    <G opacity="0.25">
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const angle = (i * Math.PI) / 4;
        const r = 180;
        const cx = 200 + Math.cos(angle) * r;
        const cy = (totalHeight / 2) + Math.sin(angle) * r * 0.55;
        return <Circle key={i} cx={cx} cy={cy} r={3} fill="#EAB308" />;
      })}
    </G>
  </Svg>
);

export default function ProfileHero({ name, tagline, location, avatarUrl, vanityUrl, tier }: Props) {
  const insets = useSafeAreaInsets();
  // Reserve room for the nav-buttons row (44) + padding before the tier pill
  // so the pill never collides with the status bar OR the back/share buttons.
  const tierPillTop = insets.top + 44 + 8;

  return (
    <View style={[styles.container, { height: HERO_CONTENT_HEIGHT + insets.top, paddingTop: insets.top }]}>
      <WheelSlicePattern totalHeight={HERO_CONTENT_HEIGHT + insets.top} />

      {/* Tier pill — pinned below the nav row, never under the status bar */}
      <View style={[styles.tierPill, { top: tierPillTop }]}>
        <Text style={styles.tierPillText}>{tier.label}</Text>
      </View>

      <View style={styles.content}>
        {/* Avatar with gold ring */}
        <View style={styles.avatarRing}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <User size={52} color={Colors.subtleText} />
            </View>
          )}
        </View>

        <Text style={styles.name} numberOfLines={1}>
          {name || 'Cheese Lover'}
        </Text>

        {vanityUrl ? (
          <Text style={styles.handle}>@{vanityUrl}</Text>
        ) : null}

        {tagline ? (
          <Text style={styles.tagline} numberOfLines={2}>
            {tagline}
          </Text>
        ) : null}

        {location ? (
          <View style={styles.locationRow}>
            <MapPin size={13} color={Colors.textSecondary} />
            <Text style={styles.location}>{location}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Layout.spacing.l,
    paddingTop: Layout.spacing.l,
  },
  avatarRing: {
    width: 136,
    height: 136,
    borderRadius: 68,
    padding: 4,
    backgroundColor: '#FFFEF7',
    borderWidth: 2,
    borderColor: '#EAB308',
    marginBottom: Layout.spacing.m,
    ...Layout.shadow.medium,
  },
  avatar: {
    width: 124,
    height: 124,
    borderRadius: 62,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: Typography.sizes['3xl'],
    fontFamily: Typography.fonts.heading,
    color: Colors.text,
    textAlign: 'center',
  },
  handle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  tagline: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
    textAlign: 'center',
    marginTop: Layout.spacing.s,
    paddingHorizontal: Layout.spacing.l,
    lineHeight: 22,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Layout.spacing.s,
    gap: 4,
  },
  location: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.textSecondary,
  },
  tierPill: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: '#FFFEF7',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#EAB308',
    zIndex: 10,
    ...Layout.shadow.small,
  },
  tierPillText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodyBold,
    color: '#8B6914',
    letterSpacing: 0.3,
  },
});
