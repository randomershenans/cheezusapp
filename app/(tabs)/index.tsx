import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, TouchableOpacity, Image, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Search, TrendingUp, Clock, Star } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import SearchBar from '@/components/SearchBar';
import NearbyCheeseCard from '@/components/NearbyCheeseCard';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

type FeaturedEntry = {
  id: string;
  title: string;
  description: string;
  image_url: string;
  content_type: string;
  reading_time_minutes?: number;
};

type TrendingCheese = {
  id: string;
  name: string;
  type: string;
  origin_country: string;
  image_url: string;
};

export default function HomeScreen() {
  const router = useRouter();
  const [featuredEntries, setFeaturedEntries] = useState<FeaturedEntry[]>([]);
  const [trendingCheeses, setTrendingCheeses] = useState<TrendingCheese[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async () => {
    try {
      // Fetch featured entries
      const { data: entries } = await supabase
        .from('cheezopedia_entries')
        .select('id, title, description, image_url, content_type, reading_time_minutes')
        .eq('featured', true)
        .eq('visible_in_feed', true)
        .order('published_at', { ascending: false })
        .limit(3);

      // Fetch trending cheeses
      const { data: cheeses } = await supabase
        .from('cheeses')
        .select('id, name, type, origin_country, image_url')
        .order('created_at', { ascending: false })
        .limit(6);

      setFeaturedEntries(entries || []);
      setTrendingCheeses(cheeses || []);
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    router.push(`/discover?q=${encodeURIComponent(query)}`);
  };

  const handleFilter = () => {
    router.push('/discover');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Good morning</Text>
          <Text style={styles.title}>Discover amazing cheese</Text>
        </View>

        <SearchBar 
          placeholder="Search cheeses, recipes, articles..."
          onSearch={handleSearch}
          onFilter={handleFilter}
        />

        <NearbyCheeseCard />

        {featuredEntries.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured</Text>
              <TouchableOpacity onPress={() => router.push('/discover')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredContainer}
            >
              {featuredEntries.map((entry) => (
                <TouchableOpacity
                  key={entry.id}
                  style={styles.featuredCard}
                  onPress={() => router.push(`/cheezopedia/${entry.id}`)}
                >
                  <Image 
                    source={{ uri: entry.image_url }} 
                    style={styles.featuredImage}
                  />
                  <View style={styles.featuredContent}>
                    <View style={styles.featuredMeta}>
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeBadgeText}>
                          {entry.content_type.charAt(0).toUpperCase() + entry.content_type.slice(1)}
                        </Text>
                      </View>
                      {entry.reading_time_minutes && (
                        <View style={styles.timeContainer}>
                          <Clock size={12} color={Colors.subtleText} />
                          <Text style={styles.timeText}>{entry.reading_time_minutes} min</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.featuredTitle} numberOfLines={2}>
                      {entry.title}
                    </Text>
                    <Text style={styles.featuredDescription} numberOfLines={2}>
                      {entry.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {trendingCheeses.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <TrendingUp size={20} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Trending Cheeses</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/discover')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.cheeseGrid}>
              {trendingCheeses.map((cheese) => (
                <TouchableOpacity
                  key={cheese.id}
                  style={styles.cheeseCard}
                  onPress={() => router.push(`/cheese/${cheese.id}`)}
                >
                  <Image 
                    source={{ uri: cheese.image_url }} 
                    style={styles.cheeseImage}
                  />
                  <View style={styles.cheeseContent}>
                    <Text style={styles.cheeseName} numberOfLines={1}>
                      {cheese.name}
                    </Text>
                    <Text style={styles.cheeseType}>
                      {cheese.type} • {cheese.origin_country}
                    </Text>
                    <View style={styles.cheeseRating}>
                      <Star size={12} color="#FFD700" fill="#FFD700" />
                      <Text style={styles.ratingText}>4.8</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'web' ? Layout.spacing.m : 0,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: Layout.spacing.m,
    paddingBottom: Layout.spacing.s,
  },
  greeting: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginBottom: 4,
  },
  title: {
    fontSize: Typography.sizes['3xl'],
    fontFamily: Typography.fonts.heading,
    color: Colors.text,
    letterSpacing: Typography.letterSpacing.tight,
  },
  section: {
    marginTop: Layout.spacing.l,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.m,
    marginBottom: Layout.spacing.m,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.s,
  },
  sectionTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
  },
  seeAll: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.primary,
  },
  featuredContainer: {
    paddingHorizontal: Layout.spacing.m,
    gap: Layout.spacing.m,
  },
  featuredCard: {
    width: 280,
    backgroundColor: Colors.card,
    borderRadius: Layout.borderRadius.large,
    overflow: 'hidden',
    ...Layout.shadow.medium,
  },
  featuredImage: {
    width: '100%',
    height: 160,
    ...Platform.select({
      web: {
        objectFit: 'cover',
      },
    }),
  },
  featuredContent: {
    padding: Layout.spacing.m,
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.s,
    gap: Layout.spacing.s,
  },
  typeBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Layout.spacing.s,
    paddingVertical: 2,
    borderRadius: Layout.borderRadius.small,
  },
  typeBadgeText: {
    color: Colors.background,
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodyMedium,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  featuredTitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
    marginBottom: Layout.spacing.xs,
    lineHeight: Typography.sizes.base * Typography.lineHeights.tight,
  },
  featuredDescription: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    lineHeight: Typography.sizes.sm * Typography.lineHeights.normal,
  },
  cheeseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Layout.spacing.m,
    gap: Layout.spacing.m,
  },
  cheeseCard: {
    width: '47%',
    backgroundColor: Colors.card,
    borderRadius: Layout.borderRadius.medium,
    overflow: 'hidden',
    ...Layout.shadow.small,
  },
  cheeseImage: {
    width: '100%',
    height: 120,
    ...Platform.select({
      web: {
        objectFit: 'cover',
      },
    }),
  },
  cheeseContent: {
    padding: Layout.spacing.m,
  },
  cheeseName: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
    marginBottom: 4,
  },
  cheeseType: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginBottom: Layout.spacing.xs,
  },
  cheeseRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
  },
  bottomSpacing: {
    height: Layout.spacing.xl,
  },
});