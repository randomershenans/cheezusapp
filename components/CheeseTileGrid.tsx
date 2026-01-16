import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

export type LinkedCheese = {
  link_id?: string;
  cheese_type_id?: string;
  cheese_type_name?: string;
  cheese_type_category?: string;
  producer_cheese_id?: string;
  producer_cheese_name?: string;
  producer_name?: string;
  image_url?: string;
  origin_country?: string;
  avg_rating?: number;
};

type Props = {
  cheeses: LinkedCheese[];
  title?: string;
  maxDisplay?: number;
};

export default function CheeseTileGrid({ cheeses, title = 'Featured Cheeses', maxDisplay = 6 }: Props) {
  const router = useRouter();

  if (!cheeses || cheeses.length === 0) return null;

  const displayCheeses = cheeses.slice(0, maxDisplay);

  const handleCheesePress = (cheese: LinkedCheese) => {
    if (cheese.producer_cheese_id) {
      router.push(`/producer-cheese/${cheese.producer_cheese_id}`);
    } else if (cheese.cheese_type_id) {
      router.push(`/cheese/${cheese.cheese_type_id}`);
    }
  };

  const getDisplayName = (cheese: LinkedCheese): string => {
    // If it's a "Generic" producer cheese, just show the cheese type name
    if (cheese.producer_name?.toLowerCase() === 'generic' && cheese.cheese_type_name) {
      return cheese.cheese_type_name;
    }
    // If producer cheese name starts with "Generic ", strip it
    if (cheese.producer_cheese_name?.toLowerCase().startsWith('generic ')) {
      return cheese.producer_cheese_name.substring(8);
    }
    if (cheese.producer_cheese_name) {
      return cheese.producer_cheese_name;
    }
    return cheese.cheese_type_name || 'Unknown Cheese';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.grid}>
        {displayCheeses.map((cheese, index) => (
          <TouchableOpacity
            key={cheese.link_id || cheese.producer_cheese_id || cheese.cheese_type_id || index}
            style={styles.tile}
            onPress={() => handleCheesePress(cheese)}
          >
            <Image
              source={{
                uri: cheese.image_url || 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?q=80&w=400',
              }}
              style={styles.tileImage}
            />
            <View style={styles.tileOverlay}>
              <Text style={styles.cheeseName} numberOfLines={2}>
                {getDisplayName(cheese)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
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
    gap: Layout.spacing.s,
  },
  tile: {
    width: '48%',
    height: 120,
    borderRadius: Layout.borderRadius.medium,
    overflow: 'hidden',
    ...Layout.shadow.medium,
  },
  tileImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    ...Platform.select({
      web: {
        objectFit: 'cover',
      },
    }),
  },
  tileOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
    padding: Layout.spacing.m,
  },
  cheeseName: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.background,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
