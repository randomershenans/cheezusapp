import React from 'react';
import { View, Text, Image } from 'react-native';
import { BRAND, FONTS, STORIES_WIDTH, STORIES_HEIGHT, pickVariant } from './shared';

export interface BadgeCardProps {
  badgeName: string;
  badgeDescription?: string | null;
  badgeImgUrl?: string | null;
  badgeIcon?: string | null;
  earnedCount?: number;
  totalBadges?: number;
  userName?: string | null;
  userHandle?: string | null;
  userAvatarUrl?: string | null;
  userId?: string | null;
}

const HEADLINE_VARIANTS = [
  'Badge earned.',
  'Another one for the board.',
  'New pin on the apron.',
] as const;

export function getBadgeCopyVariant(seed: string): string {
  return pickVariant(seed, HEADLINE_VARIANTS);
}

export default function BadgeCard({
  badgeName,
  badgeDescription,
  badgeImgUrl,
  badgeIcon,
  earnedCount = 0,
  totalBadges = 0,
  userName,
  userHandle,
  userAvatarUrl,
  userId,
}: BadgeCardProps) {
  const seed = `${userId ?? 'anon'}|badge|${badgeName}`;
  const headline = getBadgeCopyVariant(seed);
  const percent = totalBadges > 0 ? Math.min(100, Math.round((earnedCount / totalBadges) * 100)) : 0;

  return (
    <View
      style={{
        width: STORIES_WIDTH,
        height: STORIES_HEIGHT,
        backgroundColor: BRAND.cream,
        padding: 72,
        justifyContent: 'space-between',
        alignItems: 'stretch',
      }}
    >
      {/* Top headline */}
      <Text
        style={{
          fontFamily: FONTS.bodyMedium,
          fontSize: 36,
          color: BRAND.textSubtle,
          letterSpacing: 4,
          textTransform: 'uppercase',
        }}
      >
        {headline}
      </Text>

      {/* Centered badge art */}
      <View style={{ alignItems: 'center', gap: 40 }}>
        <View
          style={{
            width: 520,
            height: 520,
            borderRadius: 260,
            backgroundColor: BRAND.gold,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 8,
            borderColor: BRAND.goldDeep,
            // fake wax-paper radial via shadow
            shadowColor: BRAND.goldDeep,
            shadowOffset: { width: 0, height: 20 },
            shadowOpacity: 0.35,
            shadowRadius: 40,
          }}
        >
          {badgeImgUrl ? (
            <Image
              source={{ uri: badgeImgUrl }}
              style={{ width: 400, height: 400 }}
              resizeMode="contain"
            />
          ) : (
            <Text style={{ fontSize: 280 }}>{badgeIcon || '🏆'}</Text>
          )}
        </View>

        <Text
          style={{
            fontFamily: FONTS.display,
            fontSize: 88,
            lineHeight: 96,
            color: BRAND.text,
            letterSpacing: -1.5,
            textAlign: 'center',
          }}
          numberOfLines={2}
        >
          {badgeName}
        </Text>

        {badgeDescription ? (
          <Text
            style={{
              fontFamily: FONTS.body,
              fontSize: 36,
              lineHeight: 48,
              color: BRAND.textSubtle,
              textAlign: 'center',
              paddingHorizontal: 32,
            }}
            numberOfLines={3}
          >
            {badgeDescription}
          </Text>
        ) : null}
      </View>

      {/* Progress + footer */}
      <View style={{ gap: 24 }}>
        {totalBadges > 0 ? (
          <View style={{ gap: 12 }}>
            <Text
              style={{
                fontFamily: FONTS.bodySemiBold,
                fontSize: 32,
                color: BRAND.text,
              }}
            >
              {earnedCount} of {totalBadges} badges · {percent}%
            </Text>
            <View
              style={{
                height: 16,
                backgroundColor: 'rgba(234,179,8,0.2)',
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${percent}%`,
                  height: '100%',
                  backgroundColor: BRAND.goldDeep,
                  borderRadius: 8,
                }}
              />
            </View>
          </View>
        ) : null}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            {userAvatarUrl ? (
              <Image
                source={{ uri: userAvatarUrl }}
                style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: BRAND.waxPaper }}
              />
            ) : null}
            <Text
              style={{ fontFamily: FONTS.bodySemiBold, fontSize: 30, color: BRAND.text }}
              numberOfLines={1}
            >
              {userHandle ? `@${userHandle}` : userName ?? ''}
            </Text>
          </View>
          <Text
            style={{
              fontFamily: FONTS.display,
              fontSize: 28,
              color: BRAND.textSubtle,
              letterSpacing: 1,
            }}
          >
            cheezus.co
          </Text>
        </View>
      </View>
    </View>
  );
}
