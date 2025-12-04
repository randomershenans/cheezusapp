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
import Slider from '@react-native-community/slider';
import Typography from '@/constants/Typography';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import { Camera, Image as ImageIcon, Star, ArrowLeft } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { CheeseSearchResult } from './CheeseSearch';

export interface AddToBoxFormData {
  rating: number;
  notes: string;
  imageUri?: string;
}

interface AddToBoxFormProps {
  cheese: CheeseSearchResult;
  onSubmit: (data: AddToBoxFormData) => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

export const AddToBoxForm: React.FC<AddToBoxFormProps> = ({
  cheese,
  onSubmit,
  onBack,
  isSubmitting = false,
}) => {
  const [formData, setFormData] = useState<AddToBoxFormData>({
    rating: 0,
    notes: '',
    imageUri: undefined,
  });

  const updateField = (field: keyof AddToBoxFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
    onSubmit(formData);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add to Cheese Box</Text>
      </View>

      {/* Cheese Info Card */}
      <View style={styles.cheeseCard}>
        <View style={styles.cheeseImageContainer}>
          {cheese.image_url ? (
            <Image source={{ uri: cheese.image_url }} style={styles.cheeseImage} />
          ) : (
            <View style={styles.cheeseImagePlaceholder}>
              <Text style={styles.placeholderEmoji}>🧀</Text>
            </View>
          )}
        </View>
        <View style={styles.cheeseInfo}>
          <Text style={styles.cheeseName}>{cheese.name}</Text>
          <Text style={styles.cheeseSubtext}>{cheese.subtext}</Text>
          {cheese.rating && cheese.rating > 0 && (
            <View style={styles.ratingRow}>
              <Star size={14} color="#F59E0B" fill="#F59E0B" />
              <Text style={styles.ratingText}>
                {cheese.rating.toFixed(1)}{cheese.rating_count ? ` (${cheese.rating_count} reviews)` : ''}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Photo Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add a Photo</Text>
        <Text style={styles.sectionSubtitle}>Show off your cheese!</Text>
        
        {formData.imageUri ? (
          <TouchableOpacity onPress={pickImageFromGallery} style={styles.imagePreview}>
            <Image source={{ uri: formData.imageUri }} style={styles.previewImage} />
            <Text style={styles.changePhotoText}>Tap to change</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.photoButtons}>
            <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
              <Camera size={28} color={Colors.primary} />
              <Text style={styles.photoButtonText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoButton} onPress={pickImageFromGallery}>
              <ImageIcon size={28} color={Colors.primary} />
              <Text style={styles.photoButtonText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Rating Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Rating</Text>
        <Text style={styles.sectionSubtitle}>How was it? (optional)</Text>
        
        {/* Star Display */}
        <View style={styles.starDisplayContainer}>
          <View style={styles.starsDisplay}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={32}
                color="#FFD700"
                fill={formData.rating >= star ? '#FFD700' : 'transparent'}
              />
            ))}
          </View>
          <Text style={styles.ratingValueText}>{formData.rating.toFixed(1)} / 5.0</Text>
        </View>

        {/* Slider */}
        <View style={styles.sliderContainer}>
          <Slider
            style={styles.ratingSlider}
            minimumValue={0}
            maximumValue={5}
            step={0.1}
            value={formData.rating}
            onValueChange={(value) => updateField('rating', value)}
            minimumTrackTintColor="#FFD700"
            maximumTrackTintColor="#E0E0E0"
            thumbTintColor="#FCD95B"
          />
        </View>
      </View>

      {/* Notes Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tasting Notes</Text>
        <Text style={styles.sectionSubtitle}>What did you think? (optional)</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Creamy, nutty, perfect with a glass of wine..."
          placeholderTextColor="#9CA3AF"
          value={formData.notes}
          onChangeText={(text) => updateField('notes', text)}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
        activeOpacity={0.8}
      >
        <View style={styles.submitButtonContent}>
          <Star size={20} color="#1F2937" />
          <Text style={styles.submitText}>
            {isSubmitting ? 'Adding...' : 'Add to Cheese Box'}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.l,
    paddingTop: Layout.spacing.xl,
    paddingBottom: Layout.spacing.m,
  },
  backButton: {
    padding: Layout.spacing.s,
    marginRight: Layout.spacing.m,
    marginLeft: -Layout.spacing.s,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
  },
  cheeseCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: Layout.spacing.m,
    marginHorizontal: Layout.spacing.l,
    marginBottom: Layout.spacing.l,
    ...Layout.shadow.medium,
  },
  cheeseImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: Layout.spacing.m,
  },
  cheeseImage: {
    width: '100%',
    height: '100%',
  },
  cheeseImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 32,
  },
  cheeseInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  cheeseName: {
    fontSize: 18,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
    marginBottom: 4,
  },
  cheeseSubtext: {
    fontSize: 14,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginLeft: 4,
  },
  section: {
    paddingHorizontal: Layout.spacing.l,
    marginBottom: Layout.spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginBottom: Layout.spacing.m,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: Layout.spacing.m,
  },
  photoButton: {
    flex: 1,
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: Layout.spacing.l,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
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
    borderRadius: 16,
    marginBottom: 8,
  },
  changePhotoText: {
    fontSize: 14,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  starDisplayContainer: {
    alignItems: 'center',
    marginBottom: Layout.spacing.m,
  },
  starsDisplay: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: Layout.spacing.s,
  },
  ratingValueText: {
    fontSize: 18,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
  },
  sliderContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  ratingSlider: {
    width: '100%',
    height: 40,
  },
  notesInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: Layout.spacing.m,
    fontSize: 16,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
    minHeight: 120,
  },
  submitButton: {
    backgroundColor: '#FCD95B',
    borderRadius: 16,
    padding: Layout.spacing.l,
    marginHorizontal: Layout.spacing.l,
    alignItems: 'center',
    ...Layout.shadow.medium,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: 18,
    fontFamily: Typography.fonts.bodyMedium,
    color: '#1F2937',
  },
  bottomPadding: {
    height: 40,
  },
});
