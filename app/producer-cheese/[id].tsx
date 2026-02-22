import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Dimensions,
  Modal,
  TextInput,
  Share,
  KeyboardAvoidingView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Star, MapPin, ArrowLeft, Factory, Package, DollarSign, Award, X, Share2, ChevronRight, Heart, Pencil } from 'lucide-react-native';
import Slider from '@react-native-community/slider';

const { width: screenWidth } = Dimensions.get('window');
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Analytics } from '@/lib/analytics';
import {
  getProducerCheeseById,
  getFlavorTagsForProducerCheese,
  ProducerCheeseWithStats,
} from '@/lib';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';


export default function ProducerCheeseDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [producerCheese, setProducerCheese] = useState<ProducerCheeseWithStats | null>(null);
  const [flavorTags, setFlavorTags] = useState<Array<{ id: string; name: string }>>([]);
  const [userEntry, setUserEntry] = useState<any>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [otherProducerCheeses, setOtherProducerCheeses] = useState<any[]>([]);
  const [pairings, setPairings] = useState<any[]>([]);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [tempRating, setTempRating] = useState(0);
  const [tempNotes, setTempNotes] = useState('');
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProducerCheeseDetails();
      Analytics.trackCheeseView(id as string, user?.id);
      if (user) {
        fetchUserEntry();
        fetchWishlistStatus();
      }
    }
  }, [id, user]);

  const fetchProducerCheeseDetails = async () => {
    try {
      setLoading(true);

      // Fetch producer cheese details
      const cheeseData = await getProducerCheeseById(id as string);
      if (!cheeseData) throw new Error('Cheese not found');

      setProducerCheese(cheeseData);

      // Check if user can edit this cheese (owns it and not verified)
      if (user) {
        const { data: cheeseOwnership } = await supabase
          .from('producer_cheeses')
          .select('added_by, verified')
          .eq('id', id)
          .single();
        
        if (cheeseOwnership && 
            cheeseOwnership.added_by === user.id && 
            !cheeseOwnership.verified) {
          setCanEdit(true);
        }
      }

      // Fetch flavor tags
      const tags = await getFlavorTagsForProducerCheese(id as string);
      setFlavorTags(tags);

      // Fetch other cheeses from same producer
      const { data: otherCheeses, error: otherError } = await supabase
        .from('producer_cheese_stats')
        .select('*')
        .eq('producer_name', cheeseData.producer_name)
        .neq('id', id)
        .limit(6);

      if (!otherError && otherCheeses) {
        setOtherProducerCheeses(otherCheeses);
      }

      // Fetch pairings for this cheese type via cheese_types
      if (cheeseData.cheese_type_id) {
        try {
          const { data: pairingsData, error: pairingsError } = await supabase
            .from('cheese_type_pairing_matches')
            .select(`
              cheese_pairings!inner(
                id,
                pairing,
                type,
                image_url,
                featured_image_url,
                is_sponsored
              )
            `)
            .eq('cheese_type_id', cheeseData.cheese_type_id);

          if (!pairingsError && pairingsData) {
            setPairings(pairingsData.map(item => item.cheese_pairings));
          }
        } catch (pairingError) {
          // Silently fail if no pairings found - not critical
          console.log('No pairings found for this cheese type');
        }
      }
    } catch (error) {
      console.error('Error fetching producer cheese:', error);
      Alert.alert('Error', 'Failed to load cheese details');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserEntry = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('cheese_box_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('cheese_id', id)
        .maybeSingle();

      if (!error && data) {
        setUserEntry(data);
      }
    } catch (error) {
      // Silently fail - user just hasn't rated this cheese yet
      console.log('User has not rated this cheese yet');
    }
  };

  const fetchWishlistStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', user.id)
        .eq('cheese_id', id)
        .maybeSingle();

      if (!error && data) {
        setIsWishlisted(true);
      } else {
        setIsWishlisted(false);
      }
    } catch (error) {
      console.log('Error checking wishlist status');
    }
  };

  const handleToggleWishlist = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to add cheeses to your wishlist.');
      return;
    }

    try {
      if (isWishlisted) {
        // Remove from wishlist
        const { error } = await supabase
          .from('wishlists')
          .delete()
          .eq('user_id', user.id)
          .eq('cheese_id', id);

        if (error) throw error;
        setIsWishlisted(false);
        Analytics.trackCheeseWishlistRemove(id as string, user?.id);
      } else {
        // Add to wishlist
        const { error } = await supabase
          .from('wishlists')
          .insert({ user_id: user.id, cheese_id: id });

        if (error) throw error;
        setIsWishlisted(true);
        Analytics.trackCheeseWishlistAdd(id as string, user?.id);
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      Alert.alert('Error', 'Failed to update wishlist');
    }
  };

  const handleSaveRating = async () => {
    if (!user || !producerCheese) return;

    try {
      const entryData = {
        user_id: user.id,
        cheese_id: producerCheese.id,
        rating: tempRating,
        notes: tempNotes.trim() || null,
      };

      if (userEntry) {
        // Update existing entry
        const { error } = await supabase
          .from('cheese_box_entries')
          .update(entryData)
          .eq('id', userEntry.id);

        if (error) throw error;
      } else {
        // Create new entry
        const { error } = await supabase
          .from('cheese_box_entries')
          .insert([entryData]);

        if (error) throw error;
      }

      // Refresh data
      await fetchUserEntry();
      await fetchProducerCheeseDetails();
      
      // Track the rating action
      if (userEntry) {
        Analytics.trackCheeseRate(producerCheese.id, tempRating, user?.id);
      } else {
        Analytics.trackCheeseAddToBox(producerCheese.id, tempRating, user?.id);
      }
      
      setShowRatingModal(false);
      Alert.alert('Success', 'Your rating has been saved!');
    } catch (error) {
      console.error('Error saving rating:', error);
      Alert.alert('Error', 'Failed to save rating');
    }
  };

  const capitalizeText = (text: string | undefined | null): string => {
    if (!text) return '';
    return text
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleShare = async () => {
    if (!producerCheese) return;

    try {
      const cheeseUrl = `https://cheezus.co/cheese/${producerCheese.id}`;
      const message = `Check out ${producerCheese.full_name} on Cheezus! ${producerCheese.description?.substring(0, 100) || 'A delicious cheese'}...\n\n${cheeseUrl}`;
      
      const result = await Share.share({
        message,
        url: cheeseUrl, // iOS uses this for the link
        title: producerCheese.full_name,
      });
      
      if (result.action === Share.sharedAction) {
        Analytics.trackCheeseShare(producerCheese.id, result.activityType, user?.id);
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const renderStars = (rating: number, size: number = 16) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        size={size}
        color="#FFD700"
        fill={index < rating ? '#FFD700' : 'none'}
      />
    ));
  };

  const getPriceDisplay = (priceRange?: number) => {
    if (!priceRange) return 'N/A';
    return '$'.repeat(priceRange);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading cheese details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!producerCheese) {
    return (
      <SafeAreaView style={styles.container}>
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Image with Overlay */}
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: producerCheese.image_url || 'https://via.placeholder.com/400x300?text=Cheese',
            }}
            style={styles.heroImage}
          />
          <View style={styles.imageOverlay} />
          
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButtonContainer}
            onPress={() => router.canGoBack() ? router.back() : router.push('/(tabs)')}
          >
            <ArrowLeft size={24} color={Colors.background} />
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity
            style={styles.shareButtonContainer}
            onPress={handleShare}
          >
            <Share2 size={24} color={Colors.background} />
          </TouchableOpacity>

          {/* Edit Button - only show if user can edit */}
          {canEdit && (
            <TouchableOpacity
              style={styles.editButtonContainer}
              onPress={() => router.push(`/edit-cheese/${id}`)}
            >
              <Pencil size={20} color={Colors.background} />
            </TouchableOpacity>
          )}

          {/* Awards Badge */}
          {producerCheese.awards_image_url && (
            <View style={styles.awardsBadgeContainer}>
              <Image
                source={{ uri: producerCheese.awards_image_url }}
                style={styles.awardsBadge}
                resizeMode="contain"
              />
            </View>
          )}
          
          {/* Hero Content */}
          <View style={styles.heroContent}>
            <View style={styles.heroMeta}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>Cheese</Text>
              </View>
              {producerCheese.rating_count > 0 && (
                <View style={styles.heroRatingContainer}>
                  <Star size={16} color="#FFD700" fill="#FFD700" />
                  <Text style={styles.heroRatingText}>
                    {producerCheese.average_rating.toFixed(1)}
                  </Text>
                  <Text style={styles.reviewCount}>({producerCheese.rating_count} reviews)</Text>
                </View>
              )}
            </View>
            
            <Text style={styles.heroTitle}>
              {producerCheese.producer_name?.toLowerCase().includes('generic') ||
               producerCheese.producer_name?.toLowerCase().includes('unknown')
                ? producerCheese.cheese_type_name
                : producerCheese.full_name}
            </Text>
            
            {producerCheese.origin_country && (
              <View style={styles.originContainer}>
                <MapPin size={18} color="rgba(255, 255, 255, 0.9)" />
                <Text style={styles.originText}>
                  {producerCheese.origin_country}
                  {producerCheese.origin_region && `, ${producerCheese.origin_region}`}
                </Text>
              </View>
            )}

            <View style={styles.metaRow}>
              {/* Only show producer if not generic/unknown - clickable if has producer_id */}
              {producerCheese.producer_name && 
               !producerCheese.producer_name.toLowerCase().includes('generic') &&
               !producerCheese.producer_name.toLowerCase().includes('unknown') && (
                <TouchableOpacity 
                  style={styles.metaItem}
                  onPress={() => {
                    if ((producerCheese as any).producer_id) {
                      router.push(`/producer/${(producerCheese as any).producer_id}`);
                    }
                  }}
                  disabled={!(producerCheese as any).producer_id}
                >
                  <Factory size={16} color="rgba(255, 255, 255, 0.8)" />
                  <Text style={[styles.metaText, (producerCheese as any).producer_id && styles.metaTextClickable]}>
                    {producerCheese.producer_name}
                  </Text>
                </TouchableOpacity>
              )}
              {producerCheese.price_range && (
                <View style={styles.metaItem}>
                  <DollarSign size={16} color="rgba(255, 255, 255, 0.8)" />
                  <Text style={styles.metaText}>{getPriceDisplay(producerCheese.price_range)}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        
        {/* Content Container */}
        <View style={styles.contentContainer}>

          {/* Action Buttons - Always show, prompt login if not authenticated */}
          <View style={styles.section}>
            <View style={styles.actionButtonsRow}>
              {/* Add to Box / Update Rating Button */}
              <TouchableOpacity
                style={[styles.addToBoxButton, { flex: 1 }]}
                onPress={() => {
                  if (!user) {
                    Alert.alert(
                      'Join Cheezus!',
                      'Create a free account to save this cheese to your Cheese Box and track your tasting journey.',
                      [
                        { text: 'Not Now', style: 'cancel' },
                        { text: 'Sign Up', onPress: () => router.push('/auth/login') }
                      ]
                    );
                    return;
                  }
                  setTempRating(userEntry?.rating || 0);
                  setTempNotes(userEntry?.notes || '');
                  setShowRatingModal(true);
                }}
              >
                <Star size={20} color="#FFF" fill={userEntry ? "#FFF" : "none"} />
                <Text style={styles.addToBoxButtonText}>
                  {userEntry ? 'Update Rating' : 'Add to Cheese Box'}
                </Text>
              </TouchableOpacity>

              {/* Wishlist Button - only show if not already in cheese box */}
              {!userEntry && (
                <TouchableOpacity
                  style={styles.wishlistButton}
                  onPress={() => {
                    if (!user) {
                      Alert.alert(
                        'Join Cheezus!',
                        'Create a free account to add cheeses to your wishlist.',
                        [
                          { text: 'Not Now', style: 'cancel' },
                          { text: 'Sign Up', onPress: () => router.push('/auth/login') }
                        ]
                      );
                      return;
                    }
                    handleToggleWishlist();
                  }}
                >
                  <Heart 
                    size={20} 
                    color={Colors.primary} 
                    fill={isWishlisted ? Colors.primary : "none"} 
                  />
                </TouchableOpacity>
              )}
            </View>
            {!userEntry && user && (
              <Text style={styles.wishlistHint}>
                {isWishlisted ? '♥ On your wishlist' : 'Tap ♡ to add to wishlist'}
              </Text>
            )}
            {!user && (
              <Text style={styles.wishlistHint}>
                Sign up to start your cheese journey!
              </Text>
            )}
          </View>

          {/* Description */}
          {(producerCheese.description || (producerCheese as any).cheese_type_description) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About this cheese</Text>
              <Text 
                style={styles.description}
                numberOfLines={descriptionExpanded ? undefined : 3}
              >
                {producerCheese.description || (producerCheese as any).cheese_type_description}
              </Text>
              <TouchableOpacity 
                style={styles.viewMoreButton}
                onPress={() => setDescriptionExpanded(!descriptionExpanded)}
              >
                <Text style={styles.viewMoreText}>
                  {descriptionExpanded ? 'View Less' : 'View More'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Cheese Details Grid */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.detailsGrid}>
              {(producerCheese as any).cheese_type && (
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Type</Text>
                  <Text style={styles.detailValue}>{capitalizeText((producerCheese as any).cheese_type)}</Text>
                </View>
              )}
              {(producerCheese as any).cheese_family && (
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Family</Text>
                  <Text style={styles.detailValue}>{capitalizeText((producerCheese as any).cheese_family)}</Text>
                </View>
              )}
              {producerCheese.milk_type && (
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Milk Type</Text>
                  <Text style={styles.detailValue}>{capitalizeText(producerCheese.milk_type)}</Text>
                </View>
              )}
              {(producerCheese as any).texture && (
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Texture</Text>
                  <Text style={styles.detailValue}>{capitalizeText((producerCheese as any).texture)}</Text>
                </View>
              )}
              {(producerCheese as any).color && (
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Color</Text>
                  <Text style={styles.detailValue}>{capitalizeText((producerCheese as any).color)}</Text>
                </View>
              )}
              {(producerCheese as any).rind && (
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Rind</Text>
                  <Text style={styles.detailValue}>{capitalizeText((producerCheese as any).rind)}</Text>
                </View>
              )}
              {producerCheese.ageing_period && (
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Ageing</Text>
                  <Text style={styles.detailValue}>{capitalizeText(producerCheese.ageing_period)}</Text>
                </View>
              )}
              {(producerCheese as any).fat_content && (
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Fat Content</Text>
                  <Text style={styles.detailValue}>{capitalizeText((producerCheese as any).fat_content)}</Text>
                </View>
              )}
              {(producerCheese as any).calcium_content && (
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Calcium</Text>
                  <Text style={styles.detailValue}>{capitalizeText((producerCheese as any).calcium_content)}</Text>
                </View>
              )}
              {(producerCheese as any).vegetarian === true && (
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Vegetarian</Text>
                  <Text style={styles.detailValue}>Yes ✓</Text>
                </View>
              )}
              {(producerCheese as any).vegan === true && (
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Vegan</Text>
                  <Text style={styles.detailValue}>Yes ✓</Text>
                </View>
              )}
            </View>
          </View>

          {/* Flavor & Aroma */}
          {((producerCheese as any).flavor || (producerCheese as any).aroma) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Taste Profile</Text>
              
              {/* Flavor Tags - clickable */}
              {(producerCheese as any).flavor && (
                <View style={styles.flavorSection}>
                  <Text style={styles.flavorLabel}>Flavor</Text>
                  <View style={styles.flavorTagsRow}>
                    {(producerCheese as any).flavor.split(',').map((flavor: string, index: number) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.flavorTag}
                        onPress={() => router.push(`/(tabs)/discover?search=${encodeURIComponent(flavor.trim())}`)}
                      >
                        <Text style={styles.flavorTagText}>{capitalizeText(flavor.trim())}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              
              {/* Aroma Tags - clickable */}
              {(producerCheese as any).aroma && (
                <View style={styles.flavorSection}>
                  <Text style={styles.flavorLabel}>Aroma</Text>
                  <View style={styles.flavorTagsRow}>
                    {(producerCheese as any).aroma.split(',').map((aroma: string, index: number) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.aromaTag}
                        onPress={() => router.push(`/(tabs)/discover?search=${encodeURIComponent(aroma.trim())}`)}
                      >
                        <Text style={styles.aromaTagText}>{capitalizeText(aroma.trim())}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Pairings */}
          {pairings.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Perfect pairings</Text>
              
              {pairings.filter(p => p.type === 'drink').length > 0 && (
                <View style={styles.pairingCategory}>
                  <Text style={styles.pairingCategoryTitle}>🍷 Drinks</Text>
                  <View style={styles.pairingsGrid}>
                    {pairings.filter(p => p.type === 'drink').map((pairing, index) => (
                      <TouchableOpacity 
                        key={index} 
                        style={styles.pairingTile}
                        onPress={() => router.push(`/pairing/${pairing.id}`)}
                      >
                        <Image 
                          source={{ uri: pairing.featured_image_url || pairing.image_url || 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=400' }}
                          style={styles.pairingImage}
                        />
                        <View style={styles.pairingOverlay}>
                          {pairing.is_sponsored && (
                            <View style={styles.pairingSponsoredBadge}>
                              <Text style={styles.pairingSponsoredText}>✨</Text>
                            </View>
                          )}
                          <Text style={styles.pairingName}>{pairing.pairing}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {pairings.filter(p => p.type === 'food').length > 0 && (
                <View style={styles.pairingCategory}>
                  <Text style={styles.pairingCategoryTitle}>🍯 Foods</Text>
                  <View style={styles.pairingsGrid}>
                    {pairings.filter(p => p.type === 'food').map((pairing, index) => (
                      <TouchableOpacity 
                        key={index} 
                        style={styles.pairingTile}
                        onPress={() => router.push(`/pairing/${pairing.id}`)}
                      >
                        <Image 
                          source={{ uri: pairing.featured_image_url || pairing.image_url || 'https://images.unsplash.com/photo-1587049352846-4a222e784da4?q=80&w=400' }}
                          style={styles.pairingImage}
                        />
                        <View style={styles.pairingOverlay}>
                          {pairing.is_sponsored && (
                            <View style={styles.pairingSponsoredBadge}>
                              <Text style={styles.pairingSponsoredText}>✨</Text>
                            </View>
                          )}
                          <Text style={styles.pairingName}>{pairing.pairing}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Your Entry */}
          {userEntry && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Rating</Text>
              <View style={styles.userEntry}>
                <View style={styles.stars}>
                  {renderStars(userEntry.rating, 20)}
                </View>
                {userEntry.notes && (
                  <Text style={styles.userNotes}>"{userEntry.notes}"</Text>
                )}
              </View>
            </View>
          )}

          {/* Other Producer Cheeses */}
          {/* Only show More from Producer section if producer is not generic */}
          {otherProducerCheeses.length > 0 && 
           producerCheese.producer_name &&
           !producerCheese.producer_name.toLowerCase().includes('generic') &&
           !producerCheese.producer_name.toLowerCase().includes('unknown') && (
            <View style={styles.section}>
              <TouchableOpacity 
                onPress={() => {
                  if ((producerCheese as any).producer_id) {
                    router.push(`/producer/${(producerCheese as any).producer_id}`);
                  }
                }}
                disabled={!(producerCheese as any).producer_id}
              >
                <Text style={[styles.sectionTitle, (producerCheese as any).producer_id && styles.sectionTitleClickable]}>
                  More from {producerCheese.producer_name}
                </Text>
              </TouchableOpacity>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.horizontalScroll}
              >
                {otherProducerCheeses.map((cheese) => (
                  <TouchableOpacity
                    key={cheese.id}
                    style={styles.relatedCard}
                    onPress={() => router.push(`/producer-cheese/${cheese.id}`)}
                  >
                    <Image
                      source={{
                        uri: cheese.image_url || 'https://via.placeholder.com/120?text=Cheese',
                      }}
                      style={styles.relatedImage}
                    />
                    <Text style={styles.relatedName} numberOfLines={2}>
                      {cheese.full_name}
                    </Text>
                    <View style={styles.relatedRating}>
                      <Star size={12} color="#FFD700" fill="#FFD700" />
                      <Text style={styles.relatedRatingText}>
                        {cheese.average_rating.toFixed(1)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Rating Modal */}
      <Modal
        visible={showRatingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRatingModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
          keyboardVerticalOffset={10}
        >
          <ScrollView 
            style={styles.modalScrollView}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.floatingCloseButton}
                onPress={() => setShowRatingModal(false)}
              >
                <X size={20} color={Colors.text} />
              </TouchableOpacity>

              <Text style={styles.modalTitle}>
                {userEntry ? 'Update Your Rating' : 'Rate This Cheese'}
              </Text>
              <View style={styles.modalDivider} />

              {/* Star Display */}
              <View style={styles.starDisplayContainer}>
                <View style={styles.starsDisplay}>
                  {renderStars(Math.floor(tempRating), 32)}
                  {tempRating % 1 !== 0 && (
                    <View style={styles.halfStarWrapper}>
                      <Star size={32} color="#FFD700" fill="#FFD700" style={{ opacity: 0.5 }} />
                    </View>
                  )}
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
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Tasting Notes (Optional)</Text>
                <View style={styles.textInputContainer}>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="What did you think? Creamy, nutty, sharp..."
                    value={tempNotes}
                    onChangeText={setTempNotes}
                    multiline
                    placeholderTextColor={Colors.subtleText}
                  />
                </View>
              </View>

              {/* Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowRatingModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveRating}
                >
                  <Star size={18} color={Colors.background} fill={Colors.background} />
                  <Text style={styles.saveButtonText}>Save Rating</Text>
                </TouchableOpacity>
              </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  shareButtonContainer: {
    position: 'absolute',
    top: Layout.spacing.m,
    right: Layout.spacing.m,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  editButtonContainer: {
    position: 'absolute',
    top: Layout.spacing.m,
    right: Layout.spacing.m + 50,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  awardsBadgeContainer: {
    position: 'absolute',
    top: Layout.spacing.m + 50,
    right: Layout.spacing.m,
    zIndex: 10,
  },
  awardsBadge: {
    width: 80,
    height: 80,
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
    backgroundColor: '#FCD95B',
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
  metaTextClickable: {
    textDecorationLine: 'underline',
  },
  contentContainer: {
    padding: Layout.spacing.m,
    paddingBottom: Layout.spacing.xl,
  },
  cheeseTypeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.xs,
    padding: Layout.spacing.m,
    backgroundColor: Colors.card,
    borderRadius: Layout.borderRadius.medium,
    ...Layout.shadow.small,
  },
  cheeseTypeLinkText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.primary,
  },
  stars: {
    flexDirection: 'row',
    gap: 4,
  },
  ratingText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.subtleText,
  },
  section: {
    padding: Layout.spacing.m,
    backgroundColor: Colors.card,
    marginTop: Layout.spacing.s,
  },
  sectionTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
    marginBottom: Layout.spacing.m,
  },
  sectionTitleClickable: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.s,
  },
  tag: {
    backgroundColor: '#FFF0DB',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
    borderRadius: Layout.borderRadius.large,
  },
  tagText: {
    color: Colors.primary,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
  },
  description: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
    lineHeight: Typography.sizes.base * Typography.lineHeights.normal,
  },
  userEntry: {
    gap: Layout.spacing.s,
  },
  userNotes: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
    fontStyle: 'italic',
  },
  horizontalScroll: {
    marginHorizontal: -Layout.spacing.m,
    paddingHorizontal: Layout.spacing.m,
  },
  relatedCard: {
    width: 120,
    marginRight: Layout.spacing.m,
    backgroundColor: Colors.background,
    borderRadius: Layout.borderRadius.medium,
    overflow: 'hidden',
    ...Layout.shadow.small,
  },
  relatedImage: {
    width: 120,
    height: 120,
    backgroundColor: Colors.lightGray,
  },
  relatedName: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
    padding: Layout.spacing.s,
    minHeight: 40,
  },
  relatedRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Layout.spacing.s,
    paddingBottom: Layout.spacing.s,
  },
  relatedRatingText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.subtleText,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginTop: Layout.spacing.m,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xl,
  },
  errorText: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.error,
    marginBottom: Layout.spacing.m,
  },
  backButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Layout.spacing.l,
    paddingVertical: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
  },
  backButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.background,
  },
  bottomSpacing: {
    height: Layout.spacing.xl,
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
  pairingTile: {
    width: '48%',
    height: 120,
    borderRadius: Layout.borderRadius.medium,
    overflow: 'hidden',
    ...Layout.shadow.medium,
  },
  pairingImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    ...Platform.select({
      web: {
        objectFit: 'cover',
      },
    }),
  },
  pairingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.7) 100%)',
    justifyContent: 'flex-end',
    padding: Layout.spacing.m,
  },
  pairingSponsoredBadge: {
    position: 'absolute',
    top: Layout.spacing.s,
    right: Layout.spacing.s,
    backgroundColor: 'rgba(255, 215, 0, 0.9)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pairingSponsoredText: {
    fontSize: 12,
  },
  pairingName: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.background,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.s,
  },
  addToBoxButton: {
    backgroundColor: '#FCD95B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Layout.spacing.m,
    paddingHorizontal: Layout.spacing.l,
    borderRadius: Layout.borderRadius.large,
    gap: Layout.spacing.s,
    ...Layout.shadow.medium,
  },
  addToBoxButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.background,
  },
  wishlistButton: {
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
    height: 52,
    borderRadius: Layout.borderRadius.large,
  },
  wishlistHint: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    textAlign: 'center',
    marginTop: Layout.spacing.xs,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalScrollView: {
    maxHeight: '85%',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Layout.spacing.xl,
    paddingTop: Layout.spacing.xl,
    paddingBottom: Layout.spacing.xl + 20,
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
  },
  modalDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginTop: Layout.spacing.m,
    marginBottom: Layout.spacing.xl,
    width: '100%',
  },
  starDisplayContainer: {
    alignItems: 'center',
    marginBottom: Layout.spacing.m,
  },
  starsDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  halfStarWrapper: {
    marginLeft: 4,
  },
  ratingValueText: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
  },
  sliderContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: Layout.spacing.l,
  },
  ratingSlider: {
    width: '100%',
    height: 40,
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
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
    paddingVertical: 14,
    borderRadius: Layout.borderRadius.large,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: Colors.text,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: '#FCD95B',
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
  // Details grid styles
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.m,
  },
  detailCard: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Layout.borderRadius.medium,
    padding: Layout.spacing.m,
    minWidth: '47%',
    ...Layout.shadow.small,
  },
  detailLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
  },
  // Flavor/Aroma tag styles
  flavorSection: {
    marginBottom: Layout.spacing.m,
  },
  flavorLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginBottom: Layout.spacing.s,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  flavorTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.s,
  },
  flavorTag: {
    backgroundColor: '#FEF9E7',
    paddingVertical: Layout.spacing.xs,
    paddingHorizontal: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    borderWidth: 1,
    borderColor: '#FCD95B',
  },
  flavorTagText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: '#92400E',
  },
  aromaTag: {
    backgroundColor: '#F0FDF4',
    paddingVertical: Layout.spacing.xs,
    paddingHorizontal: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  aromaTagText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: '#166534',
  },
  viewMoreButton: {
    marginTop: Layout.spacing.s,
    alignSelf: 'flex-start',
  },
  viewMoreText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.primary,
  },
  // Producer Link Card
  producerLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: Layout.spacing.m,
    marginTop: Layout.spacing.s,
    borderRadius: Layout.borderRadius.medium,
    ...Layout.shadow.small,
  },
  producerLinkIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF0DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Layout.spacing.m,
  },
  producerLinkContent: {
    flex: 1,
  },
  producerLinkLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  producerLinkName: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
    marginTop: 2,
  },
});
