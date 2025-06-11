import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, SafeAreaView, Platform, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Heart, Share2, Plus, Star, MapPin, Clock, Users } from 'lucide-react-native';
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

  const handleAddToCheeseBox = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('cheese_box_entries')
        .insert([
          {
            user_id: user.id,
            cheese_id: id,
            rating: null,
            notes: null
          }
        ])
        .select()
        .single();

      if (error) throw error;
      
      setCheeseBoxEntry(data);
      setSaved(true);
    } catch (error) {
      console.error('Error adding to cheese box:', error);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        size={16}
        color={index < rating ? '#FFD700' : '#E0E0E0'}
        fill={index < rating ? '#FFD700' : 'none'}
      />
    ));
  };

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
        <StatusBar style="dark" />
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
              <View style={styles.ratingContainer}>
                <Star size={16} color="#FFD700" fill="#FFD700" />
                <Text style={styles.ratingText}>4.{Math.floor(Math.random() * 3) + 6}</Text>
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
            <TouchableOpacity
              style={[styles.addButton, saved && styles.addButtonSaved]}
              onPress={handleAddToCheeseBox}
              disabled={saved}
            >
              {saved ? (
                <>
                  <Heart size={20} color={Colors.success} fill={Colors.success} />
                  <Text style={[styles.addButtonText, { color: Colors.success }]}>
                    In your cheese box
                  </Text>
                </>
              ) : (
                <>
                  <Plus size={20} color={Colors.background} />
                  <Text style={styles.addButtonText}>Add to cheese box</Text>
                </>
              )}
            </TouchableOpacity>

            {cheeseBoxEntry?.rating && (
              <View style={styles.userRating}>
                <Text style={styles.userRatingLabel}>Your rating:</Text>
                <View style={styles.starsContainer}>
                  {renderStars(cheeseBoxEntry.rating)}
                </View>
              </View>
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
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.xs,
  },
  ratingText: {
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
    borderRadius: Layout.borderRadius.large,
    gap: Layout.spacing.s,
    ...Layout.shadow.medium,
  },
  addButtonSaved: {
    backgroundColor: '#E8F8F0',
  },
  addButtonText: {
    color: Colors.background,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
  },
  userRating: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Layout.spacing.m,
    gap: Layout.spacing.s,
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
});