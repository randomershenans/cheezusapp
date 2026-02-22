import React, { useState, useEffect, useMemo } from 'react';
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
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Filter,
  Grid2x2 as Grid,
  List,
  Clock,
  MapPin,
  Star,
  ChefHat,
  BookOpen,
  Utensils,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { searchUsers } from '@/lib/feed-service';
import NotificationBell from '@/components/NotificationBell';
import SearchBar from '@/components/SearchBar';
import FilterPanel, { FilterOptions, SelectedFilters } from '@/components/FilterPanel';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

const { width: screenWidth } = Dimensions.get('window');

/* ───────────────────────────── types & constants ────────────────────────── */
type DiscoverItem = {
  id: string;
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

// Expand search term with synonyms
function expandSearchTerm(term: string): string[] {
  const lower = term.toLowerCase().trim();
  const expanded = [lower];
  
  // Check if term matches any synonym group
  for (const [key, synonyms] of Object.entries(CHEESE_SYNONYMS)) {
    if (synonyms.some(s => s === lower || lower.includes(s))) {
      expanded.push(...synonyms);
      break;
    }
  }
  
  return [...new Set(expanded)];
}

// Levenshtein distance for fuzzy matching
function levenshteinDistance(str1: string, str2: string): number {
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
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[m][n];
}

// Balanced fuzzy match with Levenshtein distance
function fuzzyMatch(str: string, pattern: string): boolean {
  if (!str || !pattern) return false;
  
  str = str.toLowerCase();
  pattern = pattern.toLowerCase();
  
  // Exact substring match (highest priority)
  if (str.includes(pattern)) return true;
  
  // For very short queries (3 chars or less), be strict
  if (pattern.length <= 3) {
    return str.split(/\s+/).some(word => word.startsWith(pattern));
  }
  
  // Check if pattern matches any word in the string
  const words = str.split(/\s+/);
  for (const word of words) {
    // Exact word match
    if (word === pattern) return true;
    
    // Check prefix match with tolerance (for "camam" matching "camembert")
    const prefix = word.slice(0, pattern.length);
    const maxPrefixDistance = pattern.length <= 5 ? 1 : Math.ceil(pattern.length * 0.25); // Stricter: 25% or 1 char
    if (levenshteinDistance(prefix, pattern) <= maxPrefixDistance) return true;
    
    // Check full word match with moderate tolerance
    if (Math.abs(word.length - pattern.length) <= 3) { // Similar length words only
      const maxDistance = Math.ceil(pattern.length * 0.3); // 30% tolerance
      const distance = levenshteinDistance(word, pattern);
      if (distance <= maxDistance) return true;
    }
  }
  
  return false;
}

/* ────────────────────────────── component ───────────────────────────────── */
export default function DiscoverScreen() {
  const router = useRouter();
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

  /* ── data fetch ── */
  useEffect(() => {
    fetchDiscoverItems();
  }, [searchQuery, type, region, filter, activeFilter]);

  const fetchDiscoverItems = async () => {
    setLoading(true);
    try {
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

      // Store all items before filtering
      setAllItems(all);
      
      // Apply advanced filters
      const filtered = applyAdvancedFilters(all, selectedFilters);
      
      // Trim results
      const trimmed = filtered.slice(0, 30);
      setItems(trimmed);
    } catch (err) {
      console.error('Error fetching discover items:', err);
    } finally {
      setLoading(false);
    }
  };

  /* ── helpers ── */
  const applyAdvancedFilters = (items: DiscoverItem[], filters: SelectedFilters): DiscoverItem[] => {
    let filtered = items;

    // Country filter - only applies to items that have origin_country in metadata
    if (filters.country) {
      filtered = filtered.filter(item => 
        item.metadata?.origin_country === filters.country
      );
    }

    if (filters.cheeseType) {
      filtered = filtered.filter(item => 
        item.metadata?.cheese_type === filters.cheeseType
      );
    }

    // Add more filter logic as needed
    return filtered;
  };

  const extractFilterOptions = (): FilterOptions => {
    // Countries - currently not available in producer_cheese_stats view
    const countries: string[] = [];

    const cheeseTypes = [...new Set(
      allItems
        .filter(item => item.metadata?.cheese_type)
        .map(item => item.metadata!.cheese_type!)
    )].sort();

    return {
      countries,
      milkTypes: ['Cow', 'Goat', 'Sheep', 'Buffalo'],
      cheeseTypes,
      pairings: ['Wine', 'Beer', 'Fruit', 'Bread', 'Nuts'],
    };
  };

  const handleApplyFilters = (filters: SelectedFilters) => {
    setSelectedFilters(filters);
    const filtered = applyAdvancedFilters(allItems, filters);
    setItems(filtered.slice(0, 30));
  };

  const formatTypeBadge = (type: string): string => {
    if (type === 'producer-cheese') return 'Cheese';
    if (type === 'user') return 'Person';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const handlePress = (item: DiscoverItem) => {
    if (item.type === 'user') {
      router.push(`/profile/${item.id}`);
    } else if (item.type === 'producer-cheese') {
      router.push(`/producer-cheese/${item.id}`);
    } else if (item.type === 'cheese') {
      router.push(`/cheese/${item.id}`);
    } else {
      router.push(`/cheezopedia/${item.id}`);
    }
  };

  const renderFilterInfo = () => {
    if (type && typeof type === 'string') {
      return (
        <View style={styles.filterInfo}>
          <Text style={styles.filterInfoText}>Showing cheeses of type: <Text style={styles.filterHighlight}>{type}</Text></Text>
          <TouchableOpacity onPress={() => router.push('/discover')} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (region && typeof region === 'string') {
      return (
        <View style={styles.filterInfo}>
          <Text style={styles.filterInfoText}>Showing cheeses from: <Text style={styles.filterHighlight}>{region}</Text></Text>
          <TouchableOpacity onPress={() => router.push('/discover')} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (filter === 'types') {
      return (
        <View style={styles.filterInfo}>
          <Text style={styles.filterInfoText}>Browse all cheese types</Text>
          <TouchableOpacity onPress={() => router.push('/discover')} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (filter === 'regions') {
      return (
        <View style={styles.filterInfo}>
          <Text style={styles.filterInfoText}>Browse all cheese regions</Text>
          <TouchableOpacity onPress={() => router.push('/discover')} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return null;
  };

  /* ── render hero card ── */
  const renderHeroCard = (item: DiscoverItem) => {
    return (
      <TouchableOpacity key={item.id} style={styles.heroCard} onPress={() => handlePress(item)}>
        <Image 
          source={{ uri: item.image_url }} 
          style={styles.heroImage}
        />
        <View style={styles.heroOverlay}>
          <View style={styles.heroContent}>
            <View style={styles.heroMeta}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{formatTypeBadge(item.type)}</Text>
              </View>
              
              {item.metadata?.reading_time && item.metadata.reading_time > 0 && (
                <View style={styles.timeBadge}>
                  <Clock size={14} color={Colors.background} />
                  <Text style={styles.timeBadgeText}>{item.metadata.reading_time} min</Text>
                </View>
              )}

              {(item.type === 'cheese' || item.type === 'producer-cheese') && 
               (item.metadata?.rating_count ?? 0) > 0 &&
               parseFloat((item.metadata?.average_rating ?? 0).toString()) > 0 && (
                <View style={styles.ratingBadge}>
                  <Star size={14} color="#FFD700" fill="#FFD700" />
                  <Text style={styles.ratingText}>{parseFloat(item.metadata.average_rating.toString()).toFixed(1)}</Text>
                </View>
              )}
            </View>

            <Text style={styles.heroTitle} numberOfLines={2}>
              {item.title}
            </Text>

            {item.metadata?.origin_country && (
              <View style={styles.heroLocation}>
                <MapPin size={16} color="rgba(255, 255, 255, 0.9)" />
                <Text style={styles.heroLocationText}>{item.metadata.origin_country}</Text>
              </View>
            )}

            <Text style={styles.heroDescription} numberOfLines={3}>
              {item.description}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  /* ── UI ── */
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Discover</Text>
          <Text style={styles.subtitle}>Explore the world of cheese</Text>
        </View>
        <NotificationBell />
      </View>

      <SearchBar
        placeholder="Search everything..."
        initialValue={initialSearch}
        onSearch={setSearchQuery}
        onFilter={() => setShowFilterPanel(true)}
      />

      {renderFilterInfo()}

      {/* ---------- Horizontal filter row ---------- */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {filterOptions.map(opt => {
          const active = activeFilter === opt.key;
          const Icon = opt.icon;

          return (
            <TouchableOpacity
              key={opt.key}
              style={styles.filterItem}
              onPress={() => setActive(opt.key as any)}
            >
              <Icon size={24} color={active ? opt.color : Colors.subtleText} />
              <Text style={[styles.filterText, { color: active ? opt.color : Colors.subtleText }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ---------- Main content ---------- */}
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
            <Text style={styles.emptySubtext}>
              Try adjusting your search or filters to discover more content
            </Text>
          </View>
        ) : (
          <View style={styles.heroContainer}>{items.map(renderHeroCard)}</View>
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

/* ─────────────────────────────── styles ─────────────────────────────────── */
const styles = StyleSheet.create({
  /* -------- filter info banner -------- */
  filterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    paddingVertical: Layout.spacing.s,
    paddingHorizontal: Layout.spacing.m,
    marginHorizontal: Layout.spacing.m,
    marginVertical: Layout.spacing.s,
    borderRadius: Layout.borderRadius.medium,
    ...Layout.shadow.small,
  },
  filterInfoText: {
    fontFamily: Typography.fonts.bodyMedium,
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    flex: 1,
  },
  filterHighlight: {
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.primary,
  },
  clearButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: Layout.spacing.xs,
    paddingHorizontal: Layout.spacing.s,
    borderRadius: Layout.borderRadius.small,
  },
  clearButtonText: {
    fontFamily: Typography.fonts.bodySemiBold,
    fontSize: Typography.sizes.xs,
    color: Colors.primary,
  },
  /* -------- layout -------- */
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
  headerLeft: {
    flex: 1,
  },

  /* -------- titles -------- */
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

  /* -------- filter bar -------- */
  filterContainer: {
    marginTop: Layout.spacing.s,
    marginBottom: Layout.spacing.m,
    flexGrow: 0,
    maxHeight: 85,
  },
  filterContent: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    columnGap: Layout.spacing.xl,
    paddingHorizontal: Layout.spacing.m,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  filterItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Layout.spacing.xs,
    paddingHorizontal: Layout.spacing.s,
  },
  filterText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodySemiBold,
    textAlign: 'center',
    marginTop: 2,
  },

  /* -------- main list -------- */
  content: { flex: 1 },

  heroContainer: {
    paddingHorizontal: Layout.spacing.s,
    paddingTop: Layout.spacing.s,
    gap: Layout.spacing.l,
    alignItems: 'center',
  },
  heroCard: {
    width: '92%',
    height: Math.round(screenWidth * 0.75), // Dynamic height based on width
    maxWidth: 600, // Maximum width on larger screens
    marginHorizontal: '4%',
    borderRadius: Layout.borderRadius.large,
    overflow: 'hidden',
    ...Layout.shadow.large,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    ...Platform.select({ web: { objectFit: 'cover' } }),
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor:
      'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%)',
    justifyContent: 'flex-end',
  },
  heroContent: { padding: Layout.spacing.l },

  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.m,
    gap: Layout.spacing.s,
  },

  /* -------- badges -------- */
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCD95B',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.borderRadius.medium,
    gap: Layout.spacing.xs,
  },
  typeBadgeText: {
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

  /* -------- hero text -------- */
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

  /* -------- states -------- */
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
  emptyIcon: { fontSize: 64, marginBottom: Layout.spacing.l },
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

  bottomSpacing: { height: Layout.spacing.xl },
  
  /* -------- modal -------- */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
});
