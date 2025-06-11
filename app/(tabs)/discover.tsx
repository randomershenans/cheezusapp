import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, TouchableOpacity, Image, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Filter, Grid2x2 as Grid, List, Clock, MapPin } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import SearchBar from '@/components/SearchBar';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

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

export default function DiscoverScreen() {
  const router = useRouter();
  const { q } = useLocalSearchParams();
  const [items, setItems] = useState<DiscoverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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

  const getItemColor = (type: string): string => {
    switch (type) {
      case 'cheese': return '#FFF0DB';
      case 'recipe': return '#FFE8EC';
      case 'article': return '#E8F4FF';
      default: return '#F5F5F5';
    }
  };

  const renderGridItem = (item: DiscoverItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.gridItem}
      onPress={() => handleItemPress(item)}
    >
      <Image source={{ uri: item.image_url }} style={styles.gridImage} />
      <View style={styles.gridContent}>
        <View style={styles.itemMeta}>
          <View style={[styles.typeIcon, { backgroundColor: getItemColor(item.type) }]}>
            <Text style={styles.itemIcon}>{getItemIcon(item.type)}</Text>
          </View>
          <Text style={styles.itemType}>{item.type}</Text>
        </View>
        <Text style={styles.gridTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.gridDescription} numberOfLines={2}>
          {item.description}
        </Text>
        {item.metadata?.origin_country && (
          <View style={styles.metadataContainer}>
            <MapPin size={12} color={Colors.subtleText} />
            <Text style={styles.metadataText}>{item.metadata.origin_country}</Text>
          </View>
        )}
        {item.metadata?.reading_time && (
          <View style={styles.metadataContainer}>
            <Clock size={12} color={Colors.subtleText} />
            <Text style={styles.metadataText}>{item.metadata.reading_time} min read</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderListItem = (item: DiscoverItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.listItem}
      onPress={() => handleItemPress(item)}
    >
      <Image source={{ uri: item.image_url }} style={styles.listImage} />
      <View style={styles.listContent}>
        <View style={styles.itemMeta}>
          <View style={[styles.typeIcon, { backgroundColor: getItemColor(item.type) }]}>
            <Text style={styles.itemIcon}>{getItemIcon(item.type)}</Text>
          </View>
          <Text style={styles.itemType}>{item.type}</Text>
        </View>
        <Text style={styles.listTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.listDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.listMetadata}>
          {item.metadata?.origin_country && (
            <View style={styles.metadataContainer}>
              <MapPin size={12} color={Colors.subtleText} />
              <Text style={styles.metadataText}>{item.metadata.origin_country}</Text>
            </View>
          )}
          {item.metadata?.reading_time && (
            <View style={styles.metadataContainer}>
              <Clock size={12} color={Colors.subtleText} />
              <Text style={styles.metadataText}>{item.metadata.reading_time} min</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Discover</Text>
          <Text style={styles.subtitle}>Explore the world of cheese</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.viewToggle, viewMode === 'list' && styles.viewToggleActive]}
            onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? (
              <List size={18} color={viewMode === 'list' ? Colors.primary : Colors.text} />
            ) : (
              <Grid size={18} color={viewMode === 'grid' ? Colors.primary : Colors.text} />
            )}
          </TouchableOpacity>
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
        {[
          { key: 'all', label: 'All', count: items.length },
          { key: 'cheese', label: 'Cheeses', count: items.filter(i => i.type === 'cheese').length },
          { key: 'articles', label: 'Articles', count: items.filter(i => i.type === 'article').length },
          { key: 'recipes', label: 'Recipes', count: items.filter(i => i.type === 'recipe').length },
        ].map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterButton,
              activeFilter === filter.key && styles.filterButtonActive
            ]}
            onPress={() => setActiveFilter(filter.key as any)}
          >
            <Text style={[
              styles.filterText,
              activeFilter === filter.key && styles.filterTextActive
            ]}>
              {filter.label}
            </Text>
            {filter.count > 0 && (
              <View style={[
                styles.filterCount,
                activeFilter === filter.key && styles.filterCountActive
              ]}>
                <Text style={[
                  styles.filterCountText,
                  activeFilter === filter.key && styles.filterCountTextActive
                ]}>
                  {filter.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
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
          <View style={viewMode === 'grid' ? styles.gridContainer : styles.listContainer}>
            {items.map(item => 
              viewMode === 'grid' ? renderGridItem(item) : renderListItem(item)
            )}
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
  headerActions: {
    flexDirection: 'row',
    gap: Layout.spacing.s,
  },
  viewToggle: {
    padding: Layout.spacing.s,
    borderRadius: Layout.borderRadius.medium,
    backgroundColor: Colors.backgroundSecondary,
  },
  viewToggleActive: {
    backgroundColor: '#FFF0DB',
  },
  filterContainer: {
    marginVertical: Layout.spacing.s,
  },
  filterContent: {
    paddingHorizontal: Layout.spacing.m,
    gap: Layout.spacing.s,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
    borderRadius: Layout.borderRadius.large,
    backgroundColor: Colors.backgroundSecondary,
    gap: Layout.spacing.xs,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
  },
  filterTextActive: {
    color: Colors.background,
  },
  filterCount: {
    backgroundColor: Colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  filterCountActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterCountText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.subtleText,
  },
  filterCountTextActive: {
    color: Colors.background,
  },
  content: {
    flex: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Layout.spacing.m,
    gap: Layout.spacing.m,
  },
  gridItem: {
    width: '47%',
    backgroundColor: Colors.card,
    borderRadius: Layout.borderRadius.large,
    overflow: 'hidden',
    ...Layout.shadow.medium,
  },
  gridImage: {
    width: '100%',
    height: 140,
    ...Platform.select({
      web: {
        objectFit: 'cover',
      },
    }),
  },
  gridContent: {
    padding: Layout.spacing.m,
  },
  gridTitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
    marginBottom: Layout.spacing.xs,
    lineHeight: Typography.sizes.base * Typography.lineHeights.tight,
  },
  gridDescription: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    lineHeight: Typography.sizes.sm * Typography.lineHeights.normal,
    marginBottom: Layout.spacing.s,
  },
  listContainer: {
    paddingHorizontal: Layout.spacing.m,
    gap: Layout.spacing.m,
  },
  listItem: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Layout.borderRadius.large,
    overflow: 'hidden',
    ...Layout.shadow.medium,
  },
  listImage: {
    width: 120,
    height: 120,
    ...Platform.select({
      web: {
        objectFit: 'cover',
      },
    }),
  },
  listContent: {
    flex: 1,
    padding: Layout.spacing.m,
  },
  listTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
    marginBottom: Layout.spacing.xs,
    lineHeight: Typography.sizes.lg * Typography.lineHeights.tight,
  },
  listDescription: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    lineHeight: Typography.sizes.sm * Typography.lineHeights.normal,
    marginBottom: Layout.spacing.s,
  },
  listMetadata: {
    flexDirection: 'row',
    gap: Layout.spacing.m,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.s,
    gap: Layout.spacing.s,
  },
  typeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemIcon: {
    fontSize: Typography.sizes.sm,
  },
  itemType: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.subtleText,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wide,
  },
  metadataContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metadataText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
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