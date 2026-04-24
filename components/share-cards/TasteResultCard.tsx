import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Polygon, Polyline, Circle, Line, G } from 'react-native-svg';
import { BRAND, FONTS, STORIES_WIDTH, STORIES_HEIGHT, pickVariant } from './shared';
import { TASTE_FINGERPRINT_AXES } from '@/constants/FlavorTags';

export interface TasteResultCardProps {
  tagline: string;
  flavorTags: string[];
  fingerprint: Record<string, number>;
  userName?: string | null;
  userHandle?: string | null;
  userId?: string | null;
}

const HEADLINE_VARIANTS = [
  'Your cheese taste',
  'Your flavor fingerprint',
  "Here's your cheese vibe",
] as const;

export function getTasteResultCopyVariant(seed: string): string {
  return pickVariant(seed, HEADLINE_VARIANTS);
}

function Radar({ fingerprint }: { fingerprint: Record<string, number> }) {
  const axes = TASTE_FINGERPRINT_AXES;
  const cx = 300;
  const cy = 300;
  const maxR = 240;
  const sides = axes.length;

  const polarToXY = (radius: number, idx: number) => {
    const angle = (Math.PI * 2 * idx) / sides - Math.PI / 2;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)] as const;
  };

  // background rings
  const rings = [0.25, 0.5, 0.75, 1].map((scale) => {
    const pts = axes.map((_, i) => polarToXY(maxR * scale, i));
    return pts.map((p) => p.join(',')).join(' ');
  });

  // radial spokes
  const spokes = axes.map((_, i) => {
    const [x, y] = polarToXY(maxR, i);
    return { x, y };
  });

  // data polygon
  const dataPts = axes
    .map((axis, i) => {
      const raw = fingerprint[axis] ?? 0;
      // Treat values either 0-1 or 0-100 gracefully
      const norm = raw > 1 ? Math.min(1, raw / 100) : Math.max(0, Math.min(1, raw));
      return polarToXY(Math.max(0.08, norm) * maxR, i);
    })
    .map((p) => p.join(','))
    .join(' ');

  return (
    <Svg width={600} height={600}>
      <G>
        {rings.map((points, i) => (
          <Polyline
            key={i}
            points={`${points} ${points.split(' ')[0]}`}
            stroke={'rgba(44,62,80,0.15)'}
            strokeWidth={2}
            fill="none"
          />
        ))}
        {spokes.map((s, i) => (
          <Line
            key={i}
            x1={cx}
            y1={cy}
            x2={s.x}
            y2={s.y}
            stroke={'rgba(44,62,80,0.10)'}
            strokeWidth={1.5}
          />
        ))}
        <Polygon
          points={dataPts}
          fill={BRAND.gold}
          fillOpacity={0.55}
          stroke={BRAND.goldDeep}
          strokeWidth={4}
        />
        {spokes.map((s, i) => (
          <Circle key={i} cx={s.x} cy={s.y} r={6} fill={BRAND.text} />
        ))}
      </G>
    </Svg>
  );
}

export default function TasteResultCard({
  tagline,
  flavorTags,
  fingerprint,
  userName,
  userHandle,
  userId,
}: TasteResultCardProps) {
  const seed = `${userId ?? 'anon'}|taste_result`;
  const headline = getTasteResultCopyVariant(seed);
  const topTags = (flavorTags || []).slice(0, 3);

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
      <View style={{ gap: 16 }}>
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
        <Text
          style={{
            fontFamily: FONTS.display,
            fontSize: 76,
            lineHeight: 84,
            color: BRAND.text,
            letterSpacing: -1,
          }}
          numberOfLines={4}
        >
          {tagline}
        </Text>
      </View>

      <View style={{ alignItems: 'center' }}>
        <Radar fingerprint={fingerprint} />
      </View>

      <View style={{ gap: 32 }}>
        {/* Flavor pills */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 20,
            justifyContent: 'center',
          }}
        >
          {topTags.map((tag) => (
            <View
              key={tag}
              style={{
                backgroundColor: BRAND.gold,
                paddingVertical: 20,
                paddingHorizontal: 40,
                borderRadius: 60,
                borderWidth: 3,
                borderColor: BRAND.goldDeep,
              }}
            >
              <Text
                style={{
                  fontFamily: FONTS.bodySemiBold,
                  fontSize: 38,
                  color: BRAND.ink,
                  letterSpacing: 0.5,
                }}
              >
                {tag}
              </Text>
            </View>
          ))}
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text
            style={{ fontFamily: FONTS.bodySemiBold, fontSize: 30, color: BRAND.text }}
            numberOfLines={1}
          >
            {userHandle ? `@${userHandle}` : userName ?? ''}
          </Text>
          <Text
            style={{
              fontFamily: FONTS.display,
              fontSize: 32,
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
