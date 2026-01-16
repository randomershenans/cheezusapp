import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { MapPin, Store, Factory, Navigation, X, Slice } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';
import { MAPBOX_ACCESS_TOKEN, MAP_STYLES, DEFAULT_MAP_CENTER, DEFAULT_ZOOM } from '@/constants/Mapbox';

// Conditionally import Mapbox - it doesn't work on web or Expo Go
let MapboxGL: any = null;
let mapboxAvailable = false;

if (Platform.OS !== 'web') {
  try {
    MapboxGL = require('@rnmapbox/maps').default;
    MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);
    mapboxAvailable = true;
  } catch (e) {
    console.log('Mapbox native code not available - using fallback');
    mapboxAvailable = false;
  }
}

export type MapMarker = {
  id: string;
  type: 'shop' | 'producer' | 'cheese';
  name: string;
  latitude: number;
  longitude: number;
  image_url?: string;
  address?: string;
  distance_km?: number;
  producer_name?: string; // For cheeses
};

export type MapRegion = {
  latitude: number;
  longitude: number;
  zoomLevel: number;
  visibleRadius: number; // approximate radius in km
};

type Props = {
  markers?: MapMarker[];
  onMarkerPress?: (marker: MapMarker) => void;
  onRegionChange?: (region: MapRegion) => void;
  showUserLocation?: boolean;
  initialCenter?: { latitude: number; longitude: number };
  initialZoom?: number;
  style?: any;
};

