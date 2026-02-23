import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
  Share,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  MapPin,
  Globe,
  Phone,
  Mail,
  Star,
  ChevronRight,
  Award,
  Navigation,
  ExternalLink,
} from 'lucide-react-native';

import {
  getProducerById,
  getProducerCheeses,
  getProducerSections,
  getProducerShowcaseData,
  ProducerWithStats,
  ProducerCheeseSummary,
  ProducerSection,
} from '@/lib';
import { Analytics } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

import {
  VideoHero,
  StorySection,
  ProcessSection,
  TeamSection,
  GallerySection,
  AwardsSection,
  QuoteSection,
} from '@/components/producer-showcase';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

/* ── Types ── */
interface ShowcaseData {
  hero_video_url?: string;
  logo_url?: string;
  tagline?: string;
  founded_year?: number;
  latitude?: number;
  longitude?: number;
  is_verified?: boolean;
}

interface SectionLayout {
  y: number;
  height: number;
}

/* ── Component ── */
export default function ProducerDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [producer, setProducer] = useState<ProducerWithStats | null>(null);
  const [cheeses, setCheeses] = useState<ProducerCheeseSummary[]>([]);
  const [sections, setSections] = useState<ProducerSection[]>([]);
  const [showcase, setShowcase] = useState<ShowcaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  // Scroll-based visibility tracking for video auto-play
  const [scrollY, setScrollY] = useState(0);
  const sectionLayouts = useRef<Record<string, SectionLayout>>({});
  const heroLayout = useRef<SectionLayout>({ y: 0, height: 0 });

  useEffect(() => {
    if (id) {
      fetchProducerDetails();
      Analytics.trackProducerView(id as string, user?.id);
    }
  }, [id]);

  const fetchProducerDetails = async () => {
    try {
      setLoading(true);
      const [producerData, cheesesData, sectionsData, showcaseData] = await Promise.all([
        getProducerById(id as string),
        getProducerCheeses(id as string),
        getProducerSections(id as string),
        getProducerShowcaseData(id as string),
      ]);

      if (!producerData) throw new Error('Producer not found');

      setProducer(producerData);
      setCheeses(cheesesData);
      setSections(sectionsData);
      setShowcase(showcaseData);
    } catch (error) {
      console.error('Error fetching producer:', error);
    } finally {
      setLoading(false);
    }
  };

  /* ── Helpers ── */
  const isSectionVisible = useCallback(
    (key: string) => {
      const layout = key === 'hero' ? heroLayout.current : sectionLayouts.current[key];
      if (!layout) return false;
      const viewTop = scrollY;
      const viewBottom = scrollY + screenHeight;
      return layout.y < viewBottom && layout.y + layout.height > viewTop;
    },
    [scrollY]
  );

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollY(e.nativeEvent.contentOffset.y);
  }, []);

  const onHeroLayout = useCallback((e: LayoutChangeEvent) => {
    heroLayout.current = { y: e.nativeEvent.layout.y, height: e.nativeEvent.layout.height };
  }, []);

  const onSectionLayout = useCallback((key: string) => (e: LayoutChangeEvent) => {
    sectionLayouts.current[key] = { y: e.nativeEvent.layout.y, height: e.nativeEvent.layout.height };
  }, []);

  const handleOpenWebsite = () => {
    if (producer?.website) {
      const url = producer.website.startsWith('http')
        ? producer.website
        : `https://${producer.website}`;
      Linking.openURL(url);
    }
  };

  const handleCall = () => {
    if (producer?.phone) Linking.openURL(`tel:${producer.phone}`);
  };

  const handleEmail = () => {
    if (producer?.email) Linking.openURL(`mailto:${producer.email}`);
  };

  const handleShowOnMap = () => {
    if (!showcase?.latitude || !showcase?.longitude) return;
    const label = encodeURIComponent(producer?.name || 'Producer');
    const lat = showcase.latitude;
    const lng = showcase.longitude;
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    });
    if (url) Linking.openURL(url);
  };

  const handleShare = async () => {
    if (!producer) return;
    try {
      await Share.share({
        message: `Check out ${producer.name} on Cheezus! 🧀`,
        title: producer.name,
      });
    } catch (e) {
      // user cancelled
    }
  };

  /* ── Render section by type ── */
  const renderSection = (section: ProducerSection, index: number) => {
    const key = `section-${section.id}`;
    const visible = isSectionVisible(key);

    switch (section.section_type) {
      case 'story':
        return (
          <View key={key} onLayout={onSectionLayout(key)}>
            <StorySection
              title={section.title || undefined}
              subtitle={section.subtitle || undefined}
              bodyText={section.body_text || undefined}
              mediaUrl={section.media_url || undefined}
              mediaType={section.media_type || undefined}
              backgroundColor={section.background_color || undefined}
              isVisible={visible}
            />
          </View>
        );

      case 'process':
        return (
          <View key={key} onLayout={onSectionLayout(key)}>
            <ProcessSection
              title={section.title || undefined}
              subtitle={section.subtitle || undefined}
              steps={section.metadata?.steps || []}
            />
          </View>
        );

      case 'team':
        return (
          <View key={key} onLayout={onSectionLayout(key)}>
            <TeamSection
              title={section.title || undefined}
              subtitle={section.subtitle || undefined}
              members={section.metadata?.members || []}
            />
          </View>
        );

      case 'gallery':
        return (
          <View key={key} onLayout={onSectionLayout(key)}>
            <GallerySection
              title={section.title || undefined}
              subtitle={section.subtitle || undefined}
              images={section.metadata?.images || []}
            />
          </View>
        );

      case 'awards':
        return (
          <View key={key} onLayout={onSectionLayout(key)}>
            <AwardsSection
              title={section.title || undefined}
              subtitle={section.subtitle || undefined}
              awards={section.metadata?.awards || []}
            />
          </View>
        );

      case 'quote':
        return (
          <View key={key} onLayout={onSectionLayout(key)}>
            <QuoteSection
              bodyText={section.body_text || undefined}
              mediaUrl={section.media_url || undefined}
              mediaType={section.media_type || undefined}
              backgroundColor={section.background_color || undefined}
              author={section.metadata?.author}
              role={section.metadata?.role}
            />
          </View>
        );

      default:
        return null;
    }
  };

  /* ── Loading / Error states ── */
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

  const hasShowcase = sections.length > 0 || showcase?.hero_video_url || showcase?.tagline;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* ── Video Hero ── */}
        <View onLayout={onHeroLayout}>
          <VideoHero
            name={producer.name}
            country={producer.country}
            region={producer.region}
            tagline={showcase?.tagline}
            foundedYear={showcase?.founded_year}
            imageUrl={producer.image_url}
            videoUrl={showcase?.hero_video_url}
            logoUrl={showcase?.logo_url}
            isVerified={showcase?.is_verified}
            isVisible={isSectionVisible('hero')}
            onBack={() => router.canGoBack() ? router.back() : router.push('/(tabs)')}
            onShare={handleShare}
          />
        </View>

        {/* ── Stats Bar ── */}
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

        {/* ── About (always shown) ── */}
        {producer.description && (
          <View style={styles.aboutSection}>
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

        {/* ── Dynamic Showcase Sections ── */}
        {sections.map((section, index) => renderSection(section, index))}

        {/* ── Their Cheeses ── */}
        <View style={styles.contentContainer}>
          {cheeses.length > 0 ? (
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
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Their Cheeses</Text>
              <View style={styles.emptyState}>
                <Award size={48} color={Colors.subtleText} />
                <Text style={styles.emptyStateText}>No cheeses linked yet</Text>
                <Text style={styles.emptyStateSubtext}>Check back soon for their collection</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Map / Location ── */}
        {showcase?.latitude && showcase?.longitude && (
          <View style={styles.mapSection}>
            <Text style={styles.mapTitle}>Find Us</Text>
            <TouchableOpacity style={styles.mapButton} onPress={handleShowOnMap}>
              <Navigation size={20} color={Colors.background} />
              <Text style={styles.mapButtonText}>Show on Map</Text>
            </TouchableOpacity>
            {producer.address && (
              <Text style={styles.mapAddress}>{producer.address}</Text>
            )}
          </View>
        )}

        {/* ── Contact ── */}
        {(producer.website || producer.phone || producer.email || producer.address) && (
          <View style={styles.contactSection}>
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
                  <ExternalLink size={16} color={Colors.subtleText} />
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
                  <ChevronRight size={16} color={Colors.subtleText} />
                </TouchableOpacity>
              )}
              {producer.email && (
                <TouchableOpacity style={styles.contactCard} onPress={handleEmail}>
                  <View style={styles.contactIconContainer}>
                    <Mail size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactLabel}>Email</Text>
                    <Text style={styles.contactValue} numberOfLines={1}>{producer.email}</Text>
                  </View>
                  <ChevronRight size={16} color={Colors.subtleText} />
                </TouchableOpacity>
              )}
              {producer.address && !showcase?.latitude && (
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

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

/* ── Styles ── */
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
    color: Colors.text,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
  },

  // Stats Bar
  statsBar: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    marginHorizontal: Layout.spacing.m,
    marginTop: -30,
    borderRadius: Layout.borderRadius.large,
    padding: Layout.spacing.m,
    zIndex: 5,
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

  // About
  aboutSection: {
    padding: Layout.spacing.l,
    paddingTop: Layout.spacing.xl,
  },

  // Sections
  contentContainer: {
    padding: Layout.spacing.m,
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
    color: Colors.primaryDark,
  },

  // Map
  mapSection: {
    padding: Layout.spacing.l,
    paddingVertical: Layout.spacing.xl,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
  },
  mapTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
    marginBottom: Layout.spacing.l,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.s,
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: Layout.spacing.xl,
    paddingVertical: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    ...Layout.shadow.small,
  },
  mapButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.background,
  },
  mapAddress: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginTop: Layout.spacing.m,
    textAlign: 'center',
  },

  // Contact
  contactSection: {
    padding: Layout.spacing.l,
  },
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
