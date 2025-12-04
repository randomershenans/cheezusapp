import React, { useState } from 'react';
import { StyleSheet, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { uploadImageToStorage } from '@/lib/storage';
import { CheeseSearch, CheeseSearchResult } from '@/components/add-cheese/CheeseSearch';
import { AddToBoxForm, AddToBoxFormData } from '@/components/add-cheese/AddToBoxForm';
import { NewCheeseForm, NewCheeseFormData } from '@/components/add-cheese/NewCheeseForm';
import Colors from '@/constants/Colors';

type Step = 'search' | 'add-existing' | 'add-new';

export default function AddCheeseScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('search');
  const [selectedCheese, setSelectedCheese] = useState<CheeseSearchResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle selecting an existing cheese
  const handleSelectExisting = (cheese: CheeseSearchResult) => {
    setSelectedCheese(cheese);
    setStep('add-existing');
  };

  // Handle adding to cheese box (existing cheese)
  const handleAddToBox = async (formData: AddToBoxFormData) => {
    if (!selectedCheese) return;
    
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload image if provided
      let imageUrl: string | undefined;
      if (formData.imageUri) {
        try {
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
          
          const uploadedUrl = await uploadImageToStorage(base64, 'jpg');
          if (uploadedUrl) {
            imageUrl = uploadedUrl;
          }
        } catch (error) {
          console.error('Error uploading image:', error);
        }
      }

      // Add to cheese box
      const { error } = await supabase
        .from('cheese_box_entries')
        .insert({
          user_id: user.id,
          cheese_id: selectedCheese.id,
          rating: formData.rating || null,
          notes: formData.notes || null,
        });

      if (error) throw error;

      Alert.alert(
        'Added! 🧀',
        `${selectedCheese.name} is now in your cheese box`,
        [
          {
            text: 'View Cheese',
            onPress: () => router.replace(`/producer-cheese/${selectedCheese.id}`),
          },
          {
            text: 'Back to Box',
            onPress: () => router.replace('/(tabs)/cheese-box'),
          },
        ]
      );
    } catch (error) {
      console.error('Error adding to cheese box:', error);
      Alert.alert('Error', 'Failed to add cheese to your box');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle creating a new cheese
  const handleCreateNewCheese = async (formData: NewCheeseFormData) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload image if provided
      let imageUrl: string | undefined;
      if (formData.imageUri) {
        try {
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
          
          const uploadedUrl = await uploadImageToStorage(base64, 'jpg');
          if (uploadedUrl) {
            imageUrl = uploadedUrl;
          }
        } catch (error) {
          console.error('Error uploading image:', error);
        }
      }

      // 1. Check if cheese type already exists, otherwise create it
      const cheeseName = formData.cheeseName.trim();
      
      // First try to find existing cheese type
      const { data: existingType } = await supabase
        .from('cheese_types')
        .select('id')
        .ilike('name', cheeseName)
        .single();

      let cheeseTypeId: string;

      if (existingType) {
        // Use existing cheese type
        cheeseTypeId = existingType.id;
      } else {
        // Create new cheese type (pending status)
        const { data: newCheeseType, error: ctError } = await supabase
          .from('cheese_types')
          .insert({
            name: cheeseName,
            type: formData.cheeseType || null,
            milk_type: formData.milkTypes.length > 0 ? formData.milkTypes.join(', ') : null,
            origin_country: formData.originCountry || null,
            description: formData.description || null,
            status: 'pending',
            source: 'user',
            added_by: user.id,
          })
          .select('id')
          .single();

        if (ctError) throw ctError;
        cheeseTypeId = newCheeseType.id;
      }

      // 2. Handle producer - check if exists in producers table, otherwise create
      const producerName = formData.producerName?.trim() || 'Generic';
      const productName = formData.cheeseName.trim();
      let producerId: string | null = null;

      if (producerName !== 'Generic') {
        // Check if producer exists
        const { data: existingProducer } = await supabase
          .from('producers')
          .select('id')
          .ilike('name', producerName)
          .single();

        if (existingProducer) {
          producerId = existingProducer.id;
        } else {
          // Create new producer
          const { data: newProducer, error: prodError } = await supabase
            .from('producers')
            .insert({
              name: producerName,
              country: formData.originCountry || null,
            })
            .select('id')
            .single();

          if (prodError) {
            console.error('Error creating producer:', prodError);
            // Continue without producer_id if it fails
          } else {
            producerId = newProducer.id;
          }
        }
      }

      // 3. Check if producer cheese already exists, otherwise create it
      // Note: full_name is a generated column, so we don't insert it
      const { data: existingProducerCheese } = await supabase
        .from('producer_cheeses')
        .select('id')
        .eq('cheese_type_id', cheeseTypeId)
        .ilike('producer_name', producerName)
        .ilike('product_name', productName)
        .single();

      let producerCheeseId: string;

      if (existingProducerCheese) {
        // Use existing producer cheese, but update producer_id if we have one
        producerCheeseId = existingProducerCheese.id;
        
        if (producerId) {
          await supabase
            .from('producer_cheeses')
            .update({ producer_id: producerId })
            .eq('id', producerCheeseId);
        }
      } else {
        // Create new producer cheese
        const { data: newProducerCheese, error: pcError } = await supabase
          .from('producer_cheeses')
          .insert({
            cheese_type_id: cheeseTypeId,
            producer_id: producerId,
            producer_name: producerName,
            product_name: productName,
            origin_country: formData.originCountry || null,
            description: formData.description || null,
            image_url: imageUrl || null,
            status: 'pending',
            source: 'user',
            added_by: user.id,
          })
          .select('id')
          .single();

        if (pcError) throw pcError;
        producerCheeseId = newProducerCheese.id;
      }

      // 3. Add flavor tags if any (use upsert to avoid duplicates)
      if (formData.flavorTagIds.length > 0) {
        const flavorTagInserts = formData.flavorTagIds.map(tagId => ({
          producer_cheese_id: producerCheeseId,
          flavor_tag_id: tagId,
        }));

        await supabase
          .from('producer_cheese_flavor_tags')
          .upsert(flavorTagInserts, { onConflict: 'producer_cheese_id,flavor_tag_id' });
      }

      // 4. Add to cheese box (check if already exists first)
      const { data: existingEntry } = await supabase
        .from('cheese_box_entries')
        .select('id')
        .eq('user_id', user.id)
        .eq('cheese_id', producerCheeseId)
        .single();

      if (existingEntry) {
        // Already in cheese box - just navigate to it
        router.replace(`/producer-cheese/${producerCheeseId}`);
        return;
      }

      const { error: boxError } = await supabase
        .from('cheese_box_entries')
        .insert({
          user_id: user.id,
          cheese_id: producerCheeseId,
          rating: formData.rating || null,
          notes: formData.notes || null,
        });

      if (boxError) throw boxError;

      // 5. Update badges
      await supabase.rpc('update_all_badges_for_user', { p_user_id: user.id });

      // Navigate directly to the cheese page
      router.replace(`/producer-cheese/${producerCheeseId}`);
    } catch (error) {
      console.error('Error creating cheese:', error);
      Alert.alert('Error', 'Failed to add cheese. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    if (step === 'add-existing' || step === 'add-new') {
      setStep('search');
      setSelectedCheese(null);
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {step === 'search' && (
        <CheeseSearch
          onSelectExisting={handleSelectExisting}
          onAddNew={() => setStep('add-new')}
        />
      )}

      {step === 'add-existing' && selectedCheese && (
        <AddToBoxForm
          cheese={selectedCheese}
          onSubmit={handleAddToBox}
          onBack={handleBack}
          isSubmitting={isSubmitting}
        />
      )}

      {step === 'add-new' && (
        <NewCheeseForm
          onSubmit={handleCreateNewCheese}
          onBack={handleBack}
          isSubmitting={isSubmitting}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
