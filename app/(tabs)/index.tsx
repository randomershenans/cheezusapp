import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, TouchableOpacity, Image, Platform, Dimensions, useWindowDimensions, Modal, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Search, TrendingUp, Clock, Star, MapPin, ChefHat, BookOpen, Utensils, Sparkles, ShoppingBag, Grid, Award } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { getPersonalizedFeed, interleaveFeedItems, getCheeseDisplayName, searchUsers, FeedItem as ApiFeedItem, FeedCheeseItem, FeedArticle, FeedSponsored, UserTasteProfile } from '@/lib/feed-service';
import { useAuth } from '@/contexts/AuthContext';
import SearchBar from '@/components/SearchBar';
import FilterPanel, { FilterOptions, SelectedFilters } from '@/components/FilterPanel';
import NearbyCheeseCard from '@/components/NearbyCheeseCard';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

// Synonym mapping for fuzzy search
const CHEESE_SYNONYMS: Record<string, string[]> = {
  'cheddar': ['cheddar', 'cheder', 'cheedar', 'chedar', 'chedder'],
  'mozzarella': ['mozzarella', 'mozarella', 'mozzerella', 'mozza', 'mozerella'],
  'parmesan': ['parmesan', 'parmigiano', 'reggiano', 'parm', 'parmasean'],
  'brie': ['brie', 'bree', 'bri'],
  'feta': ['feta', 'fetta', 'feeta'],
  'camembert': ['camembert', 'camembear', 'camember', 'camambert', 'camenbert'],
  'gouda': ['gouda', 'guda', 'gooda'],
  'gruyere': ['gruyere', 'gruyère', 'gruyer', 'gruyear'],
  'ricotta': ['ricotta', 'ricota'],
  'provolone': ['provolone', 'provoloni', 'provelone'],
  'emmental': ['emmental', 'emmenthal', 'emmenthaler', 'swiss'],
  'manchego': ['manchego', 'manchago'],
  'gorgonzola': ['gorgonzola', 'gorganzola'],
  'stilton': ['stilton', 'stiliton'],
  'roquefort': ['roquefort', 'rocquefort', 'roquefor'],
  'havarti': ['havarti', 'havarthi'],
  'goat': ['goat', 'goats', 'chèvre', 'chevre'],
  'blue': ['blue', 'bleu'],
  'sheep': ['sheep', 'sheeps', 'pecorino'],
};

// Expand search term with synonyms
function expandSearchTerms(term: string): string[] {
  const lower = term.toLowerCase().trim();
  const expanded = [lower];
  
  for (const [key, synonyms] of Object.entries(CHEESE_SYNONYMS)) {
    if (synonyms.some(s => s === lower || lower.includes(s) || s.includes(lower))) {
      expanded.push(...synonyms);
      break;
    }
  }
  
  return [...new Set(expanded)];
}

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
  producer_name?: string;
  cheese_type_name?: string;
  cheese_family?: string;
  average_rating?: number;
  rating_count?: number;
  is_producer_cheese?: boolean;
};

type SponsoredPairing = {
  id: string;
  pairing: string;
  type: string;
  description: string;
  image_url: string;
  featured_image_url: string;
  brand_name: string;
  brand_logo_url: string;
  product_name: string;
  price_range: string;
};

type UserResult = {
  id: string;
  name: string;
  vanity_url?: string;
  avatar_url?: string;
  tagline?: string;
};

