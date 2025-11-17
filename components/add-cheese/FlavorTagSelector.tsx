import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { getAllFlavorTags, FlavorTag } from '@/lib';
import Typography from '@/constants/Typography';
import { Check } from 'lucide-react-native';

interface FlavorTagSelectorProps {
  selectedTagIds: string[];
  onSelectionChange: (tagIds: string[]) => void;
  maxSelections?: number;
}

export const FlavorTagSelector: React.FC<FlavorTagSelectorProps> = ({
  selectedTagIds,
  onSelectionChange,
  maxSelections = 10,
}) => {
  const [allTags, setAllTags] = useState<FlavorTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFlavorTags();
  }, []);

  const loadFlavorTags = async () => {
    setIsLoading(true);
    const tags = await getAllFlavorTags();
    setAllTags(tags);
    setIsLoading(false);
  };

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      // Remove tag
      onSelectionChange(selectedTagIds.filter(id => id !== tagId));
    } else {
      // Add tag if under limit
      if (selectedTagIds.length < maxSelections) {
        onSelectionChange([...selectedTagIds, tagId]);
      }
    }
  };

  const isSelected = (tagId: string) => selectedTagIds.includes(tagId);

  const renderTag = (tag: FlavorTag) => {
    const selected = isSelected(tag.id);

    return (
      <TouchableOpacity
        style={[styles.tagChip, selected && styles.tagChipSelected]}
        onPress={() => toggleTag(tag.id)}
        activeOpacity={0.7}
      >
        <Text style={[styles.tagText, selected && styles.tagTextSelected]}>
          {tag.name}
        </Text>
        {selected && <Check size={16} color="#fff" style={styles.checkIcon} />}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Flavor Profile</Text>
        <Text style={styles.subtitle}>
          Select up to {maxSelections} flavors ({selectedTagIds.length} selected)
        </Text>
      </View>

      <FlatList
        data={allTags}
        renderItem={({ item }) => renderTag(item)}
        keyExtractor={(item) => item.id}
        numColumns={3}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No flavor tags available</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: Typography.fonts.bodyMedium,
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Typography.fonts.body,
    color: '#6B7280',
  },
  row: {
    justifyContent: 'flex-start',
    marginBottom: 12,
  },
  tagChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tagChipSelected: {
    backgroundColor: '#F59E0B',
    borderColor: '#D97706',
  },
  tagText: {
    fontSize: 14,
    fontFamily: Typography.fonts.bodyMedium,
    color: '#4B5563',
  },
  tagTextSelected: {
    color: '#fff',
  },
  checkIcon: {
    marginLeft: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
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
});
