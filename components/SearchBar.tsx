import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Modal, Text, ScrollView, Animated, Platform } from 'react-native';
import { Search, Filter } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';

// Levenshtein distance implementation
function levenshteinDistance(str1: string, str2: string): number {
  const track = Array(str2.length + 1).fill(null).map(() =>
    Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i;
  }
  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1].toLowerCase() === str2[j - 1].toLowerCase() ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }
  
  return track[str2.length][str1.length];
}

function calculateSimilarity(str1: string, str2: string): number {
  const maxLength = Math.max(str1.length, str2.length);
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return 1 - (distance / maxLength);
}

import { supabase } from '@/lib/supabase';

type SearchResult = {
  id: string;
  type: 'cheese' | 'pairing' | 'article';
  title: string;
  description: string;
  score: number;
};

type SearchMode = 'all' | 'cheese' | 'pairing';

export default function SearchBar({ 
  placeholder = 'Search + filter', 
  onSearch,
  onFilter 
}: SearchBarProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>('cheese');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [cheeseTypes, setCheeseTypes] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [typeCount, setTypeCount] = useState<{ type: string; count: number }[]>([]);
  const [regionCount, setRegionCount] = useState<{ country: string; count: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    // Fetch unique cheese types and their counts
    const { data: typesData } = await supabase
      .from('cheeses')
      .select('type')
      .order('type');
    
    if (typesData) {
      const types = [...new Set(typesData.map(item => item.type))];
      setCheeseTypes(types);
      
      const counts = await Promise.all(
        types.map(async type => {
          const { count } = await supabase
            .from('cheeses')
            .select('*', { count: 'exact', head: true })
            .eq('type', type);
          return { type, count: count || 0 };
        })
      );
      setTypeCount(counts);
    }
    
    // Fetch unique regions and their counts
    const { data: regionsData } = await supabase
      .from('cheeses')
      .select('origin_country')
      .order('origin_country');
    
    if (regionsData) {
      const countries = [...new Set(regionsData.map(item => item.origin_country))];
      setRegions(countries);
      
      const counts = await Promise.all(
        countries.map(async country => {
          const { count } = await supabase
            .from('cheeses')
            .select('*', { count: 'exact', head: true })
            .eq('origin_country', country);
          return { country, count: count || 0 };
        })
      );
      setRegionCount(counts);
    }
  };

  // Helper function to get flag emoji
  const getFlag = (country: string): string => {
    const flags: Record<string, string> = {
      'France': '🇫🇷',
      'Italy': '🇮🇹',
      'Switzerland': '🇨🇭',
      'Netherlands': '🇳🇱',
      'Spain': '🇪🇸',
      'England': '🇬🇧',
    };
    return flags[country] || '🏳️';
  };
  
  const pairingCategories = [
    { type: 'Wine', count: 156 },
    { type: 'Beer', count: 89 },
    { type: 'Fruits', count: 45 },
    { type: 'Nuts', count: 32 },
    { type: 'Meats', count: 78 },
    { type: 'Bread', count: 34 },
  ];
  
  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);

    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    const searchTerm = searchQuery.toLowerCase().trim();

    try {
      // Get all cheeses and entries for searching
      const [{ data: cheeses }, { data: entries }] = await Promise.all([
        supabase
        .from('cheeses')
        .select('id, name, description, type'),
        supabase
        .from('cheezopedia_entries')
        .select('id, title, description, content_type')
      ]);

      if (!cheeses || !entries) throw new Error('Failed to fetch data');

      // Process all items with fuzzy matching
      const processedResults = [
        ...cheeses.map(cheese => ({
          id: cheese.id,
          type: 'cheese',
          title: cheese.name,
          description: cheese.description,
          similarity: Math.max(
            calculateSimilarity(searchTerm, cheese.name),
            calculateSimilarity(searchTerm, cheese.description)
          )
        })),
        ...entries.map(entry => ({
          id: entry.id,
          type: entry.content_type,
          title: entry.title,
          description: entry.description,
          similarity: Math.max(
            calculateSimilarity(searchTerm, entry.title),
            calculateSimilarity(searchTerm, entry.description)
          )
        }))
      ];

      // Filter and sort results
      const exactMatches = processedResults.filter(item => 
        item.title.toLowerCase().includes(searchTerm) || 
        item.description.toLowerCase().includes(searchTerm)
      );

      const fuzzyMatches = processedResults
        .filter(item => !exactMatches.find(m => m.id === item.id))
        .filter(item => item.similarity > 0.6)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3);

      const combinedResults = [
        ...exactMatches.map(r => ({ ...r, score: 1 })),
        ...fuzzyMatches.map(r => ({ ...r, score: r.similarity }))
      ].sort((a, b) => b.score - a.score);

      if (combinedResults.length === 0 && searchTerm.length >= 3) {
        // If no results, show "Did you mean?" suggestions
        const suggestions = processedResults
          .filter(cheese => cheese.similarity > 0.4)
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 3);

        setResults(suggestions.map(s => ({
          id: s.id,
          type: 'cheese',
          title: s.name,
          description: `Did you mean: ${s.name}?`,
          score: s.similarity
        })));
      } else {
        setResults(combinedResults);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message || 'Failed to search. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTypeFilter = async (type: string) => {
    const { data, error } = await supabase
      .from('cheeses')
      .select('id, name, type, origin_country, origin_region')
      .eq('type', type)
      .order('name');
    
    if (error) {
      console.error('Filter error:', error);
      return;
    }
    
    setSearchResults(data || []);
  };

  const handleRegionFilter = async (country: string) => {
    const { data, error } = await supabase
      .from('cheeses')
      .select('id, name, type, origin_country, origin_region')
      .eq('origin_country', country)
      .order('name');
    
    if (error) {
      console.error('Filter error:', error);
      return;
    }
    
    setSearchResults(data || []);
  };

  const handleResultPress = (result: SearchResult) => {
    setIsExpanded(false);
    if (result.type === 'cheese') {
      router.push(`/cheese/${result.id}`);
    }
  };

  const getResultIcon = (type: string): string => {
    switch (type) {
      case 'cheese':
        return '🧀';
      case 'pairing':
        return '🍷';
      case 'article':
        return '📝';
      default:
        return '📄';
    }
  };
  
  return (
    <>
      <View 
        style={styles.container}
      >
        <View style={styles.searchContainer}>
          <TouchableOpacity
            style={styles.searchInputContainer}
            onPress={() => setIsExpanded(true)}
          >
            <Search size={20} color="#888" style={styles.searchIcon} />
            <Text style={styles.placeholder}>{placeholder}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          onPress={onFilter} 
          style={styles.filterButton}
        >
          <Filter size={18} color="#888" />
        </TouchableOpacity>
      </View>
      
      <Modal
        visible={isExpanded}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsExpanded(false)}
      >
        <View style={styles.modalContainer}>
          <Animated.View style={[styles.modalContent, {
            transform: [{ translateY: 0 }],
          }]}>
            <View style={styles.segmentedControl}>
              <TouchableOpacity 
                style={[
                  styles.segment,
                  searchMode === 'cheese' && styles.segmentActive
                ]}
                onPress={() => setSearchMode('cheese')}
              >
                <Text style={[
                  styles.segmentText,
                  searchMode === 'cheese' && styles.segmentTextActive
                ]}>Cheese</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.segment,
                  searchMode === 'pairing' && styles.segmentActive
                ]}
                onPress={() => setSearchMode('pairing')}
              >
                <Text style={[
                  styles.segmentText,
                  searchMode === 'pairing' && styles.segmentTextActive
                ]}>Pairing</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchHeader}>
              <View style={styles.expandedSearchContainer}>
                <Search size={20} color="#888" style={styles.searchIcon} />
                <TextInput
                  style={styles.expandedInput}
                  placeholder="Search for anything cheesy..."
                  placeholderTextColor="#888"
                  value={query}
                  onChangeText={handleSearch}
                  autoFocus
                />
              </View>
              <TouchableOpacity 
                onPress={() => setIsExpanded(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
            
            {searchMode === 'cheese' ? (
              <ScrollView style={styles.resultsContainer}>
                {loading ? (
                  <View style={styles.messageContainer}>
                    <Text style={styles.messageText}>Searching...</Text>
                  </View>
                ) : error ? (
                  <View style={styles.messageContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : results.length > 0 ? (
                  <View style={styles.searchResults}>
                    {results.map((result) => (
                      <TouchableOpacity
                        key={result.id}
                        style={styles.resultItem}
                        onPress={() => handleResultPress(result)}
                      >
                        <Text style={styles.resultIcon}>
                          {getResultIcon(result.type)}
                        </Text>
                        <View style={styles.resultContent} key={result.id}>
                          <Text style={styles.resultTitle}>{result.title}</Text>
                          <Text style={styles.resultDescription} numberOfLines={2}>
                            {result.description}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : query.length > 1 ? (
                  <View style={styles.messageContainer}>
                    <Text style={styles.messageText}>No results found</Text>
                  </View>
                ) : null}
                
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Cheese by type</Text>
                    <TouchableOpacity>
                      <Text style={styles.seeAll}>See all</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.typeGrid}>
                    {typeCount.map((item) => (
                      <TouchableOpacity
                        key={item.type}
                        style={styles.typeButton}
                        onPress={() => handleTypeFilter(item.type)}
                      >
                        <Text style={styles.typeText}>{item.type}</Text>
                        <Text style={styles.countText}>{item.count}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Cheese by region</Text>
                    <TouchableOpacity>
                      <Text style={styles.seeAll}>See all</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.regionGrid}>
                    {regionCount.map((item) => (
                      <TouchableOpacity
                        key={item.country}
                        style={styles.regionButton}
                        onPress={() => handleRegionFilter(item.country)}
                      >
                        <Text style={styles.regionFlag}>{getFlag(item.country)}</Text>
                        <Text style={styles.regionText}>{item.country}</Text>
                        <Text style={styles.countText}>{item.count}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>
            ) : (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Pairing categories</Text>
                  <TouchableOpacity>
                    <Text style={styles.seeAll}>See all</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.pairingGrid}>
                  {pairingCategories.map((item) => (
                    <TouchableOpacity
                      key={item.type}
                      style={styles.pairingButton}
                    >
                      <Text style={styles.pairingText}>{item.type}</Text>
                      <Text style={styles.countText}>{item.count}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: Layout.spacing.m,
    marginVertical: Layout.spacing.s,
    gap: Layout.spacing.s,
  },
  searchContainer: {
    flex: 1,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: Layout.borderRadius.medium,
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Platform.OS === 'web' ? Layout.spacing.m : Layout.spacing.s,
  },
  searchIcon: {
    marginRight: Layout.spacing.s,
  },
  placeholder: {
    fontSize: 14,
    color: '#888',
    fontFamily: 'Poppins-Regular',
  },
  filterContainer: {
    marginLeft: Layout.spacing.s,
  },
  filterButton: {
    backgroundColor: '#F5F5F5',
    aspectRatio: 1,
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Platform.select({
      web: 'rgba(0, 0, 0, 0.3)', 
      default: Colors.background
    }),
    paddingTop: Platform.select({
      web: 0,
      default: 60
    }),
  },
  modalContent: {
    backgroundColor: Colors.background,
    ...Platform.select({
      web: {
        borderBottomLeftRadius: Layout.borderRadius.large,
        borderBottomRightRadius: Layout.borderRadius.large,
      },
      default: {
        flex: 1,
      }
    }),
    paddingTop: Layout.spacing.m,
    maxHeight: Platform.select({
      web: '80%',
      default: '100%'
    }),
  },
  segmentedControl: {
    flexDirection: 'row',
    marginHorizontal: Layout.spacing.m,
    marginBottom: Platform.select({
      web: Layout.spacing.m,
      default: Layout.spacing.l
    }),
    backgroundColor: Platform.select({
      web: '#F5F5F5',
      default: '#FFFFFF'
    }),
    borderRadius: Layout.borderRadius.large,
    padding: Platform.select({
      web: 4,
      default: 6
    }),
  },
  segment: {
    flex: 1,
    paddingVertical: Platform.select({
      web: Layout.spacing.s,
      default: Layout.spacing.m
    }),
    alignItems: 'center',
    borderRadius: Layout.borderRadius.medium,
  },
  segmentActive: {
    backgroundColor: Colors.background,
    ...Layout.shadow.small,
  },
  segmentText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: Colors.subtleText,
  },
  segmentTextActive: {
    color: Colors.text,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.m,
    paddingBottom: Layout.spacing.m,
  },
  expandedSearchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Platform.select({
      web: '#F5F5F5',
      default: '#FFFFFF'
    }),
    borderRadius: Layout.borderRadius.large,
    paddingHorizontal: Layout.spacing.m,
    height: 44,
  },
  expandedInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: Colors.text,
  },
  cancelButton: {
    marginLeft: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
  },
  cancelText: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: Colors.text,
  },
  section: {
    marginTop: Layout.spacing.l,
    paddingHorizontal: Layout.spacing.m,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.m,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Medium',
    color: Colors.text,
  },
  seeAll: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.s,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Platform.select({
      web: '#F5F5F5',
      default: '#FFFFFF'
    }),
    paddingVertical: Layout.spacing.s,
    paddingHorizontal: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
    gap: Layout.spacing.s,
  },
  typeText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: Colors.text,
  },
  countText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: Colors.subtleText,
    backgroundColor: '#E8E8E8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  regionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.s,
  },
  regionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Platform.select({
      web: '#F5F5F5',
      default: '#FFFFFF'
    }),
    paddingVertical: Layout.spacing.s,
    paddingHorizontal: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
    gap: Layout.spacing.s,
  },
  regionFlag: {
    fontSize: 16,
  },
  regionText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: Colors.text,
  },
  pairingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.s,
  },
  pairingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0DB',
    paddingVertical: Layout.spacing.s,
    paddingHorizontal: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
    gap: Layout.spacing.s,
  },
  pairingText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: Colors.primary,
  },
  resultsContainer: {
    flex: 1,
  },
  messageContainer: {
    padding: Layout.spacing.xl,
    alignItems: 'center',
  },
  messageText: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: Colors.subtleText,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: Colors.error,
    textAlign: 'center',
  },
  searchResults: {
    paddingHorizontal: Layout.spacing.m,
    marginBottom: Layout.spacing.m,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Layout.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: Platform.select({
      web: Colors.border,
      default: '#E8E8E8'
    }),
  },
  resultIcon: {
    fontSize: 20,
    marginRight: Layout.spacing.m,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: Colors.text,
    marginBottom: 4,
  },
  resultDescription: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: Colors.subtleText,
    lineHeight: 20,
  },
});