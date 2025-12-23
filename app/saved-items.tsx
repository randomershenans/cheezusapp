import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bookmark } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

type SavedItem = {
  id: string;
  item_type: 'article' | 'recipe' | 'pairing';
  item_id: string;
  created_at: string;
  item_data?: any;
};

export default function SavedItemsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<'all' | 'article' | 'recipe' | 'pairing'>('all');
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSavedItems();
    }
  }, [user, activeFilter]);

  const fetchSavedItems = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('saved_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (activeFilter !== 'all') {
        query = query.eq('item_type', activeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch the actual item data for each saved item
      if (data) {
        const itemsWithData = await Promise.all(
          data.map(async (item) => {
            let itemData = null;
            
            if (item.item_type === 'pairing') {
              const { data: pairingData } = await supabase
                .from('cheese_pairings')
                .select('pairing, type, description, featured_image_url')
                .eq('id', item.item_id)
                .single();
              itemData = pairingData;
            } else {
              // article or recipe
              const { data: cheezopediaData } = await supabase
                .from('cheezopedia_entries')
                .select('title, description, image_url, content_type, reading_time_minutes')
                .eq('id', item.item_id)
                .single();
              itemData = cheezopediaData;
            }

            return { ...item, item_data: itemData };
          })
        );

        setSavedItems(itemsWithData);
      }
    } catch (error) {
      console.error('Error fetching saved items:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSavedItems();
  };

  const handleRemoveBookmark = async (itemId: string, itemType: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('saved_items')
        .delete()
        .eq('user_id', user.id)
        .eq('item_type', itemType)
        .eq('item_id', itemId);

      if (!error) {
        setSavedItems(savedItems.filter(item => item.item_id !== itemId));
      }
    } catch (error) {
      console.error('Error removing bookmark:', error);
    }
  };

  const handleItemPress = (item: SavedItem) => {
    if (item.item_type === 'pairing') {
      router.push(`/pairing/${item.item_id}`);
    } else {
      router.push(`/cheezopedia/${item.item_id}`);
    }
  };

  const getFilterCounts = () => {
    return {
      all: savedItems.length,
      article: savedItems.filter(i => i.item_type === 'article').length,
      recipe: savedItems.filter(i => i.item_type === 'recipe').length,
      pairing: savedItems.filter(i => i.item_type === 'pairing').length,
    };
  };

  const counts = getFilterCounts();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Items</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterScrollView}
        contentContainerStyle={styles.filterContainer}
      >
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'all' && styles.filterButtonActive]}
          onPress={() => setActiveFilter('all')}
        >
          <Text style={[styles.filterText, activeFilter === 'all' && styles.filterTextActive]}>
            All ({counts.all})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'article' && styles.filterButtonActive]}
          onPress={() => setActiveFilter('article')}
        >
          <Text style={[styles.filterText, activeFilter === 'article' && styles.filterTextActive]}>
            📚 Articles ({counts.article})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'recipe' && styles.filterButtonActive]}
          onPress={() => setActiveFilter('recipe')}
        >
          <Text style={[styles.filterText, activeFilter === 'recipe' && styles.filterTextActive]}>
            🍽️ Recipes ({counts.recipe})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'pairing' && styles.filterButtonActive]}
          onPress={() => setActiveFilter('pairing')}
        >
          <Text style={[styles.filterText, activeFilter === 'pairing' && styles.filterTextActive]}>
            🍷 Pairings ({counts.pairing})
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Loading...</Text>
          </View>
        ) : savedItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Bookmark size={64} color={Colors.subtleText} />
            <Text style={styles.emptyTitle}>No saved items yet</Text>
            <Text style={styles.emptyText}>
              Tap the bookmark icon on articles, recipes, and pairings to save them here
            </Text>
          </View>
        ) : (
          <View style={styles.itemsList}>
            {savedItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.itemCard}
                onPress={() => handleItemPress(item)}
              >
                {item.item_data && (
                  <>
                    <Image
                      source={{ uri: item.item_data.image_url || item.item_data.featured_image_url }}
                      style={styles.itemImage}
                    />
                    <View style={styles.itemContent}>
                      <View style={styles.itemHeader}>
                        <View style={styles.itemTypeBadge}>
                          <Text style={styles.itemTypeBadgeText}>
                            {item.item_type === 'pairing' ? item.item_data.type : item.item_data.content_type}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => handleRemoveBookmark(item.item_id, item.item_type)}
                        >
                          <Bookmark size={20} color={Colors.primary} fill={Colors.primary} />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.itemTitle}>
                        {item.item_data.title || item.item_data.pairing}
                      </Text>
                      <Text style={styles.itemDescription} numberOfLines={2}>
                        {item.item_data.description}
                      </Text>
                      <Text style={styles.itemDate}>
                        Saved {new Date(item.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
  },
  filterScrollView: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.m,
    gap: Layout.spacing.s,
  },
  filterButton: {
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
    borderRadius: Layout.borderRadius.large,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
  },
  filterTextActive: {
    color: Colors.background,
  },
  content: {
    flex: 1,
  },
  itemsList: {
    padding: Layout.spacing.m,
    gap: Layout.spacing.m,
  },
  itemCard: {
    backgroundColor: Colors.card,
    borderRadius: Layout.borderRadius.large,
    overflow: 'hidden',
    marginBottom: Layout.spacing.m,
    ...Layout.shadow.small,
  },
  itemImage: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.border,
  },
  itemContent: {
    padding: Layout.spacing.m,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.s,
  },
  itemTypeBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Layout.spacing.s,
    paddingVertical: 4,
    borderRadius: Layout.borderRadius.small,
  },
  itemTypeBadgeText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.background,
    textTransform: 'capitalize',
  },
  removeButton: {
    padding: Layout.spacing.xs,
  },
  itemTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
    marginBottom: Layout.spacing.xs,
  },
  itemDescription: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    lineHeight: 20,
    marginBottom: Layout.spacing.s,
  },
  itemDate: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.spacing.xl,
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
    marginTop: Layout.spacing.m,
    marginBottom: Layout.spacing.s,
  },
  emptyText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    textAlign: 'center',
    lineHeight: 24,
  },
});
