import React, { useState, useEffect, useCallback } from 'react';
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
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import {
  MapPin,
  Star,
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
  type: 'shop' | 'producer';
  image_url: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  distance_km?: number;
  is_verified?: boolean;
  title: string;
  description: string;
  image_url: string;
  type: 'cheese' | 'producer-cheese' | 'article' | 'recipe' | 'user';
  metadata?: {
    origin_country?: string;
    cheese_type?: string;
    cheese_family?: string;
    producer_name?: string;
    flavor?: string;
    aroma?: string;
    reading_time?: number;
    average_rating?: number;
    rating_count?: number;
    vanity_url?: string;
    tagline?: string;
  };
};

const filterOptions = [
  { key: 'all',      label: 'All',      icon: Grid,     color: '#0066CC' },
  { key: 'cheese',   label: 'Cheeses',  icon: ChefHat,  color: '#E67E22' },
  { key: 'articles', label: 'Articles', icon: BookOpen, color: '#27AE60' },
  { key: 'recipes',  label: 'Recipes',  icon: Utensils, color: '#E74C3C' },
];

// Synonym mapping for smart search (includes common misspellings)
const CHEESE_SYNONYMS: Record<string, string[]> = {
  'goat': ['goat', 'goats', 'chèvre', 'chevre', "goat's", 'capra'],
  'blue': ['blue', 'bleu', 'gorgonzola', 'roquefort', 'stilton', 'veined'],
  'sheep': ['sheep', 'sheeps', 'pecorino', 'manchego', "sheep's", 'ewe', 'ovine'],
  'cow': ['cow', 'cows', "cow's", 'bovine', 'milk'],
  'soft': ['soft', 'fresh', 'creamy', 'spreadable'],
  'hard': ['hard', 'aged', 'mature', 'firm', 'dense'],
  'french': ['french', 'france'],
  'italian': ['italian', 'italy', 'italiano'],
  'swiss': ['swiss', 'switzerland', 'gruyere', 'emmental'],
  'english': ['english', 'england', 'british'],
  'spanish': ['spanish', 'spain', 'espana'],
  'dutch': ['dutch', 'netherlands', 'holland', 'gouda'],
  'cheddar': ['cheddar', 'cheder', 'cheedar', 'chedar', 'chedder'],
  'mozzarella': ['mozzarella', 'mozarella', 'mozzerella', 'mozza', 'mozerella'],
  'parmesan': ['parmesan', 'parmigiano', 'reggiano', 'parm', 'parmasean'],
  'brie': ['brie', 'bree', 'bri'],
  'feta': ['feta', 'fetta', 'feeta'],
  'camembert': ['camembert', 'camembear', 'camember', 'camambert', 'camenbert'],
  'ricotta': ['ricotta', 'ricota'],
  'provolone': ['provolone', 'provoloni', 'provelone'],
  'gruyere': ['gruyere', 'gruyère', 'gruyer', 'gruyear'],
  'gouda': ['gouda', 'guda', 'gooda'],
  'emmental': ['emmental', 'emmenthal', 'emmenthaler'],
  'gorgonzola': ['gorgonzola', 'gorganzola'],
  'stilton': ['stilton', 'stiliton'],
  'roquefort': ['roquefort', 'rocquefort', 'roquefor'],
  'havarti': ['havarti', 'havarthi'],
  'mild': ['mild', 'subtle', 'delicate', 'gentle'],
  'strong': ['strong', 'sharp', 'pungent', 'intense', 'tangy'],
  'nutty': ['nutty', 'hazelnut', 'almond'],
  'creamy': ['creamy', 'smooth', 'buttery', 'rich'],
};

type ViewMode = 'map' | 'list';

