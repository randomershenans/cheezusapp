import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';
import { MAPBOX_ACCESS_TOKEN, MAP_STYLES } from '@/constants/Mapbox';
import type { CountryCount } from '@/lib/profile-service';
import { COUNTRY_CENTROIDS, findCentroid, TOTAL_COUNTRIES_IN_WORLD } from '@/lib/country-centroids';

// Conditional dynamic import — same pattern as CheeseMap. @rnmapbox/maps
// needs native code; on web or Expo Go we fall back to a list.
let MapboxGL: any = null;
let mapboxAvailable = false;
if (Platform.OS !== 'web') {
  try {
    MapboxGL = require('@rnmapbox/maps').default;
    MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);
    mapboxAvailable = true;
  } catch {
    mapboxAvailable = false;
  }
}

type Props = {
  countries: CountryCount[];
};

type MapDot = { name: string; count: number; lat: number; lng: number };

const MAP_ASPECT_RATIO = 16 / 10;

export default function PassportMap({ countries }: Props) {
  const [selected, setSelected] = useState<MapDot | null>(null);
  const cameraRef = useRef<any>(null);

  const { loggedDots, totalLogged } = useMemo(() => {
    const dots: MapDot[] = [];
    for (const c of countries) {
      const centroid = findCentroid(c.country);
      if (!centroid) continue;
      dots.push({ name: centroid.name, count: c.count, lat: centroid.lat, lng: centroid.lng });
    }
    return { loggedDots: dots, totalLogged: countries.length };
  }, [countries]);

  // Fit camera to the bounds of the user's countries, with a sensible default
  // when they have zero countries yet.
  const cameraProps = useMemo(() => {
    if (loggedDots.length === 0) {
      return {
        centerCoordinate: [10, 30], // roughly centered on Europe+Africa
        zoomLevel: 0.2,
      };
    }
    if (loggedDots.length === 1) {
      return {
        centerCoordinate: [loggedDots[0].lng, loggedDots[0].lat],
        zoomLevel: 3,
      };
    }
    const lats = loggedDots.map((d) => d.lat);
    const lngs = loggedDots.map((d) => d.lng);
    const ne: [number, number] = [Math.max(...lngs), Math.max(...lats)];
    const sw: [number, number] = [Math.min(...lngs), Math.min(...lats)];
    return {
      bounds: {
        ne,
        sw,
        paddingLeft: 40,
        paddingRight: 40,
        paddingTop: 40,
        paddingBottom: 40,
      },
    } as any;
  }, [loggedDots]);

  const renderFallback = () => (
    <View style={styles.fallbackCard}>
      <Text style={styles.fallbackTitle}>Countries stamped</Text>
      {loggedDots.length === 0 ? (
        <Text style={styles.fallbackBody}>
          Your passport is empty — log a cheese to start stamping it.
        </Text>
      ) : (
        <View style={styles.fallbackList}>
          {loggedDots.slice(0, 12).map((d) => (
            <View key={d.name} style={styles.fallbackChip}>
              <Text style={styles.fallbackChipName}>{d.name}</Text>
              <Text style={styles.fallbackChipCount}>{d.count}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
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
        {!mapboxAvailable ? (
          renderFallback()
        ) : (
          <>
            <MapboxGL.MapView
              style={StyleSheet.absoluteFill}
              styleURL={MAP_STYLES.light}
              logoEnabled={false}
              attributionEnabled={false}
              compassEnabled={false}
              scaleBarEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              zoomEnabled
              scrollEnabled
            >
              <MapboxGL.Camera
                ref={cameraRef}
                animationMode="flyTo"
                animationDuration={800}
                {...cameraProps}
              />

              {loggedDots.map((d) => {
                const size = 18 + Math.min(26, Math.log2(d.count + 1) * 7);
                return (
                  <MapboxGL.MarkerView
                    key={d.name}
                    coordinate={[d.lng, d.lat]}
                    anchor={{ x: 0.5, y: 0.5 }}
                  >
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => setSelected(d)}
                      style={[
                        styles.dot,
                        {
                          width: size,
                          height: size,
                          borderRadius: size / 2,
                        },
                      ]}
                    >
                      <Text style={[styles.dotCount, { fontSize: Math.max(10, size * 0.42) }]}>
                        {d.count}
                      </Text>
                    </TouchableOpacity>
                  </MapboxGL.MarkerView>
                );
              })}
            </MapboxGL.MapView>

            {selected ? (
              <TouchableOpacity
                activeOpacity={1}
                style={styles.tooltipBackdrop}
                onPress={() => setSelected(null)}
              >
                <View style={styles.tooltip}>
                  <Text style={styles.tooltipCountry}>{selected.name}</Text>
                  <Text style={styles.tooltipCount}>
                    {selected.count} {selected.count === 1 ? 'cheese' : 'cheeses'}
                  </Text>
                  <Text style={styles.tooltipClose}>Tap anywhere to close</Text>
                </View>
              </TouchableOpacity>
            ) : null}
          </>
        )}
      </View>

      {mapboxAvailable && totalLogged > 0 ? (
        <Text style={styles.hint}>Tap a gold pin for country details.</Text>
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
    aspectRatio: MAP_ASPECT_RATIO,
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
  // Marker dot (gold, sized by count)
  dot: {
    backgroundColor: '#FCD95B',
    borderWidth: 2,
    borderColor: '#8B6914',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 3,
    elevation: 3,
  },
  dotCount: {
    color: '#1F2937',
    fontFamily: Typography.fonts.bodyBold,
  },
  // Tooltip
  tooltipBackdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.12)',
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
  // Web / Expo Go fallback
  fallbackCard: {
    ...StyleSheet.absoluteFillObject,
    padding: Layout.spacing.m,
    backgroundColor: '#FFFEF7',
    justifyContent: 'center',
  },
  fallbackTitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyBold,
    color: Colors.text,
    marginBottom: Layout.spacing.s,
  },
  fallbackBody: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.textSecondary,
  },
  fallbackList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  fallbackChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FCD95B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  fallbackChipName: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodyBold,
    color: '#1F2937',
  },
  fallbackChipCount: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: '#1F2937',
  },
});
