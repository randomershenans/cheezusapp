import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Polygon, Circle, Line, Text as SvgText, G, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';
import { TASTE_FINGERPRINT_AXES } from '@/constants/FlavorTags';
import type { FlavorFingerprint } from '@/lib/profile-service';

type Props = {
  fingerprint: FlavorFingerprint;
  cheeseCount: number;
};

const SIZE = 260;
const CENTER = SIZE / 2;
const MAX_RADIUS = 95;
const RINGS = 4;

export default function TasteFingerprint({ fingerprint, cheeseCount }: Props) {
  // Normalize counts to [0, 1] for plotting. If user has no ≥4-star cheeses
  // in these axes yet, show an empty state instead of a collapsed dot.
  const hasData = useMemo(
    () => Object.values(fingerprint).some((v) => (v ?? 0) > 0),
    [fingerprint]
  );

  const { points, topTag } = useMemo(() => {
    const maxCount = Math.max(1, ...TASTE_FINGERPRINT_AXES.map((a) => fingerprint[a] ?? 0));
    const axisPoints: { x: number; y: number; value: number; axis: string }[] = TASTE_FINGERPRINT_AXES.map((axis, i) => {
      const angle = (Math.PI * 2 * i) / TASTE_FINGERPRINT_AXES.length - Math.PI / 2;
      const value = (fingerprint[axis] ?? 0) / maxCount;
      const r = value * MAX_RADIUS;
      return {
        x: CENTER + Math.cos(angle) * r,
        y: CENTER + Math.sin(angle) * r,
        value,
        axis,
      };
    });
    const top = TASTE_FINGERPRINT_AXES.reduce<{ tag: string; count: number }>(
      (best, axis) => {
        const c = fingerprint[axis] ?? 0;
        return c > best.count ? { tag: axis, count: c } : best;
      },
      { tag: '', count: 0 }
    );
    return { points: axisPoints, topTag: top.tag };
  }, [fingerprint]);

  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Taste Fingerprint</Text>
        <Text style={styles.subtitle}>
          {hasData
            ? `Strongest note: ${topTag}`
            : cheeseCount === 0
              ? 'Log and rate cheeses to reveal your taste.'
              : 'Rate a few cheeses 4★+ to reveal your taste.'}
        </Text>
      </View>

      <View style={styles.chartWrapper}>
        <Svg width={SIZE} height={SIZE}>
          <Defs>
            <SvgLinearGradient id="fingerprintFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%"  stopColor="#FCD95B" stopOpacity="0.55" />
              <Stop offset="100%" stopColor="#EAB308" stopOpacity="0.35" />
            </SvgLinearGradient>
          </Defs>

          {/* Concentric rings */}
          {Array.from({ length: RINGS }, (_, i) => {
            const r = ((i + 1) / RINGS) * MAX_RADIUS;
            return (
              <Circle
                key={`ring-${i}`}
                cx={CENTER}
                cy={CENTER}
                r={r}
                fill="none"
                stroke={Colors.border}
                strokeWidth={1}
                strokeDasharray={i === RINGS - 1 ? '0' : '3,3'}
              />
            );
          })}

          {/* Axis spokes */}
          {TASTE_FINGERPRINT_AXES.map((_axis, i) => {
            const angle = (Math.PI * 2 * i) / TASTE_FINGERPRINT_AXES.length - Math.PI / 2;
            const x2 = CENTER + Math.cos(angle) * MAX_RADIUS;
            const y2 = CENTER + Math.sin(angle) * MAX_RADIUS;
            return (
              <Line
                key={`spoke-${i}`}
                x1={CENTER}
                y1={CENTER}
                x2={x2}
                y2={y2}
                stroke={Colors.border}
                strokeWidth={1}
              />
            );
          })}

          {/* Filled fingerprint polygon */}
          {hasData ? (
            <Polygon
              points={polygonPoints}
              fill="url(#fingerprintFill)"
              stroke="#EAB308"
              strokeWidth={2}
              strokeLinejoin="round"
            />
          ) : null}

          {/* Axis value dots */}
          {hasData
            ? points.map((p, i) => (
                <Circle key={`dot-${i}`} cx={p.x} cy={p.y} r={3.5} fill="#EAB308" />
              ))
            : null}

          {/* Axis labels */}
          <G>
            {TASTE_FINGERPRINT_AXES.map((axis, i) => {
              const angle = (Math.PI * 2 * i) / TASTE_FINGERPRINT_AXES.length - Math.PI / 2;
              const labelR = MAX_RADIUS + 18;
              const x = CENTER + Math.cos(angle) * labelR;
              const y = CENTER + Math.sin(angle) * labelR;
              return (
                <SvgText
                  key={`label-${i}`}
                  x={x}
                  y={y}
                  fontSize={12}
                  fontWeight="700"
                  fill={Colors.text}
                  textAnchor="middle"
                  alignmentBaseline="middle"
                >
                  {axis}
                </SvgText>
              );
            })}
          </G>
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Layout.spacing.xl,
    paddingHorizontal: Layout.spacing.m,
  },
  header: {
    marginBottom: Layout.spacing.m,
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.heading,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  chartWrapper: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.m,
    backgroundColor: '#FFFEF7',
    borderRadius: Layout.borderRadius.large,
    ...Layout.shadow.small,
  },
});
