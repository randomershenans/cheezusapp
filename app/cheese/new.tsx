import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, ScrollView, Platform, Modal, Alert, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, router } from 'expo-router';
import { X, Camera, Upload, ImagePlus, Brain, ArrowLeft } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';
import { takeCameraPhoto, pickImageFromGallery, analyzeImageWithAI, ensureStorageBucket } from '@/lib/storage';
import { saveCheeseEntry, CheeseData, CheeseType, MilkType } from '@/lib/cheese-service';
import { supabase } from '@/lib/supabase';

// Using types from cheese-service.ts instead of redefining them here

const cheeseTypes: CheeseType[] = ['Hard', 'Soft', 'Semi-soft', 'Fresh', 'Blue', 'Processed'];
const milkTypes: MilkType[] = ['Cow', 'Goat', 'Sheep', 'Mixed', 'Buffalo'];

// Define styles at the top level, before any component references them
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Layout.spacing.xl,
    paddingVertical: Layout.spacing.l,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: Layout.spacing.m,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: Layout.spacing.m,
  },
  imageUpload: {
    height: 200,
    backgroundColor: '#F5F5F5',
    borderRadius: Layout.borderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Layout.spacing.l,
    overflow: 'hidden',
    position: 'relative',
  },
  cheeseImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  changePhotoButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: Layout.spacing.s,
    alignItems: 'center',
  },
  changePhotoText: {
    color: '#FFFFFF',
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
  },
  imageUploadText: {
    marginTop: Layout.spacing.s,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.subtleText,
  },
  formSection: {
    marginBottom: Layout.spacing.l,
  },
  label: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
    marginBottom: Layout.spacing.s,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.medium,
    padding: Layout.spacing.m,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.s,
  },
  optionButton: {
    paddingVertical: Layout.spacing.s,
    paddingHorizontal: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
    backgroundColor: '#F5F5F5',
  },
  optionButtonSelected: {
    backgroundColor: Colors.primary,
  },
  optionText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
  },
  optionTextSelected: {
    color: Colors.background,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flex1: {
    flex: 1,
  },
  spacer: {
    width: Layout.spacing.m,
  },
  tagInput: {
    flexDirection: 'row',
    gap: Layout.spacing.s,
    marginBottom: Layout.spacing.s,
  },
  tagInputField: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.medium,
    padding: Layout.spacing.m,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
  },
  addTagButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Layout.spacing.l,
    justifyContent: 'center',
    borderRadius: Layout.borderRadius.medium,
  },
  addTagButtonText: {
    color: Colors.background,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.s,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0DB',
    paddingVertical: Layout.spacing.xs,
    paddingHorizontal: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    gap: Layout.spacing.xs,
  },
  tagText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.primary,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: Layout.borderRadius.medium,
    paddingVertical: Layout.spacing.m,
    alignItems: 'center',
    marginTop: Layout.spacing.xl,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.subtleText,
    opacity: 0.7,
  },
  errorContainer: {
    marginTop: Layout.spacing.m,
    padding: Layout.spacing.m,
    backgroundColor: '#FFEEEE',
    borderRadius: Layout.borderRadius.small,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6666',
  },
  errorText: {
    color: '#DD3333',
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    marginBottom: Layout.spacing.xs,
  },
  cancelButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
  },
  formContainer: {
    padding: Layout.spacing.m,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  photoOptionsContainer: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Layout.borderRadius.large,
    borderTopRightRadius: Layout.borderRadius.large,
    padding: Layout.spacing.l,
    paddingBottom: Platform.OS === 'ios' ? Layout.spacing.xl : Layout.spacing.l,
  },
  photoOptionsTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Layout.spacing.l,
  },
  photoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
    marginBottom: Layout.spacing.m,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  photoOptionText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
    marginLeft: Layout.spacing.m,
  },
  cancelButton: {
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    marginTop: Layout.spacing.s,
  },
  submitButtonText: {
    color: Colors.background,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    textAlign: 'center',
  },
});