type FeedItem = {
  id: string;
  type: 'cheese' | 'producer-cheese' | 'featured' | 'nearby' | 'sponsored_pairing' | 'add-cheese-prompt' | 'user';
  data: TrendingCheese | FeaturedEntry | SponsoredPairing | UserResult | null;
};

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { width: screenWidth } = useWindowDimensions();
  const [allFeedItems, setAllFeedItems] = useState<FeedItem[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [personalizedFeed, setPersonalizedFeed] = useState<ApiFeedItem[]>([]);
  const [userProfile, setUserProfile] = useState<UserTasteProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<SelectedFilters>({});
  const [seenIds, setSeenIds] = useState<string[]>([]);

  useEffect(() => {
    loadPersonalizedFeed();
  }, [user]);

  const loadPersonalizedFeed = async () => {
    setLoading(true);
    try {
      const response = await getPersonalizedFeed(user?.id, 20, 0, []);
      setUserProfile(response.profile);
      const interleaved = interleaveFeedItems(response);
      
      // Convert to legacy format
      const converted: FeedItem[] = interleaved.map(item => {
        if ('cheese' in item) {
          const cheeseItem = item as FeedCheeseItem;
          return {
            id: cheeseItem.type === 'following' ? `following-${cheeseItem.cheese.id}` : `cheese-${cheeseItem.cheese.id}`,
            type: 'producer-cheese' as const,
            data: {
              id: cheeseItem.cheese.id,
              name: getCheeseDisplayName(cheeseItem.cheese),
              type: cheeseItem.cheese.cheese_type_name,
              origin_country: cheeseItem.cheese.origin_country || '',
              description: cheeseItem.reason,
              image_url: cheeseItem.cheese.image_url || '',
              producer_name: cheeseItem.cheese.producer_name,
              cheese_type_name: cheeseItem.cheese.cheese_type_name,
              cheese_family: cheeseItem.cheese.cheese_family,
              average_rating: cheeseItem.cheese.average_rating,
              rating_count: cheeseItem.cheese.rating_count,
              awards_image_url: cheeseItem.cheese.awards_image_url,
              is_producer_cheese: true,
              recommendation_type: cheeseItem.type,
              recommendation_reason: cheeseItem.reason,
              following_user: cheeseItem.user,
            } as TrendingCheese & { awards_image_url?: string; recommendation_type?: string; recommendation_reason?: string; following_user?: { id: string; name: string; avatar_url?: string } },
          };
        } else if (item.type === 'article') {
          const articleItem = item as FeedArticle;
          return {
            id: `featured-${articleItem.id}`,
            type: 'featured' as const,
            data: {
              id: articleItem.id,
              title: articleItem.title,
              description: articleItem.description || '',
              image_url: articleItem.image_url || '',
              content_type: articleItem.content_type,
              reading_time_minutes: articleItem.reading_time,
            } as FeaturedEntry,
          };
        } else {
          const sponsoredItem = item as FeedSponsored;
          return {
            id: `sponsored-${sponsoredItem.id}`,
            type: 'sponsored_pairing' as const,
            data: {
              id: sponsoredItem.id,
              pairing: sponsoredItem.pairing,
              type: sponsoredItem.pairing_type,
              description: sponsoredItem.description || '',
              image_url: sponsoredItem.image_url || '',
              featured_image_url: sponsoredItem.featured_image_url || '',
              brand_name: sponsoredItem.brand_name || '',
              brand_logo_url: sponsoredItem.brand_logo_url || '',
              product_name: sponsoredItem.product_name || '',
              price_range: '',
            } as SponsoredPairing,
          };
        }
      });
      
      setAllFeedItems(converted);
      setFeedItems(converted);
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery && searchQuery.trim()) {
      searchDatabase();
    } else {
      setFeedItems(allFeedItems);
    }
  }, [searchQuery, allFeedItems]);

  const convertAndSetFeed = () => {
    const converted: FeedItem[] = personalizedFeed.map(item => {
      if ('cheese' in item) {
        const cheeseItem = item as FeedCheeseItem;
        return {
          id: `cheese-${cheeseItem.cheese.id}`,
          type: 'producer-cheese' as const,
          data: {
            id: cheeseItem.cheese.id,
            name: getCheeseDisplayName(cheeseItem.cheese),
            type: cheeseItem.cheese.cheese_type_name,
            origin_country: cheeseItem.cheese.origin_country || '',
            description: cheeseItem.reason, // Use recommendation reason as description
            image_url: cheeseItem.cheese.image_url || '',
            producer_name: cheeseItem.cheese.producer_name,
            cheese_type_name: cheeseItem.cheese.cheese_type_name,
            cheese_family: cheeseItem.cheese.cheese_family,
            average_rating: cheeseItem.cheese.average_rating,
            rating_count: cheeseItem.cheese.rating_count,
            awards_image_url: cheeseItem.cheese.awards_image_url,
            is_producer_cheese: true,
            recommendation_type: cheeseItem.type,
            recommendation_reason: cheeseItem.reason,
          } as TrendingCheese & { awards_image_url?: string; recommendation_type?: string; recommendation_reason?: string },
        };
      } else if (item.type === 'article') {
        const articleItem = item as FeedArticle;
        return {
          id: `featured-${articleItem.id}`,
          type: 'featured' as const,
          data: {
            id: articleItem.id,
            title: articleItem.title,
            description: articleItem.description || '',
            image_url: articleItem.image_url || '',
            content_type: articleItem.content_type,
            reading_time_minutes: articleItem.reading_time,
          } as FeaturedEntry,
        };
      } else {
        const sponsoredItem = item as FeedSponsored;
        return {
          id: `sponsored-${sponsoredItem.id}`,
          type: 'sponsored_pairing' as const,
          data: {
            id: sponsoredItem.id,
            pairing: sponsoredItem.pairing,
            type: sponsoredItem.pairing_type,
            description: sponsoredItem.description || '',
            image_url: sponsoredItem.image_url || '',
            featured_image_url: sponsoredItem.featured_image_url || '',
            brand_name: sponsoredItem.brand_name || '',
            brand_logo_url: sponsoredItem.brand_logo_url || '',
            product_name: sponsoredItem.product_name || '',
            price_range: '',
          } as SponsoredPairing,
        };
      }
    });
    
    setAllFeedItems(converted);
    setFeedItems(converted);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPersonalizedFeed();
    setRefreshing(false);
  }, [user]);

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

      // Fetch trending producer cheeses
      const { data: producerCheeses } = await supabase
        .from('producer_cheese_stats')
        .select('id, full_name, cheese_type_name, cheese_family, producer_name, origin_country, origin_region, description, image_url, average_rating, rating_count')
        .limit(20);

      // Map producer cheeses to feed format
      const cheeses: TrendingCheese[] = [];
      
      if (producerCheeses) {
        producerCheeses.forEach(pc => {
          // Hide "Generic" producer - just show cheese type name
          const isGeneric = pc.producer_name?.toLowerCase().includes('generic') || 
                            pc.producer_name?.toLowerCase().includes('unknown');
          const displayName = isGeneric ? pc.cheese_type_name : pc.full_name;
          
          cheeses.push({
            id: pc.id,
            name: displayName,
            type: pc.cheese_type_name,
            origin_country: pc.origin_country,
            origin_region: pc.origin_region,
            description: pc.description,
            image_url: pc.image_url,
            producer_name: pc.producer_name,
            cheese_type_name: pc.cheese_type_name,
            cheese_family: pc.cheese_family,
            average_rating: pc.average_rating,
            rating_count: pc.rating_count,
            is_producer_cheese: true,
          });
        });
      }

      // Fetch sponsored pairings for feed
      const { data: sponsoredPairings, error: sponsoredError } = await supabase
        .from('cheese_pairings')
        .select('id, pairing, type, description, image_url, featured_image_url, brand_name, brand_logo_url, product_name, price_range')
        .eq('show_in_feed', true)
        .gte('feed_until', new Date().toISOString())
        .limit(3);

      console.log('Sponsored pairings query result:', { sponsoredPairings, sponsoredError });

      // Build interleaved feed
      const feed: FeedItem[] = [];

      // Add cheese and featured entries in an interleaved pattern
      const maxItems = Math.max(cheeses.length, entries.length);
      for (let i = 0; i < maxItems; i++) {
        if (i < cheeses.length) {
          feed.push({ id: `cheese-${cheeses[i].id}`, type: 'producer-cheese', data: cheeses[i] });
        }
        if (i < entries.length) {
          feed.push({ id: `featured-${entries[i].id}`, type: 'featured', data: entries[i] });
        }
      }

      setAllFeedItems(feed);
      setFeedItems(feed);
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Search database directly when user types
  const searchDatabase = async () => {
    if (!searchQuery || !searchQuery.trim()) return;
    
    const query = searchQuery.trim();
    
    // Expand search terms with synonyms for fuzzy matching
    const searchTerms = expandSearchTerms(query);
    
    try {
      const feed: FeedItem[] = [];

      // Search for users if query starts with @ or looks like a username
      if (query.startsWith('@') || query.includes('@')) {
        const users = await searchUsers(query);
        users.forEach(u => {
          feed.push({
            id: `user-${u.id}`,
            type: 'user',
            data: {
              id: u.id,
              name: u.name || 'Cheese Lover',
              vanity_url: u.vanity_url || undefined,
              avatar_url: u.avatar_url || undefined,
              tagline: u.tagline || undefined,
            },
          });
        });
      }

      // Build OR conditions for all search terms
      const cheeseOrConditions = searchTerms.flatMap(term => [
        `full_name.ilike.%${term}%`,
        `cheese_type_name.ilike.%${term}%`,
        `producer_name.ilike.%${term}%`,
        `origin_country.ilike.%${term}%`,
      ]).join(',');

      // Search producer cheeses in database with expanded terms
      const { data: producerCheeses } = await supabase
        .from('producer_cheese_stats')
        .select('id, full_name, cheese_type_name, cheese_family, producer_name, origin_country, origin_region, description, image_url, average_rating, rating_count')
        .or(cheeseOrConditions)
        .limit(50);

      // Build OR conditions for articles
      const articleOrConditions = searchTerms.flatMap(term => [
        `title.ilike.%${term}%`,
        `description.ilike.%${term}%`,
        `content.ilike.%${term}%`,
      ]).join(',');

      // Search articles - include content for better relevance
      const { data: entries } = await supabase
        .from('cheezopedia_entries')
        .select('id, title, description, content, image_url, content_type, reading_time_minutes')
        .eq('visible_in_feed', true)
        .or(articleOrConditions)
        .limit(20);

      // Filter articles to only show truly relevant ones
      const queryLower = query.toLowerCase();
      const allSearchTermsLower = searchTerms.map(t => t.toLowerCase());
      const relevantEntries = (entries || []).filter(entry => {
        // Check if any search term matches title, description, or content
        return allSearchTermsLower.some(term => 
          entry.title?.toLowerCase().includes(term) ||
          entry.description?.toLowerCase().includes(term) ||
          entry.content?.toLowerCase().includes(term)
        );
      }).slice(0, 5);

      // Add cheese results to feed
      if (producerCheeses) {
        producerCheeses.forEach(pc => {
          const isGeneric = pc.producer_name?.toLowerCase().includes('generic') || 
                            pc.producer_name?.toLowerCase().includes('unknown');
          const displayName = isGeneric ? pc.cheese_type_name : pc.full_name;
          
          feed.push({
            id: `cheese-${pc.id}`,
            type: 'producer-cheese',
            data: {
              id: pc.id,
              name: displayName,
              type: pc.cheese_type_name,
              origin_country: pc.origin_country,
              origin_region: pc.origin_region,
              description: pc.description,
              image_url: pc.image_url,
              producer_name: pc.producer_name,
              cheese_type_name: pc.cheese_type_name,
              cheese_family: pc.cheese_family,
              average_rating: pc.average_rating,
              rating_count: pc.rating_count,
              is_producer_cheese: true,
            },
          });
        });
      }

      if (relevantEntries.length > 0) {
        relevantEntries.forEach(entry => {
          feed.push({ id: `featured-${entry.id}`, type: 'featured', data: entry });
        });
      }

      // Add "Can't find your cheese?" prompt at the end of search results
      feed.push({ id: 'add-cheese-prompt', type: 'add-cheese-prompt' as any, data: null });

      setFeedItems(feed);
    } catch (error) {
      console.error('Error searching:', error);
    }
  };

  // Fuzzy matching helper (same as discover)
  const levenshteinDistance = (str1: string, str2: string): number => {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1].toLowerCase() === str2[j - 1].toLowerCase()) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1,
            dp[i - 1][j - 1] + 1
          );
        }
      }
    }

    return dp[m][n];
  };

  const fuzzyMatch = (str: string, pattern: string): boolean => {
    if (!str || !pattern) return false;
    
    str = str.toLowerCase();
    pattern = pattern.toLowerCase();
    
    if (str.includes(pattern)) return true;
    
    if (pattern.length <= 3) {
      return str.split(/\s+/).some(word => word.startsWith(pattern));
    }
    
    const words = str.split(/\s+/);
    for (const word of words) {
      if (word === pattern) return true;
      
      const prefix = word.slice(0, pattern.length);
      const maxPrefixDistance = pattern.length <= 5 ? 1 : Math.ceil(pattern.length * 0.25);
      if (levenshteinDistance(prefix, pattern) <= maxPrefixDistance) return true;
      
      if (Math.abs(word.length - pattern.length) <= 3) {
        const maxDistance = Math.ceil(pattern.length * 0.3);
        const distance = levenshteinDistance(word, pattern);
        if (distance <= maxDistance) return true;
      }
    }
    
    return false;
  };

  const filterFeedItems = () => {
    if (!searchQuery || !searchQuery.trim()) {
      setFeedItems(allFeedItems);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    
    const filtered = allFeedItems.filter(item => {
      if (!item.data) return false;
      
      if (item.type === 'producer-cheese' || item.type === 'cheese') {
        const cheese = item.data as TrendingCheese;
        return (
          fuzzyMatch(cheese.name, query) ||
          (cheese.cheese_type_name && fuzzyMatch(cheese.cheese_type_name, query)) ||
          (cheese.origin_country && fuzzyMatch(cheese.origin_country, query)) ||
          (cheese.description && fuzzyMatch(cheese.description, query))
        );
      } else if (item.type === 'featured') {
        const featured = item.data as FeaturedEntry;
        return (
          fuzzyMatch(featured.title, query) ||
          fuzzyMatch(featured.description, query)
        );
      }
      
      return false;
    });

    setFeedItems(filtered);
  };

  const handleFilter = () => {
    setShowFilterPanel(true);
  };

  const extractFilterOptions = (): FilterOptions => {
    const countries = [...new Set(
      allFeedItems
        .filter(item => item.type === 'producer-cheese' || item.type === 'cheese')
        .map(item => (item.data as TrendingCheese)?.origin_country)
        .filter(Boolean)
    )].sort();

    const cheeseTypes = [...new Set(
      allFeedItems
        .filter(item => item.type === 'producer-cheese' || item.type === 'cheese')
        .map(item => (item.data as TrendingCheese)?.cheese_family)
        .filter(Boolean)
    )].sort();

    return {
      countries: countries as string[],
      milkTypes: ['Cow', 'Goat', 'Sheep', 'Buffalo'],
      cheeseTypes: cheeseTypes as string[],
      pairings: ['Wine', 'Beer', 'Fruit', 'Bread', 'Nuts'],
    };
  };

  const handleApplyFilters = (filters: SelectedFilters) => {
    setSelectedFilters(filters);
    let filtered = allFeedItems;

    if (filters.country) {
      filtered = filtered.filter(item => {
        if (item.type === 'producer-cheese' || item.type === 'cheese') {
          return (item.data as TrendingCheese).origin_country === filters.country;
        }
        return false;
      });
    }

    if (filters.cheeseType) {
      filtered = filtered.filter(item => {
        if (item.type === 'producer-cheese' || item.type === 'cheese') {
          return (item.data as TrendingCheese).cheese_family === filters.cheeseType;
        }
        return false;
      });
    }

    setFeedItems(filtered);
  };

  // Format content type for display (remove underscores, capitalize words)
  const formatContentType = (contentType: string): string => {
    return contentType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const renderCheeseCard = (cheese: TrendingCheese & { awards_image_url?: string; recommendation_type?: string; recommendation_reason?: string }) => {
    // Calculate responsive height based on screen width
    const cardHeight = screenWidth * 0.75; // 75% of screen width for better aspect ratio

    const handlePress = () => {
      if (cheese.is_producer_cheese) {
        router.push(`/producer-cheese/${cheese.id}`);
      } else {
        router.push(`/cheese/${cheese.id}`);
      }
    };

    // Get recommendation badge info (removed "For You" - if it's on the feed, it's for you anyway)
    const getRecommendationBadge = () => {
      switch (cheese.recommendation_type) {
        case 'recommendation':
          return null; // Removed "For You" tag
        case 'trending':
          return { icon: <TrendingUp size={12} color={Colors.background} />, text: 'Trending' };
        case 'award_winner':
          return { icon: <Award size={12} color={Colors.background} />, text: 'Award Winner' };
        case 'discovery':
          return { icon: <Search size={12} color={Colors.background} />, text: 'Discover' };
        default:
          return null;
      }
    };

    const badge = getRecommendationBadge();

    return (
      <TouchableOpacity
        style={[styles.cheeseCard, { height: cardHeight }]}
        onPress={handlePress}
      >
        <Image 
          source={{ uri: cheese.image_url }} 
          style={styles.cheeseImage}
        />
        
        {/* Awards badge overlay */}
        {cheese.awards_image_url && (
          <View style={styles.awardsBadgeContainer}>
            <Image
              source={{ uri: cheese.awards_image_url }}
              style={styles.awardsBadge}
              resizeMode="contain"
            />
          </View>
        )}
        
        <View style={styles.cheeseOverlay}>
          <View style={styles.cheeseContent}>
            <View style={styles.cheeseMeta}>
              {badge ? (
                <View style={[styles.cheeseBadge, styles.recommendationBadge]}>
                  {badge.icon}
                  <Text style={styles.cheeseBadgeText}>{badge.text}</Text>
                </View>
              ) : (
                <View style={styles.cheeseBadge}>
                  <Text style={styles.cheeseBadgeText}>Cheese</Text>
                </View>
              )}
              {cheese.average_rating && cheese.rating_count ? (
                <View style={styles.ratingBadge}>
                  <Star size={14} color="#FFD700" fill="#FFD700" />
                  <Text style={styles.ratingText}>{cheese.average_rating.toFixed(1)}</Text>
                </View>
              ) : null}
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
                  {formatContentType(entry.content_type)}
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

  const renderSponsoredPairingCard = (pairing: SponsoredPairing) => {
    const cardHeight = screenWidth * 0.75;

    return (
      <TouchableOpacity
        style={[styles.sponsoredCard, { height: cardHeight }]}
        onPress={() => router.push(`/pairing/${pairing.id}`)}
      >
        <Image 
          source={{ uri: pairing.featured_image_url || pairing.image_url }} 
          style={styles.sponsoredImage}
        />
        <View style={styles.sponsoredOverlay}>
          {/* Sponsored badge */}
          <View style={styles.sponsoredBadgeTop}>
            <Sparkles size={12} color="#FFD700" />
            <Text style={styles.sponsoredBadgeTopText}>Sponsored</Text>
          </View>
          
          <View style={styles.sponsoredContent}>
            <View style={styles.sponsoredMeta}>
              <View style={styles.pairingTypeBadge}>
                {pairing.type === 'food' ? <Utensils size={14} color={Colors.background} /> : <ChefHat size={14} color={Colors.background} />}
                <Text style={styles.pairingTypeBadgeText}>{pairing.type === 'food' ? 'Food' : 'Drink'}</Text>
              </View>
            </View>
            
            <Text style={styles.sponsoredBrandName} numberOfLines={1}>
              {pairing.brand_name}
            </Text>
            
            <Text style={styles.sponsoredProductTitle} numberOfLines={2}>
              {pairing.product_name || pairing.pairing}
            </Text>
            
            <Text style={styles.sponsoredDescription} numberOfLines={3}>
              {pairing.description}
            </Text>
            
            <View style={styles.tapToLearnMore}>
              <Text style={styles.tapToLearnMoreText}>Tap to learn more</Text>
              <Sparkles size={14} color="#FFD700" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderAddCheesePrompt = () => (
    <View style={styles.addCheesePrompt}>
      <Text style={styles.addCheesePromptText}>Can't find what you're looking for?</Text>
      <TouchableOpacity 
        style={styles.addCheesePromptButton}
        onPress={() => router.push('/add-cheese')}
      >
        <Text style={styles.addCheesePromptButtonText}>+ Add New Cheese</Text>
      </TouchableOpacity>
    </View>
  );

  const renderUserCard = (user: UserResult) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => router.push(`/profile/${user.id}`)}
    >
      <Image
        source={{ uri: user.avatar_url || 'https://via.placeholder.com/60?text=User' }}
        style={styles.userAvatar}
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user.name}</Text>
        {user.vanity_url && (
          <Text style={styles.userHandle}>@{user.vanity_url}</Text>
        )}
        {user.tagline && (
          <Text style={styles.userTagline} numberOfLines={1}>{user.tagline}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderFeedItem = (item: FeedItem) => {
    switch (item.type) {
      case 'cheese':
      case 'producer-cheese':
        return renderCheeseCard(item.data as TrendingCheese);
      case 'featured':
        return renderFeaturedCard(item.data as FeaturedEntry);
      case 'sponsored_pairing':
        return renderSponsoredPairingCard(item.data as SponsoredPairing);
      case 'user':
        return renderUserCard(item.data as UserResult);
      case 'nearby':
        return <NearbyCheeseCard key={item.id} />;
      case 'add-cheese-prompt':
        return renderAddCheesePrompt();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>
            {userProfile ? `Hey there, cheese ${userProfile.tier}!` : 'Hello Cheeky Cheese Lovers!'}
          </Text>
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

      {/* Filter Panel Modal */}
      <Modal
        visible={showFilterPanel}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterPanel(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterPanel(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <FilterPanel
              visible={showFilterPanel}
              onClose={() => setShowFilterPanel(false)}
              onApply={handleApplyFilters}
              options={extractFilterOptions()}
              currentFilters={selectedFilters}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  awardsBadgeContainer: {
    position: 'absolute',
    top: Layout.spacing.m,
    right: Layout.spacing.m,
    zIndex: 10,
  },
  awardsBadge: {
    width: 60,
    height: 60,
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
    backgroundColor: '#FCD95B',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
    borderRadius: Layout.borderRadius.medium,
    gap: Layout.spacing.xs,
  },
  recommendationBadge: {
    backgroundColor: Colors.primary,
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
  // Sponsored pairing card styles
  sponsoredCard: {
    width: '92%',
    maxWidth: 600,
    alignSelf: 'center',
    marginHorizontal: '4%',
    borderRadius: Layout.borderRadius.large,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFD700',
    ...Layout.shadow.large,
  },
  sponsoredImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    ...Platform.select({
      web: {
        objectFit: 'cover',
      },
    }),
  },
  sponsoredOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.8) 100%)',
    justifyContent: 'space-between',
  },
  brandLogoContainer: {
    position: 'absolute',
    top: Layout.spacing.m,
    right: Layout.spacing.m,
    width: 50,
    height: 50,
    borderRadius: Layout.borderRadius.medium,
    backgroundColor: Colors.background,
    padding: Layout.spacing.xs,
    ...Layout.shadow.medium,
  },
  brandLogoSmall: {
    width: '100%',
    height: '100%',
    borderRadius: Layout.borderRadius.small,
  },
  sponsoredBadgeTop: {
    position: 'absolute',
    top: Layout.spacing.m,
    left: Layout.spacing.m,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.borderRadius.medium,
    gap: 6,
  },
  sponsoredBadgeTopText: {
    color: '#FFD700',
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodySemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sponsoredContent: {
    padding: Layout.spacing.l,
    marginTop: 'auto',
  },
  sponsoredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.s,
    gap: Layout.spacing.s,
  },
  pairingTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.borderRadius.medium,
    gap: Layout.spacing.xs,
  },
  pairingTypeBadgeText: {
    color: Colors.background,
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodySemiBold,
  },
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.borderRadius.medium,
    gap: Layout.spacing.xs,
  },
  priceBadgeText: {
    color: Colors.background,
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodySemiBold,
  },
  sponsoredBrandName: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: '#FFD700',
    marginBottom: Layout.spacing.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  sponsoredProductTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.heading,
    color: Colors.background,
    marginBottom: Layout.spacing.s,
    lineHeight: Typography.sizes.xl * Typography.lineHeights.tight,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  sponsoredDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    lineHeight: Typography.sizes.base * Typography.lineHeights.normal,
    marginBottom: Layout.spacing.m,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tapToLearnMore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.xs,
  },
  tapToLearnMoreText: {
    color: '#FFD700',
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  /* -------- add cheese prompt -------- */
  addCheesePrompt: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.xl,
    paddingHorizontal: Layout.spacing.l,
    marginTop: Layout.spacing.m,
  },
  addCheesePromptText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.textSecondary,
    marginBottom: Layout.spacing.m,
  },
  addCheesePromptButton: {
    backgroundColor: '#FCD95B',
    paddingHorizontal: Layout.spacing.xl,
    paddingVertical: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
  },
  addCheesePromptButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: '#1F2937',
  },
  /* -------- modal -------- */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  /* -------- user card -------- */
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    ...Layout.shadow.small,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: Layout.spacing.m,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
  },
  userHandle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.primary,
    marginTop: 2,
  },
  userTagline: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginTop: 2,
  },
});