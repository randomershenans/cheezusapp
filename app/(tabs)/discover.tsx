import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, TouchableOpacity, Image, Platform, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Filter, Grid2x2 as Grid, List, Clock, MapPin, Star, ChefHat, BookOpen, Utensils } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import SearchBar from '@/components/SearchBar';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

const { width: screenWidth } = Dimensions.get('window');

type DiscoverItem = {
  id: string;
  title: string;
  description: string;
  image_url: string;
  type: 'cheese' | 'article' | 'recipe';
  metadata?: {
    origin_country?: string;
    cheese_type?: string;
    reading_time?: number;
  };
};

const filterOptions = [
  { 
    key: 'all', 
    label: 'All', 
    icon: Grid,
    color: '#0066CC'
  },
  { 
    key: 'cheese', 
    label: 'Cheeses', 
    icon: ChefHat,
    color: '#E67E22'
  },
  { 
    key: 'articles', 
    label: 'Articles', 
    icon: BookOpen,
    color: '#27AE60'
  },
  { 
    key: 'recipes', 
    label: 'Recipes', 
    icon: Utensils,
    color: '#E74C3C'
  },
];

export default function DiscoverScreen() {
  const router = useRouter();
  const { q } = useLocalSearchParams();
  const [items, setItems] = useState<DiscoverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'cheese' | 'articles' | 'recipes'>('all');

  useEffect(() => {
    fetchDiscoverItems();
  }, [q, activeFilter]);

  const fetchDiscoverItems = async () => {
    setLoading(true);
    try {
      let allItems: DiscoverItem[] = [];

      // Fetch cheeses if not filtered out
      if (activeFilter === 'all' || activeFilter === 'cheese') {
        const { data: cheeses } = await supabase
          .from('cheeses')
          .select('id, name, description, image_url, type, origin_country')
          .order('created_at', { ascending: false })
          .limit(20);

        if (cheeses) {
          allItems.push(...cheeses.map(cheese => ({
            id: cheese.id,
            title: cheese.name,
            description: cheese.description,
            image_url: cheese.image_url,
            type: 'cheese' as const,
            metadata: {
              origin_country: cheese.origin_country,
              cheese_type: cheese.type,
            }
          })));
        }
      }

      // Fetch articles and recipes if not filtered out
      if (activeFilter === 'all' || activeFilter === 'articles' || activeFilter === 'recipes') {
        const { data: entries } = await supabase
          .from('cheezopedia_entries')
          .select('id, title, description, image_url, content_type, reading_time_minutes')
          .eq('visible_in_feed', true)
          .order('published_at', { ascending: false })
          .limit(20);

        if (entries) {
          allItems.push(...entries
            .filter(entry => {
              if (activeFilter === 'articles') return entry.content_type === 'article';
              if (activeFilter === 'recipes') return entry.content_type === 'recipe';
              return true;
            })
            .map(entry => ({
              id: entry.id,
              title: entry.title,
              description: entry.description,
              image_url: entry.image_url,
              type: entry.content_type === 'recipe' ? 'recipe' as const : 'article' as const,
              metadata: {
                reading_time: entry.reading_time_minutes,
              }
            })));
        }
      }

      // Filter by search query if provided
      if (q && typeof q === 'string') {
        const searchTerm = q.toLowerCase();
        allItems = allItems.filter(item => 
          item.title.toLowerCase().includes(searchTerm) ||
          item.description.toLowerCase().includes(searchTerm)
        );
      }

      // Shuffle and limit results
      allItems = allItems.sort(() => Math.random() - 0.5).slice(0, 20);
      
      setItems(allItems);
    } catch (error) {
      console.error('Error fetching discover items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemPress = (item: DiscoverItem) => {
    if (item.type === 'cheese') {
      router.push(`/cheese/${item.id}`);
    } else {
      router.push(`/cheezopedia/${item.id}`);
    }
  };

  const getItemIcon = (type: string): string => {
    switch (type) {
      case 'cheese': return '🧀';
      case 'recipe': return '👨‍🍳';
      case 'article': return '📝';
      default: return '📄';
    }
  };

  const renderHeroCard = (item: DiscoverItem) => {
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.heroCard}
        onPress={() => handleItemPress(item)}
      >
        <Image 
          source={{ uri: item.image_url }} 
          style={styles.heroImage}
        />
        <View style={styles.heroOverlay}>
          <View style={styles.heroContent}>
            <View style={styles.heroMeta}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeIcon}>{getItemIcon(item.type)}</Text>
                <Text style={styles.typeBadgeText}>{item.type}</Text>
              </View>
              {item.metadata?.reading_time && (
                <View style={styles.timeBadge}>
                  <Clock size={14} color={Colors.background} />
                  <Text style={styles.timeBadgeText}>{item.metadata.reading_time} min</Text>
                </View>
              )}
              {item.type === 'cheese' && (
                <View style={styles.ratingBadge}>
                  <Star size={14} color="#FFD700" fill="#FFD700" />
                  <Text style={styles.ratingText}>4.{Math.floor(Math.random() * 3) + 6}</Text>
                </View>
              )}
            </View>
            
            <Text style={styles.heroTitle} numberOfLines={2}>
              {item.title}
            </Text>
            
            {item.metadata?.origin_country && (
              <View style={styles.heroLocation}>
                <MapPin size={16} color="rgba(255, 255, 255, 0.9)" />
                <Text style={styles.heroLocationText}>
                  {item.metadata.origin_country}
                </Text>
              </View>
            )}
            
            <Text style={styles.heroDescription} numberOfLines={3}>
              {item.description}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Discover</Text>
          <Text style={styles.subtitle}>Explore the world of cheese</Text>
        </View>
      </View>

      <SearchBar 
        placeholder="Search everything..."
        onSearch={(query) => router.push(`/discover?q=${encodeURIComponent(query)}`)}
        onFilter={() => {}}
      />

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {filterOptions.map((filter) => {
          const isActive = activeFilter === filter.key;
          const IconComponent = filter.icon;
          const itemCount = filter.key === 'all' 
            ? items.length 
            : items.filter(i => {
                if (filter.key === 'cheese') return i.type === 'cheese';
                if (filter.key === 'articles') return i.type === 'article';
                if (filter.key === 'recipes') return i.type === 'recipe';
                return false;
              }).length;

          return (
            <TouchableOpacity
              key={filter.key}
              style={styles.filterItem}
              onPress={() => setActiveFilter(filter.key as any)}
            >
              <IconComponent 
                size={20} 
                color={isActive ? filter.color : Colors.subtleText} 
              />
              <Text style={[
                styles.filterText,
                { color: isActive ? filter.color : Colors.subtleText }
              ]}>
                {filter.label}
              </Text>
              {itemCount > 0 && (
                <Text style={[
                  styles.filterCount,
                  { color: isActive ? filter.color : Colors.subtleText }
                ]}>
                  {itemCount}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingSpinner} />
            <Text style={styles.loadingText}>Discovering amazing content...</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>No items found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your search or filters to discover more content</Text>
          </View>
        ) : (
          <View style={styles.heroContainer}>
            {items.map(item => renderHeroCard(item))}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
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
  filterContainer: {
    marginTop: Layout.spacing.s,
    marginBottom: Layout.spacing.s,
  },
  filterContent: {
    paddingHorizontal: Layout.spacing.m,
    gap: Layout.spacing.xl,
  },
  filterItem: {
    alignItems: 'center',
    gap: Layout.spacing.xs,
    minWidth: 60,
  },
  filterText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
    textAlign: 'center',
  },
  filterCount: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodyMedium,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  heroContainer: {
    paddingHorizontal: Layout.spacing.m,
    paddingTop: Layout.spacing.s,
    gap: Layout.spacing.l,
  },
  heroCard: {
    width: screenWidth - (Layout.spacing.m * 2),
    height: 320,
    borderRadius: Layout.borderRadius.large,
    overflow: 'hidden',
    ...Layout.shadow.large,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    ...Platform.select({
      web: {
        objectFit: 'cover',
      },
    }),
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%)',
    justifyContent: 'flex-end',
  },
  heroContent: {
    padding: Layout.spacing.l,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.m,
    gap: Layout.spacing.s,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(230, 126, 34, 0.95)',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
    borderRadius: Layout.borderRadius.medium,
    gap: Layout.spacing.xs,
  },
  typeIcon: {
    fontSize: Typography.sizes.sm,
  },
  typeBadgeText: {
    color: Colors.background,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
    textTransform: 'capitalize',
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
  heroTitle: {
    fontSize: Typography.sizes['2xl'],
    fontFamily: Typography.fonts.heading,
    color: Colors.background,
    marginBottom: Layout.spacing.s,
    lineHeight: Typography.sizes['2xl'] * Typography.lineHeights.tight,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.xs,
    marginBottom: Layout.spacing.m,
  },
  heroLocationText: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  heroDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    lineHeight: Typography.sizes.base * Typography.lineHeights.normal,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xl,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Layout.spacing.l,
  },
  emptyTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
    marginBottom: Layout.spacing.s,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    textAlign: 'center',
    lineHeight: Typography.sizes.base * Typography.lineHeights.normal,
  },
  bottomSpacing: {
    height: Layout.spacing.xl,
  },
});