import React from 'react';
import { View, Text, Image } from 'react-native';
import { BRAND, FONTS, STORIES_WIDTH, STORIES_HEIGHT, pickVariant } from './shared';

export interface ProfileCardProps {
  userName?: string | null;
  userHandle?: string | null;
  userAvatarUrl?: string | null;
  userId?: string | null;
  cheeseCount?: number;
  countryCount?: number;
  topFamily?: string | null;
  topStyle?: string | null;
  topCountry?: string | null;
  tagline?: string | null;
  topCheesePhotos?: Array<string | null | undefined>;
  vanityUrl?: string | null;
}

const TAGLINE_VARIANTS = [
  'My taste: {top_style}, {top_country}, unafraid.',
  'My cheese board, so far.',
  "Follow along — I'm tasting everything.",
] as const;

export function getProfileCopyVariant(
  seed: string,
  opts: { topStyle?: string | null; topCountry?: string | null }
): string {
  const tmpl = pickVariant(seed, TAGLINE_VARIANTS);
  return tmpl
    .replace('{top_style}', opts.topStyle || 'eclectic')
    .replace('{top_country}', opts.topCountry || 'well-traveled');
}

function GridTile({ url }: { url?: string | null }) {
  return (
    <View
      style={{
        width: '31%',
        aspectRatio: 1,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: BRAND.waxPaper,
        borderWidth: 2,
        borderColor: BRAND.border,
      }}
    >
      {url ? (
        <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 96 }}>🧀</Text>
        </View>
      )}
    </View>
  );
}

export default function ProfileCard({
  userName,
  userHandle,
  userAvatarUrl,
  userId,
  cheeseCount = 0,
  countryCount = 0,
  topFamily,
  topStyle,
  topCountry,
  tagline,
  topCheesePhotos = [],
  vanityUrl,
}: ProfileCardProps) {
  const seed = `${userId ?? 'anon'}|profile`;
  const copy = tagline || getProfileCopyVariant(seed, { topStyle, topCountry });
  const tiles = Array.from({ length: 6 }, (_, i) => topCheesePhotos[i]);
  const displayName = userName || (userHandle ? `@${userHandle}` : 'Cheese fan');
  const title = `${displayName.split(/\s+/)[0]}'s cheese board`;

  const statPieces: string[] = [];
  if (cheeseCount) statPieces.push(`${cheeseCount} cheeses`);
  if (countryCount) statPieces.push(`${countryCount} countries`);
  if (topFamily) statPieces.push(`top: ${topFamily}`);
  const statStrip = statPieces.join(' · ');

  const followHandle = vanityUrl ? `@${vanityUrl}` : userHandle ? `@${userHandle}` : 'Cheezus';

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
      {/* Header */}
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24 }}>
          {userAvatarUrl ? (
            <Image
              source={{ uri: userAvatarUrl }}
              style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: BRAND.waxPaper }}
            />
          ) : (
            <View
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: BRAND.gold,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: FONTS.display, fontSize: 56, color: BRAND.ink }}>
                {displayName[0]?.toUpperCase() ?? '🧀'}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: FONTS.display,
                fontSize: 64,
                lineHeight: 72,
                color: BRAND.text,
                letterSpacing: -1,
              }}
              numberOfLines={2}
            >
              {title}
            </Text>
          </View>
        </View>
      </View>

      {/* 3x2 grid */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 20,
          justifyContent: 'space-between',
        }}
      >
        {tiles.map((url, i) => (
          <GridTile key={i} url={url} />
        ))}
      </View>

      {/* Stats + tagline + CTA */}
      <View style={{ gap: 24 }}>
        {statStrip ? (
          <Text
            style={{
              fontFamily: FONTS.bodySemiBold,
              fontSize: 34,
              color: BRAND.textSubtle,
              letterSpacing: 0.5,
            }}
            numberOfLines={1}
          >
            {statStrip}
          </Text>
        ) : null}

        <Text
          style={{
            fontFamily: FONTS.display,
            fontSize: 52,
            lineHeight: 60,
            color: BRAND.text,
            letterSpacing: -0.5,
          }}
          numberOfLines={3}
        >
          {copy}
        </Text>

        <View
          style={{
            backgroundColor: BRAND.gold,
            paddingVertical: 36,
            borderRadius: 28,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: FONTS.display,
              fontSize: 44,
              color: BRAND.ink,
              letterSpacing: -0.5,
            }}
          >
            Follow {followHandle} on Cheezus
          </Text>
          <Text
            style={{
              fontFamily: FONTS.body,
              fontSize: 26,
              color: BRAND.ink,
              marginTop: 6,
              opacity: 0.7,
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