export default function CheeseMap({
  markers = [],
  onMarkerPress,
  onRegionChange,
  showUserLocation = true,
  initialCenter,
  initialZoom = DEFAULT_ZOOM,
  style,
}: Props) {
  const router = useRouter();
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const mapRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (showUserLocation) {
      requestLocationPermission();
    } else {
      setLoading(false);
    }
  }, [showUserLocation]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied');
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting location:', error);
      setLocationError('Could not get location');
    } finally {
      setLoading(false);
    }
  };

  const centerOnUser = () => {
    if (userLocation && cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [userLocation.longitude, userLocation.latitude],
        zoomLevel: 12,
        animationDuration: 1000,
      });
    }
  };

  const handleMarkerPress = (marker: MapMarker) => {
    setSelectedMarker(marker);
    if (onMarkerPress) {
      onMarkerPress(marker);
    }
  };

  const navigateToDetail = () => {
    if (!selectedMarker) return;
    
    if (selectedMarker.type === 'shop') {
      router.push(`/shop/${selectedMarker.id}`);
    } else if (selectedMarker.type === 'producer') {
      router.push(`/producer/${selectedMarker.id}`);
    } else if (selectedMarker.type === 'cheese') {
      router.push(`/producer-cheese/${selectedMarker.id}`);
    }
    setSelectedMarker(null);
  };

  const getMarkerColor = (type: 'shop' | 'producer' | 'cheese') => {
    if (type === 'shop') return Colors.primary;
    if (type === 'producer') return '#4CAF50';
    return '#FFA726'; // Orange for cheeses
  };

  const center = initialCenter || userLocation || DEFAULT_MAP_CENTER;

  // Fallback - show placeholder when Mapbox not available (web or Expo Go)
  if (Platform.OS === 'web' || !mapboxAvailable) {
    return (
      <View style={[styles.container, styles.webFallback, style]}>
        <MapPin size={48} color={Colors.subtleText} />
        <Text style={styles.webFallbackText}>
          {Platform.OS === 'web' ? 'Map view available on mobile' : 'Map requires a development build'}
        </Text>
        <Text style={styles.webFallbackSubtext}>
          {Platform.OS === 'web' 
            ? 'Download the Cheezus app to discover cheese near you'
            : 'Run "npx expo prebuild && npx expo run:ios" to enable maps'}
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, style]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Finding your location...</Text>
      </View>
    );
  }

  // Calculate approximate visible radius based on zoom level
  const getVisibleRadius = (zoom: number): number => {
    // At zoom 0, world is ~40000km wide; each zoom level halves the view
    // Approximate radius = 20000 / 2^zoom
    return Math.min(20000 / Math.pow(2, zoom), 5000);
  };

  const handleRegionChange = async () => {
    if (!onRegionChange || !mapRef.current) return;
    
    try {
      const center = await mapRef.current.getCenter();
      const zoom = await mapRef.current.getZoom();
      
      if (center && zoom !== undefined) {
        onRegionChange({
          latitude: center[1],
          longitude: center[0],
          zoomLevel: zoom,
          visibleRadius: getVisibleRadius(zoom),
        });
      }
    } catch (e) {
      // Ignore errors during rapid panning
    }
  };

  return (
    <View style={[styles.container, style]}>
      <MapboxGL.MapView
        ref={mapRef}
        style={styles.map}
        styleURL={MAP_STYLES.streets}
        logoEnabled={false}
        attributionEnabled={false}
        onMapIdle={handleRegionChange}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          zoomLevel={initialZoom}
          centerCoordinate={[center.longitude, center.latitude]}
          animationMode="flyTo"
          animationDuration={1000}
        />

        {showUserLocation && userLocation && (
          <MapboxGL.UserLocation visible={true} />
        )}

        {markers.map((marker) => (
          <MapboxGL.MarkerView
            key={`${marker.type}-${marker.id}`}
            coordinate={[marker.longitude, marker.latitude]}
            anchor={{ x: 0.5, y: 1 }}
          >
            <TouchableOpacity
              onPress={() => handleMarkerPress(marker)}
              style={[
                styles.markerContainer,
                selectedMarker?.id === marker.id && styles.markerSelected,
              ]}
            >
              <Image
                source={{ 
                  uri: marker.image_url || (
                    marker.type === 'cheese' 
                      ? 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=100&h=100&fit=crop'
                      : marker.type === 'producer'
                        ? 'https://images.unsplash.com/photo-1559561853-08451507cbe7?w=100&h=100&fit=crop'
                        : 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=100&h=100&fit=crop'
                  )
                }}
                style={[
                  styles.markerImage,
                  { borderColor: getMarkerColor(marker.type) },
                ]}
              />
              <View style={[styles.markerPointer, { borderTopColor: getMarkerColor(marker.type) }]} />
            </TouchableOpacity>
          </MapboxGL.MarkerView>
        ))}
      </MapboxGL.MapView>

      {/* Center on user button */}
      {userLocation && (
        <TouchableOpacity style={styles.centerButton} onPress={centerOnUser}>
          <Navigation size={20} color={Colors.primary} />
        </TouchableOpacity>
      )}

      {/* Selected marker card */}
      {selectedMarker && (
        <View style={styles.markerCard}>
          <TouchableOpacity
            style={styles.markerCardClose}
            onPress={() => setSelectedMarker(null)}
          >
            <X size={16} color={Colors.subtleText} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.markerCardContent} onPress={navigateToDetail}>
            <Image
              source={{ 
                uri: selectedMarker.image_url || (
                  selectedMarker.type === 'cheese' 
                    ? 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=200&h=200&fit=crop'
                    : selectedMarker.type === 'producer'
                      ? 'https://images.unsplash.com/photo-1559561853-08451507cbe7?w=200&h=200&fit=crop'
                      : 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=200&h=200&fit=crop'
                )
              }}
              style={styles.markerCardImage}
            />

            <View style={styles.markerCardInfo}>
              <View style={styles.markerCardBadge}>
                {selectedMarker.type === 'shop' ? (
                  <Store size={12} color={Colors.primary} />
                ) : selectedMarker.type === 'producer' ? (
                  <Factory size={12} color="#4CAF50" />
                ) : (
                  <Slice size={12} color="#FFA726" />
                )}
                <Text style={styles.markerCardBadgeText}>
                  {selectedMarker.type === 'shop' ? 'Shop' : selectedMarker.type === 'producer' ? 'Producer' : 'Cheese'}
                </Text>
              </View>

              <Text style={styles.markerCardName} numberOfLines={1}>
                {selectedMarker.name}
              </Text>

              {selectedMarker.producer_name && selectedMarker.type === 'cheese' && (
                <Text style={styles.markerCardAddress} numberOfLines={1}>
                  by {selectedMarker.producer_name}
                </Text>
              )}

              {selectedMarker.address && selectedMarker.type !== 'cheese' && (
                <Text style={styles.markerCardAddress} numberOfLines={1}>
                  {selectedMarker.address}
                </Text>
              )}

              {selectedMarker.distance_km !== undefined && (
                <Text style={styles.markerCardDistance}>
                  {selectedMarker.distance_km < 1
                    ? `${Math.round(selectedMarker.distance_km * 1000)}m away`
                    : `${selectedMarker.distance_km.toFixed(1)}km away`}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Location error */}
      {locationError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{locationError}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Layout.spacing.m,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  webFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    padding: Layout.spacing.xl,
  },
  webFallbackText: {
    marginTop: Layout.spacing.m,
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
  },
  webFallbackSubtext: {
    marginTop: Layout.spacing.s,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    textAlign: 'center',
  },

  // Markers
  markerContainer: {
    alignItems: 'center',
  },
  markerImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: Colors.primary,
    backgroundColor: Colors.backgroundSecondary,
    ...Layout.shadow.medium,
  },
  markerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.background,
    ...Layout.shadow.medium,
  },
  markerPointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.primary,
    marginTop: -2,
  },
  markerSelected: {
    transform: [{ scale: 1.15 }],
  },

  // Center button
  centerButton: {
    position: 'absolute',
    bottom: 120,
    right: Layout.spacing.m,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...Layout.shadow.medium,
  },

  // Marker card
  markerCard: {
    position: 'absolute',
    bottom: Layout.spacing.m,
    left: Layout.spacing.m,
    right: Layout.spacing.m,
    backgroundColor: Colors.card,
    borderRadius: Layout.borderRadius.large,
    padding: Layout.spacing.m,
    ...Layout.shadow.large,
  },
  markerCardClose: {
    position: 'absolute',
    top: Layout.spacing.s,
    right: Layout.spacing.s,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  markerCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  markerCardImage: {
    width: 70,
    height: 70,
    borderRadius: Layout.borderRadius.medium,
    marginRight: Layout.spacing.m,
  },
  markerCardImagePlaceholder: {
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerCardInfo: {
    flex: 1,
  },
  markerCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  markerCardBadgeText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.subtleText,
    textTransform: 'uppercase',
  },
  markerCardName: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
    marginBottom: 2,
  },
  markerCardAddress: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  markerCardDistance: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.primary,
    marginTop: 4,
  },

  // Error
  errorBanner: {
    position: 'absolute',
    top: Layout.spacing.m,
    left: Layout.spacing.m,
    right: Layout.spacing.m,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
  },
  errorText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.background,
    textAlign: 'center',
  },
});
