import React from 'react';
import { View, Text, Image } from 'react-native';
import { BRAND, FONTS, STORIES_WIDTH, STORIES_HEIGHT, firstSentence, pickVariant } from './shared';

export interface JustLoggedCardProps {
  cheeseName: string;
  producerName?: string | null;
  originCountry?: string | null;
  imageUrl?: string | null;
  rating?: number | null;
  note?: string | null;
  userName?: string | null;
  userHandle?: string | null;
  userAvatarUrl?: string | null;
  userId?: string | null;
}

const HEADLINE_VARIANTS = [
  'Just rated a stunning {cheese}.',
  'New favorite unlocked: {cheese}.',
  '{cheese} — {rating}★. Worth it.',
] as const;

export function getJustLoggedCopyVariant(seed: string): string {
  return pickVariant(seed, HEADLINE_VARIANTS);
}

function StarRow({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const stars: string[] = [];
  for (let i = 0; i < 5; i++) {
    if (i < full) stars.push('★');
    else if (i === full && half) stars.push('☆'); // treat half as outlined
    else stars.push('☆');
  }
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      {stars.map((s, i) => (
        <Text
          key={i}
          style={{
            fontFamily: FONTS.display,
            fontSize: 72,
            color: s === '★' ? BRAND.goldDeep : 'rgba(234,179,8,0.25)',
            lineHeight: 72,
          }}
        >
          {'★'}
        </Text>
      ))}
    </View>
  );
}

export default function JustLoggedCard({
  cheeseName,
  producerName,
  originCountry,
  imageUrl,
  rating,
  note,
  userName,
  userHandle,
  userAvatarUrl,
  userId,
}: JustLoggedCardProps) {
  const ratingDisplay = rating ? rating.toFixed(1).replace(/\.0$/, '') : '';
  const seed = `${userId ?? 'anon'}|just_logged`;
  const headlineTemplate = getJustLoggedCopyVariant(seed);
  const headline = headlineTemplate
    .replace('{cheese}', cheeseName)
    .replace('{rating}', ratingDisplay || '5');

  const subhead = [producerName, originCountry].filter(Boolean).join(' · ');
  const pullQuote = firstSentence(note, 80);

  return (
    <View
      style={{
        width: STORIES_WIDTH,
        height: STORIES_HEIGHT,
        backgroundColor: BRAND.cream,
        padding: 72,
        justifyContent: 'space-between',
      }}
    >
      {/* Hero photo — top 60% */}
      <View
        style={{
          width: STORIES_WIDTH - 144,
          height: Math.round(STORIES_HEIGHT * 0.55),
          borderRadius: 32,
          overflow: 'hidden',
          backgroundColor: BRAND.waxPaper,
          borderWidth: 2,
          borderColor: BRAND.border,
        }}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: BRAND.creamDeep,
            }}
          >
            <Text style={{ fontSize: 240 }}>🧀</Text>
          </View>
        )}
      </View>

      {/* Bottom content block */}
      <View style={{ gap: 24 }}>
        <Text
          style={{
            fontFamily: FONTS.display,
            fontSize: 54,
            lineHeight: 60,
            color: BRAND.textSubtle,
            letterSpacing: -0.5,
          }}
          numberOfLines={2}
        >
          {headline}
        </Text>

        <Text
          style={{
            fontFamily: FONTS.display,
            fontSize: 72,
            lineHeight: 78,
            color: BRAND.text,
            letterSpacing: -1,
          }}
          numberOfLines={2}
        >
          {cheeseName}
        </Text>

        {subhead ? (
          <Text
            style={{
              fontFamily: FONTS.body,
              fontSize: 36,
              color: BRAND.textSubtle,
            }}
            numberOfLines={1}
          >
            {subhead}
          </Text>
        ) : null}

        {rating ? <StarRow rating={rating} /> : null}

        {pullQuote ? (
          <Text
            style={{
              fontFamily: FONTS.body,
              fontStyle: 'italic',
              fontSize: 36,
              lineHeight: 48,
              color: BRAND.text,
              borderLeftWidth: 6,
              borderLeftColor: BRAND.gold,
              paddingLeft: 24,
            }}
            numberOfLines={2}
          >
            “{pullQuote}”
          </Text>
        ) : null}

        {/* Footer row: avatar+handle left, wordmark right */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            {userAvatarUrl ? (
              <Image
                source={{ uri: userAvatarUrl }}
                style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: BRAND.waxPaper }}
              />
            ) : (
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: BRAND.gold,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontFamily: FONTS.display, fontSize: 32, color: BRAND.ink }}>
                  {userName?.[0]?.toUpperCase() ?? '🧀'}
                </Text>
              </View>
            )}
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
