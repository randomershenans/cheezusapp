import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { searchCheeseTypes, getCheeseTypes, CheeseTypeWithStats } from '@/lib';
import Typography from '@/constants/Typography';
import { ChevronRight } from 'lucide-react-native';

interface CheeseTypeSelectorProps {
  onSelect: (cheeseType: CheeseTypeWithStats) => void;
  onCreateNew: () => void;
}

export const CheeseTypeSelector: React.FC<CheeseTypeSelectorProps> = ({
  onSelect,
  onCreateNew,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CheeseTypeWithStats[]>([]);
  const [recentTypes, setRecentTypes] = useState<CheeseTypeWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load recent/popular cheese types on mount
  useEffect(() => {
    loadRecentTypes();
  }, []);

  // Search when query changes
  useEffect(() => {
    if (searchQuery.length > 0) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadRecentTypes = async () => {
    setIsLoading(true);
    const types = await getCheeseTypes(true, { limit: 10 });
    setRecentTypes(types as CheeseTypeWithStats[]);
    setIsLoading(false);
  };

  const performSearch = async () => {
    setIsLoading(true);
    const results = await searchCheeseTypes(searchQuery, 20);
    setSearchResults(results);
    setIsLoading(false);
  };

  const renderCheeseTypeItem = (item: CheeseTypeWithStats) => (
    <TouchableOpacity
      style={styles.cheeseTypeItem}
      onPress={() => onSelect(item)}
    >
      <View style={styles.cheeseTypeInfo}>
        <Text style={styles.cheeseTypeName}>{item.name}</Text>
        <Text style={styles.cheeseTypeDetails}>
          {item.type} • {item.producer_count} producers
        </Text>
      </View>
      <ChevronRight size={20} color="#999" />
    </TouchableOpacity>
  );

  const displayList = searchQuery.length > 0 ? searchResults : recentTypes;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What type of cheese did you try?</Text>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search cheese types (Brie, Cheddar, Gouda...)"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="words"
          autoCorrect={false}
        />
      </View>

      {/* Results/Recent List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
        </View>
      ) : (
        <>
          <Text style={styles.sectionLabel}>
            {searchQuery.length > 0 ? 'Search Results' : 'Popular Types'}
          </Text>
          <FlatList
            data={displayList}
            renderItem={({ item }) => renderCheeseTypeItem(item)}
            keyExtractor={(item) => item.id}
            style={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchQuery.length > 0
                    ? 'No cheese types found. Create a new one?'
                    : 'Loading popular cheese types...'}
                </Text>
              </View>
            }
          />
        </>
      )}

      {/* Create New Button */}
      <TouchableOpacity
        style={styles.createNewButton}
        onPress={onCreateNew}
      >
        <Text style={styles.createNewText}>+ Create New Cheese Type</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: Typography.fonts.heading,
    color: '#1F2937',
    marginBottom: 20,
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: Typography.fonts.body,
    color: '#1F2937',
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: Typography.fonts.bodyMedium,
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    flex: 1,
  },
  cheeseTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cheeseTypeInfo: {
    flex: 1,
  },
  cheeseTypeName: {
    fontSize: 18,
    fontFamily: Typography.fonts.bodyMedium,
    color: '#1F2937',
    marginBottom: 4,
  },
  cheeseTypeDetails: {
    fontSize: 14,
    fontFamily: Typography.fonts.body,
    color: '#6B7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: Typography.fonts.body,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  createNewButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  createNewText: {
    fontSize: 16,
    fontFamily: Typography.fonts.bodyMedium,
    color: '#fff',
  },
});
