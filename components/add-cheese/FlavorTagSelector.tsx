import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { getAllFlavorTags, FlavorTag } from '@/lib';
import { supabase } from '@/lib/supabase';
import Typography from '@/constants/Typography';
import { Check, Plus } from 'lucide-react-native';

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
  const [showAddNew, setShowAddNew] = useState(false);
  const [newFlavorName, setNewFlavorName] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);

  const INITIAL_VISIBLE_COUNT = 6;

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

  const handleAddNewFlavor = async () => {
    if (!newFlavorName.trim()) {
      Alert.alert('Error', 'Please enter a flavor name');
      return;
    }

    setIsAddingNew(true);
    try {
      // Check if flavor already exists
      const existingTag = allTags.find(
        t => t.name.toLowerCase() === newFlavorName.trim().toLowerCase()
      );
      
      if (existingTag) {
        Alert.alert('Already exists', 'This flavor profile already exists');
        setIsAddingNew(false);
        return;
      }

      // Insert new flavor tag
      const { data, error } = await supabase
        .from('flavor_tags')
        .insert({ name: newFlavorName.trim() })
        .select()
        .single();

      if (error) throw error;

      // Add to local list and select it
      if (data) {
        setAllTags([...allTags, data]);
        if (selectedTagIds.length < maxSelections) {
          onSelectionChange([...selectedTagIds, data.id]);
        }
      }

      setNewFlavorName('');
      setShowAddNew(false);
      Alert.alert('Added!', `"${newFlavorName.trim()}" has been added`);
    } catch (error) {
      console.error('Error adding flavor:', error);
      Alert.alert('Error', 'Failed to add new flavor');
    } finally {
      setIsAddingNew(false);
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
        {selected && <Check size={16} color="#1F2937" style={styles.checkIcon} />}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FCD95B" />
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

      {/* Show limited tags initially, all when expanded */}
      <View style={styles.tagsContainer}>
        {(showAllTags ? allTags : allTags.slice(0, INITIAL_VISIBLE_COUNT)).map((tag) => renderTag(tag))}
      </View>

      {allTags.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No flavor tags available</Text>
        </View>
      )}

      {/* Show more/less toggle */}
      {allTags.length > INITIAL_VISIBLE_COUNT && (
        <TouchableOpacity
          style={styles.showMoreButton}
          onPress={() => setShowAllTags(!showAllTags)}
        >
          <Text style={styles.showMoreText}>
            {showAllTags ? 'Show less' : `Show ${allTags.length - INITIAL_VISIBLE_COUNT} more...`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Add New Flavor */}
      {showAddNew ? (
        <View style={styles.addNewContainer}>
          <TextInput
            style={styles.addNewInput}
            placeholder="Enter flavor name..."
            placeholderTextColor="#9CA3AF"
            value={newFlavorName}
            onChangeText={setNewFlavorName}
            autoCapitalize="words"
            autoFocus
          />
          <View style={styles.addNewButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowAddNew(false);
                setNewFlavorName('');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addButton, isAddingNew && styles.addButtonDisabled]}
              onPress={handleAddNewFlavor}
              disabled={isAddingNew}
            >
              <Text style={styles.addButtonText}>
                {isAddingNew ? 'Adding...' : 'Add'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addNewTrigger}
          onPress={() => setShowAddNew(true)}
        >
          <Plus size={16} color="#FCD95B" />
          <Text style={styles.addNewTriggerText}>Can't find a flavor? Add it</Text>
        </TouchableOpacity>
      )}
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
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  showMoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  showMoreText: {
    fontSize: 14,
    fontFamily: Typography.fonts.bodyMedium,
    color: '#FCD95B',
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
    backgroundColor: '#FCD95B',
    borderColor: '#FCD95B',
  },
  tagText: {
    fontSize: 14,
    fontFamily: Typography.fonts.bodyMedium,
    color: '#4B5563',
  },
  tagTextSelected: {
    color: '#1F2937',
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
  addNewTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  addNewTriggerText: {
    fontSize: 14,
    fontFamily: Typography.fonts.bodyMedium,
    color: '#FCD95B',
  },
  addNewContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  addNewInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: Typography.fonts.body,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  addNewButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: Typography.fonts.bodyMedium,
    color: '#6B7280',
  },
  addButton: {
    backgroundColor: '#FCD95B',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    fontSize: 14,
    fontFamily: Typography.fonts.bodyMedium,
    color: '#1F2937',
  },
});
