import React, { useState } from 'react';
import { StyleSheet, SafeAreaView, Alert, Modal, View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { Box, Heart, Star } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { uploadImageToStorage } from '@/lib/storage';
import { CheeseSearch, CheeseSearchResult } from '@/components/add-cheese/CheeseSearch';
import { AddToBoxForm, AddToBoxFormData } from '@/components/add-cheese/AddToBoxForm';
import { NewCheeseForm, NewCheeseFormData, CheeseTypePrefill } from '@/components/add-cheese/NewCheeseForm';
import Colors from '@/constants/Colors';

type Step = 'search' | 'add-existing' | 'add-new';
type AddDestination = 'cheese_box' | 'wishlist';

export default function AddCheeseScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('search');
  const [selectedCheese, setSelectedCheese] = useState<CheeseSearchResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cheeseTypePrefill, setCheeseTypePrefill] = useState<CheeseTypePrefill | undefined>(undefined);
  const [showDestinationModal, setShowDestinationModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<NewCheeseFormData | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [tempRating, setTempRating] = useState(0);
  const [tempNotes, setTempNotes] = useState('');

  // State for existing cheese destination choice
  const [showExistingDestinationModal, setShowExistingDestinationModal] = useState(false);

  // Handle selecting an existing cheese
  const handleSelectExisting = (cheese: CheeseSearchResult) => {
    if (cheese.type === 'cheese_type') {
      // Cheese type selected - redirect to add new with prefilled data
      setCheeseTypePrefill({
        cheeseTypeId: cheese.id,
        cheeseName: cheese.name,
        cheeseType: cheese.subtext?.split(' • ')[0] || undefined,
        originCountry: cheese.origin_country,
      });
      setStep('add-new');
    } else {
      // Producer cheese selected - show destination choice
      setSelectedCheese(cheese);
      setShowExistingDestinationModal(true);
    }
  };

  // Handle destination choice for existing cheese
  const handleExistingDestinationChoice = async (destination: AddDestination) => {
    setShowExistingDestinationModal(false);
    
    if (destination === 'cheese_box') {
      // Go to add-existing step for rating/notes
      setStep('add-existing');
    } else {
      // Add directly to wishlist
      if (!selectedCheese) return;
      
      setIsSubmitting(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Check if already in wishlist
        const { data: existing } = await supabase
          .from('wishlist')
          .select('id')
          .eq('user_id', user.id)
          .eq('cheese_id', selectedCheese.id)
          .single();

        if (existing) {
          Alert.alert('Already saved', 'This cheese is already in your wishlist');
          setIsSubmitting(false);
          return;
        }

        // Add to wishlist
        const { error } = await supabase
          .from('wishlist')
          .insert({
            user_id: user.id,
            cheese_id: selectedCheese.id,
          });

        if (error) throw error;

        Alert.alert(
          'Added to Wishlist! ❤️',
          `${selectedCheese.name} is now on your wishlist`,
          [
            {
              text: 'View Cheese',
              onPress: () => router.replace(`/producer-cheese/${selectedCheese.id}`),
            },
            {
              text: 'Done',
              onPress: () => router.back(),
            },
          ]
        );
      } catch (error) {
        console.error('Error adding to wishlist:', error);
        Alert.alert('Error', 'Failed to add to wishlist. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    }
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

  // Handle form submission - show choice modal
  const handleNewCheeseSubmit = (formData: NewCheeseFormData) => {
    setPendingFormData(formData);
    setShowDestinationModal(true);
  };

  // Handle destination choice
  const handleDestinationChoice = async (destination: AddDestination) => {
    setShowDestinationModal(false);
    if (!pendingFormData) return;
    
    if (destination === 'cheese_box') {
      // Show rating modal for cheese box
      setTempRating(0);
      setTempNotes('');
      setShowRatingModal(true);
    } else {
      // Wishlist - no rating needed
      await handleCreateNewCheese(pendingFormData, destination, 0, '');
    }
  };

  // Handle rating submission
  const handleRatingSubmit = async () => {
    setShowRatingModal(false);
    if (!pendingFormData) return;
    await handleCreateNewCheese(pendingFormData, 'cheese_box', tempRating, tempNotes);
  };

  // Handle creating a new cheese
  const handleCreateNewCheese = async (
    formData: NewCheeseFormData, 
    destination: AddDestination = 'cheese_box',
    rating: number = 0,
    notes: string = ''
  ) => {
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

      // 2. Handle producer - use existing if selected, otherwise check/create
      const producerName = formData.producerName?.trim() || 'Generic';
      const productName = formData.cheeseName.trim();
      let producerId: string | null = formData.producerId || null;

      if (producerName !== 'Generic' && !producerId) {
        // No producer ID provided - check if exists by name or create new
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

      // 4. Add to cheese box OR wishlist based on user choice
      if (destination === 'cheese_box') {
        const { data: existingEntry } = await supabase
          .from('cheese_box_entries')
          .select('id')
          .eq('user_id', user.id)
          .eq('cheese_id', producerCheeseId)
          .single();

        if (existingEntry) {
          router.replace(`/producer-cheese/${producerCheeseId}`);
          return;
        }

        const { error: boxError } = await supabase
          .from('cheese_box_entries')
          .insert({
            user_id: user.id,
            cheese_id: producerCheeseId,
            rating: rating || null,
            notes: notes || null,
          });

        if (boxError) throw boxError;

        // Update badges for cheese box additions
        await supabase.rpc('update_all_badges_for_user', { p_user_id: user.id });
      } else {
        // Add to wishlist
        const { data: existingWishlist } = await supabase
          .from('wishlist')
          .select('id')
          .eq('user_id', user.id)
          .eq('cheese_id', producerCheeseId)
          .single();

        if (existingWishlist) {
          router.replace(`/producer-cheese/${producerCheeseId}`);
          return;
        }

        const { error: wishlistError } = await supabase
          .from('wishlist')
          .insert({
            user_id: user.id,
            cheese_id: producerCheeseId,
          });

        if (wishlistError) throw wishlistError;
      }

      // Navigate to the cheese page
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
      setCheeseTypePrefill(undefined);
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
          onSubmit={handleNewCheeseSubmit}
          onBack={handleBack}
          isSubmitting={isSubmitting}
          prefillData={cheeseTypePrefill}
        />
      )}

      {/* Destination Choice Modal - for new cheeses */}
      <Modal
        visible={showDestinationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDestinationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Where would you like to add this?</Text>
            <Text style={styles.modalSubtitle}>Have you tried this cheese?</Text>

            <TouchableOpacity
              style={styles.destinationButton}
              onPress={() => handleDestinationChoice('cheese_box')}
            >
              <View style={styles.destinationIconBox}>
                <Box size={28} color="#FFFFFF" />
              </View>
              <View style={styles.destinationTextContainer}>
                <Text style={styles.destinationTitle}>Add to Cheese Box</Text>
                <Text style={styles.destinationDescription}>I've tried this cheese</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.destinationButton}
              onPress={() => handleDestinationChoice('wishlist')}
            >
              <View style={[styles.destinationIconBox, styles.wishlistIconBox]}>
                <Heart size={28} color="#FFFFFF" />
              </View>
              <View style={styles.destinationTextContainer}>
                <Text style={styles.destinationTitle}>Add to Wishlist</Text>
                <Text style={styles.destinationDescription}>I want to try this later</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowDestinationModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Destination Choice Modal - for existing cheeses from search */}
      <Modal
        visible={showExistingDestinationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExistingDestinationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Where would you like to add this?</Text>
            <Text style={styles.modalSubtitle}>
              {selectedCheese?.name ? `"${selectedCheese.name}"` : 'Have you tried this cheese?'}
            </Text>

            <TouchableOpacity
              style={styles.destinationButton}
              onPress={() => handleExistingDestinationChoice('cheese_box')}
            >
              <View style={styles.destinationIconBox}>
                <Box size={28} color="#FFFFFF" />
              </View>
              <View style={styles.destinationTextContainer}>
                <Text style={styles.destinationTitle}>Add to Cheese Box</Text>
                <Text style={styles.destinationDescription}>I've tried this cheese</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.destinationButton}
              onPress={() => handleExistingDestinationChoice('wishlist')}
            >
              <View style={[styles.destinationIconBox, styles.wishlistIconBox]}>
                <Heart size={28} color="#FFFFFF" />
              </View>
              <View style={styles.destinationTextContainer}>
                <Text style={styles.destinationTitle}>Add to Wishlist</Text>
                <Text style={styles.destinationDescription}>I want to try this later</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowExistingDestinationModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Rating Modal - shown after selecting Cheese Box */}
      <Modal
        visible={showRatingModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRatingModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView 
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Rate this cheese</Text>
              <Text style={styles.modalSubtitle}>How did you like it?</Text>

              {/* Star Display */}
              <View style={styles.starDisplayContainer}>
                <View style={styles.starsDisplay}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={32}
                      color="#FFD700"
                      fill={tempRating >= star ? '#FFD700' : 'transparent'}
                    />
                  ))}
                </View>
                <Text style={styles.ratingValueText}>{tempRating.toFixed(1)} / 5.0</Text>
              </View>

              {/* Slider */}
              <View style={styles.sliderContainer}>
                <Slider
                  style={styles.ratingSlider}
                  minimumValue={0}
                  maximumValue={5}
                  step={0.1}
                  value={tempRating}
                  onValueChange={setTempRating}
                  minimumTrackTintColor="#FFD700"
                  maximumTrackTintColor="#E0E0E0"
                  thumbTintColor="#FCD95B"
                />
              </View>

              {/* Notes */}
              <Text style={styles.notesLabel}>Tasting Notes (optional)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="What did you think?"
                placeholderTextColor="#9CA3AF"
                value={tempNotes}
                onChangeText={setTempNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={styles.submitRatingButton}
                onPress={handleRatingSubmit}
              >
                <Text style={styles.submitRatingText}>Add to Cheese Box</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowRatingModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.subtleText,
    textAlign: 'center',
    marginBottom: 24,
  },
  destinationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  destinationIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  wishlistIconBox: {
    backgroundColor: '#E91E63',
  },
  destinationTextContainer: {
    flex: 1,
  },
  destinationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  destinationDescription: {
    fontSize: 13,
    color: Colors.subtleText,
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    color: Colors.subtleText,
    fontWeight: '500',
  },
  starDisplayContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  starsDisplay: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  ratingValueText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  sliderContainer: {
    width: '100%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  ratingSlider: {
    width: '100%',
    height: 40,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  notesInput: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: Colors.text,
    minHeight: 80,
    marginBottom: 16,
  },
  submitRatingButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  submitRatingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
});
