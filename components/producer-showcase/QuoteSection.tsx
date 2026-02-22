import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { Quote } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

interface QuoteSectionProps {
  bodyText?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  backgroundColor?: string;
  author?: string;
  role?: string;
}

export default function QuoteSection({
  bodyText,
  mediaUrl,
  mediaType,
  backgroundColor,
  author,
  role,
}: QuoteSectionProps) {
  if (!bodyText) return null;

  const hasBackground = mediaUrl && mediaType === 'image';

  return (
    <View style={[styles.container, backgroundColor ? { backgroundColor } : null]}>
      {hasBackground && (
        <>
          <Image source={{ uri: mediaUrl }} style={styles.backgroundImage} />
          <View style={styles.backgroundOverlay} />
        </>
      )}
      <View style={styles.content}>
        <Quote size={32} color={hasBackground ? 'rgba(255,255,255,0.3)' : Colors.primaryLight} />
        <Text style={[styles.quoteText, hasBackground && styles.quoteTextLight]}>
          {bodyText}
        </Text>
        {(author || role) && (
          <View style={styles.attribution}>
            <View style={styles.attributionLine} />
            {author && (
              <Text style={[styles.authorName, hasBackground && styles.authorNameLight]}>
                {author}
              </Text>
            )}
            {role && (
              <Text style={[styles.authorRole, hasBackground && styles.authorRoleLight]}>
                {role}
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: Colors.backgroundSecondary,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  content: {
    padding: Layout.spacing.xl,
    paddingVertical: Layout.spacing.xxl,
    alignItems: 'center',
  },
  quoteText: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.heading,
    color: Colors.text,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: Typography.sizes.xl * 1.6,
    marginTop: Layout.spacing.m,
    paddingHorizontal: Layout.spacing.m,
  },
  quoteTextLight: {
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  attribution: {
    alignItems: 'center',
    marginTop: Layout.spacing.l,
  },
  attributionLine: {
    width: 40,
    height: 2,
    backgroundColor: Colors.primary,
    marginBottom: Layout.spacing.m,
  },
  authorName: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
  },
  authorNameLight: {
    color: '#fff',
  },
  authorRole: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginTop: 2,
  },
  authorRoleLight: {
    color: 'rgba(255,255,255,0.7)',
  },
});
