import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, TouchableOpacity, Image, Platform, Alert, TextInput, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Star, Trash2, Pen, TrendingUp, Award, Heart, BarChart3, Search, Filter, X, Grid, List, Plus } from 'lucide-react-native';
import NotificationBell from '@/components/NotificationBell';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

type CheeseBoxEntry = {
  id: string;
  rating?: number;
  notes?: string;
  created_at: string;
  producer_cheese: {
    id: string;
    full_name: string;
    producer_name: string;
    product_name?: string;
    image_url?: string;
    cheese_type: {
      id: string;
      name: string;
      type: string;
      origin_country?: string;
    };
  };
};

type WishlistEntry = {
  id: string;
  created_at: string;
  notes?: string;
  priority?: number;
  producer_cheese: {
    id: string;
    full_name: string;
    producer_name: string;
    product_name?: string;
    image_url?: string;
    cheese_type: {
      id: string;
      name: string;
      type: string;
      origin_country?: string;
    };
  };
};

type FilterType = 'all' | 'rated' | 'unrated' | string;
type ViewMode = 'grid' | 'list';
type TabType = 'tried' | 'wishlist';

export default function CheeseBoxScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('tried');
  const [entries, setEntries] = useState<CheeseBoxEntry[]>([]);
  const [wishlistEntries, setWishlistEntries] = useState<WishlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [stats, setStats] = useState({
    totalCheeses: 0,
    averageRating: 0,
    favoriteType: '',
  });

  useEffect(() => {
    if (user) {
      fetchCheeseBoxEntries();
      fetchWishlistEntries();
    }
  }, [user]);

  const fetchCheeseBoxEntries = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('cheese_box_entries')
        .select(`
          id,
          rating,
          notes,
          created_at,
          producer_cheese:producer_cheeses!cheese_id (
            id,
            full_name,
            producer_name,
            product_name,
            image_url,
            cheese_type:cheese_types!cheese_type_id (
              id,
              name,
              type,
              origin_country
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setEntries(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching cheese box entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWishlistEntries = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('wishlists')
        .select(`
          id,
          notes,
          priority,
          created_at,
          producer_cheese:producer_cheeses!cheese_id (
            id,
            full_name,
            producer_name,
            product_name,
            image_url,
            cheese_type:cheese_types!cheese_type_id (
              id,
              name,
              type,
              origin_country
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setWishlistEntries(data || []);
    } catch (error) {
      console.error('Error fetching wishlist entries:', error);
    }
  };

  const handleRemoveFromWishlist = async (wishlistId: string) => {
    try {
      const { error } = await supabase
        .from('wishlists')
        .delete()
        .eq('id', wishlistId);

      if (error) throw error;
      
      // Refresh wishlist
      fetchWishlistEntries();
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      Alert.alert('Error', 'Failed to remove from wishlist');
    }
  };

  const handleMoveToCheeseBox = async (wishlistEntry: WishlistEntry) => {
    // Navigate to cheese details where they can add it to their box
    router.push(`/producer-cheese/${wishlistEntry.producer_cheese.id}`);
  };

  // Get unique cheese types for filters
  const cheeseTypes = useMemo(() => {
    const types = new Set(entries.map(e => e.producer_cheese?.cheese_type?.type).filter(Boolean));
    return Array.from(types).sort();
  }, [entries]);

  // Filter and search logic
  const filteredEntries = useMemo(() => {
    let filtered = entries;

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.producer_cheese?.full_name?.toLowerCase().includes(query) ||
        entry.producer_cheese?.cheese_type?.name?.toLowerCase().includes(query) ||
        entry.producer_cheese?.cheese_type?.type?.toLowerCase().includes(query) ||
        entry.notes?.toLowerCase().includes(query)
      );
    }

    // Apply filters
    if (selectedFilter === 'rated') {
      filtered = filtered.filter(e => e.rating && e.rating > 0);
    } else if (selectedFilter === 'unrated') {
      filtered = filtered.filter(e => !e.rating);
    } else if (selectedFilter !== 'all') {
      filtered = filtered.filter(e => e.producer_cheese?.cheese_type?.type === selectedFilter);
    }

    return filtered;
  }, [entries, searchQuery, selectedFilter]);

  const calculateStats = (entries: CheeseBoxEntry[]) => {
    const totalCheeses = entries.length;
    const ratingsSum = entries.reduce((sum, entry) => sum + (entry.rating || 0), 0);
    const averageRating = totalCheeses > 0 ? ratingsSum / totalCheeses : 0;
    
    // Find most common cheese type
    const typeCounts = entries.reduce((acc, entry) => {
      const type = entry.producer_cheese?.cheese_type?.type;
      if (type) {
        acc[type] = (acc[type] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const favoriteType = Object.keys(typeCounts).reduce((a, b) => 
      typeCounts[a] > typeCounts[b] ? a : b, ''
    );

    setStats({
      totalCheeses,
      averageRating,
      favoriteType,
    });
  };

  const handleDeleteEntry = async (entryId: string) => {
    Alert.alert(
      'Remove Cheese',
      'Are you sure you want to remove this cheese from your box?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('cheese_box_entries')
                .delete()
                .eq('id', entryId);

              if (error) throw error;
              
              // Refresh the list
              fetchCheeseBoxEntries();
            } catch (error) {
              console.error('Error deleting entry:', error);
              Alert.alert('Error', 'Failed to remove cheese from your box');
            }
          },
        },
      ]
    );
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        size={14}
        color={index < rating ? '#FFD700' : '#E0E0E0'}
        fill={index < rating ? '#FFD700' : 'none'}
      />
    ));
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authPrompt}>
          <View style={styles.authIcon}>
            <Heart size={48} color={Colors.primary} />
          </View>
          <Text style={styles.authTitle}>Your Personal Cheese Journey</Text>
          <Text style={styles.authSubtitle}>
            Track your cheese tastings, rate your favorites, and build your personal cheese collection. 
            Join thousands of cheese enthusiasts discovering amazing flavors.
          </Text>
          <TouchableOpacity
            style={styles.authButton}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.authButtonText}>Start Your Journey</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.authSecondaryButton}
            onPress={() => router.push('/auth/signup')}
          >
            <Text style={styles.authSecondaryButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Cheese Box</Text>
          <Text style={styles.subtitle}>Your personal cheese collection</Text>
        </View>
        <NotificationBell />
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tried' && styles.tabActive]}
          onPress={() => setActiveTab('tried')}
        >
          <Star size={16} color={activeTab === 'tried' ? Colors.text : Colors.subtleText} />
          <Text style={[styles.tabText, activeTab === 'tried' && styles.tabTextActive]}>
            Tried ({entries.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'wishlist' && styles.tabActive]}
          onPress={() => setActiveTab('wishlist')}
        >
          <Heart size={16} color={activeTab === 'wishlist' ? '#E91E63' : Colors.subtleText} />
          <Text style={[styles.tabText, activeTab === 'wishlist' && styles.tabTextActive]}>
            Wishlist ({wishlistEntries.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'tried' && (
        <>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <TrendingUp size={20} color={Colors.primary} />
            </View>
            <Text style={styles.statNumber}>{stats.totalCheeses}</Text>
            <Text style={styles.statLabel}>Cheeses Tried</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Star size={20} color="#FFD700" />
            </View>
            <Text style={styles.statNumber}>{stats.averageRating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Award size={20} color={Colors.success} />
            </View>
            <Text style={styles.statNumber}>{stats.favoriteType || 'N/A'}</Text>
            <Text style={styles.statLabel}>Favorite Type</Text>
          </View>
        </View>

        {entries.length > 0 && (
          <>
            <TouchableOpacity
              style={styles.analyticsButton}
              onPress={() => router.push('/analytics')}
            >
              <Text style={styles.analyticsButtonText}>Elite Analytics</Text>
              <Text style={styles.analyticsButtonSubtext}>
                Deep dive into your cheese stats
              </Text>
            </TouchableOpacity>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <View style={styles.searchInputWrapper}>
                <Search size={18} color={Colors.subtleText} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search your collection..."
                  placeholderTextColor={Colors.subtleText}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={18} color={Colors.subtleText} />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={[styles.filterButton, showFilters && styles.filterButtonActive]}
                onPress={() => setShowFilters(!showFilters)}
              >
                <Filter size={18} color={showFilters ? Colors.primary : Colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? 
                  <List size={18} color={Colors.text} /> : 
                  <Grid size={18} color={Colors.text} />
                }
              </TouchableOpacity>
            </View>

            {/* Filter Chips */}
            {showFilters && (
              <View style={styles.filtersContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.filterChips}>
                    <TouchableOpacity
                      style={[styles.filterChip, selectedFilter === 'all' && styles.filterChipActive]}
                      onPress={() => setSelectedFilter('all')}
                    >
                      <Text style={[styles.filterChipText, selectedFilter === 'all' && styles.filterChipTextActive]}>
                        All
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterChip, selectedFilter === 'rated' && styles.filterChipActive]}
                      onPress={() => setSelectedFilter('rated')}
                    >
                      <Text style={[styles.filterChipText, selectedFilter === 'rated' && styles.filterChipTextActive]}>
                        Rated
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterChip, selectedFilter === 'unrated' && styles.filterChipActive]}
                      onPress={() => setSelectedFilter('unrated')}
                    >
                      <Text style={[styles.filterChipText, selectedFilter === 'unrated' && styles.filterChipTextActive]}>
                        Unrated
                      </Text>
                    </TouchableOpacity>
                    {cheeseTypes.map(type => (
                      <TouchableOpacity
                        key={type}
                        style={[styles.filterChip, selectedFilter === type && styles.filterChipActive]}
                        onPress={() => setSelectedFilter(type)}
                      >
                        <Text style={[styles.filterChipText, selectedFilter === type && styles.filterChipTextActive]}>
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
          </>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingSpinner} />
            <Text style={styles.loadingText}>Loading your cheese collection...</Text>
          </View>
        ) : entries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>🧀</Text>
            </View>
            <Text style={styles.emptyTitle}>Your cheese box is empty</Text>
            <Text style={styles.emptySubtitle}>
              Start building your cheese collection by adding your first tasting! 
              Discover new flavors and track your favorites.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/add-cheese')}
            >
              <Plus size={20} color={Colors.background} />
              <Text style={styles.emptyButtonText}>Add Your First Cheese</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.entriesContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Collection</Text>
              <Text style={styles.sectionCount}>
                {filteredEntries.length} {filteredEntries.length === entries.length ? '' : `of ${entries.length} `}cheeses
              </Text>
            </View>
            <View style={viewMode === 'grid' ? styles.gridContainer : styles.listContainer}>
            {filteredEntries.map((entry) => {
              // Hide generic/unknown producers
              const isGeneric = entry.producer_cheese?.producer_name?.toLowerCase().includes('generic') || 
                                entry.producer_cheese?.producer_name?.toLowerCase().includes('unknown');
              const displayName = isGeneric 
                ? (entry.producer_cheese?.cheese_type?.name || 'Unknown Cheese')
                : (entry.producer_cheese?.full_name || 'Unknown Cheese');
              
              return (
              <View key={entry.id} style={viewMode === 'grid' ? styles.entryCard : styles.entryCardList}>
                <TouchableOpacity
                  style={styles.entryContent}
                  onPress={() => router.push(`/producer-cheese/${entry.producer_cheese?.id}`)}
                >
                  <View style={styles.imageWrapper}>
                    <Image 
                      source={{ 
                        uri: entry.producer_cheese?.image_url || 'https://via.placeholder.com/90?text=Cheese'
                      }} 
                      style={viewMode === 'grid' ? styles.entryImage : styles.entryImageList}
                    />
                    <TouchableOpacity
                      style={styles.deleteButtonOverlay}
                      onPress={() => handleDeleteEntry(entry.id)}
                    >
                      <Trash2 size={16} color={Colors.background} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.entryInfo}>
                    <Text style={styles.entryName} numberOfLines={2}>{displayName || 'Unknown Cheese'}</Text>
                    <Text style={styles.entryType}>
                      {entry.producer_cheese?.cheese_type?.name || 'Unknown'} • {entry.producer_cheese?.cheese_type?.type || 'Cheese'}
                    </Text>
                    {entry.producer_cheese?.cheese_type?.origin_country ? (
                      <Text style={styles.entryOrigin}>
                        📍 {entry.producer_cheese.cheese_type.origin_country}
                      </Text>
                    ) : null}
                    {entry.rating ? (
                      <View style={styles.ratingContainer}>
                        {renderStars(entry.rating)}
                        <Text style={styles.ratingText}>({entry.rating}/5)</Text>
                      </View>
                    ) : null}
                    {entry.notes ? (
                      <Text style={styles.entryNotes} numberOfLines={2}>
                        "{entry.notes}"
                      </Text>
                    ) : null}
                    <Text style={styles.entryDate}>
                      Added {new Date(entry.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            );
            })}
            </View>
          </View>
        )}
        </>
        )}

        {/* Wishlist Tab Content */}
        {activeTab === 'wishlist' && (
          <>
            {wishlistEntries.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Heart size={48} color="#E91E63" />
                </View>
                <Text style={styles.emptyTitle}>Your Wishlist is Empty</Text>
                <Text style={styles.emptySubtitle}>
                  Save cheeses you want to try by tapping the heart icon on any cheese page
                </Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => router.push('/(tabs)/discover')}
                >
                  <Search size={20} color={Colors.background} />
                  <Text style={styles.emptyButtonText}>Discover Cheeses</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.entriesContainer}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Want to Try</Text>
                  <Text style={styles.sectionCount}>
                    {wishlistEntries.length} cheeses
                  </Text>
                </View>
                <View style={styles.listContainer}>
                  {wishlistEntries.map((entry) => {
                    const cheese = entry.producer_cheese as any;
                    const isGeneric = cheese?.producer_name?.toLowerCase().includes('generic') || 
                                      cheese?.producer_name?.toLowerCase().includes('unknown');
                    const displayName = isGeneric ? cheese?.cheese_type?.name : cheese?.full_name;
                    
                    return (
                      <View key={entry.id} style={styles.wishlistCard}>
                        <TouchableOpacity
                          style={styles.wishlistContent}
                          onPress={() => handleMoveToCheeseBox(entry)}
                        >
                          <Image 
                            source={{ 
                              uri: cheese?.image_url || 'https://via.placeholder.com/90?text=Cheese'
                            }} 
                            style={styles.wishlistImage}
                          />
                          <View style={styles.wishlistInfo}>
                            <Text style={styles.wishlistName} numberOfLines={2}>{displayName || 'Unknown Cheese'}</Text>
                            <Text style={styles.wishlistType}>
                              {cheese?.cheese_type?.name || 'Unknown'} • {cheese?.cheese_type?.type || 'Cheese'}
                            </Text>
                            <Text style={styles.wishlistDate}>
                              Added {new Date(entry.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </Text>
                          </View>
                        </TouchableOpacity>
                        <View style={styles.wishlistActions}>
                          <TouchableOpacity
                            style={styles.wishlistTryButton}
                            onPress={() => handleMoveToCheeseBox(entry)}
                          >
                            <Text style={styles.wishlistTryButtonText}>Try It</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.wishlistRemoveButton}
                            onPress={() => handleRemoveFromWishlist(entry.id)}
                          >
                            <X size={16} color={Colors.subtleText} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </>
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
  notificationButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: Typography.fonts.bodySemiBold,
  },
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: Layout.spacing.m,
    marginBottom: Layout.spacing.m,
    gap: Layout.spacing.s,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Layout.spacing.s,
    paddingHorizontal: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    backgroundColor: Colors.backgroundSecondary,
    gap: Layout.spacing.xs,
  },
  tabActive: {
    backgroundColor: '#FEF9E7',
    borderWidth: 1,
    borderColor: '#FCD95B',
  },
  tabText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  tabTextActive: {
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Layout.spacing.m,
    marginBottom: Layout.spacing.l,
    gap: Layout.spacing.m,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    alignItems: 'center',
    ...Layout.shadow.small,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FFFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Layout.spacing.s,
  },
  statNumber: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.display,
    color: Colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.subtleText,
    textAlign: 'center',
  },
  analyticsButton: {
    marginHorizontal: Layout.spacing.m,
    marginBottom: Layout.spacing.l,
    backgroundColor: '#FCD95B',
    borderRadius: Layout.borderRadius.large,
    padding: Layout.spacing.m,
    alignItems: 'center',
    ...Layout.shadow.small,
  },
  analyticsButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: '#1F2937',
    marginBottom: 4,
  },
  analyticsButtonSubtext: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: '#1F2937',
  },
  authPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xl,
  },
  authIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF0DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Layout.spacing.l,
  },
  authTitle: {
    fontSize: Typography.sizes['2xl'],
    fontFamily: Typography.fonts.heading,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Layout.spacing.m,
    letterSpacing: Typography.letterSpacing.tight,
  },
  authSubtitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    textAlign: 'center',
    lineHeight: Typography.sizes.base * Typography.lineHeights.normal,
    marginBottom: Layout.spacing.xl,
  },
  authButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Layout.spacing.xl,
    paddingVertical: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    marginBottom: Layout.spacing.m,
    ...Layout.shadow.medium,
  },
  authButtonText: {
    color: Colors.background,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
  },
  authSecondaryButton: {
    backgroundColor: '#FFF0DB',
    paddingHorizontal: Layout.spacing.xl,
    paddingVertical: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
  },
  authSecondaryButtonText: {
    color: Colors.primary,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
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
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF0DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Layout.spacing.l,
  },
  emptyIconText: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Layout.spacing.s,
  },
  emptySubtitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    textAlign: 'center',
    lineHeight: Typography.sizes.base * Typography.lineHeights.normal,
    marginBottom: Layout.spacing.xl,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Layout.spacing.l,
    paddingVertical: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    gap: Layout.spacing.s,
    ...Layout.shadow.medium,
  },
  emptyButtonText: {
    color: Colors.background,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
  },
  entriesContainer: {
    paddingHorizontal: Layout.spacing.m,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.m,
  },
  sectionTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
  },
  sectionCount: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.subtleText,
  },
  entryCard: {
    backgroundColor: Colors.card,
    borderRadius: Layout.borderRadius.large,
    width: (SCREEN_WIDTH - Layout.spacing.m * 3) / 2,
    overflow: 'hidden',
    ...Layout.shadow.medium,
  },
  entryCardList: {
    backgroundColor: Colors.card,
    borderRadius: Layout.borderRadius.large,
    overflow: 'hidden',
    marginBottom: Layout.spacing.m,
    ...Layout.shadow.medium,
  },
  entryContent: {
    flex: 1,
  },
  imageWrapper: {
    position: 'relative',
  },
  entryImage: {
    width: '100%',
    height: 140,
    ...Platform.select({
      web: {
        objectFit: 'cover',
      },
    }),
  },
  entryImageList: {
    width: '100%',
    height: 180,
    ...Platform.select({
      web: {
        objectFit: 'cover',
      },
    }),
  },
  deleteButtonOverlay: {
    position: 'absolute',
    top: Layout.spacing.s,
    right: Layout.spacing.s,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Layout.shadow.medium,
  },
  entryInfo: {
    padding: Layout.spacing.m,
  },
  entryName: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
    marginBottom: 4,
    lineHeight: Typography.sizes.base * Typography.lineHeights.tight,
  },
  entryType: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginBottom: Layout.spacing.xs,
  },
  entryOrigin: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginBottom: Layout.spacing.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.xs,
    marginBottom: Layout.spacing.xs,
  },
  ratingText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.subtleText,
  },
  entryNotes: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
    fontStyle: 'italic',
    marginBottom: Layout.spacing.xs,
    lineHeight: Typography.sizes.sm * Typography.lineHeights.normal,
  },
  entryDate: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  entryActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Layout.spacing.m,
    paddingBottom: Layout.spacing.m,
    gap: Layout.spacing.s,
  },
  actionButton: {
    padding: Layout.spacing.s,
    borderRadius: Layout.borderRadius.medium,
    backgroundColor: '#F8FFFE',
  },
  deleteButton: {
    backgroundColor: '#FFE8EC',
  },
  // Search & Filter styles
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: Layout.spacing.m,
    marginBottom: Layout.spacing.m,
    gap: Layout.spacing.s,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Layout.borderRadius.large,
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
    gap: Layout.spacing.s,
    ...Layout.shadow.small,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
    paddingVertical: 4,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: Layout.borderRadius.large,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...Layout.shadow.small,
  },
  filterButtonActive: {
    backgroundColor: '#FFF0DB',
  },
  filtersContainer: {
    marginBottom: Layout.spacing.m,
  },
  filterChips: {
    flexDirection: 'row',
    paddingHorizontal: Layout.spacing.m,
    gap: Layout.spacing.s,
  },
  filterChip: {
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
    borderRadius: Layout.borderRadius.large,
    backgroundColor: Colors.card,
    ...Layout.shadow.small,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterChipText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
  },
  filterChipTextActive: {
    color: Colors.background,
  },
  // Grid layout
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.m,
  },
  listContainer: {
    flexDirection: 'column',
  },
  bottomSpacing: {
    height: Layout.spacing.xl,
  },
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Layout.spacing.xl,
    paddingVertical: Layout.spacing.xl * 2,
  },
  // Wishlist styles
  wishlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: Layout.spacing.m,
    marginBottom: Layout.spacing.s,
    marginHorizontal: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    ...Layout.shadow.small,
  },
  wishlistContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  wishlistImage: {
    width: 60,
    height: 60,
    borderRadius: Layout.borderRadius.medium,
    marginRight: Layout.spacing.m,
  },
  wishlistInfo: {
    flex: 1,
  },
  wishlistName: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
    marginBottom: 2,
  },
  wishlistType: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginBottom: 2,
  },
  wishlistDate: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  wishlistActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.s,
  },
  wishlistTryButton: {
    backgroundColor: '#FCD95B',
    paddingVertical: Layout.spacing.xs,
    paddingHorizontal: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
  },
  wishlistTryButtonText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
  },
  wishlistRemoveButton: {
    padding: Layout.spacing.xs,
  },
});