export default function NewCheeseScreen() {
  const router = useRouter();
  const { name } = useLocalSearchParams();
  
  const [cheeseName, setCheeseName] = useState(name as string || '');
  const [selectedType, setSelectedType] = useState<CheeseType | null>(null);
  const [selectedMilk, setSelectedMilk] = useState<MilkType | null>(null);
  const [origin, setOrigin] = useState({ country: '', region: '' });
  const [description, setDescription] = useState('');
  const [ageingPeriod, setAgeingPeriod] = useState('');
  const [flavorTags, setFlavorTags] = useState<string[]>([]);
  const [newFlavorTag, setNewFlavorTag] = useState('');
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [photoSource, setPhotoSource] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Ensure storage bucket exists on component mount
  useEffect(() => {
    ensureStorageBucket().catch(err => 
      console.error('Failed to ensure storage bucket exists:', err)
    );
  }, []);

  // Authentication check on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        Alert.alert(
          'Authentication Required', 
          'Please sign in to add a new cheese.',
          [{ text: 'OK', onPress: () => router.push('/') }]
        );
      }
    };
    checkAuth();
  }, []);

  const handleAddFlavorTag = () => {
    if (newFlavorTag.trim() && !flavorTags.includes(newFlavorTag.trim())) {
      setFlavorTags([...flavorTags, newFlavorTag.trim()]);
      setNewFlavorTag('');
    }
  };

  const handleRemoveFlavorTag = (tag: string) => {
    setFlavorTags(flavorTags.filter(t => t !== tag));
  };

  const handlePhotoOptionSelect = async (option: 'camera' | 'gallery' | 'ai') => {
    // Close the photo options modal
    setPhotoModalVisible(false);
    setIsUploading(true);
    
    try {
      // Check authentication first
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session) {
        Alert.alert(
          'Authentication Required', 
          'Please sign in to upload photos.',
          [{ text: 'OK', onPress: () => router.push('/') }]
        );
        return;
      }
      
      let photoUri: string | null = null;
      
      if (option === 'camera') {
        photoUri = await takeCameraPhoto();
      } else if (option === 'gallery') {
        photoUri = await pickImageFromGallery();
      } else if (option === 'ai') {
        // For now, AI analysis is a placeholder that uses gallery selection
        Alert.alert(
          'AI Analysis', 
          'The AI will analyze your cheese photo to help identify it. Please select an image.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Continue', onPress: async () => {
                setIsUploading(true);
                const aiUri = await analyzeImageWithAI();
                if (aiUri) {
                  setPhotoSource(aiUri);
                  Alert.alert('AI Analysis Complete', 'The cheese appears to be a fine quality artisanal cheese.');
                } else {
                  Alert.alert('Analysis Failed', 'Could not analyze the photo. Please try again.');
                }
                setIsUploading(false);
              }
            }
          ]
        );
        setIsUploading(false);
        return;
      }
      
      if (photoUri) {
        setPhotoSource(photoUri);
      } else {
        Alert.alert('Upload Failed', 'Could not upload the photo. Please check your permissions and try again.');
      }
    } catch (error) {
      console.error(`Error with photo option: ${option}`, error);
      Alert.alert(
        'Upload Error', 
        `Failed to ${option === 'camera' ? 'take' : option === 'gallery' ? 'select' : 'analyze'} photo. Please try again.`
      );
    } finally {
      setIsUploading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!cheeseName.trim()) errors.name = 'Name is required';
    if (!selectedType) errors.type = 'Cheese type is required';
    if (!selectedMilk) errors.milk = 'Milk type is required';
    if (!origin.country.trim()) errors.originCountry = 'Country of origin is required';
    if (!description.trim()) errors.description = 'Description is required';
    if (!photoSource) errors.image = 'A cheese photo is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare data for saving
      const cheeseData: CheeseData = {
        name: cheeseName,
        type: selectedType as CheeseType, // We validated this isn't null
        milk: selectedMilk as MilkType, // We validated this isn't null
        origin_country: origin.country,
        origin_region: origin.region || undefined,
        description,
        ageing_period: ageingPeriod || undefined,
        image_url: photoSource as string, // We validated this isn't null
        flavor_tags: flavorTags
      };
      
      // Save to database
      const cheeseId = await saveCheeseEntry(cheeseData);
      
      if (cheeseId) {
        // Show notification
        Alert.alert('Success', 'Cheese added successfully!');
        
        // Automatically redirect to the cheese details page after a short delay
        setTimeout(() => {
          router.replace('/cheese/' + cheeseId);
        }, 1000); // 1 second delay for the alert to be seen
      } else {
        throw new Error('Failed to save cheese');
      }
    } catch (error) {
      console.error('Error saving cheese:', error);
      Alert.alert('Error', 'Failed to save cheese. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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
        <Text style={styles.headerTitle}>Add New Cheese</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity 
          style={styles.imageUpload}
          onPress={() => setPhotoModalVisible(true)}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.imageUploadText}>Uploading...</Text>
            </>
          ) : photoSource ? (
            <>
              <Image 
                source={{ uri: photoSource }} 
                style={styles.cheeseImage} 
                resizeMode="cover"
                onError={(e) => console.log('Image loading error:', e.nativeEvent.error)}
              />
              <TouchableOpacity 
                style={styles.changePhotoButton}
                onPress={() => setPhotoModalVisible(true)}
              >
                <Text style={styles.changePhotoText}>Change Photo</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <ImagePlus size={32} color={Colors.subtleText} />
              <Text style={styles.imageUploadText}>Add cheese photo</Text>
            </>
          )}
        </TouchableOpacity>
        
        {/* Photo Options Modal */}
        <Modal
          visible={photoModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setPhotoModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.photoOptionsContainer}>
              <Text style={styles.photoOptionsTitle}>Add Photo</Text>
              
              <TouchableOpacity 
                style={styles.photoOption}
                onPress={() => handlePhotoOptionSelect('camera')}
              >
                <Camera size={24} color={Colors.primary} />
                <Text style={styles.photoOptionText}>Take Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.photoOption}
                onPress={() => handlePhotoOptionSelect('gallery')}
              >
                <Upload size={24} color={Colors.primary} />
                <Text style={styles.photoOptionText}>Upload from Gallery</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.photoOption}
                onPress={() => handlePhotoOptionSelect('ai')}
              >
                <Brain size={24} color={Colors.primary} />
                <Text style={styles.photoOptionText}>AI Analysis</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setPhotoModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <View style={styles.formSection}>
          <Text style={styles.label}>Cheese Name</Text>
          <TextInput
            style={styles.input}
            value={cheeseName}
            onChangeText={setCheeseName}
            placeholder="Enter cheese name"
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>Type</Text>
          <View style={styles.optionsGrid}>
            {cheeseTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.optionButton,
                  selectedType === type && styles.optionButtonSelected
                ]}
                onPress={() => setSelectedType(type)}
              >
                <Text style={[
                  styles.optionText,
                  selectedType === type && styles.optionTextSelected
                ]}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>Milk Type</Text>
          <View style={styles.optionsGrid}>
            {milkTypes.map((milk) => (
              <TouchableOpacity
                key={milk}
                style={[
                  styles.optionButton,
                  selectedMilk === milk && styles.optionButtonSelected
                ]}
                onPress={() => setSelectedMilk(milk)}
              >
                <Text style={[
                  styles.optionText,
                  selectedMilk === milk && styles.optionTextSelected
                ]}>{milk}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>Origin</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.flex1]}
              value={origin.country}
              onChangeText={(text) => setOrigin({...origin, country: text})}
              placeholder="Country"
            />
            <View style={styles.spacer} />
            <TextInput
              style={[styles.input, styles.flex1]}
              value={origin.region}
              onChangeText={(text) => setOrigin({...origin, region: text})}
              placeholder="Region"
            />
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>Ageing Period (months)</Text>
          <TextInput
            style={styles.input}
            value={ageingPeriod}
            onChangeText={setAgeingPeriod}
            placeholder="e.g., 12-24"
            keyboardType="number-pad"
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the cheese..."
            multiline={true}
            numberOfLines={5}
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>Flavor Tags</Text>
          
          <View style={styles.tagInput}>
            <TextInput
              style={styles.tagInputField}
              value={newFlavorTag}
              onChangeText={setNewFlavorTag}
              placeholder="e.g., Nutty, Sweet"
            />
            <TouchableOpacity 
              style={styles.addTagButton}
              onPress={handleAddFlavorTag}
            >
              <Text style={styles.addTagButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.tagsContainer}>
            {flavorTags.map((tag) => (
              <TouchableOpacity 
                key={tag}
                style={styles.tag}
                onPress={() => handleRemoveFlavorTag(tag)}
              >
                <Text style={styles.tagText}>{tag}</Text>
                <X size={14} color={Colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <View style={styles.formContainer}>
          <TouchableOpacity 
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} 
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Add Cheese</Text>
            )}
          </TouchableOpacity>
          
          {Object.keys(formErrors).length > 0 && (
            <View style={styles.errorContainer}>
              {Object.values(formErrors).map((error, index) => (
                <Text key={index} style={styles.errorText}>{error}</Text>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
