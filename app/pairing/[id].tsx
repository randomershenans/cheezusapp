import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Linking, Animated, Dimensions, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Sparkles, ShoppingBag, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

const { width: screenWidth } = Dimensions.get('window');

type Pairing = {
  id: string;
  pairing: string;
  type: string;
  description?: string;
  image_url?: string;
  is_sponsored?: boolean;
  brand_name?: string;
  brand_logo_url?: string;
  product_name?: string;
  featured_image_url?: string;
  why_it_works?: string;
  purchase_url?: string;
  price_range?: string;
  alternative_generic?: string;
  alternative_suggestions?: string[];
  cheeses?: {
    id: string;
    name: string;
    type: string;
    origin_country: string;
    origin_region?: string;
    image_url: string;
  }[];
};

export default function PairingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (id) {
      fetchPairingDetails();
    }
  }, [id]);

  const fetchPairingDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('cheese_pairings')
        .select(`
          *,
          cheeses:cheese_pairing_matches(
            cheese:cheeses(
              id,
              name,
              type,
              origin_country,
              origin_region,
              image_url
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Flatten the cheeses array
      const flattenedData = {
        ...data,
        cheeses: data?.cheeses?.map((item: any) => item.cheese) || []
      };

      setPairing(flattenedData);
    } catch (error) {
      console.error('Error fetching pairing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = () => {
    if (pairing?.purchase_url) {
      Linking.openURL(pairing.purchase_url);
    }
  };

  const toggleAlternatives = () => {
    setShowAlternatives(!showAlternatives);
    Animated.timing(fadeAnim, {
      toValue: showAlternatives ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  if (loading || !pairing) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  // Determine hero image - use featured for sponsored, otherwise regular
  const heroImage = pairing.is_sponsored && pairing.featured_image_url 
    ? pairing.featured_image_url 
    : pairing.image_url || (pairing.type === 'food' 
      ? 'https://images.unsplash.com/photo-1587049352846-4a222e784da4?q=80&w=1000'
      : 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=1000');

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Image Section */}
        <View style={styles.heroSection}>
          <Image source={{ uri: heroImage }} style={styles.heroImage} />
          <View style={styles.heroOverlay} />
          
          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={Colors.background} />
          </TouchableOpacity>

          {/* Hero Content */}
          <View style={styles.heroContent}>
            {pairing.is_sponsored && (
              <View style={styles.sponsoredBadge}>
                <Sparkles size={14} color="#FFD700" fill="#FFD700" />
                <Text style={styles.sponsoredBadgeText}>Featured Partner</Text>
              </View>
            )}
            
            <Text style={styles.pairingType}>
              {pairing.type === 'food' ? '🍯 Food' : '🍷 Drink'} Pairing
            </Text>
            
            {pairing.is_sponsored && pairing.brand_name && (
              <Text style={styles.brandName}>{pairing.brand_name}</Text>
            )}
            
            <Text style={styles.pairingTitle}>
              {pairing.is_sponsored && pairing.product_name ? pairing.product_name : pairing.pairing}
            </Text>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.contentSection}>
          {/* Description or Why It Works */}
          {pairing.is_sponsored && pairing.why_it_works ? (
            <View style={styles.whySection}>
              <Text style={styles.sectionTitle}>Why this pairs perfectly</Text>
              <Text style={styles.bodyText}>{pairing.why_it_works}</Text>
            </View>
          ) : pairing.description ? (
            <View style={styles.whySection}>
              <Text style={styles.sectionTitle}>About this pairing</Text>
              <Text style={styles.bodyText}>{pairing.description}</Text>
            </View>
          ) : null}

          {/* Sponsored: Purchase Section */}
          {pairing.is_sponsored && pairing.purchase_url && (
            <View style={styles.purchaseSection}>
              {pairing.price_range && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Price</Text>
                  <Text style={styles.priceValue}>{pairing.price_range}</Text>
                </View>
              )}
              
              <TouchableOpacity style={styles.buyButton} onPress={handlePurchase}>
                <ShoppingBag size={20} color={Colors.background} />
                <Text style={styles.buyButtonText}>Shop Now</Text>
                <ExternalLink size={16} color={Colors.background} />
              </TouchableOpacity>

              {/* Alternatives */}
              {(pairing.alternative_generic || pairing.alternative_suggestions?.length) && (
                <View style={styles.alternativesSection}>
                  <TouchableOpacity style={styles.alternativesHeader} onPress={toggleAlternatives}>
                    <Text style={styles.alternativesHeaderText}>Can't get this? See alternatives</Text>
                    {showAlternatives ? <ChevronUp size={20} color={Colors.primary} /> : <ChevronDown size={20} color={Colors.primary} />}
                  </TouchableOpacity>
                  
                  {showAlternatives && (
                    <Animated.View style={[styles.alternativesContent, { opacity: fadeAnim }]}>
                      {pairing.alternative_generic && (
                        <Text style={styles.alternativeText}>Try any: {pairing.alternative_generic}</Text>
                      )}
                      {pairing.alternative_suggestions?.map((alt, index) => (
                        <Text key={index} style={styles.alternativeItem}>• {alt}</Text>
                      ))}
                    </Animated.View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Cheeses Section */}
          {pairing.cheeses && pairing.cheeses.length > 0 && (
            <View style={styles.cheesesSection}>
              <Text style={styles.sectionTitle}>Cheeses that pair well</Text>
              <View style={styles.cheeseGrid}>
                {pairing.cheeses.map((cheese, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.cheeseCard}
                    onPress={() => router.push(`/cheese/${cheese.id}`)}
                  >
                    <Image 
                      source={{ uri: cheese.image_url || 'https://images.unsplash.com/photo-1566454825481-9c31a52e2f92?q=80&w=400' }} 
                      style={styles.cheeseImage}
                    />
                    <View style={styles.cheeseInfo}>
                      <Text style={styles.cheeseName}>{cheese.name}</Text>
                      <Text style={styles.cheeseCountry}>{cheese.origin_country}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xl,
  },
  loadingText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.subtleText,
  },
  
  // Hero Section
  heroSection: {
    position: 'relative',
    height: 400,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    ...Platform.select({
      web: { objectFit: 'cover' },
    }),
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: Layout.spacing.m,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Layout.spacing.l,
    gap: Layout.spacing.s,
  },
  sponsoredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: 6,
    borderRadius: 20,
  },
  sponsoredBadgeText: {
    color: '#FFD700',
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
  },
  pairingType: {
    color: Colors.background,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    opacity: 0.9,
  },
  brandName: {
    color: '#FFD700',
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bodySemiBold,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  pairingTitle: {
    color: Colors.background,
    fontSize: Typography.sizes['2xl'],
    fontFamily: Typography.fonts.bodyBold,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  // Content Section
  contentSection: {
    padding: Layout.spacing.l,
    gap: Layout.spacing.xl,
  },
  whySection: {
    gap: Layout.spacing.m,
  },
  sectionTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.bodyBold,
    color: Colors.text,
  },
  bodyText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
    lineHeight: 24,
  },

  // Purchase Section
  purchaseSection: {
    gap: Layout.spacing.m,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Layout.spacing.m,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  priceLabel: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.subtleText,
  },
  priceValue: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Layout.spacing.s,
    backgroundColor: Colors.primary,
    paddingVertical: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    ...Layout.shadow.medium,
  },
  buyButtonText: {
    color: Colors.background,
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bodySemiBold,
  },

  // Alternatives
  alternativesSection: {
    marginTop: Layout.spacing.m,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.medium,
    overflow: 'hidden',
  },
  alternativesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Layout.spacing.m,
    backgroundColor: Colors.card,
  },
  alternativesHeaderText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
  },
  alternativesContent: {
    padding: Layout.spacing.m,
    gap: Layout.spacing.s,
    backgroundColor: Colors.background,
  },
  alternativeText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
    lineHeight: 20,
  },
  alternativeItem: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
    lineHeight: 20,
    paddingLeft: Layout.spacing.s,
  },

  // Cheeses Section
  cheesesSection: {
    gap: Layout.spacing.m,
  },
  cheeseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.m,
  },
  cheeseCard: {
    width: (screenWidth - Layout.spacing.l * 2 - Layout.spacing.m) / 2,
    backgroundColor: Colors.card,
    borderRadius: Layout.borderRadius.medium,
    overflow: 'hidden',
    ...Layout.shadow.small,
  },
  cheeseImage: {
    width: '100%',
    height: 120,
    ...Platform.select({
      web: { objectFit: 'cover' },
    }),
  },
  cheeseInfo: {
    padding: Layout.spacing.m,
    gap: 4,
  },
  cheeseName: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
  },
  cheeseCountry: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
});
