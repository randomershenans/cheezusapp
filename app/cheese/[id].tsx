import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Alert, TouchableOpacity, Modal, TextInput, ActivityIndicator, Dimensions, SafeAreaView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Star, Heart, Calendar, MapPin, Info, Award, Edit3, Plus, X, Trash2, ArrowLeft, Share2, Clock, Users } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import Slider from '@react-native-community/slider';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

const { width: screenWidth } = Dimensions.get('window');

type Cheese = {
  id: string;
  name: string;
  type: string;
  milk: string;
  origin_country: string;
  origin_region?: string;
  description: string;
  ageing_period?: string;
  image_url: string;
  created_at: string;
  flavors?: { flavor: string }[];
  pairings?: { pairing: string; type: string }[];
};

type CheeseBoxEntry = {
  id: string;
  rating?: number;
  notes?: string;
};

export default function CheeseDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  
  const [cheese, setCheese] = useState<Cheese | null>(null);
  const [cheeseBoxEntry, setCheeseBoxEntry] = useState<CheeseBoxEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRating, setEditRating] = useState<number>(0);
  const [editNotes, setEditNotes] = useState<string>('');

  useEffect(() => {
    if (id) {
      fetchCheeseDetails();
      if (user) {
        fetchCheeseBoxEntry();
      }
    }
  }, [id, user]);

  const fetchCheeseDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('cheeses')
        .select(`
          *,
          flavors:cheese_flavors(flavor),
          pairings:cheese_pairings(pairing, type)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setCheese(data);
    } catch (error) {
      console.error('Error fetching cheese details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCheeseBoxEntry = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('cheese_box_entries')
        .select('id, rating, notes')
        .eq('user_id', user.id)
        .eq('cheese_id', id)
        .single();

      if (data) {
        setCheeseBoxEntry(data);
        setSaved(true);
      }
    } catch (error) {
      // Entry doesn't exist, which is fine
    }
  };

  const handleAddToCheeseBox = () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    // Open modal for new entry
    setEditRating(0);
    setEditNotes('');
    setShowEditModal(true);
  };

  const handleEditEntry = () => {
    if (!cheeseBoxEntry) return;
    
    setEditRating(cheeseBoxEntry.rating || 0);
    setEditNotes(cheeseBoxEntry.notes || '');
    setShowEditModal(true);
  };

  const handleSaveEntry = async () => {
    if (!user) return;

    try {
      if (cheeseBoxEntry) {
        // Update existing entry
        const { error } = await supabase
          .from('cheese_box_entries')
          .update({
            rating: editRating > 0 ? parseFloat(editRating.toFixed(1)) : null,
            notes: editNotes.trim() || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', cheeseBoxEntry.id);

        if (error) throw error;

        setCheeseBoxEntry({
          ...cheeseBoxEntry,
          rating: editRating > 0 ? parseFloat(editRating.toFixed(1)) : undefined,
          notes: editNotes.trim() || undefined
        });
      } else {
        // Create new entry
        const { data, error } = await supabase
          .from('cheese_box_entries')
          .insert([
            {
              user_id: user.id,
              cheese_id: id,
              rating: editRating > 0 ? parseFloat(editRating.toFixed(1)) : null,
              notes: editNotes.trim() || null
            }
          ])
          .select()
          .single();

        if (error) throw error;
        
        setCheeseBoxEntry(data);
        setSaved(true);
      }

      setShowEditModal(false);
    } catch (error) {
      console.error('Error saving cheese box entry:', error);
      Alert.alert('Error', 'Failed to save your cheese entry. Please try again.');
    }
  };

  const handleRemoveFromCheeseBox = async () => {
    if (!cheeseBoxEntry) return;

    Alert.alert(
      'Remove from Cheese Box',
      'Are you sure you want to remove this cheese from your box?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('cheese_box_entries')
                .delete()
                .eq('id', cheeseBoxEntry.id);

              if (error) throw error;
              
              setCheeseBoxEntry(null);
              setSaved(false);
            } catch (error) {
              console.error('Error removing from cheese box:', error);
              Alert.alert('Error', 'Failed to remove cheese from your box.');
            }
          }
        }
      ]
    );
  };

  const renderDecimalRating = () => {
    return (
      <View style={styles.decimalRatingContainer}>
        <View style={styles.starsDisplay}>
          {renderStarsForDisplay(editRating)}
        </View>
        <View style={styles.sliderContainer}>
          <Slider
            style={styles.ratingSlider}
            minimumValue={0}
            maximumValue={5}
            step={0.1}
            value={editRating}
            minimumTrackTintColor={Colors.primary}
            maximumTrackTintColor="#E0E0E0"
            thumbTintColor={Colors.primary}
            // Thumb styling is controlled via thumbTintColor
            onValueChange={value => setEditRating(parseFloat(value.toFixed(1)))}
          />
        </View>
      </View>
    );
  };

  const renderStars = (rating: number, interactive: boolean = false) => {
    return Array.from({ length: 5 }, (_, index) => {
      const starValue = index + 1;
      const fillPercentage = Math.max(0, Math.min(1, rating - index));
      const starColor = fillPercentage > 0 ? '#FFD700' : '#E0E0E0';
      const starSize = interactive ? 28 : 16;
      
      return (
        <View key={index} style={[styles.starContainer, interactive && styles.interactiveStarContainer]}>
          {/* Base star (outline or background) */}
          <View style={styles.starBase}>
            <Star
              size={starSize}
              color={starColor}
              fill="none"
              strokeWidth={1.5}
            />
          </View>
          
          {/* Filled portion of the star */}
          {fillPercentage > 0 && (
            <View style={[styles.starFill, { width: `${fillPercentage * 100}%` }]}>
              <Star
                size={starSize}
                color={starColor}
                fill={starColor}
                strokeWidth={1.5}
              />
            </View>
          )}
        </View>
      );
    });
  };
  
  const renderStarsForDisplay = (rating: number) => {
    return renderStars(rating, true);
  };

  const renderRatingModal = () => (
    <Modal
      visible={showEditModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowEditModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Floating close button positioned at top-right corner */}
          <TouchableOpacity
            style={styles.floatingCloseButton}
            onPress={() => setShowEditModal(false)}
          >
            <X size={18} color={Colors.subtleText} strokeWidth={2} />
          </TouchableOpacity>
          
          <Text style={styles.modalTitle}>
            {cheeseBoxEntry ? 'Edit your tasting' : 'Add to cheese box'}
          </Text>
          
          <View style={styles.modalDivider} />

          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>Your rating</Text>
            <View style={styles.ratingContainer}>
              {renderDecimalRating()}
            </View>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>
                {editRating > 0 ? `${editRating.toFixed(1)}/5` : 'Slide to rate'}
              </Text>
            </View>
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>Tasting notes</Text>
            <View style={styles.textInputContainer}>
              <TextInput
                style={styles.notesInput}
                placeholder="Share your thoughts about this cheese..."
                placeholderTextColor={Colors.subtleText}
                value={editNotes}
                onChangeText={setEditNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          <View style={styles.modalActions}>
            {cheeseBoxEntry && (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={handleRemoveFromCheeseBox}
              >
                <Trash2 size={18} color={Colors.error} strokeWidth={2} />
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveEntry}
            >
              {cheeseBoxEntry ? (
                <>
                  <Edit3 size={18} color={Colors.background} strokeWidth={2} />
                  <Text style={styles.saveButtonText}>Update</Text>
                </>
              ) : (
                <>
                  <Plus size={18} color={Colors.background} strokeWidth={2.5} />
                  <Text style={styles.saveButtonText}>Add to box</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <View style={styles.loadingSpinner} />
          <Text style={styles.loadingText}>Loading cheese details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!cheese) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" translucent />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Cheese not found</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const drinkPairings = cheese.pairings?.filter(p => p.type === 'drink') || [];
  const foodPairings = cheese.pairings?.filter(p => p.type === 'food') || [];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: cheese.image_url }} 
            style={styles.heroImage}
          />
          <View style={styles.imageOverlay} />
          
          <TouchableOpacity 
            style={styles.backButtonContainer}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={Colors.background} />
          </TouchableOpacity>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {/* Handle share */}}
            >
              <Share2 size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.heroContent}>
            <View style={styles.heroMeta}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{cheese.type}</Text>
              </View>
              <View style={styles.heroRatingContainer}>
                <Star size={16} color="#FFD700" fill="#FFD700" />
                <Text style={styles.heroRatingText}>4.{Math.floor(Math.random() * 3) + 6}</Text>
                <Text style={styles.reviewCount}>({Math.floor(Math.random() * 50) + 10} reviews)</Text>
              </View>
            </View>
            
            <Text style={styles.heroTitle}>{cheese.name}</Text>
            
            <View style={styles.originContainer}>
              <MapPin size={18} color="rgba(255, 255, 255, 0.9)" />
              <Text style={styles.originText}>
                {cheese.origin_country}
                {cheese.origin_region ? `, ${cheese.origin_region}` : ''}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Users size={16} color="rgba(255, 255, 255, 0.8)" />
                <Text style={styles.metaText}>{cheese.milk} milk</Text>
              </View>
              {cheese.ageing_period && (
                <View style={styles.metaItem}>
                  <Clock size={16} color="rgba(255, 255, 255, 0.8)" />
                  <Text style={styles.metaText}>{cheese.ageing_period}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        
        <View style={styles.contentContainer}>
          <View style={styles.actionSection}>
            {saved ? (
              <View style={styles.savedSection}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={handleEditEntry}
                >
                  <Heart size={18} color={Colors.primary} fill={Colors.primary} strokeWidth={2} />
                  <Text style={styles.editButtonText}>In your cheese box</Text>
                  <Edit3 size={16} color={Colors.subtleText} strokeWidth={1.5} />
                </TouchableOpacity>

                {cheeseBoxEntry?.rating && (
                  <View style={styles.userRatingDisplay}>
                    <Text style={styles.userRatingLabel}>Your rating:</Text>
                    <View style={styles.ratingContainer}>
                      {renderStars(cheeseBoxEntry?.rating || 0)}
                      <Text style={styles.inBoxRating}>
                        {cheeseBoxEntry?.rating ? `${cheeseBoxEntry.rating.toFixed(1)}/5` : 'Not rated'}
                      </Text>
                    </View>
                  </View>
                )}

                {cheeseBoxEntry?.notes && (
                  <View style={styles.userNotesDisplay}>
                    <Text style={styles.userNotesLabel}>Your notes:</Text>
                    <Text style={styles.userNotesText}>"{cheeseBoxEntry.notes}"</Text>
                  </View>
                )}
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddToCheeseBox}
              >
                <Plus size={18} color={Colors.background} strokeWidth={2.5} />
                <Text style={styles.addButtonText}>Add to cheese box</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this cheese</Text>
            <Text style={styles.description}>{cheese.description}</Text>
          </View>

          {cheese.flavors && cheese.flavors.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Flavor profile</Text>
              <View style={styles.tagsContainer}>
                {cheese.flavors.map((flavor, index) => (
                  <View key={index} style={styles.flavorTag}>
                    <Text style={styles.flavorTagText}>{flavor.flavor}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {(drinkPairings.length > 0 || foodPairings.length > 0) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Perfect pairings</Text>
              
              {drinkPairings.length > 0 && (
                <View style={styles.pairingCategory}>
                  <Text style={styles.pairingCategoryTitle}>🍷 Drinks</Text>
                  <View style={styles.pairingsGrid}>
                    {drinkPairings.map((pairing, index) => (
                      <View key={index} style={styles.pairingItem}>
                        <Text style={styles.pairingText}>{pairing.pairing}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {foodPairings.length > 0 && (
                <View style={styles.pairingCategory}>
                  <Text style={styles.pairingCategoryTitle}>🍯 Foods</Text>
                  <View style={styles.pairingsGrid}>
                    {foodPairings.map((pairing, index) => (
                      <View key={index} style={styles.pairingItem}>
                        <Text style={styles.pairingText}>{pairing.pairing}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cheese details</Text>
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Type</Text>
                <Text style={styles.detailValue}>{cheese.type}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Milk</Text>
                <Text style={styles.detailValue}>{cheese.milk}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Origin</Text>
                <Text style={styles.detailValue}>
                  {cheese.origin_country}
                  {cheese.origin_region ? `, ${cheese.origin_region}` : ''}
                </Text>
              </View>
              {cheese.ageing_period && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Ageing</Text>
                  <Text style={styles.detailValue}>{cheese.ageing_period}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {renderRatingModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    height: 400,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    ...Platform.select({
      web: {
        objectFit: 'cover',
      },
    }),
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%)',
  },
  backButtonContainer: {
    position: 'absolute',
    top: Layout.spacing.m,
    left: Layout.spacing.m,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtons: {
    position: 'absolute',
    top: Layout.spacing.m,
    right: Layout.spacing.m,
    flexDirection: 'row',
    gap: Layout.spacing.s,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Layout.spacing.l,
  },
  heroMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.m,
  },
  typeBadge: {
    backgroundColor: 'rgba(230, 126, 34, 0.95)',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
    borderRadius: Layout.borderRadius.medium,
  },
  typeBadgeText: {
    color: Colors.background,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
  },
  heroRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.xs,
  },
  heroRatingText: {
    color: Colors.background,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
    marginLeft: 4,
  },
  reviewCount: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
  },
  heroTitle: {
    fontSize: Typography.sizes['3xl'],
    fontFamily: Typography.fonts.heading,
    color: Colors.background,
    marginBottom: Layout.spacing.s,
    lineHeight: Typography.sizes['3xl'] * Typography.lineHeights.tight,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  originContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.xs,
    marginBottom: Layout.spacing.m,
  },
  originText: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Layout.spacing.l,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.xs,
  },
  metaText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  contentContainer: {
    padding: Layout.spacing.m,
    paddingBottom: Layout.spacing.xl,
  },
  actionSection: {
    marginBottom: Layout.spacing.l,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Layout.spacing.m,
    paddingHorizontal: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    gap: Layout.spacing.m,
    ...Layout.shadow.small,
  },
  addButtonText: {
    color: Colors.background,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
  },
  savedSection: {
    gap: Layout.spacing.m,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Layout.spacing.m,
    paddingHorizontal: Layout.spacing.l,
    borderRadius: Layout.borderRadius.large,
    ...Layout.shadow.small,
  },
  editButtonText: {
    color: Colors.text,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
  },
  userRatingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
    gap: Layout.spacing.s,
    ...Layout.shadow.small,
  },
  userRatingLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  userRatingValue: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
    marginLeft: Layout.spacing.s,
  },
  userNotesDisplay: {
    backgroundColor: Colors.card,
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
    ...Layout.shadow.small,
  },
  userNotesLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
    marginBottom: Layout.spacing.xs,
  },
  userNotesText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
    fontStyle: 'italic',
    lineHeight: Typography.sizes.base * Typography.lineHeights.normal,
  },
  section: {
    marginBottom: Layout.spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
    marginBottom: Layout.spacing.m,
  },
  description: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
    lineHeight: Typography.sizes.base * Typography.lineHeights.normal,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.s,
  },
  flavorTag: {
    backgroundColor: '#FFF0DB',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
    borderRadius: Layout.borderRadius.large,
  },
  flavorTagText: {
    color: Colors.primary,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
  },
  pairingCategory: {
    marginBottom: Layout.spacing.l,
  },
  pairingCategoryTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
    marginBottom: Layout.spacing.s,
  },
  pairingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.s,
  },
  pairingItem: {
    backgroundColor: Colors.card,
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
    borderRadius: Layout.borderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pairingText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
  },
  detailsGrid: {
    gap: Layout.spacing.m,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Layout.spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailLabel: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.subtleText,
  },
  detailValue: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
    textAlign: 'right',
    flex: 1,
    marginLeft: Layout.spacing.m,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xl,
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF0DB',
    marginBottom: Layout.spacing.m,
  },
  loadingText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.subtleText,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xl,
  },
  errorText: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
    marginBottom: Layout.spacing.l,
  },
  backButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Layout.spacing.xl,
    paddingVertical: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
  },
  backButtonText: {
    color: Colors.background,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    position: 'relative',
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Layout.spacing.xl,
    paddingTop: Layout.spacing.xl,
    maxHeight: '80%',
    ...Layout.shadow.large,
  },
  floatingCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    ...Layout.shadow.small,
  },
  modalTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
    marginBottom: 4,
    marginRight: 20,
    textAlign: 'left',
  },
  modalDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginTop: Layout.spacing.m,
    marginBottom: Layout.spacing.xl,
    width: '100%',
  },
  modalSection: {
    marginBottom: Layout.spacing.xl,
  },
  modalSectionTitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
    marginBottom: Layout.spacing.m,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Layout.spacing.s,
    marginBottom: Layout.spacing.m,
  },
  starContainer: {
    position: 'relative',
    marginHorizontal: 3,
  },
  interactiveStarContainer: {
    marginHorizontal: 6,
  },
  ratingBadge: {
    alignSelf: 'center',
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: Layout.spacing.xs,
  },
  ratingText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.subtleText,
  },
  textInputContainer: {
    borderRadius: Layout.borderRadius.large,
    backgroundColor: Colors.backgroundSecondary,
    ...Layout.shadow.small,
    overflow: 'hidden',
  },
  notesInput: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
    minHeight: 100,
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.m,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Layout.spacing.m,
    marginTop: Layout.spacing.m,
  },
  decimalRatingContainer: {
    width: '100%',
    alignItems: 'center',
  },
  starsDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    height: 32,
    width: '80%',
  },
  sliderContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  ratingSlider: {
    width: '80%',
    height: 40,
  },
  // Slider thumb is styled via thumbTintColor
  inBoxRating: {
    fontSize: Typography.sizes.sm,
    color: Colors.subtleText,
    marginLeft: Layout.spacing.s,
  },
  starBase: {
    position: 'relative',
  },
  starFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
  removeButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FFF1F0',  // Very light red background
    paddingVertical: 14,
    paddingHorizontal: Layout.spacing.s,
    borderRadius: Layout.borderRadius.large,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    ...Layout.shadow.small,
  },
  removeButtonText: {
    color: Colors.error,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: Layout.borderRadius.large,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Layout.shadow.small,
  },
  saveButtonText: {
    color: Colors.background,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
  },
});