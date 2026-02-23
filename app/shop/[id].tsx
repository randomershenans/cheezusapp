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
  Store,
  Clock,
  ShoppingBag,
} from 'lucide-react-native';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

const { width: screenWidth } = Dimensions.get('window');

type Shop = {
  id: string;
  name: string;
  description: string | null;
  shop_type: string;
  image_url: string | null;
  logo_url: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  opening_hours: any | null;
  is_verified: boolean;
  status: string;
  created_at: string;
};

type ShopCheese = {
  id: string;
  in_stock: boolean;
  price: number | null;
  notes: string | null;
  cheese_type?: {
    id: string;
    name: string;
    image_url: string | null;
    origin_country: string | null;
  } | null;
  producer_cheese?: {
    id: string;
    full_name: string;
    image_url: string | null;
    producer_name: string | null;
  } | null;
};

export default function ShopDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [shop, setShop] = useState<Shop | null>(null);
  const [shopCheeses, setShopCheeses] = useState<ShopCheese[]>([]);
  const [loading, setLoading] = useState(true);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  useEffect(() => {
    if (id) {
      fetchShopDetails();
      fetchShopCheeses();
    }
  }, [id]);

  const fetchShopDetails = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setShop(data);
    } catch (error) {
      console.error('Error fetching shop:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchShopCheeses = async () => {
    try {
      const { data, error } = await supabase
        .from('shop_cheeses')
        .select(`
          id,
          in_stock,
          price,
          notes,
          cheese_type:cheese_type_id (id, name, image_url, origin_country),
          producer_cheese:producer_cheese_id (id, full_name, image_url, producer_name)
        `)
        .eq('shop_id', id);

      if (error) throw error;
      
      // Transform data - Supabase returns single objects for foreign keys, not arrays
      const transformed = (data || []).map((item: any) => ({
        ...item,
        cheese_type: Array.isArray(item.cheese_type) ? item.cheese_type[0] : item.cheese_type,
        producer_cheese: Array.isArray(item.producer_cheese) ? item.producer_cheese[0] : item.producer_cheese,
      }));
      setShopCheeses(transformed);
    } catch (error) {
      console.error('Error fetching shop cheeses:', error);
    }
  };

  const handleOpenWebsite = () => {
    if (shop?.website_url) {
      const url = shop.website_url.startsWith('http')
        ? shop.website_url
        : `https://${shop.website_url}`;
      Linking.openURL(url);
    }
  };

  const handleCall = () => {
    if (shop?.phone) {
      Linking.openURL(`tel:${shop.phone}`);
    }
  };

  const handleEmail = () => {
    if (shop?.email) {
      Linking.openURL(`mailto:${shop.email}`);
    }
  };

  const handleOpenMaps = () => {
    if (shop?.address) {
      const address = encodeURIComponent(
        `${shop.address}, ${shop.city || ''} ${shop.postal_code || ''}, ${shop.country || ''}`
      );
      const url = Platform.select({
        ios: `maps:?q=${address}`,
        android: `geo:0,0?q=${address}`,
        default: `https://www.google.com/maps/search/?api=1&query=${address}`,
      });
      Linking.openURL(url as string);
    }
  };

  const getShopTypeLabel = (type: string): string => {
    switch (type) {
      case 'online':
        return 'Online Store';
      case 'physical':
        return 'Physical Store';
      case 'both':
        return 'Online & Physical';
      default:
        return 'Shop';
    }
  };

  const getFullAddress = (): string => {
    const parts = [shop?.address, shop?.city, shop?.postal_code, shop?.country].filter(Boolean);
    return parts.join(', ');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading shop...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!shop) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Shop not found</Text>
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
              uri: shop.image_url || 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?q=80&w=800',
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
            <View style={styles.shopBadge}>
              <Store size={14} color={Colors.background} />
              <Text style={styles.shopBadgeText}>{getShopTypeLabel(shop.shop_type)}</Text>
            </View>

            <Text style={styles.heroTitle}>{shop.name}</Text>

            {(shop.city || shop.country) && (
              <View style={styles.locationRow}>
                <MapPin size={18} color="rgba(255, 255, 255, 0.9)" />
                <Text style={styles.locationText}>
                  {shop.city && `${shop.city}, `}
                  {shop.country}
                </Text>
              </View>
            )}
          </View>

          {/* Verified Badge */}
          {shop.is_verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ Verified</Text>
            </View>
          )}
        </View>

        {/* Stats Bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <ShoppingBag size={20} color={Colors.primary} />
            <Text style={styles.statLabel}>{getShopTypeLabel(shop.shop_type)}</Text>
          </View>
          {shop.is_verified && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Star size={20} color="#FFD700" fill="#FFD700" />
                <Text style={styles.statLabel}>Verified Partner</Text>
              </View>
            </>
          )}
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          {/* About Section */}
          {shop.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text
                style={styles.description}
                numberOfLines={descriptionExpanded ? undefined : 4}
              >
                {shop.description}
              </Text>
              {shop.description.length > 200 && (
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
          {(shop.website_url || shop.phone || shop.email || shop.address) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact & Location</Text>
              <View style={styles.contactGrid}>
                {shop.website_url && (
                  <TouchableOpacity style={styles.contactCard} onPress={handleOpenWebsite}>
                    <View style={styles.contactIconContainer}>
                      <Globe size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactLabel}>Website</Text>
                      <Text style={styles.contactValue} numberOfLines={1}>
                        {shop.website_url.replace(/^https?:\/\//, '')}
                      </Text>
                    </View>
                    <ChevronRight size={18} color={Colors.subtleText} />
                  </TouchableOpacity>
                )}

                {shop.phone && (
                  <TouchableOpacity style={styles.contactCard} onPress={handleCall}>
                    <View style={styles.contactIconContainer}>
                      <Phone size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactLabel}>Phone</Text>
                      <Text style={styles.contactValue}>{shop.phone}</Text>
                    </View>
                    <ChevronRight size={18} color={Colors.subtleText} />
                  </TouchableOpacity>
                )}

                {shop.email && (
                  <TouchableOpacity style={styles.contactCard} onPress={handleEmail}>
                    <View style={styles.contactIconContainer}>
                      <Mail size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactLabel}>Email</Text>
                      <Text style={styles.contactValue} numberOfLines={1}>
                        {shop.email}
                      </Text>
                    </View>
                    <ChevronRight size={18} color={Colors.subtleText} />
                  </TouchableOpacity>
                )}

                {shop.address && (
                  <TouchableOpacity style={styles.contactCard} onPress={handleOpenMaps}>
                    <View style={styles.contactIconContainer}>
                      <MapPin size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactLabel}>Address</Text>
                      <Text style={styles.contactValue}>{getFullAddress()}</Text>
                    </View>
                    <ChevronRight size={18} color={Colors.subtleText} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Opening Hours Section */}
          {shop.opening_hours && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Opening Hours</Text>
              <View style={styles.hoursCard}>
                <Clock size={20} color={Colors.primary} />
                <Text style={styles.hoursText}>
                  {typeof shop.opening_hours === 'string' 
                    ? shop.opening_hours 
                    : JSON.stringify(shop.opening_hours)}
                </Text>
              </View>
            </View>
          )}

          {/* Cheeses Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Cheeses {shopCheeses.length > 0 && `(${shopCheeses.length})`}
            </Text>
            {shopCheeses.length > 0 ? (
              <View style={styles.cheesesGrid}>
                {shopCheeses.map((item) => {
                  const cheese = item.producer_cheese || item.cheese_type;
                  const name = item.producer_cheese?.full_name || item.cheese_type?.name || 'Unknown Cheese';
                  const imageUrl = item.producer_cheese?.image_url || item.cheese_type?.image_url;
                  const subtitle = item.producer_cheese?.producer_name || item.cheese_type?.origin_country;
                  
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.cheeseCard}
                      onPress={() => {
                        if (item.producer_cheese?.id) {
                          router.push(`/producer-cheese/${item.producer_cheese.id}`);
                        } else if (item.cheese_type?.id) {
                          router.push(`/cheese/${item.cheese_type.id}`);
                        }
                      }}
                    >
                      <Image
                        source={{
                          uri: imageUrl || 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=200&h=200&fit=crop',
                        }}
                        style={styles.cheeseImage}
                      />
                      <View style={styles.cheeseInfo}>
                        <Text style={styles.cheeseName} numberOfLines={2}>{name}</Text>
                        {subtitle && (
                          <Text style={styles.cheeseSubtitle} numberOfLines={1}>{subtitle}</Text>
                        )}
                        <View style={styles.cheeseMetaRow}>
                          {item.price && (
                            <Text style={styles.cheesePrice}>£{item.price.toFixed(2)}</Text>
                          )}
                          <View style={[
                            styles.stockBadge,
                            { backgroundColor: item.in_stock ? '#E8F5E9' : '#FFEBEE' }
                          ]}>
                            <Text style={[
                              styles.stockText,
                              { color: item.in_stock ? '#2E7D32' : '#C62828' }
                            ]}>
                              {item.in_stock ? 'In Stock' : 'Out of Stock'}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <ChevronRight size={18} color={Colors.subtleText} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <ShoppingBag size={48} color={Colors.subtleText} />
                <Text style={styles.emptyStateText}>No cheeses listed yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Check back to see what cheeses this shop offers
                </Text>
              </View>
            )}
          </View>
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
  shopBadge: {
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
  shopBadgeText: {
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
  verifiedBadge: {
    position: 'absolute',
    top: Layout.spacing.m,
    right: Layout.spacing.m,
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
    borderRadius: Layout.borderRadius.medium,
  },
  verifiedText: {
    color: Colors.background,
    fontSize: Typography.sizes.sm,
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
    ...Layout.shadow.medium,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Layout.spacing.s,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.divider,
    marginVertical: Layout.spacing.xs,
  },
  statLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
  },

  // Content
  contentContainer: {
    padding: Layout.spacing.m,
    paddingTop: Layout.spacing.l,
  },
  section: {
    marginBottom: Layout.spacing.l,
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

  // Opening Hours
  hoursCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
    gap: Layout.spacing.m,
  },
  hoursText: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
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
    textAlign: 'center',
  },

  // Cheese Cards
  cheesesGrid: {
    gap: Layout.spacing.s,
  },
  cheeseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Layout.borderRadius.medium,
    padding: Layout.spacing.m,
    gap: Layout.spacing.m,
  },
  cheeseImage: {
    width: 60,
    height: 60,
    borderRadius: Layout.borderRadius.small,
    backgroundColor: Colors.border,
  },
  cheeseInfo: {
    flex: 1,
    gap: 2,
  },
  cheeseName: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
  },
  cheeseSubtitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  cheeseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.s,
    marginTop: 4,
  },
  cheesePrice: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.primary,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stockText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodyMedium,
  },

  bottomSpacing: {
    height: Layout.spacing.xxl,
  },
});
