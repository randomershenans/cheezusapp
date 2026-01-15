import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Dimensions,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  MapPin,
  Globe,
  Phone,
  Mail,
  Star,
  ChevronRight,
  Award,
  Factory,
} from 'lucide-react-native';

import {
  getProducerById,
  getProducerCheeses,
  ProducerWithStats,
  ProducerCheeseSummary,
} from '@/lib';
import { Analytics } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

const { width: screenWidth } = Dimensions.get('window');

export default function ProducerDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [producer, setProducer] = useState<ProducerWithStats | null>(null);
  const [cheeses, setCheeses] = useState<ProducerCheeseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProducerDetails();
      Analytics.trackProducerView(id as string, user?.id);
    }
  }, [id]);

  const fetchProducerDetails = async () => {
    try {
      setLoading(true);

      const [producerData, cheesesData] = await Promise.all([
        getProducerById(id as string),
        getProducerCheeses(id as string),
      ]);

      if (!producerData) throw new Error('Producer not found');

      setProducer(producerData);
      setCheeses(cheesesData);
    } catch (error) {
      console.error('Error fetching producer:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWebsite = () => {
    if (producer?.website) {
      const url = producer.website.startsWith('http')
        ? producer.website
        : `https://${producer.website}`;
      Linking.openURL(url);
    }
  };

  const handleCall = () => {
    if (producer?.phone) {
      Linking.openURL(`tel:${producer.phone}`);
    }
  };

  const handleEmail = () => {
    if (producer?.email) {
      Linking.openURL(`mailto:${producer.email}`);
    }
  };

  const renderStars = (rating: number, size: number = 14) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        size={size}
        color="#FFD700"
        fill={index < Math.round(rating) ? '#FFD700' : 'none'}
      />
    ));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading producer...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!producer) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Producer not found</Text>
          <TouchableOpacity
            style={styles.backButtonError}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonErrorText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroContainer}>
          <Image
            source={{
              uri: producer.image_url || 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?q=80&w=800',
            }}
            style={styles.heroImage}
          />
          <View style={styles.heroOverlay} />

          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.push('/(tabs)')}
          >
            <ArrowLeft size={24} color={Colors.background} />
          </TouchableOpacity>

          {/* Hero Content */}
          <View style={styles.heroContent}>
            <View style={styles.producerBadge}>
              <Factory size={14} color={Colors.background} />
              <Text style={styles.producerBadgeText}>Producer</Text>
            </View>

            <Text style={styles.heroTitle}>{producer.name}</Text>

            {(producer.country || producer.region) && (
              <View style={styles.locationRow}>
                <MapPin size={18} color="rgba(255, 255, 255, 0.9)" />
                <Text style={styles.locationText}>
                  {producer.region && `${producer.region}, `}
                  {producer.country}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats Bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{producer.cheese_count}</Text>
            <Text style={styles.statLabel}>Cheeses</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.ratingRow}>
              <Star size={16} color="#FFD700" fill="#FFD700" />
              <Text style={styles.statValue}>
                {producer.average_rating > 0 ? producer.average_rating.toFixed(1) : '-'}
              </Text>
            </View>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{producer.total_ratings}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          {/* About Section */}
          {producer.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text
                style={styles.description}
                numberOfLines={descriptionExpanded ? undefined : 4}
              >
                {producer.description}
              </Text>
              {producer.description.length > 200 && (
                <TouchableOpacity
                  style={styles.viewMoreButton}
                  onPress={() => setDescriptionExpanded(!descriptionExpanded)}
                >
                  <Text style={styles.viewMoreText}>
                    {descriptionExpanded ? 'View Less' : 'View More'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Contact Section */}
          {(producer.website || producer.phone || producer.email || producer.address) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact</Text>
              <View style={styles.contactGrid}>
                {producer.website && (
                  <TouchableOpacity style={styles.contactCard} onPress={handleOpenWebsite}>
                    <View style={styles.contactIconContainer}>
                      <Globe size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactLabel}>Website</Text>
                      <Text style={styles.contactValue} numberOfLines={1}>
                        {producer.website.replace(/^https?:\/\//, '')}
                      </Text>
                    </View>
                    <ChevronRight size={18} color={Colors.subtleText} />
                  </TouchableOpacity>
                )}

                {producer.phone && (
                  <TouchableOpacity style={styles.contactCard} onPress={handleCall}>
                    <View style={styles.contactIconContainer}>
                      <Phone size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactLabel}>Phone</Text>
                      <Text style={styles.contactValue}>{producer.phone}</Text>
                    </View>
                    <ChevronRight size={18} color={Colors.subtleText} />
                  </TouchableOpacity>
                )}

                {producer.email && (
                  <TouchableOpacity style={styles.contactCard} onPress={handleEmail}>
                    <View style={styles.contactIconContainer}>
                      <Mail size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactLabel}>Email</Text>
                      <Text style={styles.contactValue} numberOfLines={1}>
                        {producer.email}
                      </Text>
                    </View>
                    <ChevronRight size={18} color={Colors.subtleText} />
                  </TouchableOpacity>
                )}

                {producer.address && (
                  <View style={styles.contactCard}>
                    <View style={styles.contactIconContainer}>
                      <MapPin size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactLabel}>Address</Text>
                      <Text style={styles.contactValue}>{producer.address}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Cheeses Section */}
          {cheeses.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Their Cheeses</Text>
                <Text style={styles.cheeseCount}>{cheeses.length} cheeses</Text>
              </View>

              <View style={styles.cheesesGrid}>
                {cheeses.map((cheese) => (
                  <TouchableOpacity
                    key={cheese.id}
                    style={styles.cheeseCard}
                    onPress={() => router.push(`/producer-cheese/${cheese.id}`)}
                  >
                    <View style={styles.cheeseImageContainer}>
                      <Image
                        source={{
                          uri: cheese.image_url || 'https://via.placeholder.com/200?text=Cheese',
                        }}
                        style={styles.cheeseImage}
                      />
                      {cheese.awards_image_url && (
                        <Image
                          source={{ uri: cheese.awards_image_url }}
                          style={styles.cheeseAwardBadge}
                          resizeMode="contain"
                        />
                      )}
                    </View>
                    <View style={styles.cheeseInfo}>
                      <Text style={styles.cheeseName} numberOfLines={2}>
                        {cheese.product_name || cheese.full_name}
                      </Text>
                      <Text style={styles.cheeseType} numberOfLines={1}>
                        {cheese.cheese_type_name}
                      </Text>
                      <View style={styles.cheeseFooter}>
                        {cheese.rating_count > 0 ? (
                          <View style={styles.cheeseRating}>
                            <Star size={12} color="#FFD700" fill="#FFD700" />
                            <Text style={styles.cheeseRatingText}>
                              {cheese.average_rating.toFixed(1)}
                            </Text>
                            <Text style={styles.cheeseReviewCount}>
                              ({cheese.rating_count})
                            </Text>
                          </View>
                        ) : (
                          <Text style={styles.noRatings}>No ratings yet</Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Empty State for Cheeses */}
          {cheeses.length === 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Their Cheeses</Text>
              <View style={styles.emptyState}>
                <Award size={48} color={Colors.subtleText} />
                <Text style={styles.emptyStateText}>
                  No cheeses linked yet
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  Check back soon for their collection
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.bottomSpacing} />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Layout.spacing.m,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xl,
  },
  errorText: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
    marginBottom: Layout.spacing.m,
  },
  backButtonError: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Layout.spacing.l,
    paddingVertical: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
  },
  backButtonErrorText: {
    color: Colors.background,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
  },

  // Hero Section
  heroContainer: {
    height: 320,
    position: 'relative',
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  backButton: {
    position: 'absolute',
    top: Layout.spacing.m,
    left: Layout.spacing.m,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  heroContent: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    padding: Layout.spacing.l,
  },
  producerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
    borderRadius: Layout.borderRadius.large,
    alignSelf: 'flex-start',
    marginBottom: Layout.spacing.m,
  },
  producerBadgeText: {
    color: Colors.background,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
  },
  heroTitle: {
    fontSize: Typography.sizes['4xl'],
    fontFamily: Typography.fonts.heading,
    color: Colors.background,
    marginBottom: Layout.spacing.s,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.xs,
  },
  locationText: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Stats Bar
  statsBar: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    marginHorizontal: Layout.spacing.m,
    marginTop: -30,
    borderRadius: Layout.borderRadius.large,
    padding: Layout.spacing.m,
    ...Layout.shadow.medium,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.divider,
    marginVertical: Layout.spacing.xs,
  },
  statValue: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.heading,
    color: Colors.text,
  },
  statLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  // Content
  contentContainer: {
    padding: Layout.spacing.m,
    paddingTop: Layout.spacing.l,
  },
  section: {
    marginBottom: Layout.spacing.l,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.m,
  },
  sectionTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
    marginBottom: Layout.spacing.m,
  },
  cheeseCount: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginBottom: Layout.spacing.m,
  },
  description: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
    lineHeight: Typography.sizes.base * Typography.lineHeights.relaxed,
  },
  viewMoreButton: {
    marginTop: Layout.spacing.s,
  },
  viewMoreText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.primary,
  },

  // Contact Section
  contactGrid: {
    gap: Layout.spacing.s,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
  },
  contactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Layout.spacing.m,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contactValue: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
    marginTop: 2,
  },

  // Cheeses Grid
  cheesesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Layout.spacing.xs,
  },
  cheeseCard: {
    width: (screenWidth - Layout.spacing.m * 2 - Layout.spacing.s) / 2,
    marginHorizontal: Layout.spacing.xs,
    marginBottom: Layout.spacing.m,
    backgroundColor: Colors.card,
    borderRadius: Layout.borderRadius.medium,
    overflow: 'hidden',
    ...Layout.shadow.small,
  },
  cheeseImageContainer: {
    position: 'relative',
  },
  cheeseImage: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.lightGray,
  },
  cheeseAwardBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 40,
    height: 40,
  },
  cheeseInfo: {
    padding: Layout.spacing.s,
  },
  cheeseName: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
    marginBottom: 2,
    minHeight: 36,
  },
  cheeseType: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginBottom: Layout.spacing.xs,
  },
  cheeseFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cheeseRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  cheeseRatingText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
  },
  cheeseReviewCount: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  noRatings: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    fontStyle: 'italic',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.xl,
  },
  emptyStateText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
    marginTop: Layout.spacing.m,
  },
  emptyStateSubtext: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginTop: Layout.spacing.xs,
  },

  bottomSpacing: {
    height: Layout.spacing.xxl,
  },
});
