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
  Calendar,
  Clock,
  Globe,
  Ticket,
  Users,
  ChevronRight,
  ExternalLink,
  Share2,
} from 'lucide-react-native';

import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

const { width: screenWidth } = Dimensions.get('window');

type EventDetail = {
  id: string;
  partner_id: string | null;
  title: string;
  description: string | null;
  event_type: string | null;
  image_url: string | null;
  location_name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  ticket_url: string | null;
  price_info: string | null;
  price: string | null;
  price_type: string | null;
  status: string | null;
  location_type: string | null;
  venue_name: string | null;
  city: string | null;
  country: string | null;
  online_url: string | null;
  max_attendees: number | null;
  registration_url: string | null;
  created_at: string | null;
};

type Partner = {
  id: string;
  name: string;
  logo_url: string | null;
};

export default function EventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  useEffect(() => {
    if (id) {
      fetchEventDetails();
    }
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setEvent(data);

      if (data?.partner_id) {
        fetchPartner(data.partner_id);
      }
    } catch (error) {
      console.error('Error fetching event:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPartner = async (partnerId: string) => {
    try {
      const { data } = await supabase
        .from('partners')
        .select('id, name, logo_url')
        .eq('id', partnerId)
        .single();

      if (data) setPartner(data);
    } catch (error) {
      // Partner table might not exist or partner not found - that's ok
      console.log('Could not fetch partner:', error);
    }
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string | null): string => {
    if (!timeStr) return '';
    return timeStr;
  };

  const getEventTypeLabel = (type: string | null): string => {
    if (!type) return 'Event';
    switch (type.toLowerCase()) {
      case 'tasting': return 'Tasting';
      case 'market': return 'Market';
      case 'festival': return 'Festival';
      case 'workshop': return 'Workshop';
      case 'pairing': return 'Pairing Event';
      case 'tour': return 'Tour';
      case 'class': return 'Class';
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const getEventStatus = (): { label: string; color: string; bgColor: string } => {
    if (!event) return { label: 'Unknown', color: Colors.subtleText, bgColor: Colors.backgroundSecondary };

    const now = new Date();
    const startDate = event.start_date ? new Date(event.start_date) : null;
    const endDate = event.end_date ? new Date(event.end_date) : null;

    if (event.status === 'cancelled') {
      return { label: 'Cancelled', color: '#C62828', bgColor: '#FFEBEE' };
    }
    if (endDate && now > endDate) {
      return { label: 'Past Event', color: Colors.subtleText, bgColor: Colors.backgroundSecondary };
    }
    if (startDate && now >= startDate && (!endDate || now <= endDate)) {
      return { label: 'Happening Now', color: '#2E7D32', bgColor: '#E8F5E9' };
    }
    if (startDate && now < startDate) {
      return { label: 'Upcoming', color: '#E65100', bgColor: '#FFF3E0' };
    }
    return { label: 'Event', color: Colors.subtleText, bgColor: Colors.backgroundSecondary };
  };

  const getPriceDisplay = (): string => {
    if (event?.price_type === 'free' || event?.price === 'free' || event?.price === '0') return 'Free';
    if (event?.price_info) return event.price_info;
    if (event?.price) return event.price;
    return 'Check event for details';
  };

  const getLocationDisplay = (): string => {
    const parts = [
      event?.venue_name || event?.location_name,
      event?.address,
      event?.city,
      event?.country,
    ].filter(Boolean);
    return parts.join(', ');
  };

  const handleOpenMaps = () => {
    if (event?.latitude && event?.longitude) {
      const url = Platform.select({
        ios: `maps:?q=${event.latitude},${event.longitude}`,
        android: `geo:${event.latitude},${event.longitude}`,
        default: `https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`,
      });
      Linking.openURL(url as string);
    } else if (event?.address) {
      const address = encodeURIComponent(getLocationDisplay());
      const url = Platform.select({
        ios: `maps:?q=${address}`,
        android: `geo:0,0?q=${address}`,
        default: `https://www.google.com/maps/search/?api=1&query=${address}`,
      });
      Linking.openURL(url as string);
    }
  };

  const handleOpenTickets = () => {
    const url = event?.ticket_url || event?.registration_url;
    if (url) {
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      Linking.openURL(fullUrl);
    }
  };

  const handleOpenOnline = () => {
    if (event?.online_url) {
      const url = event.online_url.startsWith('http') ? event.online_url : `https://${event.online_url}`;
      Linking.openURL(url);
    }
  };

  const handleShare = async () => {
    // Basic share - can be enhanced with expo-sharing later
    if (event?.title) {
      const url = event.ticket_url || event.registration_url || '';
      const text = `Check out ${event.title}${url ? ` - ${url}` : ''}`;
      try {
        await Linking.openURL(`sms:?body=${encodeURIComponent(text)}`);
      } catch {
        // Fallback - do nothing
      }
    }
  };

  const handleShowOnMap = () => {
    if (!event?.latitude || !event?.longitude) return;
    router.push({
      pathname: '/(tabs)/discover',
      params: {
        viewMode: 'map',
        lat: event.latitude.toString(),
        lng: event.longitude.toString(),
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading event...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Event not found</Text>
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

  const eventStatus = getEventStatus();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroContainer}>
          <Image
            source={{
              uri: event.image_url || 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=800',
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

          {/* Share Button */}
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Share2 size={20} color={Colors.background} />
          </TouchableOpacity>

          {/* Hero Content */}
          <View style={styles.heroContent}>
            <View style={styles.badgeRow}>
              <View style={styles.eventTypeBadge}>
                <Text style={styles.eventTypeBadgeText}>{getEventTypeLabel(event.event_type)}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: eventStatus.bgColor }]}>
                <Text style={[styles.statusBadgeText, { color: eventStatus.color }]}>{eventStatus.label}</Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>{event.title}</Text>

            {(event.city || event.country) && (
              <View style={styles.locationRow}>
                <MapPin size={18} color="rgba(255, 255, 255, 0.9)" />
                <Text style={styles.locationText}>
                  {event.venue_name || event.location_name
                    ? `${event.venue_name || event.location_name}, `
                    : ''}
                  {event.city && `${event.city}`}
                  {event.city && event.country && ', '}
                  {event.country}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick Info Bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Calendar size={18} color={Colors.primary} />
            <Text style={styles.statLabel} numberOfLines={1}>
              {event.start_date ? formatDate(event.start_date) : 'TBA'}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Clock size={18} color={Colors.primary} />
            <Text style={styles.statLabel} numberOfLines={1}>
              {event.start_time
                ? `${formatTime(event.start_time)}${event.end_time ? ` - ${formatTime(event.end_time)}` : ''}`
                : 'Time TBA'}
            </Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          {/* Price & Tickets */}
          <View style={styles.priceSection}>
            <View style={styles.priceInfo}>
              <Text style={styles.priceLabel}>Price</Text>
              <Text style={styles.priceValue}>{getPriceDisplay()}</Text>
            </View>
            {(event.ticket_url || event.registration_url) && (
              <TouchableOpacity style={styles.ticketButton} onPress={handleOpenTickets}>
                <Ticket size={18} color={Colors.background} />
                <Text style={styles.ticketButtonText}>
                  {event.ticket_url ? 'Get Tickets' : 'Register'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* About Section */}
          {event.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text
                style={styles.description}
                numberOfLines={descriptionExpanded ? undefined : 6}
              >
                {event.description}
              </Text>
              {event.description.length > 300 && (
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

          {/* Location Section */}
          {(event.address || event.venue_name || event.location_name || event.city) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location</Text>
              <View style={styles.detailCard}>
                <TouchableOpacity style={styles.detailRow} onPress={handleOpenMaps}>
                  <View style={styles.detailIconContainer}>
                    <MapPin size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.detailInfo}>
                    <Text style={styles.detailLabel}>
                      {event.location_type === 'online' ? 'Online Event' : 'Venue'}
                    </Text>
                    <Text style={styles.detailValue}>{getLocationDisplay()}</Text>
                  </View>
                  <ChevronRight size={18} color={Colors.subtleText} />
                </TouchableOpacity>

                {event.latitude && event.longitude && (
                  <TouchableOpacity style={styles.mapButton} onPress={handleShowOnMap}>
                    <MapPin size={16} color={Colors.background} />
                    <Text style={styles.mapButtonText}>Show on Map</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Online Link */}
          {event.online_url && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Online Access</Text>
              <TouchableOpacity style={styles.linkCard} onPress={handleOpenOnline}>
                <View style={styles.detailIconContainer}>
                  <Globe size={20} color={Colors.primary} />
                </View>
                <View style={styles.detailInfo}>
                  <Text style={styles.detailLabel}>Join Online</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>
                    {event.online_url.replace(/^https?:\/\//, '')}
                  </Text>
                </View>
                <ExternalLink size={18} color={Colors.subtleText} />
              </TouchableOpacity>
            </View>
          )}

          {/* Capacity */}
          {event.max_attendees && (
            <View style={styles.section}>
              <View style={styles.capacityCard}>
                <Users size={20} color={Colors.primary} />
                <Text style={styles.capacityText}>
                  Limited to {event.max_attendees} attendees
                </Text>
              </View>
            </View>
          )}

          {/* Organizer */}
          {partner && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Organizer</Text>
              <View style={styles.organizerCard}>
                {partner.logo_url ? (
                  <Image source={{ uri: partner.logo_url }} style={styles.organizerLogo} />
                ) : (
                  <View style={styles.organizerLogoPlaceholder}>
                    <Text style={styles.organizerLogoText}>
                      {partner.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.organizerName}>{partner.name}</Text>
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
      web: { objectFit: 'cover' as any },
    }),
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
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
  shareButton: {
    position: 'absolute',
    top: Layout.spacing.m,
    right: Layout.spacing.m,
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
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.s,
    marginBottom: Layout.spacing.m,
  },
  eventTypeBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
    borderRadius: Layout.borderRadius.large,
  },
  eventTypeBadgeText: {
    color: Colors.background,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
  },
  statusBadge: {
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
    borderRadius: Layout.borderRadius.large,
  },
  statusBadgeText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
  },
  heroTitle: {
    fontSize: Typography.sizes['3xl'],
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
    flex: 1,
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
    flexShrink: 1,
  },

  // Content
  contentContainer: {
    padding: Layout.spacing.m,
    paddingTop: Layout.spacing.l,
  },

  // Price Section
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.backgroundSecondary,
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    marginBottom: Layout.spacing.l,
  },
  priceInfo: {
    flex: 1,
  },
  priceLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceValue: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
    marginTop: 2,
  },
  ticketButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.s,
    backgroundColor: Colors.primary,
    paddingHorizontal: Layout.spacing.l,
    paddingVertical: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
  },
  ticketButtonText: {
    color: Colors.background,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
  },

  // Sections
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

  // Detail Cards
  detailCard: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Layout.borderRadius.medium,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Layout.spacing.m,
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
    marginTop: 2,
  },

  // Map Button
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Layout.spacing.s,
    backgroundColor: Colors.primary,
    paddingVertical: Layout.spacing.m,
    margin: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
  },
  mapButtonText: {
    color: Colors.background,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
  },

  // Link Card
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
  },

  // Capacity
  capacityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.m,
    backgroundColor: Colors.backgroundSecondary,
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
  },
  capacityText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
  },

  // Organizer
  organizerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.m,
    backgroundColor: Colors.backgroundSecondary,
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
  },
  organizerLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.border,
  },
  organizerLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  organizerLogoText: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.background,
  },
  organizerName: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
  },

  bottomSpacing: {
    height: Layout.spacing.xxl,
  },
});
