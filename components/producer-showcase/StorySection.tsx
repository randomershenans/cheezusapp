import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SECTION_HEIGHT = 400;

interface StorySectionProps {
  title?: string;
  subtitle?: string;
  bodyText?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  backgroundColor?: string;
  isVisible: boolean;
}

export default function StorySection({
  title,
  subtitle,
  bodyText,
  mediaUrl,
  mediaType,
  backgroundColor,
  isVisible,
}: StorySectionProps) {
  const hasMedia = !!mediaUrl;
  const isVideo = mediaType === 'video' && mediaUrl;

  const player = useVideoPlayer(isVideo ? mediaUrl : null, (p) => {
    p.loop = true;
    p.muted = true;
  });

  React.useEffect(() => {
    if (!player || !isVideo) return;
    if (isVisible) {
      player.play();
    } else {
      player.pause();
    }
  }, [isVisible, player, isVideo]);

  // Full-bleed media section with text overlay
  if (hasMedia) {
    return (
      <View style={[styles.mediaContainer, backgroundColor ? { backgroundColor } : null]}>
        {isVideo && player ? (
          <VideoView
            player={player}
            style={styles.media}
            nativeControls={false}
            contentFit="cover"
          />
        ) : (
          <Image source={{ uri: mediaUrl }} style={styles.media} />
        )}
        <View style={styles.mediaOverlay} />
        <View style={styles.mediaContent}>
          {subtitle && <Text style={styles.mediaSuperTitle}>{subtitle}</Text>}
          {title && <Text style={styles.mediaTitle}>{title}</Text>}
          {bodyText && <Text style={styles.mediaBody}>{bodyText}</Text>}
        </View>
      </View>
    );
  }

  // Text-only section
  return (
    <View style={[styles.textContainer, backgroundColor ? { backgroundColor } : null]}>
      {subtitle && <Text style={styles.textSuperTitle}>{subtitle}</Text>}
      {title && <Text style={styles.textTitle}>{title}</Text>}
      {bodyText && <Text style={styles.textBody}>{bodyText}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  // Full-bleed media variant
  mediaContainer: {
    height: SECTION_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
  },
  media: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SECTION_HEIGHT,
  },
  mediaOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  mediaContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Layout.spacing.l,
    paddingBottom: Layout.spacing.xl,
  },
  mediaSuperTitle: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: Layout.spacing.s,
  },
  mediaTitle: {
    fontSize: 28,
    fontFamily: Typography.fonts.heading,
    color: '#fff',
    marginBottom: Layout.spacing.m,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  mediaBody: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: Typography.sizes.base * 1.7,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Text-only variant
  textContainer: {
    padding: Layout.spacing.l,
    paddingVertical: Layout.spacing.xl,
    backgroundColor: Colors.background,
  },
  textSuperTitle: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: Layout.spacing.s,
  },
  textTitle: {
    fontSize: Typography.sizes['2xl'],
    fontFamily: Typography.fonts.heading,
    color: Colors.text,
    marginBottom: Layout.spacing.m,
  },
  textBody: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.textSecondary,
    lineHeight: Typography.sizes.base * 1.7,
  },
});
