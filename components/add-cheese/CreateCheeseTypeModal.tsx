import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { CheeseCategory, MilkType, CreateCheeseTypeInput } from '@/lib';
import Typography from '@/constants/Typography';
import { X } from 'lucide-react-native';

interface CreateCheeseTypeModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (data: CreateCheeseTypeInput) => void;
  isCreating?: boolean;
}

const CHEESE_CATEGORIES: CheeseCategory[] = [
  'Hard',
  'Soft',
  'Semi-soft',
  'Fresh',
  'Blue',
  'Processed',
];

const MILK_TYPES: MilkType[] = ['Cow', 'Goat', 'Sheep', 'Mixed', 'Buffalo'];

export const CreateCheeseTypeModal: React.FC<CreateCheeseTypeModalProps> = ({
  visible,
  onClose,
  onCreate,
  isCreating = false,
}) => {
  const [formData, setFormData] = useState<CreateCheeseTypeInput>({
    name: '',
    type: 'Semi-soft',
    milk_type: 'Cow',
    origin_country: '',
    origin_region: '',
    description: '',
  });

  const updateField = (field: keyof CreateCheeseTypeInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = () => {
    // Validation
    if (!formData.name.trim()) {
      Alert.alert('Missing Information', 'Please enter a cheese name');
      return;
    }

    onCreate(formData);
  };

  const handleClose = () => {
    // Reset form
    setFormData({
      name: '',
      type: 'Semi-soft',
      milk_type: 'Cow',
      origin_country: '',
      origin_region: '',
      description: '',
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Create New Cheese Type</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Cheese Name */}
          <View style={styles.section}>
            <Text style={styles.label}>Cheese Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Brie, Cheddar, Manchego"
              value={formData.name}
              onChangeText={(text) => updateField('name', text)}
              autoCapitalize="words"
              autoFocus
            />
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.label}>Category *</Text>
            <View style={styles.optionsGrid}>
              {CHEESE_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.optionButton,
                    formData.type === category && styles.optionButtonSelected,
                  ]}
                  onPress={() => updateField('type', category)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      formData.type === category && styles.optionTextSelected,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Milk Type */}
          <View style={styles.section}>
            <Text style={styles.label}>Milk Type</Text>
            <View style={styles.optionsGrid}>
              {MILK_TYPES.map((milk) => (
                <TouchableOpacity
                  key={milk}
                  style={[
                    styles.optionButton,
                    formData.milk_type === milk && styles.optionButtonSelected,
                  ]}
                  onPress={() => updateField('milk_type', milk)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      formData.milk_type === milk && styles.optionTextSelected,
                    ]}
                  >
                    {milk}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Origin */}
          <View style={styles.section}>
            <Text style={styles.label}>Traditional Origin</Text>
            <TextInput
              style={styles.input}
              placeholder="Country (e.g., France, Italy)"
              value={formData.origin_country || ''}
              onChangeText={(text) => updateField('origin_country', text)}
              autoCapitalize="words"
            />
            <TextInput
              style={styles.input}
              placeholder="Region (optional)"
              value={formData.origin_region || ''}
              onChangeText={(text) => updateField('origin_region', text)}
              autoCapitalize="words"
            />
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="General information about this cheese type..."
              value={formData.description || ''}
              onChangeText={(text) => updateField('description', text)}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Create Button */}
          <TouchableOpacity
            style={[styles.createButton, isCreating && styles.createButtonDisabled]}
            onPress={handleCreate}
            disabled={isCreating}
          >
            <Text style={styles.createButtonText}>
              {isCreating ? 'Creating...' : 'Create Cheese Type'}
            </Text>
          </TouchableOpacity>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontFamily: Typography.fonts.heading,
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontFamily: Typography.fonts.bodyMedium,
    color: '#1F2937',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: Typography.fonts.body,
    color: '#1F2937',
    marginBottom: 8,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonSelected: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  optionText: {
    fontSize: 14,
    fontFamily: Typography.fonts.bodyMedium,
    color: '#6B7280',
  },
  optionTextSelected: {
    color: '#92400E',
  },
  createButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 12,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    fontSize: 18,
    fontFamily: Typography.fonts.bodyMedium,
    color: '#fff',
  },
  bottomPadding: {
    height: 40,
  },
});