export default function DiscoverScreen() {
  const router = useRouter();
  
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [nearbyShops, setNearbyShops] = useState<NearbyItem[]>([]);
  const [nearbyProducers, setNearbyProducers] = useState<NearbyItem[]>([]);
  const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([]);

  useEffect(() => {
    initializeLocation();
  }, []);
  const { type, region, filter, search } = useLocalSearchParams();
  const initialSearch = typeof search === 'string' ? search : '';

  const [items,      setItems]      = useState<DiscoverItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [activeFilter, setActive]   = useState<'all' | 'cheese' | 'articles' | 'recipes'>('all');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<SelectedFilters>({});
  const [allItems, setAllItems] = useState<DiscoverItem[]>([]);
  const [searchQuery, setSearchQuery] = useState(initialSearch);

  // Sync searchQuery when search param changes (e.g. navigating from flavor tag)
  useEffect(() => {
    if (initialSearch) {
      setSearchQuery(initialSearch);
    }
  }, [initialSearch]);

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
      let all: DiscoverItem[] = [];

      /* Users - Search when query starts with @ or contains username-like pattern */
      if (searchQuery && (searchQuery.startsWith('@') || searchQuery.includes('@'))) {
        const users = await searchUsers(searchQuery);
        all.push(
          ...users.map(u => ({
            id: u.id,
            title: u.name || 'Cheese Lover',
            description: u.vanity_url ? `@${u.vanity_url}` : (u.tagline || 'Cheese enthusiast'),
            image_url: u.avatar_url || 'https://via.placeholder.com/100?text=User',
            type: 'user' as const,
            metadata: {
              vanity_url: u.vanity_url || undefined,
              tagline: u.tagline || undefined,
            },
          }))
        );
      }

      /* Cheeses - Show both producer cheeses and cheese types */
      if (activeFilter === 'all' || activeFilter === 'cheese') {
        // Fetch producer cheeses - if searching, get more for fuzzy matching
        let producerQuery = supabase
          .from('producer_cheese_stats')
          .select('id, full_name, image_url, cheese_type_name, producer_name, average_rating, rating_count, flavor, aroma');
        
        // Apply type filter if present
        if (type && typeof type === 'string') {
          producerQuery = producerQuery.eq('cheese_type_name', type);
        }
        
        // If searching, get more results for fuzzy matching; otherwise limit
        const limit = searchQuery && searchQuery.trim() ? 200 : 50;
        const { data: producerCheeses } = await producerQuery.limit(limit);

        if (producerCheeses) {
          all.push(
            ...producerCheeses.map(c => {
              // Hide "Generic" producer - just show cheese type name
              const isGeneric = c.producer_name?.toLowerCase().includes('generic') || 
                                c.producer_name?.toLowerCase().includes('unknown');
              const displayTitle = isGeneric ? c.cheese_type_name : c.full_name;
              
              return {
                id: c.id,
                title: displayTitle,
                description: `${c.producer_name} ${c.cheese_type_name}`,
                image_url: c.image_url || 'https://via.placeholder.com/400?text=Cheese',
                type: 'producer-cheese' as const,
                metadata: {
                  cheese_type: c.cheese_type_name,
                  producer_name: c.producer_name,
                  flavor: c.flavor || undefined,
                  aroma: c.aroma || undefined,
                  average_rating: c.average_rating,
                  rating_count: c.rating_count,
                },
              };
            })
          );
        }

      }

      /* Articles & Recipes */
      if (activeFilter === 'all' || activeFilter === 'articles' || activeFilter === 'recipes') {
        const { data: entries } = await supabase
          .from('cheezopedia_entries')
          .select('id, title, description, image_url, content_type, reading_time_minutes')
          .eq('visible_in_feed', true)
          .order('published_at', { ascending: false })
          .limit(50);

        if (entries) {
          all.push(
            ...entries
              .filter(e => {
                if (activeFilter === 'articles') return e.content_type === 'article';
                if (activeFilter === 'recipes')  return e.content_type === 'recipe';
                return true;
              })
              .map(e => ({
                id:        e.id,
                title:     e.title,
                description: e.description,
                image_url: e.image_url,
                type:      e.content_type === 'recipe' ? 'recipe' as DiscoverItem['type'] : 'article' as DiscoverItem['type'],
                metadata:  { reading_time: e.reading_time_minutes },
              }))
          );
        }
      }

      /* Client-side aggressive fuzzy filter */
      if (searchQuery && searchQuery.trim()) {
        const searchTerms = expandSearchTerm(searchQuery);
        
        // Score each item by relevance
        const scoredItems = all.map(i => {
          let score = 0;
          
          searchTerms.forEach(term => {
            // Title matches score highest
            if (fuzzyMatch(i.title, term)) score += 10;
            if (i.description && fuzzyMatch(i.description, term)) score += 5;
            if (i.metadata?.cheese_type && fuzzyMatch(i.metadata.cheese_type, term)) score += 8;
            if (i.metadata?.origin_country && fuzzyMatch(i.metadata.origin_country, term)) score += 3;
            if (i.metadata?.producer_name && fuzzyMatch(i.metadata.producer_name, term)) score += 4;
            if (i.metadata?.flavor && fuzzyMatch(i.metadata.flavor, term)) score += 9;
            if (i.metadata?.aroma && fuzzyMatch(i.metadata.aroma, term)) score += 7;
          });
          
          return { item: i, score };
        });
        
        // Filter items with any score and sort by relevance
        all = scoredItems
          .filter(({ score }) => score > 0)
          .sort((a, b) => b.score - a.score)
          .map(({ item }) => item);
      } else {
        // No search - shuffle for discovery
        all = all.sort(() => Math.random() - 0.5);
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

  const formatDistance = (km?: number): string => {
    if (!km) return '';
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
          {item.type === 'shop' ? (
            <Store size={12} color={Colors.primary} />
          ) : (
            <Factory size={12} color="#4CAF50" />
          )}
          <Text style={styles.nearbyCardBadgeText}>
            {item.type === 'shop' ? 'Shop' : 'Producer'}
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

  const hasItems = nearbyShops.length > 0 || nearbyProducers.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Discover</Text>
          <Text style={styles.subtitle}>
            {userLocation ? 'Cheese around you' : 'Explore cheese places'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.viewToggle}
            onPress={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
          >
            {viewMode === 'map' ? (
              <List size={22} color={Colors.text} />
            ) : (
              <Map size={22} color={Colors.text} />
            )}
          </TouchableOpacity>
          <NotificationBell />
        </View>
      </View>

      {/* Location Banner */}
      {userLocation && (
        <View style={styles.locationBanner}>
          <Navigation size={14} color={Colors.primary} />
          <Text style={styles.locationBannerText}>
            Showing places near you
          </Text>
        </View>
      )}
      <SearchBar
        placeholder="Search everything..."
        initialValue={initialSearch}
        onSearch={setSearchQuery}
        onFilter={() => setShowFilterPanel(true)}
      />

      {/* Main Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Finding cheese near you...</Text>
        </View>
      ) : viewMode === 'map' ? (
        <CheeseMap
          markers={mapMarkers}
          onMarkerPress={handleMarkerPress}
          onRegionChange={handleRegionChange}
          showUserLocation={true}
          initialCenter={userLocation || undefined}
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
              {nearbyShops.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Store size={20} color={Colors.primary} />
                    <Text style={styles.sectionTitle}>Cheese Shops</Text>
                    <Text style={styles.sectionCount}>{nearbyShops.length}</Text>
                  </View>
                  {nearbyShops.map(renderNearbyCard)}
                </View>
              )}

              {/* Producers Section */}
              {nearbyProducers.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Factory size={20} color="#4CAF50" />
                    <Text style={styles.sectionTitle}>Producers</Text>
                    <Text style={styles.sectionCount}>{nearbyProducers.length}</Text>
                  </View>
                  {nearbyProducers.map(renderNearbyCard)}
                </View>
              )}
            </>
          )}

          {/* Search CTA */}
          <TouchableOpacity
            style={styles.searchCTA}
            onPress={() => router.push('/search')}
          >
            <Search size={20} color={Colors.primary} />
            <Text style={styles.searchCTAText}>Search for cheeses, recipes & more</Text>
            <ChevronRight size={18} color={Colors.subtleText} />
          </TouchableOpacity>

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
    alignItems: 'flex-start',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.s,
  },
  title: {
    fontSize: Typography.sizes['3xl'],
    fontFamily: Typography.fonts.heading,
    color: Colors.text,
    letterSpacing: Typography.letterSpacing.tight,
  },
  subtitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginTop: 4,
  },
  viewToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
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
