import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

const { width: screenWidth } = Dimensions.get('window');

export type LinkedContent = {
  content_id: string;
  content_type: string;
  title: string;
  description?: string;
  image_url?: string;
  reading_time_minutes?: number;
  source_type: 'cheezopedia' | 'pairing';
};

type Props = {
  content: LinkedContent[];
  title?: string;
  maxDisplay?: number;
  totalCount?: number;
  onSeeMore?: () => void;
  cheeseId?: string;
};

export default function ContentTileGrid({ 
  content, 
  title = 'Recipes & Articles', 
  maxDisplay = 4,
  totalCount,
  onSeeMore,
  cheeseId,
}: Props) {
  const router = useRouter();

  if (!content || content.length === 0) return null;

  const displayContent = content.slice(0, maxDisplay);
  const hasMore = totalCount ? totalCount > maxDisplay : content.length > maxDisplay;

  const handleContentPress = (item: LinkedContent) => {
    if (item.source_type === 'pairing') {
      router.push(`/pairing/${item.content_id}`);
    } else {
      router.push(`/cheezopedia/${item.content_id}`);
    }
  };

  const handleSeeMore = () => {
    if (onSeeMore) {
      onSeeMore();
    } else if (cheeseId) {
      router.push(`/cheese-content/${cheeseId}`);
    }
  };

  const getContentTypeIcon = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'recipe':
        return '🍽️';
      case 'article':
        return '📚';
      case 'guide':
        return '📖';
      case 'food':
        return '🍯';
      case 'drink':
        return '🍷';
      default:
        return '📄';
    }
  };

  const getContentTypeLabel = (item: LinkedContent): string => {
    if (item.source_type === 'pairing') {
      return item.content_type === 'food' ? 'Food Pairing' : 'Drink Pairing';
    }
    return item.content_type.charAt(0).toUpperCase() + item.content_type.slice(1);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.grid}>
        {displayContent.map((item, index) => (
          <TouchableOpacity
            key={`${item.source_type}-${item.content_id}-${index}`}
            style={styles.tile}
            onPress={() => handleContentPress(item)}
          >
            <Image
              source={{
                uri: item.image_url || 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?q=80&w=400',
              }}
              style={styles.tileImage}
            />
            <View style={styles.tileOverlay} />
            <View style={styles.tileContent}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>
                  {getContentTypeIcon(item.content_type)} {getContentTypeLabel(item)}
                </Text>
              </View>
              <Text style={styles.contentTitle} numberOfLines={2}>
                {item.title}
              </Text>
              {item.reading_time_minutes && (
                <View style={styles.metaRow}>
                  <Clock size={12} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.metaText}>{item.reading_time_minutes} min read</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
      
      {hasMore && (
        <TouchableOpacity style={styles.seeMoreButton} onPress={handleSeeMore}>
          <Text style={styles.seeMoreText}>See more</Text>
          <ChevronRight size={18} color={Colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Layout.spacing.xl,
    paddingTop: Layout.spacing.l,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  sectionTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
    marginBottom: Layout.spacing.m,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.m,
  },
  tile: {
    width: (screenWidth - Layout.spacing.l * 2 - Layout.spacing.m) / 2,
    height: 160,
    borderRadius: Layout.borderRadius.medium,
    overflow: 'hidden',
    ...Layout.shadow.small,
  },
  tileImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    backgroundColor: Colors.lightGray,
    ...Platform.select({
      web: { objectFit: 'cover' },
    }),
  },
  tileOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  tileContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Layout.spacing.m,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: Layout.spacing.s,
    paddingVertical: 3,
    borderRadius: Layout.borderRadius.small,
    marginBottom: Layout.spacing.xs,
  },
  typeBadgeText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
  },
  contentTitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.background,
    lineHeight: Typography.sizes.sm * 1.3,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  metaText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  seeMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Layout.spacing.m,
    marginTop: Layout.spacing.m,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Layout.borderRadius.medium,
    gap: 4,
  },
  seeMoreText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.primary,
  },
});
