import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import Svg, { Circle, Rect, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';
import type { CountryCount } from '@/lib/profile-service';
import { COUNTRY_CENTROIDS, findCentroid, TOTAL_COUNTRIES_IN_WORLD } from '@/lib/country-centroids';

type Props = {
  countries: CountryCount[];
};

// Map viewBox — trimmed to exclude Antarctic & high Arctic.
const MAP_WIDTH = 360;
const MAP_HEIGHT = 180;
const LNG_MIN = -170;
const LNG_MAX = 180;
const LAT_MIN = -50;
const LAT_MAX = 75;

const project = (lat: number, lng: number) => {
  const x = ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * MAP_WIDTH;
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * MAP_HEIGHT;
  return { x, y };
};

const dotRadius = (count: number) => {
  // log scale so 1 and 20 are both visible without a single country dominating
  return 3 + Math.min(9, Math.log2(count + 1) * 2.2);
};

export default function PassportMap({ countries }: Props) {
  const [selected, setSelected] = useState<{ country: string; count: number } | null>(null);

  const { loggedByName, loggedDots, totalLogged } = useMemo(() => {
    const byName: Record<string, number> = {};
    for (const c of countries) {
      byName[c.country.toLowerCase()] = c.count;
    }

    const dots: { x: number; y: number; r: number; name: string; count: number }[] = [];
    for (const c of countries) {
      const centroid = findCentroid(c.country);
      if (!centroid) continue;
      const { x, y } = project(centroid.lat, centroid.lng);
      dots.push({ x, y, r: dotRadius(c.count), name: centroid.name, count: c.count });
    }
    return { loggedByName: byName, loggedDots: dots, totalLogged: countries.length };
  }, [countries]);

  const unloggedCentroids = useMemo(
    () =>
      COUNTRY_CENTROIDS.filter(
        (c) =>
          !(c.name.toLowerCase() in loggedByName) &&
          !(c.aliases?.some((a) => a.toLowerCase() in loggedByName))
      ).map((c) => {
        const { x, y } = project(c.lat, c.lng);
        return { x, y, name: c.name };
      }),
    [loggedByName]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Passport</Text>
        <Text style={styles.subtitle}>
          {totalLogged > 0
            ? `${totalLogged} of ${TOTAL_COUNTRIES_IN_WORLD} countries stamped`
            : 'Log cheeses to start stamping your passport.'}
        </Text>
      </View>

      <View style={styles.mapCard}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}>
          <Defs>
            <SvgLinearGradient id="mapBg" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%"  stopColor="#FFFEF7" />
              <Stop offset="100%" stopColor="#FAF5E8" />
            </SvgLinearGradient>
            <SvgLinearGradient id="dotGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%"  stopColor="#FCD95B" />
              <Stop offset="100%" stopColor="#EAB308" />
            </SvgLinearGradient>
          </Defs>

          <Rect x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#mapBg)" rx={12} />

          {/* Unlogged countries — ghost dots */}
          {unloggedCentroids.map((c) => (
            <Circle
              key={`ghost-${c.name}`}
              cx={c.x}
              cy={c.y}
              r={2}
              fill={Colors.border}
              opacity={0.5}
            />
          ))}

          {/* Logged countries — gold dots, sized by count */}
          {loggedDots.map((d) => (
            <Circle
              key={`logged-${d.name}`}
              cx={d.x}
              cy={d.y}
              r={d.r}
              fill="url(#dotGrad)"
              stroke="#8B6914"
              strokeWidth={0.8}
              opacity={0.95}
              onPress={() => setSelected({ country: d.name, count: d.count })}
            />
          ))}
        </Svg>

        {selected ? (
          <TouchableOpacity
            activeOpacity={1}
            style={styles.tooltipBackdrop}
            onPress={() => setSelected(null)}
          >
            <View style={styles.tooltip}>
              <Text style={styles.tooltipCountry}>{selected.country}</Text>
              <Text style={styles.tooltipCount}>
                {selected.count} {selected.count === 1 ? 'cheese' : 'cheeses'}
              </Text>
              <Text style={styles.tooltipClose}>Tap to close</Text>
            </View>
          </TouchableOpacity>
        ) : null}
      </View>

      {totalLogged > 0 ? (
        <Text style={styles.hint}>Tap a gold dot for country details.</Text>
      ) : null}
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
  mapCard: {
    aspectRatio: MAP_WIDTH / MAP_HEIGHT,
    borderRadius: Layout.borderRadius.large,
    overflow: 'hidden',
    backgroundColor: '#FFFEF7',
    ...Layout.shadow.small,
  },
  hint: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    textAlign: 'center',
    marginTop: Layout.spacing.s,
  },
  tooltipBackdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(252, 217, 91, 0.08)',
  },
  tooltip: {
    backgroundColor: '#2C3E50',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
    borderRadius: Layout.borderRadius.medium,
    alignItems: 'center',
    minWidth: 160,
    ...Layout.shadow.medium,
  },
  tooltipCountry: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyBold,
    color: '#FCD95B',
  },
  tooltipCount: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: '#FFF',
    marginTop: 2,
  },
  tooltipClose: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 6,
  },
});
