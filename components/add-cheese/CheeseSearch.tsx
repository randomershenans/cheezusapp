import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import Typography from '@/constants/Typography';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import { Search, Plus, ChevronRight, Star, ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { calculateSimilarity } from '@/components/search/searchUtils';

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
  'ricotta': ['ricotta', 'ricota', 'ricota'],
  'provolone': ['provolone', 'provoloni', 'provelone'],
  'emmental': ['emmental', 'emmenthal', 'emmenthaler', 'swiss'],
  'manchego': ['manchego', 'manchago'],
  'gorgonzola': ['gorgonzola', 'gorganzola'],
  'stilton': ['stilton', 'stiliton'],
  'roquefort': ['roquefort', 'rocquefort', 'roquefor'],
  'havarti': ['havarti', 'havarthi', 'havarti'],
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

// Unified search result type
export interface CheeseSearchResult {
  id: string;
  name: string;
  type: 'cheese_type' | 'producer_cheese';
  subtext: string;
  image_url?: string;
  rating?: number;
  rating_count?: number;
  origin_country?: string;
  producer_name?: string;
  cheese_type_id?: string;
  cheese_type_name?: string;
}

interface CheeseSearchProps {
  onSelectExisting: (cheese: CheeseSearchResult) => void;
  onAddNew: () => void;
  onBack?: () => void;
}

export const CheeseSearch: React.FC<CheeseSearchProps> = ({
  onSelectExisting,
  onAddNew,
  onBack,
}) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<CheeseSearchResult[]>([]);
  const [popularCheeses, setPopularCheeses] = useState<CheeseSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [userCheeseIds, setUserCheeseIds] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load user's cheese box entries on mount, then load popular cheeses
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        let ids: string[] = [];
        
        if (user) {
          const { data: entries, error } = await supabase
            .from('cheese_box_entries')
            .select('cheese_id')
            .eq('user_id', user.id);

          if (!error && entries) {
            ids = entries.map(e => e.cheese_id);
          }
        }
        
        setUserCheeseIds(ids);
        setIsInitialized(true);
      } catch (error) {
        console.error('Error loading user cheese box:', error);
        setIsInitialized(true);
      }
    };
    
    init();
  }, []);

  // Load popular cheeses after initialization
  useEffect(() => {
    if (isInitialized) {
      loadPopularCheeses();
    }
  }, [isInitialized]);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length === 0) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const timer = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadPopularCheeses = async () => {
    try {
      // Get cheeses not in user's box - prioritize popular ones, but fetch more to have options
      const { data: producerCheeses, error } = await supabase
        .from('producer_cheese_stats')
        .select('id, full_name, cheese_type_name, image_url, average_rating, rating_count, origin_country, producer_name')
        .eq('status', 'approved')
        .order('rating_count', { ascending: false })
        .limit(50); // Fetch more so we have options after filtering

      if (error) throw error;

      // Filter out cheeses already in user's box
      const filteredCheeses = (producerCheeses || []).filter(pc => !userCheeseIds.includes(pc.id));

      // Take first 10 after filtering
      const popular: CheeseSearchResult[] = filteredCheeses.slice(0, 10).map(pc => {
        // Use cheese type name if producer is Generic, otherwise use full_name
        const displayName = pc.producer_name === 'Generic' ? pc.cheese_type_name : pc.full_name;
        return {
          id: pc.id,
          name: displayName,
          type: 'producer_cheese',
          subtext: `${pc.cheese_type_name}${pc.origin_country ? ` • ${pc.origin_country}` : ''}`,
          image_url: pc.image_url,
          rating: pc.average_rating,
          rating_count: pc.rating_count,
          origin_country: pc.origin_country,
          producer_name: pc.producer_name,
        };
      });

      setPopularCheeses(popular);
    } catch (error) {
      console.error('Error loading popular cheeses:', error);
    }
  };

  const performSearch = async () => {
    if (searchQuery.length < 2) return;
    
    setIsLoading(true);
    setHasSearched(true);

    try {
      // Expand search terms with synonyms for fuzzy matching
      const searchTerms = expandSearchTerms(searchQuery);
      
      // Build OR conditions for all search terms
      const pcOrConditions = searchTerms.flatMap(term => [
        `full_name.ilike.%${term}%`,
        `producer_name.ilike.%${term}%`,
        `cheese_type_name.ilike.%${term}%`,
      ]).join(',');

      // Search producer cheeses (the actual cheeses users log)
      const { data: producerCheeses, error: pcError } = await supabase
        .from('producer_cheese_stats')
        .select('id, full_name, cheese_type_name, cheese_type_id, image_url, average_rating, rating_count, origin_country, producer_name')
        .eq('status', 'approved')
        .or(pcOrConditions)
        .order('rating_count', { ascending: false })
        .limit(30);

      if (pcError) throw pcError;

      // Build OR conditions for cheese types
      const ctOrConditions = searchTerms.map(term => `name.ilike.%${term}%`).join(',');

      // Search cheese types (for when they want to add a new producer version)
      const { data: cheeseTypes, error: ctError } = await supabase
        .from('cheese_type_stats')
        .select('id, name, type, origin_country, producer_count, average_rating')
        .eq('status', 'approved')
        .or(ctOrConditions)
        .order('producer_count', { ascending: false })
        .limit(10);

      if (ctError) throw ctError;

      // Combine results - producer cheeses first, then cheese types
      const combinedResults: CheeseSearchResult[] = [];

      // Add producer cheeses (filter out ones already in user's box)
      (producerCheeses || []).forEach(pc => {
        if (userCheeseIds.includes(pc.id)) return; // Skip cheeses already in box
        
        // Use cheese type name if producer is Generic, otherwise use full_name
        const displayName = pc.producer_name === 'Generic' ? pc.cheese_type_name : pc.full_name;
        combinedResults.push({
          id: pc.id,
          name: displayName,
          type: 'producer_cheese',
          subtext: `${pc.cheese_type_name}${pc.origin_country ? ` • ${pc.origin_country}` : ''}`,
          image_url: pc.image_url,
          rating: pc.average_rating,
          rating_count: pc.rating_count,
          origin_country: pc.origin_country,
          producer_name: pc.producer_name,
          cheese_type_id: pc.cheese_type_id,
          cheese_type_name: pc.cheese_type_name,
        });
      });

      // Add cheese types (shown as "Add your own [Type]")
      (cheeseTypes || []).forEach(ct => {
        // Only add if not already represented by a producer cheese
        const hasProducerVersion = combinedResults.some(r => r.cheese_type_name === ct.name);
        if (!hasProducerVersion || combinedResults.length < 5) {
          combinedResults.push({
            id: ct.id,
            name: ct.name,
            type: 'cheese_type',
            subtext: `${ct.type || 'Cheese'}${ct.origin_country ? ` • ${ct.origin_country}` : ''} • ${ct.producer_count || 0} versions`,
            rating: ct.average_rating,
            origin_country: ct.origin_country,
          });
        }
      });

      // Sort results: exact matches first, then by similarity score
      const searchLower = searchQuery.toLowerCase();
      combinedResults.sort((a, b) => {
        const aExact = a.name.toLowerCase().includes(searchLower) ? 1 : 0;
        const bExact = b.name.toLowerCase().includes(searchLower) ? 1 : 0;
        if (aExact !== bExact) return bExact - aExact;
        
        // Then by similarity
        const aSim = calculateSimilarity(searchQuery, a.name);
        const bSim = calculateSimilarity(searchQuery, b.name);
        return bSim - aSim;
      });

      setResults(combinedResults.slice(0, 15));
    } catch (error) {
      console.error('Error searching cheeses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderCheeseItem = ({ item }: { item: CheeseSearchResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => onSelectExisting(item)}
      activeOpacity={0.7}
    >
      {/* Image or placeholder */}
      <View style={styles.imageContainer}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.cheeseImage} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderEmoji}>🧀</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.resultInfo}>
        <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.resultSubtext} numberOfLines={1}>{item.subtext}</Text>
        {item.rating !== undefined && item.rating > 0 && item.rating_count !== undefined && item.rating_count > 0 ? (
          <View style={styles.ratingRow}>
            <Star size={12} color="#F59E0B" fill="#F59E0B" />
            <Text style={styles.ratingText}>
              {item.rating.toFixed(1)} ({item.rating_count})
            </Text>
          </View>
        ) : null}
      </View>

      {/* Type badge */}
      <View style={[
        styles.typeBadge,
        item.type === 'cheese_type' && styles.typeBadgeType
      ]}>
        <Text style={[
          styles.typeBadgeText,
          item.type === 'cheese_type' && styles.typeBadgeTextType
        ]}>
          {item.type === 'producer_cheese' ? 'Add' : 'New'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const displayList = searchQuery.length > 0 ? results : popularCheeses;
  const showNoResults = hasSearched && results.length === 0 && !isLoading;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Add Cheese</Text>
            <Text style={styles.subtitle}>Search for a cheese or add a new one</Text>
          </View>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search cheeses..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="words"
          autoCorrect={false}
        />
      </View>

      {/* Results */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionLabel}>
            {searchQuery.length > 0 ? 'Results' : 'Popular Cheeses'}
          </Text>

          {showNoResults ? (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsEmoji}>🔍</Text>
              <Text style={styles.noResultsTitle}>No cheeses found</Text>
              <Text style={styles.noResultsText}>
                Can't find "{searchQuery}"? Add it as a new cheese!
              </Text>
            </View>
          ) : (
            <FlatList
              data={displayList}
              renderItem={renderCheeseItem}
              keyExtractor={(item) => `${item.type}-${item.id}`}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}

      {/* Add New Cheese Section */}
      <View style={styles.addNewSection}>
        <Text style={styles.cantFindText}>Can't find what you're looking for?</Text>
        <TouchableOpacity
          style={styles.addNewButton}
          onPress={onAddNew}
          activeOpacity={0.8}
        >
          <Plus size={20} color="#1F2937" />
          <Text style={styles.addNewText}>Add New Cheese</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Layout.spacing.l,
    paddingTop: Layout.spacing.xl,
    paddingBottom: Layout.spacing.m,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: Layout.spacing.s,
    marginRight: Layout.spacing.m,
    marginLeft: -Layout.spacing.s,
  },
  title: {
    fontSize: 28,
    fontFamily: Typography.fonts.heading,
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    marginHorizontal: Layout.spacing.l,
    marginBottom: Layout.spacing.m,
    paddingHorizontal: Layout.spacing.m,
  },
  searchIcon: {
    marginRight: Layout.spacing.s,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Layout.spacing.m,
    fontSize: 16,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.subtleText,
    marginHorizontal: Layout.spacing.l,
    marginBottom: Layout.spacing.s,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Layout.spacing.m,
    fontSize: 16,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Layout.spacing.l,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: Layout.spacing.m,
    marginBottom: Layout.spacing.s,
    ...Layout.shadow.small,
  },
  imageContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: Layout.spacing.m,
  },
  cheeseImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 24,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
    marginBottom: 2,
  },
  resultSubtext: {
    fontSize: 14,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginLeft: 4,
  },
  typeBadge: {
    backgroundColor: '#FCD95B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  typeBadgeType: {
    backgroundColor: '#E0F2FE',
  },
  typeBadgeText: {
    fontSize: 12,
    fontFamily: Typography.fonts.bodyMedium,
    color: '#1F2937',
  },
  typeBadgeTextType: {
    color: '#0369A1',
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.xl,
  },
  noResultsEmoji: {
    fontSize: 48,
    marginBottom: Layout.spacing.m,
  },
  noResultsTitle: {
    fontSize: 20,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
    marginBottom: Layout.spacing.s,
  },
  noResultsText: {
    fontSize: 16,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    textAlign: 'center',
  },
  addNewSection: {
    paddingTop: Layout.spacing.m,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cantFindText: {
    fontSize: 14,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    textAlign: 'center',
    marginBottom: Layout.spacing.s,
    marginHorizontal: Layout.spacing.l,
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FCD95B',
    borderRadius: 16,
    padding: Layout.spacing.m,
    marginHorizontal: Layout.spacing.l,
    marginBottom: Layout.spacing.l,
    ...Layout.shadow.medium,
  },
  addNewText: {
    fontSize: 16,
    fontFamily: Typography.fonts.bodyMedium,
    color: '#1F2937',
    marginLeft: Layout.spacing.s,
  },
});
