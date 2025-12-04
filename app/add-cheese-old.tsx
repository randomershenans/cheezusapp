import React, { useState } from 'react';
import { StyleSheet, View, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import {
  CheeseTypeWithStats,
  CreateCheeseTypeInput,
  createCheeseType,
  createProducerCheese,
  updateFlavorTagsForProducerCheese,
  addProducerCheeseToBox,
} from '@/lib';
import { uploadImageToStorage } from '@/lib/storage';
import { CheeseTypeSelector } from '@/components/add-cheese/CheeseTypeSelector';
import { ProducerCheeseForm, ProducerCheeseFormData } from '@/components/add-cheese/ProducerCheeseForm';
import { CreateCheeseTypeModal } from '@/components/add-cheese/CreateCheeseTypeModal';
import Colors from '@/constants/Colors';

type Step = 'select-type' | 'enter-details';

export default function AddCheeseScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('select-type');
  const [selectedCheeseType, setSelectedCheeseType] = useState<CheeseTypeWithStats | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingType, setIsCreatingType] = useState(false);

  // Handle cheese type selection
  const handleSelectCheeseType = (cheeseType: CheeseTypeWithStats) => {
    setSelectedCheeseType(cheeseType);
    setStep('enter-details');
  };

  // Handle creating new cheese type
  const handleCreateCheeseType = async (data: CreateCheeseTypeInput) => {
    setIsCreatingType(true);
    try {
      const cheeseTypeId = await createCheeseType(data);
      
      if (cheeseTypeId) {
        // Create a CheeseTypeWithStats object for the newly created type
        const newCheeseType: CheeseTypeWithStats = {
          id: cheeseTypeId,
          name: data.name,
          type: data.type,
          milk_type: data.milk_type,
          origin_country: data.origin_country,
          origin_region: data.origin_region,
          description: data.description,
          producer_count: 0,
          total_ratings: 0,
          average_rating: 0,
          unique_raters: 0,
        };
        
        setShowCreateModal(false);
        setSelectedCheeseType(newCheeseType);
        setStep('enter-details');
        Alert.alert('Success', 'Cheese type created!');
      } else {
        Alert.alert('Error', 'Failed to create cheese type');
      }
    } catch (error) {
      console.error('Error creating cheese type:', error);
      Alert.alert('Error', 'Failed to create cheese type');
    } finally {
      setIsCreatingType(false);
    }
  };

  // Handle producer cheese form submission
  const handleSubmitProducerCheese = async (formData: ProducerCheeseFormData) => {
    if (!selectedCheeseType) return;
    
    setIsSubmitting(true);
    try {
      // Upload image if provided
      let imageUrl: string | undefined;
      if (formData.imageUri) {
        try {
          // Convert URI to base64
          const response = await fetch(formData.imageUri);
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
          
          // Upload to storage
          const uploadedUrl = await uploadImageToStorage(base64, 'jpg');
          if (uploadedUrl) {
            imageUrl = uploadedUrl;
          }
        } catch (error) {
          console.error('Error uploading image:', error);
          // Continue without image
        }
      }

      // Create producer cheese
      const producerCheeseId = await createProducerCheese({
        cheese_type_id: selectedCheeseType.id,
        producer_name: formData.producerName,
        product_name: formData.productName || undefined,
        origin_country: formData.originCountry || undefined,
        origin_region: formData.originRegion || undefined,
        price_range: formData.priceRange,
        description: formData.description || undefined,
        image_url: imageUrl,
      });

      if (!producerCheeseId) {
        Alert.alert('Error', 'Failed to create producer cheese');
        return;
      }

      // Add flavor tags
      if (formData.flavorTagIds.length > 0) {
        await updateFlavorTagsForProducerCheese(producerCheeseId, formData.flavorTagIds);
      }

      // Add to cheese box with rating
      const added = await addProducerCheeseToBox(
        producerCheeseId,
        formData.rating,
        formData.notes || undefined
      );

      if (added) {
        Alert.alert(
          'Success! 🧀',
          `${formData.producerName} ${selectedCheeseType.name} added to your cheese box`,
          [
            {
              text: 'View Cheese',
              onPress: () => router.replace(`/producer-cheese/${producerCheeseId}`),
            },
            {
              text: 'Back to Box',
              onPress: () => router.replace('/(tabs)/cheese-box'),
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to add to cheese box');
      }
    } catch (error) {
      console.error('Error submitting producer cheese:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    if (step === 'enter-details') {
      setStep('select-type');
      setSelectedCheeseType(null);
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {step === 'select-type' ? (
        <CheeseTypeSelector
          onSelect={handleSelectCheeseType}
          onCreateNew={() => setShowCreateModal(true)}
        />
      ) : selectedCheeseType ? (
        <ProducerCheeseForm
          cheeseType={selectedCheeseType}
          onSubmit={handleSubmitProducerCheese}
          onBack={handleBack}
          isSubmitting={isSubmitting}
        />
      ) : null}

      <CreateCheeseTypeModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateCheeseType}
        isCreating={isCreatingType}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});