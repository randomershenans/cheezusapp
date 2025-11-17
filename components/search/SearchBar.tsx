import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, TextInput } from 'react-native';
import { Search, Filter, X } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

import { SearchBarProps } from './types';

export default function SearchBar({ 
  placeholder = 'Search cheeses, articles, pairings...', 
  onSearch, 
  onFilter 
}: SearchBarProps) {
  const [query, setQuery] = useState('');

  // Handle search input change
  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    
    // Call parent callback to update feed
    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  // Clear search
  const handleClear = () => {
    setQuery('');
    if (onSearch) {
      onSearch('');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.innerContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={placeholder}
            placeholderTextColor="#888"
            value={query}
            onChangeText={handleSearch}
          />
          {query.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClear}
            >
              <X size={16} color="#888" />
            </TouchableOpacity>
          )}
        </View>

        {onFilter && (
          <TouchableOpacity 
            onPress={onFilter} 
            style={styles.filterButton}
          >
            <Filter size={18} color="#888" />
          </TouchableOpacity>
        )}
      </View>
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
    height: 48,
  },
  searchIcon: {
    marginRight: Layout.spacing.s,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sizes.base,
    color: Colors.text,
    fontFamily: Typography.fonts.body,
  },
  clearButton: {
    padding: Layout.spacing.xs,
    marginLeft: Layout.spacing.xs,
  },
  filterButton: {
    backgroundColor: '#F5F5F5',
    width: 48,
    height: 48,
    borderRadius: Layout.borderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
