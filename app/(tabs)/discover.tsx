import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Platform,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import {
  MapPin,
  Store,
  Factory,
  Map,
  List,
  Navigation,
  ChevronRight,
  Compass,
  Search,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import NotificationBell from '@/components/NotificationBell';
import CheeseMap, { MapMarker, MapRegion } from '@/components/CheeseMap';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

const { width: screenWidth } = Dimensions.get('window');

type NearbyItem = {
  id: string;
  name: string;
  type: 'shop' | 'producer' | 'cheese';
  image_url: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  distance_km?: number;
  is_verified?: boolean;
};

type ViewMode = 'map' | 'list';
type FilterType = 'all' | 'cheeses' | 'producers' | 'shops' | 'events';

const FILTERS: { key: FilterType; label: string; comingSoon?: boolean }[] = [
  { key: 'all', label: 'All' },
  { key: 'cheeses', label: 'Cheeses' },
  { key: 'producers', label: 'Producers' },
  { key: 'shops', label: 'Shops', comingSoon: true },
  { key: 'events', label: 'Events', comingSoon: true },
];

export default function DiscoverScreen() {
  const router = useRouter();
  const { viewMode: viewModeParam, lat, lng } = useLocalSearchParams();
  
  const [viewMode, setViewMode] = useState<ViewMode>(
    viewModeParam === 'map' ? 'map' : 'list'
  );
  const [mapCenter, setMapCenter] = useState<{ latitude: number; longitude: number } | undefined>(
    lat && lng ? { latitude: parseFloat(lat as string), longitude: parseFloat(lng as string) } : undefined
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [nearbyShops, setNearbyShops] = useState<NearbyItem[]>([]);
  const [nearbyProducers, setNearbyProducers] = useState<NearbyItem[]>([]);
  const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([]);
  const [nearbyCheeses, setNearbyCheeses] = useState<NearbyItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filteredMapMarkers = useMemo(() => {
    if (activeFilter === 'all') return mapMarkers;
    const typeMap: Record<FilterType, string> = {
      all: '',
      cheeses: 'cheese',
      producers: 'producer',
      shops: 'shop',
      events: 'event',
    };
    return mapMarkers.filter(m => m.type === typeMap[activeFilter]);
  }, [mapMarkers, activeFilter]);

  useEffect(() => {
    initializeLocation();
  }, []);

  useEffect(() => {
    if (userLocation) {
      fetchNearbyItems();
    }
  }, [userLocation]);

  const initializeLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Enable location to discover cheese near you');
        setLoading(false);
        fetchAllItems();
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
      setLocationError('Could not get your location');
      fetchAllItems();
    } finally {
      setLoading(false);
    }
  };

  const fetchNearbyItems = async () => {
    if (!userLocation) return;

    try {
      // Fetch nearby shops, producers, and cheeses in parallel
      const [shopsRes, producersRes, cheesesRes] = await Promise.all([
        supabase.rpc('find_nearby_shops', {
          p_latitude: userLocation.latitude,
          p_longitude: userLocation.longitude,
          p_radius_km: 100,
        }),
        supabase.rpc('find_nearby_producers', {
          p_latitude: userLocation.latitude,
          p_longitude: userLocation.longitude,
          p_radius_km: 100,
        }),
        supabase.rpc('find_nearby_cheese_types', {
          p_latitude: userLocation.latitude,
          p_longitude: userLocation.longitude,
          p_radius_km: 100,
        }),
      ]);

      const shops = shopsRes.data || [];
      const producers = producersRes.data || [];
      const cheeses = cheesesRes.data || [];

      if (shops.length > 0) {
        setNearbyShops(shops.map((s: any) => ({
          ...s,
          type: 'shop' as const,
        })));
      }

      if (producers.length > 0) {
        setNearbyProducers(producers.map((p: any) => ({
          ...p,
          type: 'producer' as const,
        })));
      }

      if (cheeses.length > 0) {
        setNearbyCheeses(cheeses.map((c: any) => ({
          id: c.producer_cheese_id || c.id,
          name: c.name,
          type: 'cheese' as const,
          image_url: c.image_url,
          address: c.origin_region ? `${c.origin_region}, ${c.origin_country}` : c.origin_country,
          city: c.origin_region,
          country: c.origin_country,
          latitude: c.latitude,
          longitude: c.longitude,
          distance_km: c.distance_km,
        })));
      }

      // Build map markers including cheeses
      const markers: MapMarker[] = [
        ...shops.map((s: any) => ({
          id: s.id,
          type: 'shop' as const,
          name: s.name,
          latitude: s.latitude,
          longitude: s.longitude,
          image_url: s.image_url,
          address: s.address,
          distance_km: s.distance_km,
        })),
        ...producers.map((p: any) => ({
          id: p.id,
          type: 'producer' as const,
          name: p.name,
          latitude: p.latitude,
          longitude: p.longitude,
          image_url: p.image_url,
          address: p.address,
          distance_km: p.distance_km,
        })),
        ...cheeses.map((c: any) => ({
          id: c.producer_cheese_id || c.id,
          type: 'cheese' as const,
          name: c.name,
          latitude: c.latitude,
          longitude: c.longitude,
          image_url: c.image_url,
          address: c.origin_region ? `${c.origin_region}, ${c.origin_country}` : c.origin_country,
          distance_km: c.distance_km,
        })),
      ].filter(m => m.latitude && m.longitude);

      setMapMarkers(markers);
    } catch (error) {
      console.error('Error fetching nearby items:', error);
    }
  };

  const fetchAllItems = async () => {
    try {
      // Fallback: fetch all shops and producers without location filter
      const { data: shops } = await supabase
        .from('shops')
        .select('id, name, image_url, address, city, country, latitude, longitude, is_verified')
        .eq('status', 'active')
        .limit(20);

      if (shops) {
        setNearbyShops(shops.map(s => ({
          ...s,
          type: 'shop' as const,
        })));
      }

      const { data: producers } = await supabase
        .from('producers')
        .select('id, name, image_url, address, country, region, latitude, longitude')
        .limit(20);

      if (producers) {
        setNearbyProducers(producers.map(p => ({
          ...p,
          city: p.region,
          type: 'producer' as const,
        })));
      }
    } catch (error) {
      console.error('Error fetching all items:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (userLocation) {
      await fetchNearbyItems();
    } else {
      await fetchAllItems();
    }
    setRefreshing(false);
  }, [userLocation]);

  const handleItemPress = (item: NearbyItem) => {
    if (item.type === 'shop') {
      router.push(`/shop/${item.id}`);
    } else if (item.type === 'cheese') {
      router.push(`/producer-cheese/${item.id}`);
    } else {
      router.push(`/producer/${item.id}`);
    }
  };

  // Let CheeseMap handle showing preview card - don't navigate directly
  const handleMarkerPress = (marker: MapMarker) => {
    // CheeseMap will show the preview card automatically
    // Navigation happens when user taps the card
  };

  const handleRegionChange = useCallback(async (region: MapRegion) => {
    // Fetch markers for the visible region
    try {
      const radius = Math.max(region.visibleRadius, 50); // Minimum 50km radius
      
      // Fetch shops, producers, and cheeses in visible region
      const [shopsRes, producersRes, cheesesRes] = await Promise.all([
        supabase.rpc('find_nearby_shops', {
          p_latitude: region.latitude,
          p_longitude: region.longitude,
          p_radius_km: radius,
        }),
        supabase.rpc('find_nearby_producers', {
          p_latitude: region.latitude,
          p_longitude: region.longitude,
          p_radius_km: radius,
        }),
        supabase.rpc('find_nearby_cheese_types', {
          p_latitude: region.latitude,
          p_longitude: region.longitude,
          p_radius_km: radius,
        }),
      ]);

      const shops = shopsRes.data || [];
      const producers = producersRes.data || [];
      const cheeses = cheesesRes.data || [];

      // Build markers from results
      const markers: MapMarker[] = [
        ...shops.map((s: any) => ({
          id: s.id,
          type: 'shop' as const,
          name: s.name,
          latitude: s.latitude,
          longitude: s.longitude,
          image_url: s.image_url,
          address: s.address,
          distance_km: s.distance_km,
        })),
        ...producers.map((p: any) => ({
          id: p.id,
          type: 'producer' as const,
          name: p.name,
          latitude: p.latitude,
          longitude: p.longitude,
          image_url: p.image_url,
          address: p.address,
          distance_km: p.distance_km,
        })),
        ...cheeses.map((c: any) => ({
          id: c.producer_cheese_id || c.id, // Use producer_cheese_id if available for navigation
          type: 'cheese' as const,
          name: c.name,
          latitude: c.latitude,
          longitude: c.longitude,
          image_url: c.image_url,
          address: c.origin_region ? `${c.origin_region}, ${c.origin_country}` : c.origin_country,
          distance_km: c.distance_km,
        })),
      ].filter(m => m.latitude && m.longitude);

      setMapMarkers(markers);
    } catch (error) {
      console.error('Error fetching markers for region:', error);
    }
  }, []);

  const useImperial = useMemo(() => {
    try {
      const locale = Intl.DateTimeFormat().resolvedOptions().locale || '';
      return locale.endsWith('-US') || locale === 'en-US';
    } catch {
      return false;
    }
  }, []);

  const formatDistance = (km?: number): string => {
    if (!km) return '';
    if (useImperial) {
      const miles = km * 0.621371;
      if (miles < 0.1) return `${Math.round(miles * 5280)}ft`;
      return `${miles.toFixed(1)}mi`;
    }
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  const renderNearbyCard = (item: NearbyItem) => (
    <TouchableOpacity
      key={`${item.type}-${item.id}`}
      style={styles.nearbyCard}
      onPress={() => handleItemPress(item)}
    >
      <Image
        source={{
          uri: item.image_url || (item.type === 'shop' 
            ? 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?q=80&w=400'
            : 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?q=80&w=400'),
        }}
        style={styles.nearbyCardImage}
      />
      <View style={styles.nearbyCardContent}>
        <View style={styles.nearbyCardBadge}>
          <Text style={styles.nearbyCardBadgeText}>
            {item.type === 'shop' ? 'Shop' : item.type === 'cheese' ? 'Cheese' : 'Producer'}
          </Text>
          {item.is_verified && (
            <View style={styles.verifiedDot} />
          )}
        </View>
        
        <Text style={styles.nearbyCardName} numberOfLines={1}>
          {item.name}
        </Text>
        
        {(item.city || item.country) && (
          <View style={styles.nearbyCardLocation}>
            <MapPin size={12} color={Colors.subtleText} />
            <Text style={styles.nearbyCardLocationText} numberOfLines={1}>
              {[item.city, item.country].filter(Boolean).join(', ')}
            </Text>
          </View>
        )}
        
        {item.distance_km !== undefined && (
          <Text style={styles.nearbyCardDistance}>
            {formatDistance(item.distance_km)} away
          </Text>
        )}
      </View>
      
      <ChevronRight size={20} color={Colors.subtleText} />
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Compass size={64} color={Colors.subtleText} />
      <Text style={styles.emptyTitle}>No places found nearby</Text>
      <Text style={styles.emptySubtitle}>
        {locationError || 'We\'re still growing! Check back soon for cheese shops and producers in your area.'}
      </Text>
      {locationError && (
        <TouchableOpacity style={styles.enableLocationButton} onPress={initializeLocation}>
          <Navigation size={16} color={Colors.background} />
          <Text style={styles.enableLocationText}>Enable Location</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const hasItems = nearbyShops.length > 0 || nearbyProducers.length > 0 || nearbyCheeses.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
        <NotificationBell />
      </View>

      {/* Segmented Toggle */}
      <View style={styles.toggleContainer}>
        <View style={styles.togglePill}>
          <TouchableOpacity
            style={[styles.toggleOption, viewMode === 'map' && styles.toggleOptionActive]}
            onPress={() => setViewMode('map')}
          >
            <Map size={16} color={viewMode === 'map' ? Colors.text : Colors.subtleText} />
            <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>Map</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleOption, viewMode === 'list' && styles.toggleOptionActive]}
            onPress={() => setViewMode('list')}
          >
            <List size={16} color={viewMode === 'list' ? Colors.text : Colors.subtleText} />
            <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>List</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBarScroll}
        contentContainerStyle={styles.filterBar}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterChip,
              activeFilter === f.key && styles.filterChipActive,
              f.comingSoon && styles.filterChipDisabled,
            ]}
            onPress={() => !f.comingSoon && setActiveFilter(f.key)}
            activeOpacity={f.comingSoon ? 1 : 0.7}
          >
            <Text style={[
              styles.filterChipText,
              activeFilter === f.key && styles.filterChipTextActive,
              f.comingSoon && styles.filterChipTextDisabled,
            ]}>
              {f.label}
            </Text>
            {f.comingSoon && (
              <Text style={styles.comingSoonBadge}>Soon</Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
      {/* Main Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Finding cheese near you...</Text>
        </View>
      ) : viewMode === 'map' ? (
        <CheeseMap
          markers={filteredMapMarkers}
          onMarkerPress={handleMarkerPress}
          onRegionChange={handleRegionChange}
          showUserLocation={true}
          initialCenter={mapCenter || userLocation || undefined}
          style={styles.map}
        />
      ) : (
        <ScrollView
          style={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {!hasItems ? (
            renderEmptyState()
          ) : (
            <>
              {/* Shops Section */}
              {(activeFilter === 'all' || activeFilter === 'shops') && nearbyShops.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Cheese Shops</Text>
                    <Text style={styles.sectionCount}>{nearbyShops.length}</Text>
                  </View>
                  {nearbyShops.map(renderNearbyCard)}
                </View>
              )}

              {/* Producers Section */}
              {(activeFilter === 'all' || activeFilter === 'producers') && nearbyProducers.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Producers</Text>
                    <Text style={styles.sectionCount}>{nearbyProducers.length}</Text>
                  </View>
                  {nearbyProducers.map(renderNearbyCard)}
                </View>
              )}

              {/* Cheeses Section */}
              {(activeFilter === 'all' || activeFilter === 'cheeses') && nearbyCheeses.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Cheese Near You</Text>
                    <Text style={styles.sectionCount}>{nearbyCheeses.length}</Text>
                  </View>
                  {nearbyCheeses.map(renderNearbyCard)}
                </View>
              )}
            </>
          )}

          <View style={styles.bottomSpacing} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'web' ? Layout.spacing.m : 0,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
  },
  title: {
    fontSize: Typography.sizes['3xl'],
    fontFamily: Typography.fonts.heading,
    color: Colors.text,
    letterSpacing: Typography.letterSpacing.tight,
  },

  // Segmented Toggle
  toggleContainer: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.s,
  },
  togglePill: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Layout.borderRadius.large,
    padding: 3,
  },
  toggleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Layout.spacing.l,
    paddingVertical: Layout.spacing.s,
    borderRadius: Layout.borderRadius.large,
  },
  toggleOptionActive: {
    backgroundColor: Colors.card,
    ...Layout.shadow.small,
  },
  toggleText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.subtleText,
  },
  toggleTextActive: {
    color: Colors.text,
    fontFamily: Typography.fonts.bodySemiBold,
  },

  // Filter Bar
  filterBarScroll: {
    flexGrow: 0,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.s,
    paddingHorizontal: Layout.spacing.m,
    paddingBottom: Layout.spacing.s,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.backgroundSecondary,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterChipDisabled: {
    opacity: 0.5,
  },
  filterChipText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.subtleText,
  },
  filterChipTextActive: {
    color: Colors.text,
    fontFamily: Typography.fonts.bodySemiBold,
  },
  filterChipTextDisabled: {
    color: Colors.subtleText,
  },
  comingSoonBadge: {
    fontSize: 9,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.primary,
    backgroundColor: 'rgba(252, 217, 91, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },

  // Location Banner
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.xs,
    backgroundColor: 'rgba(252, 217, 91, 0.15)',
    paddingVertical: Layout.spacing.s,
    paddingHorizontal: Layout.spacing.m,
    marginHorizontal: Layout.spacing.m,
    marginVertical: Layout.spacing.s,
    borderRadius: Layout.borderRadius.medium,
  },
  locationBannerText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.primary,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Layout.spacing.m,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },

  // Map
  map: {
    flex: 1,
  },

  // List
  listContainer: {
    flex: 1,
  },

  // Sections
  section: {
    marginBottom: Layout.spacing.l,
    paddingHorizontal: Layout.spacing.m,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.s,
    marginBottom: Layout.spacing.m,
  },
  sectionTitle: {
    flex: 1,
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
  },
  sectionCount: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: Layout.spacing.s,
    paddingVertical: 2,
    borderRadius: Layout.borderRadius.small,
  },

  // Nearby Card
  nearbyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Layout.borderRadius.medium,
    padding: Layout.spacing.m,
    marginBottom: Layout.spacing.s,
    ...Layout.shadow.small,
  },
  nearbyCardImage: {
    width: 60,
    height: 60,
    borderRadius: Layout.borderRadius.medium,
    marginRight: Layout.spacing.m,
    backgroundColor: Colors.backgroundSecondary,
  },
  nearbyCardContent: {
    flex: 1,
  },
  nearbyCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  nearbyCardBadgeText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.subtleText,
    textTransform: 'uppercase',
  },
  verifiedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
    marginLeft: 4,
  },
  nearbyCardName: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
    marginBottom: 2,
  },
  nearbyCardLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nearbyCardLocationText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  nearbyCardDistance: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.primary,
    marginTop: 4,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xl,
    marginTop: Layout.spacing.xxl,
  },
  emptyTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
    marginTop: Layout.spacing.l,
    marginBottom: Layout.spacing.s,
  },
  emptySubtitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    textAlign: 'center',
    lineHeight: Typography.sizes.base * 1.5,
  },
  enableLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.s,
    backgroundColor: Colors.primary,
    paddingHorizontal: Layout.spacing.l,
    paddingVertical: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    marginTop: Layout.spacing.l,
  },
  enableLocationText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.background,
  },

  // Search CTA
  searchCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.m,
    backgroundColor: Colors.backgroundSecondary,
    marginHorizontal: Layout.spacing.m,
    marginTop: Layout.spacing.l,
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
  },
  searchCTAText: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },

  bottomSpacing: {
    height: Layout.spacing.xxl,
  },
});
