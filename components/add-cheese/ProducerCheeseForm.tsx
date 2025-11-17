import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { CheeseTypeWithStats } from '@/lib';
import Typography from '@/constants/Typography';
import { FlavorTagSelector } from './FlavorTagSelector';
import { Camera, Image as ImageIcon, Star } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

export interface ProducerCheeseFormData {
  producerName: string;
  productName: string;
  originCountry: string;
  originRegion: string;
  priceRange: number;
  description: string;
  notes: string;
  rating: number;
  imageUri?: string;
  flavorTagIds: string[];
}

interface ProducerCheeseFormProps {
  cheeseType: CheeseTypeWithStats;
  onSubmit: (data: ProducerCheeseFormData) => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

export const ProducerCheeseForm: React.FC<ProducerCheeseFormProps> = ({
  cheeseType,
  onSubmit,
  onBack,
  isSubmitting = false,
}) => {
  const [formData, setFormData] = useState<ProducerCheeseFormData>({
    producerName: '',
    productName: '',
    originCountry: cheeseType.origin_country || '',
    originRegion: cheeseType.origin_region || '',
    priceRange: 2,
    description: '',
    notes: '',
    rating: 0,
    imageUri: undefined,
    flavorTagIds: [],
  });

  const updateField = (field: keyof ProducerCheeseFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const selectRating = (rating: number) => {
    updateField('rating', rating);
  };

  const selectPriceRange = (range: number) => {
    updateField('priceRange', range);
  };

  const pickImageFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need permission to access your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      updateField('imageUri', result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need permission to access your camera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      updateField('imageUri', result.assets[0].uri);
    }
  };

  const handleSubmit = () => {
    // Validation
    if (!formData.producerName.trim()) {
      Alert.alert('Missing Information', 'Please enter a producer name');
      return;
    }
    if (formData.rating === 0) {
      Alert.alert('Missing Rating', 'Please rate this cheese');
      return;
    }

    onSubmit(formData);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Change Type</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Adding: {cheeseType.name}</Text>
      </View>

      {/* Photo Upload */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Photo</Text>
        {formData.imageUri ? (
          <TouchableOpacity onPress={pickImageFromGallery} style={styles.imagePreview}>
            <Image source={{ uri: formData.imageUri }} style={styles.previewImage} />
            <Text style={styles.changePhotoText}>Tap to change</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.photoButtons}>
            <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
              <Camera size={24} color="#F59E0B" />
              <Text style={styles.photoButtonText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoButton} onPress={pickImageFromGallery}>
              <ImageIcon size={24} color="#F59E0B" />
              <Text style={styles.photoButtonText}>Choose Photo</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Producer Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Producer Details</Text>
        <TextInput
          style={styles.input}
          placeholder="Producer Name (e.g., President, Tillamook)"
          value={formData.producerName}
          onChangeText={(text) => updateField('producerName', text)}
          autoCapitalize="words"
        />
        <TextInput
          style={styles.input}
          placeholder="Product Name (optional)"
          value={formData.productName}
          onChangeText={(text) => updateField('productName', text)}
          autoCapitalize="words"
        />
      </View>

      {/* Origin */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Where Made</Text>
        <TextInput
          style={styles.input}
          placeholder="Country"
          value={formData.originCountry}
          onChangeText={(text) => updateField('originCountry', text)}
          autoCapitalize="words"
        />
        <TextInput
          style={styles.input}
          placeholder="Region (optional)"
          value={formData.originRegion}
          onChangeText={(text) => updateField('originRegion', text)}
          autoCapitalize="words"
        />
      </View>

      {/* Price Range */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Price Range</Text>
        <View style={styles.priceRangeContainer}>
          {[1, 2, 3, 4, 5].map((price) => (
            <TouchableOpacity
              key={price}
              style={[
                styles.priceButton,
                formData.priceRange === price && styles.priceButtonSelected,
              ]}
              onPress={() => selectPriceRange(price)}
            >
              <Text
                style={[
                  styles.priceText,
                  formData.priceRange === price && styles.priceTextSelected,
                ]}
              >
                {'$'.repeat(price)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Flavor Tags */}
      <View style={styles.section}>
        <FlavorTagSelector
          selectedTagIds={formData.flavorTagIds}
          onSelectionChange={(tagIds) => updateField('flavorTagIds', tagIds)}
        />
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="General information about this cheese..."
          value={formData.description}
          onChangeText={(text) => updateField('description', text)}
          multiline
          numberOfLines={4}
        />
      </View>

      {/* Your Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="What did you think? Where did you try it?"
          value={formData.notes}
          onChangeText={(text) => updateField('notes', text)}
          multiline
          numberOfLines={4}
        />
      </View>

      {/* Rating */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Rating</Text>
        <View style={styles.ratingContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => selectRating(star)}
              style={styles.starButton}
            >
              <Star
                size={40}
                color="#F59E0B"
                fill={formData.rating >= star ? '#F59E0B' : 'transparent'}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <Text style={styles.submitText}>
          {isSubmitting ? 'Adding to Cheese Box...' : 'Add to My Cheese Box'}
        </Text>
      </TouchableOpacity>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  backButton: {
    marginBottom: 8,
  },
  backText: {
    fontSize: 14,
    fontFamily: Typography.fonts.bodyMedium,
    color: '#F59E0B',
  },
  title: {
    fontSize: 24,
    fontFamily: Typography.fonts.heading,
    color: '#1F2937',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Typography.fonts.bodyMedium,
    color: '#1F2937',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: Typography.fonts.body,
    color: '#1F2937',
    marginBottom: 12,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flex: 1,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderStyle: 'dashed',
  },
  photoButtonText: {
    fontSize: 14,
    fontFamily: Typography.fonts.bodyMedium,
    color: '#92400E',
    marginTop: 8,
  },
  imagePreview: {
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
  },
  changePhotoText: {
    fontSize: 14,
    fontFamily: Typography.fonts.body,
    color: '#6B7280',
  },
  priceRangeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  priceButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  priceButtonSelected: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  priceText: {
    fontSize: 18,
    fontFamily: Typography.fonts.bodyMedium,
    color: '#6B7280',
  },
  priceTextSelected: {
    color: '#92400E',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  submitButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 12,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontSize: 18,
    fontFamily: Typography.fonts.bodyMedium,
    color: '#fff',
  },
  bottomPadding: {
    height: 40,
  },
});
