import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Slider from '@react-native-community/slider';
import Typography from '@/constants/Typography';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import { Camera, Image as ImageIcon, Star, ArrowLeft, ScanLine, ChevronDown, Info, Check, X, AlertCircle } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { FlavorTagSelector } from './FlavorTagSelector';
import { supabase } from '@/lib/supabase';
import { scanCheeseLabel, LabelScanResult } from '@/lib/label-scanner';
import { Analytics } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';

export interface NewCheeseFormData {
  // Cheese info
  cheeseName: string;
  producerName: string;
  producerId?: string; // Link to producers table
  originCountry: string;
  cheeseType: string;
  milkTypes: string[];
  description: string;
  flavorTagIds: string[];
  imageUri?: string;
  // Personal entry
  rating: number;
  notes: string;
}

interface ProducerSuggestion {
  id: string;
  name: string;
  country?: string;
  cheese_count: number;
}

export interface CheeseTypePrefill {
  cheeseTypeId: string;
  cheeseName: string;
  cheeseType?: string;
  originCountry?: string;
}

interface NewCheeseFormProps {
  onSubmit: (data: NewCheeseFormData) => void;
  onBack: () => void;
  isSubmitting?: boolean;
  prefillData?: CheeseTypePrefill;
}

const CHEESE_TYPES = ['Soft', 'Semi-soft', 'Semi-firm', 'Hard', 'Blue', 'Fresh', 'Processed'];
const MILK_TYPES = ['Cow', 'Goat', 'Sheep', 'Buffalo', 'Mixed'];

