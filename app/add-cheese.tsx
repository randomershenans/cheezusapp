import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { X, Search, Plus, CircleAlert as AlertCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

type SearchResult = {
  id: string;
  name: string;
  type: string;
  origin_country: string;
  origin_region?: string;
  similarity: number;
};

// Levenshtein distance for "did you mean?" suggestions
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
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }
  return track[str2.length][str1.length];
}

// Calculate similarity score (0-1) where 1 is exact match
function calculateSimilarity(str1: string, str2: string): number {
  const maxLength = Math.max(str1.length, str2.length);
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return 1 - (distance / maxLength);
}

export default function AddCheeseScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);
    setError(null);

    if (searchQuery.length < 2) {
      setResults([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);

    try {
      // Get all cheeses for searching
      const { data: cheeses, error: cheeseError } = await supabase
        .from('cheeses')
        .select('id, name, type, origin_country, origin_region');

      if (cheeseError) throw cheeseError;

      // Process results with fuzzy matching
      const processedResults = cheeses!.map(cheese => ({
        ...cheese,
        similarity: calculateSimilarity(searchQuery, cheese.name)
      }));

      // Find exact matches (substring)
      const exactMatches = processedResults.filter(cheese => 
        cheese.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // Find fuzzy matches
      const fuzzyMatches = processedResults
        .filter(cheese => !exactMatches.find(m => m.id === cheese.id))
        .filter(cheese => cheese.similarity > 0.6)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3);

      const combinedResults = [
        ...exactMatches.map(r => ({ ...r, similarity: 1 })),
        ...fuzzyMatches
      ].sort((a, b) => b.similarity - a.similarity);

      setResults(combinedResults);
      setShowSuggestions(combinedResults.length > 0);
      
      // If no results but query is long enough, show add new option
      if (combinedResults.length === 0 && searchQuery.length >= 3) {
        setShowSuggestions(true);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search cheeses');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewCheese = () => {
    if (!query.trim()) {
      Alert.alert('Please enter a cheese name');
      return;
    }
    // Navigate to new cheese form with the entered name
    router.push({
      pathname: '/cheese/new',
      params: { name: query }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <X size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search existing cheeses..."
            value={query}
            onChangeText={handleSearch}
          />
        </View>

        {query.length >= 2 && (
          <View style={styles.searchResultsContainer}>
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
                {results.map((cheese) => (
                  <TouchableOpacity
                    key={cheese.id}
                    style={styles.resultItem}
                    onPress={() => router.push(`/cheese/${cheese.id}`)}
                  >
                    <View style={styles.resultContent}>
                      <Text style={styles.resultName}>{cheese.name}</Text>
                      <Text style={styles.resultOrigin}>
                        {cheese.origin_country}
                        {cheese.origin_region ? `, ${cheese.origin_region}` : ''}
                      </Text>
                      {cheese.similarity < 1 && (
                        <View style={styles.similarityBadge}>
                          <Text style={styles.similarityText}>
                            Similar match ({Math.round(cheese.similarity * 100)}%)
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
                
                {query.trim().length >= 2 && (
                  <Text style={styles.resultsNote}>
                    Don't see what you're looking for? You can add a new cheese below.
                  </Text>
                )}
              </View>
            ) : query.trim().length >= 2 ? (
              <View style={styles.noResultsContainer}>
                <View style={styles.messageContainer}>
                  <AlertCircle size={24} color={Colors.subtleText} style={styles.noResultsIcon} />
                  <Text style={styles.messageText}>No matching cheeses found</Text>
                </View>
                
                <TouchableOpacity
                  style={styles.addNewButton}
                  onPress={handleAddNewCheese}
                >
                  <Plus size={20} color={Colors.primary} />
                  <Text style={styles.addNewText}>
                    Add "{query}" as a new cheese
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.messageContainer}>
                <Text style={styles.messageText}>Type at least 2 characters to search</Text>
              </View>
            )}
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
    padding: Layout.spacing.m,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: Layout.spacing.m,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Layout.borderRadius.medium,
    padding: Layout.spacing.s,
    marginVertical: Layout.spacing.m,
    elevation: 2,
    shadowColor: Colors.gray,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: {
    marginHorizontal: Layout.spacing.s,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
    marginLeft: Layout.spacing.xs,
  },
  searchResultsContainer: {
    marginTop: Layout.spacing.m,
    flex: 1,
  },
  searchResults: {
    flex: 1,
  },
  resultItem: {
    backgroundColor: Colors.white,
    borderRadius: Layout.borderRadius.medium,
    padding: Layout.spacing.m,
    marginBottom: Layout.spacing.s,
    elevation: 1,
    shadowColor: Colors.gray,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  resultContent: {
    flexDirection: 'column',
  },
  resultName: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
    marginBottom: Layout.spacing.xs,
  },
  resultOrigin: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginBottom: Layout.spacing.xs,
  },
  similarityBadge: {
    marginTop: Layout.spacing.xs,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Layout.spacing.s,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.borderRadius.small,
    alignSelf: 'flex-start',
  },
  similarityText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.primary,
  },
  messageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.spacing.l,
  },
  messageText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.subtleText,
    textAlign: 'center',
  },
  errorText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.error,
    textAlign: 'center',
  },
  resultsNote: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.subtleText,
    textAlign: 'center',
    marginTop: Layout.spacing.m,
    marginBottom: Layout.spacing.m,
    paddingHorizontal: Layout.spacing.m,
  },
  noResultsContainer: {
    alignItems: 'center',
    padding: Layout.spacing.m, 
  },
  noResultsIcon: {
    marginBottom: Layout.spacing.s,
  },
  addNewButton: {
    marginTop: Layout.spacing.l,
    padding: Layout.spacing.m,
    backgroundColor: '#FFF0DB',
    borderRadius: Layout.borderRadius.medium,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  addNewText: {
    marginLeft: Layout.spacing.s,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.primary
  }
});