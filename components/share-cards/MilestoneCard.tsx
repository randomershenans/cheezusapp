import React from 'react';
import { View, Text, Image } from 'react-native';
import { BRAND, FONTS, STORIES_WIDTH, STORIES_HEIGHT, pickVariant } from './shared';

export interface MilestoneCardProps {
  milestone: number;
  cheesePhotos?: Array<{ url: string | null; name?: string | null }>;
  userName?: string | null;
  userHandle?: string | null;
  userAvatarUrl?: string | null;
  userId?: string | null;
}

const TAGLINES: Record<number, readonly string[]> = {
  5: ['Just getting started.', 'Five down, a world to go.', 'The journey begins.'],
  10: ['Double digits — nice taste.', 'Ten-piece board, curated.', 'Officially a regular.'],
  25: [
    'Officially a connoisseur.',
    'A true cheese explorer.',
    'Twenty-five and counting.',
  ],
  50: [
    'Half a century of cheeses.',
    'Fifty deep. No notes.',
    'Mongering-level commitment.',
  ],
  100: [
    '100 cheeses. I am built different.',
    'Hall of Fame.',
    'Three digits, one obsession.',
  ],
};

const DEFAULT_TAGLINES = [
  'Another milestone. Another wedge.',
  'One more for the cheese board.',
];

export function getMilestoneCopyVariant(seed: string, milestone: number): string {
  const set = TAGLINES[milestone] ?? DEFAULT_TAGLINES;
  return pickVariant(seed, set);
}

function PhotoTile({ url }: { url: string | null | undefined }) {
  return (
    <View
      style={{
        flex: 1,
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

export default function MilestoneCard({
  milestone,
  cheesePhotos = [],
  userName,
  userHandle,
  userAvatarUrl,
  userId,
}: MilestoneCardProps) {
  const seed = `${userId ?? 'anon'}|milestone|${milestone}`;
  const tagline = getMilestoneCopyVariant(seed, milestone);
  const tiles = [0, 1, 2, 3].map((i) => cheesePhotos[i] ?? { url: null });

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
      {/* Hero row: giant numeral + 2x2 grid */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 48,
          flex: 1,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: FONTS.display,
              fontSize: 420,
              lineHeight: 420,
              color: BRAND.text,
              letterSpacing: -12,
              // Simulate wax-paper texture via subtle shadow
              textShadowColor: 'rgba(234,179,8,0.25)',
              textShadowOffset: { width: 6, height: 8 },
              textShadowRadius: 0,
            }}
          >
            {milestone}
          </Text>
          <Text
            style={{
              fontFamily: FONTS.bodyMedium,
              fontSize: 44,
              color: BRAND.textSubtle,
              marginTop: -20,
            }}
          >
            cheeses logged
          </Text>
        </View>

        <View style={{ width: 400, gap: 16 }}>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <PhotoTile url={tiles[0].url} />
            <PhotoTile url={tiles[1].url} />
          </View>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <PhotoTile url={tiles[2].url} />
            <PhotoTile url={tiles[3].url} />
          </View>
        </View>
      </View>

      {/* Tagline + gold accent block */}
      <View>
        <View
          style={{
            backgroundColor: BRAND.gold,
            paddingVertical: 40,
            paddingHorizontal: 48,
            borderRadius: 32,
            marginBottom: 32,
          }}
        >
          <Text
            style={{
              fontFamily: FONTS.display,
              fontSize: 68,
              lineHeight: 76,
              color: BRAND.ink,
              letterSpacing: -1,
            }}
            numberOfLines={2}
          >
            {tagline}
          </Text>
        </View>

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
