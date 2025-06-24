import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, Modal, ScrollView } from 'react-native';
import { Search, Filter, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

import SearchResultItem from './SearchResultItem';
import SearchModes from './SearchModes';
import { fetchSearchData, processSearchResults } from './searchUtils';
import { SearchBarProps, SearchMode, SearchResult } from './types';

export default function SearchBar({ 
  placeholder = 'Search + filter', 
  onSearch, 
  onFilter 
}: SearchBarProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<SearchMode>('all');

  // Handle search input change
  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);

    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch data from Supabase using our utility function
      const { cheeses, entries, pairings } = await fetchSearchData(searchQuery, searchMode);
      
      // Process and filter search results
      const allResults = processSearchResults(searchQuery, cheeses, entries, pairings);
      
      setResults(allResults);

      // If there's a parent onSearch callback, call it
      if (onSearch) {
        onSearch(searchQuery);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle result selection
  const handleResultPress = (result: SearchResult) => {
    setIsExpanded(false);
    
    if (result.type === 'pairing') {
      router.push(`/pairing/${result.id}`);
    } else if (result.type === 'cheese') {
      router.push(`/cheese/${result.id}`);
    } else {
      router.push(`/cheezopedia/${result.id}`);
    }
  };

  // Handle search mode change
  const handleModeChange = (mode: SearchMode) => {
    setSearchMode(mode);
    
    // Re-run search with new mode if there's a query
    if (query) {
      handleSearch(query);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.innerContainer}>
        <TouchableOpacity 
          style={styles.searchInputContainer}
          onPress={() => setIsExpanded(true)}
        >
          <Search size={20} color="#888" style={styles.searchIcon} />
          <Text style={styles.placeholder}>{placeholder}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={onFilter} 
          style={styles.filterButton}
        >
          <Filter size={18} color="#888" />
        </TouchableOpacity>
      </View>
      
      <Modal
        visible={isExpanded}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsExpanded(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.searchInputWrapper}>
              <Search size={20} color="#888" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={placeholder}
                placeholderTextColor="#888"
                value={query}
                onChangeText={handleSearch}
                autoFocus={true}
              />
              {query.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setQuery('')}
                >
                  <X size={16} color="#888" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity 
              onPress={() => setIsExpanded(false)}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          
          <SearchModes 
            currentMode={searchMode} 
            onModeChange={handleModeChange} 
          />
          
          {loading ? (
            <View style={styles.messageContainer}>
              <Text style={styles.messageText}>Searching...</Text>
            </View>
          ) : error ? (
            <View style={styles.messageContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : results.length === 0 && query.length > 0 ? (
            <View style={styles.messageContainer}>
              <Text style={styles.messageText}>No results found</Text>
            </View>
          ) : (
            <ScrollView style={styles.resultsContainer}>
              {results.map(result => (
                <SearchResultItem 
                  key={`${result.type}-${result.id}`}
                  result={result}
                  onPress={handleResultPress}
                />
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Layout.spacing.m,
    marginVertical: Layout.spacing.s,
  },
  innerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.s,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: Layout.borderRadius.medium,
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
  },
  searchIcon: {
    marginRight: Layout.spacing.s,
  },
  placeholder: {
    fontSize: Typography.sizes.sm,
    color: '#888',
    fontFamily: Typography.fonts.body,
  },
  filterButton: {
    backgroundColor: '#F5F5F5',
    width: 42,
    height: 42,
    borderRadius: Layout.borderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.m,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: Layout.borderRadius.medium,
    paddingHorizontal: Layout.spacing.m,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sizes.base,
    color: Colors.text,
    height: '100%',
  },
  clearButton: {
    padding: Layout.spacing.xs,
  },
  cancelButton: {
    marginLeft: Layout.spacing.m,
  },
  cancelText: {
    fontSize: Typography.sizes.base,
    color: Colors.primary,
    fontFamily: Typography.fonts.body,
  },
  messageContainer: {
    padding: Layout.spacing.l,
    alignItems: 'center',
  },
  messageText: {
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    fontFamily: Typography.fonts.body,
  },
  errorText: {
    fontSize: Typography.sizes.base,
    color: Colors.error,
    fontFamily: Typography.fonts.body,
  },
  resultsContainer: {
    flex: 1,
  },
});
