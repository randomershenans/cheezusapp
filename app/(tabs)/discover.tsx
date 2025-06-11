import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, TouchableOpacity, Image, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Filter, Grid, List } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import SearchBar from '@/components/SearchBar';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';

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

  const renderGridItem = (item: DiscoverItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.gridItem}
      onPress={() => handleItemPress(item)}
    >
      <Image source={{ uri: item.image_url }} style={styles.gridImage} />
      <View style={styles.gridContent}>
        <View style={styles.itemMeta}>
          <Text style={styles.itemIcon}>{getItemIcon(item.type)}</Text>
          <Text style={styles.itemType}>{item.type}</Text>
        </View>
        <Text style={styles.gridTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.gridDescription} numberOfLines={2}>
          {item.description}
        </Text>
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
          <Text style={styles.itemIcon}>{getItemIcon(item.type)}</Text>
          <Text style={styles.itemType}>{item.type}</Text>
        </View>
        <Text style={styles.listTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.listDescription} numberOfLines={2}>
          {item.description}
        </Text>
        {item.metadata?.origin_country && (
          <Text style={styles.metadata}>
            {item.metadata.origin_country}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.viewToggle}
            onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? (
              <List size={20} color={Colors.text} />
            ) : (
              <Grid size={20} color={Colors.text} />
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
        {['all', 'cheese', 'articles', 'recipes'].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterButton,
              activeFilter === filter && styles.filterButtonActive
            ]}
            onPress={() => setActiveFilter(filter as any)}
          >
            <Text style={[
              styles.filterText,
              activeFilter === filter && styles.filterTextActive
            ]}>
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No items found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your search or filters</Text>
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
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: Colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Layout.spacing.s,
  },
  viewToggle: {
    padding: Layout.spacing.s,
    borderRadius: Layout.borderRadius.small,
    backgroundColor: Colors.backgroundSecondary,
  },
  filterContainer: {
    marginVertical: Layout.spacing.s,
  },
  filterContent: {
    paddingHorizontal: Layout.spacing.m,
    gap: Layout.spacing.s,
  },
  filterButton: {
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
    borderRadius: Layout.borderRadius.large,
    backgroundColor: Colors.backgroundSecondary,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: Colors.text,
  },
  filterTextActive: {
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
    borderRadius: Layout.borderRadius.medium,
    overflow: 'hidden',
    ...Layout.shadow.small,
  },
  gridImage: {
    width: '100%',
    height: 120,
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
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.text,
    marginBottom: Layout.spacing.xs,
  },
  gridDescription: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: Colors.subtleText,
    lineHeight: 16,
  },
  listContainer: {
    paddingHorizontal: Layout.spacing.m,
    gap: Layout.spacing.m,
  },
  listItem: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Layout.borderRadius.medium,
    overflow: 'hidden',
    ...Layout.shadow.small,
  },
  listImage: {
    width: 100,
    height: 100,
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
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.text,
    marginBottom: Layout.spacing.xs,
  },
  listDescription: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: Colors.subtleText,
    lineHeight: 20,
    marginBottom: Layout.spacing.xs,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.xs,
    gap: Layout.spacing.xs,
  },
  itemIcon: {
    fontSize: 14,
  },
  itemType: {
    fontSize: 10,
    fontFamily: 'Poppins-Medium',
    color: Colors.subtleText,
    textTransform: 'uppercase',
  },
  metadata: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: Colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xl,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: Colors.subtleText,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xl,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.text,
    marginBottom: Layout.spacing.s,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: Colors.subtleText,
    textAlign: 'center',
  },
  bottomSpacing: {
    height: Layout.spacing.xl,
  },
});