export const NewCheeseForm: React.FC<NewCheeseFormProps> = ({
  onSubmit,
  onBack,
  isSubmitting = false,
  prefillData,
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<NewCheeseFormData>({
    cheeseName: prefillData?.cheeseName || '',
    producerName: '',
    originCountry: prefillData?.originCountry || '',
    cheeseType: prefillData?.cheeseType || '',
    milkTypes: [],
    description: '',
    flavorTagIds: [],
    imageUri: undefined,
    rating: 0,
    notes: '',
  });

  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showMilkDropdown, setShowMilkDropdown] = useState(false);
  const [producerSearch, setProducerSearch] = useState('');
  const [producerSuggestions, setProducerSuggestions] = useState<ProducerSuggestion[]>([]);
  const [showProducerSuggestions, setShowProducerSuggestions] = useState(false);
  const [isSearchingProducers, setIsSearchingProducers] = useState(false);
  
  // Label scanner state
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Search for producers as user types - query the producers table
  useEffect(() => {
    const searchProducers = async () => {
      if (producerSearch.length < 2) {
        setProducerSuggestions([]);
        return;
      }

      setIsSearchingProducers(true);
      try {
        // Search the producers table directly
        const { data: producers, error } = await supabase
          .from('producers')
          .select('id, name, country')
          .ilike('name', `%${producerSearch}%`)
          .limit(10);

        if (error) throw error;

        // Get cheese counts for each producer
        const suggestions: ProducerSuggestion[] = await Promise.all(
          (producers || []).map(async (p) => {
            const { count } = await supabase
              .from('producer_cheeses')
              .select('id', { count: 'exact', head: true })
              .eq('producer_id', p.id);
            
            return {
              id: p.id,
              name: p.name,
              country: p.country,
              cheese_count: count || 0,
            };
          })
        );

        // Sort by cheese count descending
        suggestions.sort((a, b) => b.cheese_count - a.cheese_count);
        setProducerSuggestions(suggestions);
      } catch (error) {
        console.error('Error searching producers:', error);
      } finally {
        setIsSearchingProducers(false);
      }
    };

    const timer = setTimeout(searchProducers, 300);
    return () => clearTimeout(timer);
  }, [producerSearch]);

  const updateField = (field: keyof NewCheeseFormData, value: any) => {
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

  const handleScanLabel = () => {
    setShowScannerModal(true);
    setScanError(null);
  };

  const takeLabelPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need permission to access your camera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      await processLabelImage(result.assets[0].base64, result.assets[0].uri);
    }
  };

  const pickLabelFromGallery = async () => {
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
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      await processLabelImage(result.assets[0].base64, result.assets[0].uri);
    }
  };

  const processLabelImage = async (base64: string, uri: string) => {
    setIsScanning(true);
    setScanError(null);
    Analytics.trackAIScanStart(user?.id);

    try {
      const result = await scanCheeseLabel(base64);

      if (!result.success) {
        setScanError(result.error.message);
        Analytics.trackAIScanFail(result.error.message, user?.id);
        return;
      }
      
      Analytics.trackAIScanSuccess(result.data.confidence, user?.id);

      // Prefill the form with scanned data
      const data = result.data;
      
      setFormData(prev => ({
        ...prev,
        cheeseName: data.cheeseName || prev.cheeseName,
        producerName: data.producerName || prev.producerName,
        originCountry: data.originCountry || prev.originCountry,
        cheeseType: data.cheeseType || prev.cheeseType,
        milkTypes: data.milkTypes.length > 0 ? data.milkTypes : prev.milkTypes,
        description: data.description || prev.description,
        imageUri: uri,
      }));

      // Update producer search field
      if (data.producerName) {
        setProducerSearch(data.producerName);
      }

      setShowScannerModal(false);
      
      // Show success message with confidence
      const confidenceMsg = data.confidence === 'high' 
        ? 'All details captured!' 
        : data.confidence === 'medium'
        ? 'Most details captured - please review.'
        : 'Some details captured - please verify and complete.';
      
      Alert.alert('Label Scanned! 🎉', confidenceMsg);
    } catch (error) {
      console.error('Scan error:', error);
      setScanError('Something went wrong. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmit = () => {
    // Validation
    if (!formData.cheeseName.trim()) {
      Alert.alert('Missing Information', 'Please enter the cheese name');
      return;
    }

    onSubmit(formData);
  };

  return (
    <>
      {/* Label Scanner Modal */}
      <Modal
        visible={showScannerModal}
        transparent
        animationType="slide"
        onRequestClose={() => !isScanning && setShowScannerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.scannerModal}>
            {/* Close Button */}
            {!isScanning && (
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowScannerModal(false)}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            )}

            {isScanning ? (
              <View style={styles.scanningContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.scanningText}>Analyzing label...</Text>
                <Text style={styles.scanningSubtext}>This may take a few seconds</Text>
              </View>
            ) : (
              <>
                {/* Header */}
                <View style={styles.scannerHeader}>
                  <ScanLine size={40} color={Colors.primary} />
                  <Text style={styles.scannerTitle}>Scan Cheese Label</Text>
                  <Text style={styles.scannerSubtitle}>
                    Take a photo of the cheese label and we'll fill in the details automatically
                  </Text>
                </View>

                {/* Instructions */}
                <View style={styles.instructionsContainer}>
                  <Text style={styles.instructionsTitle}>📸 Tips for best results:</Text>
                  <View style={styles.instructionItem}>
                    <Text style={styles.instructionBullet}>•</Text>
                    <Text style={styles.instructionText}>
                      Make sure the <Text style={styles.instructionBold}>entire label</Text> is visible
                    </Text>
                  </View>
                  <View style={styles.instructionItem}>
                    <Text style={styles.instructionBullet}>•</Text>
                    <Text style={styles.instructionText}>
                      Use <Text style={styles.instructionBold}>good lighting</Text> - avoid shadows
                    </Text>
                  </View>
                  <View style={styles.instructionItem}>
                    <Text style={styles.instructionBullet}>•</Text>
                    <Text style={styles.instructionText}>
                      Hold steady and ensure text is <Text style={styles.instructionBold}>in focus</Text>
                    </Text>
                  </View>
                  <View style={styles.instructionItem}>
                    <Text style={styles.instructionBullet}>•</Text>
                    <Text style={styles.instructionText}>
                      Capture the <Text style={styles.instructionBold}>product name & producer</Text> info
                    </Text>
                  </View>
                </View>

                {/* Error Message */}
                {scanError && (
                  <View style={styles.scanErrorContainer}>
                    <AlertCircle size={20} color="#DC2626" />
                    <Text style={styles.scanErrorText}>{scanError}</Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.scannerActions}>
                  <TouchableOpacity style={styles.scannerPrimaryButton} onPress={takeLabelPhoto}>
                    <Camera size={24} color="#1F2937" />
                    <Text style={styles.scannerPrimaryButtonText}>Take Photo of Label</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.scannerSecondaryButton} onPress={pickLabelFromGallery}>
                    <ImageIcon size={20} color={Colors.text} />
                    <Text style={styles.scannerSecondaryButtonText}>Choose from Gallery</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView 
        style={styles.keyboardAvoid} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Cheese</Text>
      </View>

      {/* Pending Notice */}
      <View style={styles.pendingNotice}>
        <Info size={20} color="#0369A1" />
        <Text style={styles.pendingText}>
          New cheeses are reviewed before appearing publicly. You'll see it in your cheese box immediately!
        </Text>
      </View>

      {/* Photo Section */}
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
              <Camera size={28} color="#92400E" />
              <Text style={styles.photoButtonText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoButton} onPress={pickImageFromGallery}>
              <ImageIcon size={28} color="#92400E" />
              <Text style={styles.photoButtonText}>Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoButton} onPress={handleScanLabel}>
              <ScanLine size={28} color="#92400E" />
              <Text style={styles.photoButtonText}>Scan Label</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Cheese Name */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cheese Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Brie, Cheddar, Comté"
          placeholderTextColor="#9CA3AF"
          value={formData.cheeseName}
          onChangeText={(text) => updateField('cheeseName', text)}
          autoCapitalize="words"
        />
      </View>

      {/* Producer (Optional) */}
      <View style={[styles.section, { zIndex: 200 }]}>
        <Text style={styles.sectionTitle}>Producer</Text>
        <Text style={styles.sectionSubtitle}>Search or add a new producer</Text>
        <View style={{ zIndex: 200 }}>
          <TextInput
            style={styles.input}
            placeholder="e.g., President, Tillamook"
            placeholderTextColor="#9CA3AF"
            value={producerSearch}
            onChangeText={(text) => {
              setProducerSearch(text);
              setShowProducerSuggestions(true);
              if (text !== formData.producerName) {
                updateField('producerName', '');
              }
            }}
            onFocus={() => setShowProducerSuggestions(true)}
            autoCapitalize="words"
          />
          {showProducerSuggestions && producerSearch.length >= 2 && (
            <View style={styles.producerSuggestions}>
              {isSearchingProducers ? (
                <View style={styles.producerSuggestionItem}>
                  <Text style={styles.producerSuggestionText}>Searching...</Text>
                </View>
              ) : producerSuggestions.length > 0 ? (
                <>
                  {producerSuggestions.map((producer) => (
                    <TouchableOpacity
                      key={producer.id}
                      style={styles.producerSuggestionItem}
                      onPress={() => {
                        setProducerSearch(producer.name);
                        updateField('producerName', producer.name);
                        updateField('producerId', producer.id);
                        setShowProducerSuggestions(false);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.producerSuggestionText}>{producer.name}</Text>
                        {producer.country && (
                          <Text style={styles.producerSuggestionCountry}>{producer.country}</Text>
                        )}
                      </View>
                      <Text style={styles.producerSuggestionCount}>{producer.cheese_count} cheeses</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={styles.producerAddNew}
                    onPress={() => {
                      updateField('producerName', producerSearch.trim());
                      updateField('producerId', undefined); // New producer, no ID yet
                      setShowProducerSuggestions(false);
                    }}
                  >
                    <Text style={styles.producerAddNewText}>+ Add "{producerSearch.trim()}" as new producer</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={styles.producerAddNew}
                  onPress={() => {
                    updateField('producerName', producerSearch.trim());
                    setShowProducerSuggestions(false);
                  }}
                >
                  <Text style={styles.producerAddNewText}>+ Add "{producerSearch.trim()}" as new producer</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
        {formData.producerName && (
          <View style={styles.selectedProducer}>
            <Check size={16} color="#16A34A" />
            <Text style={styles.selectedProducerText}>Selected: {formData.producerName}</Text>
          </View>
        )}
      </View>

      {/* Origin Country */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Origin Country</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., France, Italy, USA"
          placeholderTextColor="#9CA3AF"
          value={formData.originCountry}
          onChangeText={(text) => updateField('originCountry', text)}
          autoCapitalize="words"
        />
      </View>

      {/* Cheese Type & Milk Type */}
      <View style={[styles.section, { zIndex: 100 }]}>
        <Text style={styles.sectionTitle}>Type & Milk</Text>
        <View style={[styles.row, { zIndex: 100 }]}>
          {/* Cheese Type Dropdown */}
          <View style={[styles.halfInput, { zIndex: showTypeDropdown ? 200 : 100 }]}>
            <TouchableOpacity 
              style={styles.dropdown}
              onPress={() => {
                setShowTypeDropdown(!showTypeDropdown);
                setShowMilkDropdown(false);
              }}
            >
              <Text style={formData.cheeseType ? styles.dropdownText : styles.dropdownPlaceholder}>
                {formData.cheeseType || 'Cheese Type'}
              </Text>
              <ChevronDown size={20} color="#9CA3AF" />
            </TouchableOpacity>
            {showTypeDropdown && (
              <View style={styles.dropdownMenu}>
                {CHEESE_TYPES.map(type => (
                  <TouchableOpacity
                    key={type}
                    style={styles.dropdownItem}
                    onPress={() => {
                      updateField('cheeseType', type);
                      setShowTypeDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Milk Type Multi-Select */}
          <View style={[styles.halfInput, { zIndex: showMilkDropdown ? 200 : 100 }]}>
            <TouchableOpacity 
              style={styles.dropdown}
              onPress={() => {
                setShowMilkDropdown(!showMilkDropdown);
                setShowTypeDropdown(false);
              }}
            >
              <Text style={formData.milkTypes.length > 0 ? styles.dropdownText : styles.dropdownPlaceholder}>
                {formData.milkTypes.length > 0 ? formData.milkTypes.join(', ') : 'Milk Type'}
              </Text>
              <ChevronDown size={20} color="#9CA3AF" />
            </TouchableOpacity>
            {showMilkDropdown && (
              <View style={styles.dropdownMenu}>
                {MILK_TYPES.map(type => {
                  const isSelected = formData.milkTypes.includes(type);
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                      onPress={() => {
                        if (isSelected) {
                          updateField('milkTypes', formData.milkTypes.filter(t => t !== type));
                        } else {
                          updateField('milkTypes', [...formData.milkTypes, type]);
                        }
                      }}
                    >
                      <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextSelected]}>
                        {type}
                      </Text>
                      {isSelected && <Check size={16} color="#FCD95B" />}
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={styles.dropdownDoneButton}
                  onPress={() => setShowMilkDropdown(false)}
                >
                  <Text style={styles.dropdownDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
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
        <Text style={styles.sectionTitle}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Tell us about this cheese..."
          placeholderTextColor="#9CA3AF"
          value={formData.description}
          onChangeText={(text) => updateField('description', text)}
          multiline
          numberOfLines={3}
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
          <Check size={20} color="#1F2937" />
          <Text style={styles.submitText}>
            {isSubmitting ? 'Adding...' : 'Add Cheese'}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.bottomPadding} />
    </ScrollView>
    </KeyboardAvoidingView>
    </>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
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
  pendingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderRadius: 12,
    padding: Layout.spacing.m,
    marginHorizontal: Layout.spacing.l,
    marginBottom: Layout.spacing.l,
    gap: Layout.spacing.s,
  },
  pendingText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.fonts.body,
    color: '#0369A1',
  },
  section: {
    paddingHorizontal: Layout.spacing.l,
    marginBottom: Layout.spacing.l,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: Layout.spacing.m,
    fontSize: 16,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
    marginBottom: 8,
  },
  textArea: {
    minHeight: 80,
  },
  row: {
    flexDirection: 'row',
    gap: Layout.spacing.m,
  },
  halfInput: {
    flex: 1,
    marginBottom: 0,
  },
  producerSuggestions: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Layout.shadow.large,
    zIndex: 1000,
    elevation: 10,
  },
  producerSuggestionItem: {
    padding: Layout.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  producerSuggestionText: {
    fontSize: 16,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
  },
  producerSuggestionCountry: {
    fontSize: 12,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginTop: 2,
  },
  producerSuggestionCount: {
    fontSize: 14,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  producerAddNew: {
    padding: Layout.spacing.m,
    backgroundColor: '#FEF9E7',
  },
  producerAddNewText: {
    fontSize: 14,
    fontFamily: Typography.fonts.bodyMedium,
    color: '#92400E',
  },
  selectedProducer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
  },
  selectedProducerText: {
    fontSize: 14,
    fontFamily: Typography.fonts.bodyMedium,
    color: '#16A34A',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: Layout.spacing.m,
  },
  dropdownText: {
    fontSize: 16,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
  },
  dropdownPlaceholder: {
    fontSize: 16,
    fontFamily: Typography.fonts.body,
    color: '#9CA3AF',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Layout.shadow.large,
    zIndex: 1000,
    elevation: 10,
  },
  dropdownItem: {
    padding: Layout.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownItemSelected: {
    backgroundColor: '#FEF9E7',
  },
  dropdownItemText: {
    fontSize: 16,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
  },
  dropdownItemTextSelected: {
    color: '#92400E',
    fontFamily: Typography.fonts.bodyMedium,
  },
  dropdownDoneButton: {
    padding: Layout.spacing.m,
    alignItems: 'center',
    backgroundColor: '#FCD95B',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  dropdownDoneText: {
    fontSize: 16,
    fontFamily: Typography.fonts.bodyMedium,
    color: '#1F2937',
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
    borderColor: '#FCD95B',
    borderStyle: 'dashed',
  },
  photoButtonText: {
    fontSize: 12,
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.l,
    marginVertical: Layout.spacing.l,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 14,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.subtleText,
    paddingHorizontal: Layout.spacing.m,
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
  // Scanner Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  scannerModal: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Layout.spacing.xl,
    paddingBottom: 40,
    minHeight: '60%',
  },
  modalCloseButton: {
    position: 'absolute',
    top: Layout.spacing.m,
    right: Layout.spacing.m,
    padding: Layout.spacing.s,
    zIndex: 10,
  },
  scanningContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Layout.spacing.xxl,
  },
  scanningText: {
    fontSize: 18,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
    marginTop: Layout.spacing.l,
  },
  scanningSubtext: {
    fontSize: 14,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginTop: Layout.spacing.s,
  },
  scannerHeader: {
    alignItems: 'center',
    marginBottom: Layout.spacing.xl,
    paddingTop: Layout.spacing.m,
  },
  scannerTitle: {
    fontSize: 22,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
    marginTop: Layout.spacing.m,
  },
  scannerSubtitle: {
    fontSize: 14,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    textAlign: 'center',
    marginTop: Layout.spacing.s,
    paddingHorizontal: Layout.spacing.m,
  },
  instructionsContainer: {
    backgroundColor: '#FEF9E7',
    borderRadius: 16,
    padding: Layout.spacing.l,
    marginBottom: Layout.spacing.xl,
  },
  instructionsTitle: {
    fontSize: 15,
    fontFamily: Typography.fonts.bodyMedium,
    color: '#92400E',
    marginBottom: Layout.spacing.m,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Layout.spacing.s,
  },
  instructionBullet: {
    fontSize: 14,
    color: '#92400E',
    marginRight: Layout.spacing.s,
    lineHeight: 20,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.fonts.body,
    color: '#78350F',
    lineHeight: 20,
  },
  instructionBold: {
    fontFamily: Typography.fonts.bodyMedium,
  },
  scanErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: Layout.spacing.m,
    marginBottom: Layout.spacing.l,
    gap: Layout.spacing.s,
  },
  scanErrorText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.fonts.body,
    color: '#DC2626',
  },
  scannerActions: {
    gap: Layout.spacing.m,
  },
  scannerPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FCD95B',
    borderRadius: 16,
    padding: Layout.spacing.l,
    gap: Layout.spacing.s,
    ...Layout.shadow.medium,
  },
  scannerPrimaryButtonText: {
    fontSize: 16,
    fontFamily: Typography.fonts.bodyMedium,
    color: '#1F2937',
  },
  scannerSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: Layout.spacing.m,
    gap: Layout.spacing.s,
  },
  scannerSecondaryButtonText: {
    fontSize: 14,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
  },
});
