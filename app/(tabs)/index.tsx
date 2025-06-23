import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, TouchableOpacity, Image, Platform, Dimensions, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Search, TrendingUp, Clock, Star, MapPin, ChefHat, BookOpen, Utensils } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import SearchBar from '@/components/SearchBar';
import NearbyCheeseCard from '@/components/NearbyCheeseCard';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

const { width: initialScreenWidth } = Dimensions.get('window');

type FeaturedEntry = {
  id: string;
  title: string;
  description: string;
  image_url: string;
  content_type: string;
  reading_time_minutes?: number;
};

type TrendingCheese = {
  id: string;
  name: string;
  type: string;
  origin_country: string;
  origin_region?: string;
  description: string;
  image_url: string;
};

type FeedItem = {
  id: string;
  type: 'cheese' | 'featured' | 'nearby';
  data: TrendingCheese | FeaturedEntry | null;
};

export default function HomeScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async () => {
    try {
      // Fetch featured entries
      const { data: entries } = await supabase
        .from('cheezopedia_entries')
        .select('id, title, description, image_url, content_type, reading_time_minutes')
        .eq('featured', true)
        .eq('visible_in_feed', true)
        .order('published_at', { ascending: false })
        .limit(4);

      // Fetch trending cheeses
      const { data: cheeses } = await supabase
        .from('cheeses')
        .select('id, name, type, origin_country, origin_region, description, image_url')
        .order('created_at', { ascending: false })
        .limit(8);

      // Create mixed feed items
      const mixedItems: FeedItem[] = [];

      // Add cheese items
      if (cheeses) {
        cheeses.forEach(cheese => {
          mixedItems.push({
            id: `cheese-${cheese.id}`,
            type: 'cheese',
            data: cheese
          });
        });
      }

      // Add featured items
      if (entries) {
        entries.forEach(entry => {
          mixedItems.push({
            id: `featured-${entry.id}`,
            type: 'featured',
            data: entry
          });
        });
      }

      // Add nearby cheese component at a random position (not first)
      const nearbyPosition = Math.floor(Math.random() * (mixedItems.length - 1)) + 1;
      mixedItems.splice(nearbyPosition, 0, {
        id: 'nearby-cheese',
        type: 'nearby',
        data: null
      });

      // Shuffle the remaining items
      const shuffled = [...mixedItems];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      setFeedItems(shuffled);
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    router.push(`/discover?q=${encodeURIComponent(query)}`);
  };

  const handleFilter = () => {
    router.push('/discover');
  };

  const renderCheeseCard = (cheese: TrendingCheese) => {
    // Calculate responsive height based on screen width
    const cardHeight = screenWidth * 0.75; // 75% of screen width for better aspect ratio

    return (
      <TouchableOpacity
        style={[styles.cheeseCard, { height: cardHeight }]}
        onPress={() => router.push(`/cheese/${cheese.id}`)}
      >
        <Image 
          source={{ uri: cheese.image_url }} 
          style={styles.cheeseImage}
        />
        <View style={styles.cheeseOverlay}>
          <View style={styles.cheeseContent}>
            <View style={styles.cheeseMeta}>
              <View style={styles.cheeseBadge}>
                <ChefHat size={14} color={Colors.background} />
                <Text style={styles.cheeseBadgeText}>{cheese.type}</Text>
              </View>
              <View style={styles.ratingBadge}>
                <Star size={14} color="#FFD700" fill="#FFD700" />
                <Text style={styles.ratingText}>4.{Math.floor(Math.random() * 3) + 6}</Text>
              </View>
            </View>
            
            <Text style={styles.cheeseTitle} numberOfLines={2}>
              {cheese.name}
            </Text>
            
            <View style={styles.cheeseLocation}>
              <MapPin size={16} color="rgba(255, 255, 255, 0.9)" />
              <Text style={styles.cheeseLocationText}>
                {cheese.origin_country}
                {cheese.origin_region ? `, ${cheese.origin_region}` : ''}
              </Text>
            </View>
            
            <Text style={styles.cheeseDescription} numberOfLines={3}>
              {cheese.description}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFeaturedCard = (entry: FeaturedEntry) => {
    const getContentIcon = (type: string) => {
      switch (type) {
        case 'recipe': return <Utensils size={16} color={Colors.background} />;
        case 'article': return <BookOpen size={16} color={Colors.background} />;
        default: return <BookOpen size={16} color={Colors.background} />;
      }
    };

    // Calculate responsive height based on screen width
    const cardHeight = screenWidth * 0.9; // 90% of screen width

    return (
      <TouchableOpacity
        style={[styles.featuredCard, { height: cardHeight }]}
        onPress={() => router.push(`/cheezopedia/${entry.id}`)}
      >
        <Image 
          source={{ uri: entry.image_url }} 
          style={styles.featuredImage}
        />
        <View style={styles.featuredOverlay}>
          <View style={styles.featuredContent}>
            <View style={styles.featuredMeta}>
              <View style={styles.featuredBadge}>
                {getContentIcon(entry.content_type)}
                <Text style={styles.featuredBadgeText}>
                  {entry.content_type.charAt(0).toUpperCase() + entry.content_type.slice(1)}
                </Text>
              </View>
              {entry.reading_time_minutes && (
                <View style={styles.timeBadge}>
                  <Clock size={14} color={Colors.background} />
                  <Text style={styles.timeBadgeText}>{entry.reading_time_minutes} min</Text>
                </View>
              )}
            </View>
            
            <Text style={styles.featuredTitle} numberOfLines={3}>
              {entry.title}
            </Text>
            
            <Text style={styles.featuredDescription} numberOfLines={4}>
              {entry.description}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFeedItem = (item: FeedItem) => {
    switch (item.type) {
      case 'cheese':
        return renderCheeseCard(item.data as TrendingCheese);
      case 'featured':
        return renderFeaturedCard(item.data as FeaturedEntry);
      case 'nearby':
        return <NearbyCheeseCard key={item.id} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello Cheeky Cheese Lovers!</Text>
          <Text style={styles.title}>Let's Get Cheesy</Text>
        </View>

        <SearchBar 
          placeholder="Search cheeses, recipes, articles..."
          onSearch={handleSearch}
          onFilter={handleFilter}
        />

        {loading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingSpinner} />
            <Text style={styles.loadingText}>Loading your feed...</Text>
          </View>
        ) : (
          <View style={styles.feedContainer}>
            {feedItems.map((item, index) => (
              <View key={item.id} style={styles.feedItem}>
                {renderFeedItem(item)}
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'web' ? Layout.spacing.m : 0,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: Layout.spacing.m,
    paddingBottom: Layout.spacing.s,
  },
  greeting: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginBottom: 4,
  },
  title: {
    fontSize: Typography.sizes['3xl'],
    fontFamily: Typography.fonts.heading,
    color: Colors.text,
    letterSpacing: Typography.letterSpacing.tight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xl,
    minHeight: 200,
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF0DB',
    marginBottom: Layout.spacing.m,
  },
  loadingText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.subtleText,
  },
  feedContainer: {
    paddingTop: Layout.spacing.s,
    paddingHorizontal: Layout.spacing.s, // Add some horizontal padding to the feed container
  },
  feedItem: {
    marginBottom: Layout.spacing.l,
    width: '100%', // Make sure items take full width
  },
  // Cheese card styles
  cheeseCard: {
    width: '92%', // Slightly narrower to create space on the sides
    maxWidth: 600, // Maximum width on larger screens
    alignSelf: 'center',
    marginHorizontal: '4%', // Even margins on both sides
    borderRadius: Layout.borderRadius.large,
    overflow: 'hidden',
    ...Layout.shadow.large,
  },
  cheeseImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    ...Platform.select({
      web: {
        objectFit: 'cover',
      },
    }),
  },
  cheeseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%)',
    justifyContent: 'flex-end',
  },
  cheeseContent: {
    padding: Layout.spacing.l,
  },
  cheeseMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.m,
  },
  cheeseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(230, 126, 34, 0.95)',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
    borderRadius: Layout.borderRadius.medium,
    gap: Layout.spacing.xs,
  },
  cheeseBadgeText: {
    color: Colors.background,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
    borderRadius: Layout.borderRadius.medium,
    gap: Layout.spacing.xs,
  },
  ratingText: {
    color: Colors.background,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
  },
  cheeseTitle: {
    fontSize: Typography.sizes.xl, // Smaller font size for better scaling
    fontFamily: Typography.fonts.heading,
    color: Colors.background,
    marginBottom: Layout.spacing.s,
    lineHeight: Typography.sizes.xl * Typography.lineHeights.tight,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  cheeseLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.xs,
    marginBottom: Layout.spacing.m,
  },
  cheeseLocationText: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cheeseDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    lineHeight: Typography.sizes.base * Typography.lineHeights.normal,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Featured card styles (full screen)
  featuredCard: {
    width: '92%', // Slightly narrower to create space on the sides
    maxWidth: 600, // Maximum width on larger screens
    alignSelf: 'center',
    marginHorizontal: '4%', // Even margins on both sides
    borderRadius: Layout.borderRadius.large,
    overflow: 'hidden',
    ...Layout.shadow.large,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    ...Platform.select({
      web: {
        objectFit: 'cover',
      },
    }),
  },
  featuredOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.8) 100%)',
    justifyContent: 'flex-end',
  },
  featuredContent: {
    padding: Layout.spacing.l,
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.m,
    gap: Layout.spacing.s,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(39, 174, 96, 0.95)',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
    borderRadius: Layout.borderRadius.medium,
    gap: Layout.spacing.xs,
  },
  featuredBadgeText: {
    color: Colors.background,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
    borderRadius: Layout.borderRadius.medium,
    gap: Layout.spacing.xs,
  },
  timeBadgeText: {
    color: Colors.background,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
  },
  featuredTitle: {
    fontSize: Typography.sizes.xl, // Smaller font size for better scaling
    fontFamily: Typography.fonts.heading,
    color: Colors.background,
    marginBottom: Layout.spacing.m,
    lineHeight: Typography.sizes.xl * Typography.lineHeights.tight,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  featuredDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    lineHeight: Typography.sizes.base * Typography.lineHeights.normal,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bottomSpacing: {
    height: Layout.spacing.xl,
  },
});