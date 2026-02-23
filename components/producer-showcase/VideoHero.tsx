import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ArrowLeft, BadgeCheck, MapPin, Factory, Share2 } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_HEIGHT * 0.45;

interface VideoHeroProps {
  name: string;
  country?: string;
  region?: string;
  tagline?: string;
  foundedYear?: number;
  imageUrl?: string;
  videoUrl?: string;
  logoUrl?: string;
  isVerified?: boolean;
  isVisible: boolean;
  onBack: () => void;
  onShare?: () => void;
}

export default function VideoHero({
  name,
  country,
  region,
  tagline,
  foundedYear,
  imageUrl,
  videoUrl,
  logoUrl,
  isVerified,
  isVisible,
  onBack,
  onShare,
}: VideoHeroProps) {
  const player = useVideoPlayer(videoUrl || null, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  // Pause/play based on visibility
  React.useEffect(() => {
    if (!player || !videoUrl) return;
    if (isVisible) {
      player.play();
    } else {
      player.pause();
    }
  }, [isVisible, player, videoUrl]);

  const locationText = [region, country].filter(Boolean).join(', ');

  return (
    <View style={styles.container}>
      {/* Background: Video or Image */}
      {videoUrl && player ? (
        <VideoView
          player={player}
          style={styles.backgroundMedia}
          nativeControls={false}
          contentFit="cover"
        />
      ) : (
        <Image
          source={{
            uri: imageUrl || 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?q=80&w=800',
          }}
          style={styles.backgroundMedia}
        />
      )}

      {/* Single full overlay — no edges, no seam lines */}
      <View style={styles.overlay} />

      {/* Top bar: Back + Share */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconButton} onPress={onBack}>
          <ArrowLeft size={22} color="#fff" />
        </TouchableOpacity>
        {onShare && (
          <TouchableOpacity style={styles.iconButton} onPress={onShare}>
            <Share2 size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Hero content at bottom */}
      <View style={styles.heroContent}>
        {/* Logo + badge row */}
        <View style={styles.badgeRow}>
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={styles.logoImage} resizeMode="contain" />
          ) : (
            <View style={styles.producerBadge}>
              <Factory size={14} color={Colors.background} />
              <Text style={styles.producerBadgeText}>Producer</Text>
            </View>
          )}
          {isVerified && (
            <View style={styles.verifiedBadge}>
              <BadgeCheck size={14} color="#fff" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>

        {/* Name */}
        <Text style={styles.heroTitle}>{name}</Text>

        {/* Tagline */}
        {tagline && <Text style={styles.tagline}>{tagline}</Text>}

        {/* Location + Founded */}
        <View style={styles.metaRow}>
          {locationText ? (
            <View style={styles.metaItem}>
              <MapPin size={14} color="rgba(255,255,255,0.85)" />
              <Text style={styles.metaText}>{locationText}</Text>
            </View>
          ) : null}
          {foundedYear && (
            <View style={styles.metaItem}>
              <Text style={styles.metaText}>Est. {foundedYear}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: HERO_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundMedia: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : Layout.spacing.m,
    left: Layout.spacing.m,
    right: Layout.spacing.m,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Layout.spacing.l,
    paddingBottom: Layout.spacing.xl + 20,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.s,
    marginBottom: Layout.spacing.m,
  },
  logoImage: {
    width: 48,
    height: 48,
    borderRadius: Layout.borderRadius.medium,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  producerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
    borderRadius: Layout.borderRadius.large,
  },
  producerBadgeText: {
    color: Colors.text,
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodySemiBold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(39, 174, 96, 0.85)',
    paddingHorizontal: Layout.spacing.s,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.borderRadius.large,
  },
  verifiedText: {
    color: '#fff',
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodySemiBold,
  },
  heroTitle: {
    fontSize: 36,
    fontFamily: Typography.fonts.heading,
    color: '#fff',
    marginBottom: Layout.spacing.xs,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  tagline: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: Layout.spacing.m,
    fontStyle: 'italic',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.m,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
