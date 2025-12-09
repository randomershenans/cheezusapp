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
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Camera, Image as ImageIcon, Check } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/lib/supabase';
import { uploadImageToStorage } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

interface CheeseData {
  id: string;
  cheese_type_id: string;
  producer_name: string;
  product_name: string | null;
  origin_country: string | null;
  origin_region: string | null;
  milk_type: string | null;
  description: string | null;
  image_url: string | null;
  added_by: string;
  verified: boolean;
}

export default function EditCheeseScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cheeseData, setCheeseData] = useState<CheeseData | null>(null);
  
  // Form fields
  const [producerName, setProducerName] = useState('');
  const [productName, setProductName] = useState('');
  const [originCountry, setOriginCountry] = useState('');
  const [originRegion, setOriginRegion] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchCheeseData();
    }
  }, [id]);

  const fetchCheeseData = async () => {
    try {
      const { data, error } = await supabase
        .from('producer_cheeses')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Check if user can edit
      if (data.added_by !== user?.id) {
        Alert.alert('Error', 'You can only edit cheeses you added');
        router.back();
        return;
      }

      if (data.verified) {
        Alert.alert('Cannot Edit', 'This cheese has been verified and can no longer be edited');
        router.back();
        return;
      }

      setCheeseData(data);
      setProducerName(data.producer_name || '');
      setProductName(data.product_name || '');
      setOriginCountry(data.origin_country || '');
      setOriginRegion(data.origin_region || '');
      setDescription(data.description || '');
      setExistingImageUrl(data.image_url);
    } catch (error) {
      console.error('Error fetching cheese:', error);
      Alert.alert('Error', 'Failed to load cheese data');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to upload photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera permissions to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!cheeseData || !user) return;

    setSaving(true);
    try {
      let newImageUrl = existingImageUrl;

      // Upload new image if selected
      if (imageUri) {
        try {
          const response = await fetch(imageUri);
          const blob = await response.blob();
          const reader = new FileReader();
          
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => {
              if (typeof reader.result === 'string') {
                resolve(reader.result);
              } else {
                reject(new Error('Failed to convert image'));
              }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          
          const uploadedUrl = await uploadImageToStorage(base64, 'jpg');
          if (uploadedUrl) {
            newImageUrl = uploadedUrl;
          }
        } catch (error) {
          console.error('Error uploading image:', error);
          Alert.alert('Warning', 'Failed to upload image, but other changes will be saved');
        }
      }

      // Update cheese data
      const { error } = await supabase
        .from('producer_cheeses')
        .update({
          producer_name: producerName.trim(),
          product_name: productName.trim() || null,
          origin_country: originCountry.trim() || null,
          origin_region: originRegion.trim() || null,
          description: description.trim() || null,
          image_url: newImageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('added_by', user.id); // Safety check

      if (error) throw error;

      Alert.alert('Success', 'Cheese updated successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error saving cheese:', error);
      Alert.alert('Error', 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const displayImage = imageUri || existingImageUrl;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Cheese</Text>
        <TouchableOpacity 
          onPress={handleSave} 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.background} />
          ) : (
            <Check size={24} color={Colors.background} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Pending Badge */}
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingText}>⏳ Pending Approval</Text>
          <Text style={styles.pendingSubtext}>You can edit until an admin approves this cheese</Text>
        </View>

        {/* Image Section */}
        <View style={styles.imageSection}>
          <Text style={styles.label}>Photo</Text>
          {displayImage ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: displayImage }} style={styles.imagePreview} />
              <View style={styles.imageButtons}>
                <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
                  <Camera size={20} color={Colors.text} />
                  <Text style={styles.imageButtonText}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                  <ImageIcon size={20} color={Colors.text} />
                  <Text style={styles.imageButtonText}>Choose</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.imagePlaceholder}>
              <View style={styles.imageButtons}>
                <TouchableOpacity style={styles.imageButtonLarge} onPress={takePhoto}>
                  <Camera size={32} color={Colors.primary} />
                  <Text style={styles.imageButtonLargeText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.imageButtonLarge} onPress={pickImage}>
                  <ImageIcon size={32} color={Colors.primary} />
                  <Text style={styles.imageButtonLargeText}>Choose Photo</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Producer Name *</Text>
            <TextInput
              style={styles.input}
              value={producerName}
              onChangeText={setProducerName}
              placeholder="e.g., Kerrygold, President"
              placeholderTextColor={Colors.subtleText}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Product Name</Text>
            <TextInput
              style={styles.input}
              value={productName}
              onChangeText={setProductName}
              placeholder="e.g., Aged Cheddar, Camembert"
              placeholderTextColor={Colors.subtleText}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Country of Origin</Text>
            <TextInput
              style={styles.input}
              value={originCountry}
              onChangeText={setOriginCountry}
              placeholder="e.g., France, Ireland"
              placeholderTextColor={Colors.subtleText}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Region</Text>
            <TextInput
              style={styles.input}
              value={originRegion}
              onChangeText={setOriginRegion}
              placeholder="e.g., Normandy, Cork"
              placeholderTextColor={Colors.subtleText}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add any notes about this cheese..."
              placeholderTextColor={Colors.subtleText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.heading,
    color: Colors.text,
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  scrollView: {
    flex: 1,
  },
  pendingBadge: {
    backgroundColor: '#FEF9E7',
    padding: Layout.spacing.m,
    marginHorizontal: Layout.spacing.m,
    marginTop: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  pendingText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
  },
  pendingSubtext: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginTop: 4,
  },
  imageSection: {
    padding: Layout.spacing.m,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
    marginBottom: Layout.spacing.s,
  },
  imagePreviewContainer: {
    borderRadius: Layout.borderRadius.large,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: Layout.borderRadius.large,
  },
  imageButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Layout.spacing.m,
    marginTop: Layout.spacing.m,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.xs,
    paddingVertical: Layout.spacing.s,
    paddingHorizontal: Layout.spacing.m,
    backgroundColor: Colors.card,
    borderRadius: Layout.borderRadius.medium,
  },
  imageButtonText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
  },
  imagePlaceholder: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Layout.borderRadius.large,
    padding: Layout.spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  imageButtonLarge: {
    alignItems: 'center',
    gap: Layout.spacing.s,
    padding: Layout.spacing.m,
  },
  imageButtonLargeText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.primary,
  },
  formSection: {
    padding: Layout.spacing.m,
  },
  inputGroup: {
    marginBottom: Layout.spacing.m,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: Layout.borderRadius.medium,
    padding: Layout.spacing.m,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 100,
    paddingTop: Layout.spacing.m,
  },
  bottomPadding: {
    height: 40,
  },
});
