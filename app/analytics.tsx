import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ArrowLeft, TrendingUp, Globe, Milk, Target, Award, Sparkles } from 'lucide-react-native';
import Svg, { Polygon, Circle, Line, Text as SvgText } from 'react-native-svg';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

type CheeseEntry = {
  id: string;
  rating?: number;
  created_at: string;
  cheese: {
    id: string;
    name: string;
    type: string;
    origin_country: string;
    flavors?: { flavor: string }[];
  };
};

type FilterMode = 'frequency' | 'rating';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Custom Spider Chart Component
const SpiderChart = ({ data, size = 280 }: { data: { flavor: string; count: number }[]; size?: number }) => {
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.35;
  const levels = 5;
  
  // Calculate max value for scaling
  const maxValue = Math.max(...data.map(d => d.count), 1);
  
  // Generate points for the data polygon
  const dataPoints = data.map((d, i) => {
    const angle = (Math.PI * 2 * i) / data.length - Math.PI / 2;
    const value = d.count / maxValue;
    const r = radius * value;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle),
      label: d.flavor,
      labelX: centerX + (radius + 30) * Math.cos(angle),
      labelY: centerY + (radius + 30) * Math.sin(angle),
    };
  });
  
  const dataPolygonPoints = dataPoints.map(p => `${p.x},${p.y}`).join(' ');
  
  return (
    <Svg width={size} height={size}>
      {/* Background grid circles */}
      {Array.from({ length: levels }).map((_, i) => {
        const r = (radius * (i + 1)) / levels;
        return (
          <Circle
            key={`circle-${i}`}
            cx={centerX}
            cy={centerY}
            r={r}
            fill="none"
            stroke="#E0E0E0"
            strokeWidth="1"
          />
        );
      })}
      
      {/* Axis lines */}
      {dataPoints.map((point, i) => (
        <Line
          key={`axis-${i}`}
          x1={centerX}
          y1={centerY}
          x2={centerX + radius * Math.cos((Math.PI * 2 * i) / data.length - Math.PI / 2)}
          y2={centerY + radius * Math.sin((Math.PI * 2 * i) / data.length - Math.PI / 2)}
          stroke="#E0E0E0"
          strokeWidth="1"
        />
      ))}
      
      {/* Data polygon */}
      <Polygon
        points={dataPolygonPoints}
        fill={Colors.primary}
        fillOpacity="0.3"
        stroke={Colors.primary}
        strokeWidth="2"
      />
      
      {/* Data points */}
      {dataPoints.map((point, i) => (
        <Circle
          key={`point-${i}`}
          cx={point.x}
          cy={point.y}
          r="4"
          fill={Colors.primary}
        />
      ))}
      
      {/* Labels */}
      {dataPoints.map((point, i) => (
        <SvgText
          key={`label-${i}`}
          x={point.labelX}
          y={point.labelY}
          fill={Colors.text}
          fontSize="12"
          fontWeight="500"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          {point.label}
        </SvgText>
      ))}
    </Svg>
  );
};

export default function AnalyticsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [entries, setEntries] = useState<CheeseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<FilterMode>('frequency');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('cheese_box_entries')
        .select(`
          id,
          rating,
          created_at,
          cheese:cheeses (
            id,
            name,
            type,
            origin_country,
            flavors:cheese_flavors(flavor)
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate country stats
  const getCountryStats = () => {
    const countryCounts: Record<string, { count: number; avgRating: number; ratings: number[] }> = {};
    
    entries.forEach(entry => {
      const country = entry.cheese.origin_country;
      if (!countryCounts[country]) {
        countryCounts[country] = { count: 0, avgRating: 0, ratings: [] };
      }
      countryCounts[country].count += 1;
      if (entry.rating) {
        countryCounts[country].ratings.push(entry.rating);
      }
    });

    // Calculate average ratings
    Object.keys(countryCounts).forEach(country => {
      const ratings = countryCounts[country].ratings;
      countryCounts[country].avgRating = ratings.length > 0 
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
        : 0;
    });

    const sorted = Object.entries(countryCounts)
      .map(([country, data]) => ({ country, ...data }))
      .sort((a, b) => 
        filterMode === 'frequency' 
          ? b.count - a.count 
          : b.avgRating - a.avgRating
      );

    return sorted.slice(0, 5);
  };

  // Calculate cheese type stats
  const getTypeStats = () => {
    const typeCounts: Record<string, { count: number; avgRating: number; ratings: number[] }> = {};
    
    entries.forEach(entry => {
      const type = entry.cheese.type;
      if (!typeCounts[type]) {
        typeCounts[type] = { count: 0, avgRating: 0, ratings: [] };
      }
      typeCounts[type].count += 1;
      if (entry.rating) {
        typeCounts[type].ratings.push(entry.rating);
      }
    });

    // Calculate average ratings
    Object.keys(typeCounts).forEach(type => {
      const ratings = typeCounts[type].ratings;
      typeCounts[type].avgRating = ratings.length > 0 
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
        : 0;
    });

    const sorted = Object.entries(typeCounts)
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => 
        filterMode === 'frequency' 
          ? b.count - a.count 
          : b.avgRating - a.avgRating
      );

    return sorted;
  };

  // Calculate top flavors for list view
  const getTopFlavors = () => {
    const flavorCounts: Record<string, number> = {};
    
    entries.forEach(entry => {
      const flavors = entry.cheese.flavors || [];
      flavors.forEach(f => {
        flavorCounts[f.flavor] = (flavorCounts[f.flavor] || 0) + 1;
      });
    });

    const sorted = Object.entries(flavorCounts)
      .map(([flavor, count]) => ({ flavor, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return sorted;
  };

  // Calculate flavor profile data for radar chart
  const getFlavorProfileData = () => {
    const flavorCounts: Record<string, number> = {};
    
    entries.forEach(entry => {
      const flavors = entry.cheese.flavors || [];
      flavors.forEach(f => {
        flavorCounts[f.flavor] = (flavorCounts[f.flavor] || 0) + 1;
      });
    });

    const sorted = Object.entries(flavorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6); // Top 6 flavors for the radar chart

    // Pad with default flavors if less than 6
    const defaultFlavors = ['Creamy', 'Nutty', 'Sharp', 'Mild', 'Tangy', 'Earthy'];
    while (sorted.length < 6) {
      const nextFlavor = defaultFlavors[sorted.length];
      sorted.push([nextFlavor, 0]);
    }

    return sorted.map(([flavor, count]) => ({
      flavor,
      count,
      angle: 360 / sorted.length,
    }));
  };

  // Calculate additional stats
  const getAdvancedStats = () => {
    const uniqueCountries = new Set(entries.map(e => e.cheese.origin_country)).size;
    const uniqueTypes = new Set(entries.map(e => e.cheese.type)).size;
    const ratedEntries = entries.filter(e => e.rating);
    const avgRating = ratedEntries.length > 0
      ? ratedEntries.reduce((sum, e) => sum + (e.rating || 0), 0) / ratedEntries.length
      : 0;
    const topRated = entries
      .filter(e => e.rating)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 3);

    return {
      uniqueCountries,
      uniqueTypes,
      avgRating,
      topRated,
      totalRated: ratedEntries.length,
    };
  };

  const countryStats = getCountryStats();
  const typeStats = getTypeStats();
  const topFlavors = getTopFlavors();
  const flavorProfile = getFlavorProfileData();
  const advancedStats = getAdvancedStats();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Crunching the numbers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Elite Analytics</Text>
          <Text style={styles.subtitle}>For the cheese nerds 🧀🤓</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Filter Toggle */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterMode === 'frequency' && styles.filterButtonActive
            ]}
            onPress={() => setFilterMode('frequency')}
          >
            <Text style={[
              styles.filterButtonText,
              filterMode === 'frequency' && styles.filterButtonTextActive
            ]}>
              Most Eaten
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterMode === 'rating' && styles.filterButtonActive
            ]}
            onPress={() => setFilterMode('rating')}
          >
            <Text style={[
              styles.filterButtonText,
              filterMode === 'rating' && styles.filterButtonTextActive
            ]}>
              Top Rated
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Stats Cards */}
        <View style={styles.quickStatsContainer}>
          <View style={styles.quickStatCard}>
            <Globe size={20} color={Colors.primary} />
            <Text style={styles.quickStatNumber}>{advancedStats.uniqueCountries}</Text>
            <Text style={styles.quickStatLabel}>Countries</Text>
          </View>
          <View style={styles.quickStatCard}>
            <Milk size={20} color="#8B4513" />
            <Text style={styles.quickStatNumber}>{advancedStats.uniqueTypes}</Text>
            <Text style={styles.quickStatLabel}>Types</Text>
          </View>
          <View style={styles.quickStatCard}>
            <Target size={20} color="#FFD700" />
            <Text style={styles.quickStatNumber}>{advancedStats.avgRating.toFixed(1)}</Text>
            <Text style={styles.quickStatLabel}>Avg Rating</Text>
          </View>
        </View>

        {/* Country Breakdown */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Globe size={20} color={Colors.text} />
            <Text style={styles.sectionTitle}>Top Countries</Text>
          </View>
          <View style={styles.sectionCard}>
            {countryStats.map((stat, index) => (
              <View key={stat.country} style={styles.statRow}>
                <View style={styles.statRowLeft}>
                  <Text style={styles.statRank}>#{index + 1}</Text>
                  <Text style={styles.statName}>{stat.country}</Text>
                </View>
                <View style={styles.statRowRight}>
                  <View style={[styles.statBar, { width: `${(stat.count / entries.length) * 100}%` }]} />
                  <Text style={styles.statValue}>
                    {filterMode === 'frequency' ? `${stat.count} cheeses` : `${stat.avgRating.toFixed(1)}★`}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Cheese Type Breakdown */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Award size={20} color={Colors.text} />
            <Text style={styles.sectionTitle}>Cheese Types</Text>
          </View>
          <View style={styles.sectionCard}>
            {typeStats.map((stat, index) => (
              <View key={stat.type} style={styles.statRow}>
                <View style={styles.statRowLeft}>
                  <Text style={styles.statRank}>#{index + 1}</Text>
                  <Text style={styles.statName}>{stat.type}</Text>
                </View>
                <View style={styles.statRowRight}>
                  <View style={[styles.statBar, { width: `${(stat.count / entries.length) * 100}%` }]} />
                  <Text style={styles.statValue}>
                    {filterMode === 'frequency' ? `${stat.count}` : `${stat.avgRating.toFixed(1)}★`}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Top Flavors Breakdown */}
        {topFlavors.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Sparkles size={20} color={Colors.text} />
              <Text style={styles.sectionTitle}>Top Flavors</Text>
            </View>
            <View style={styles.sectionCard}>
              <View style={styles.flavorTagsContainer}>
                {topFlavors.map((stat, index) => (
                  <View key={stat.flavor} style={styles.flavorTag}>
                    <Text style={styles.flavorTagText}>{stat.flavor}</Text>
                    <View style={styles.flavorTagBadge}>
                      <Text style={styles.flavorTagCount}>{stat.count}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Flavor Profile Radar Chart */}
        {flavorProfile.some(f => f.count > 0) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Sparkles size={20} color={Colors.text} />
              <Text style={styles.sectionTitle}>Flavor Profile</Text>
            </View>
            <View style={styles.chartCard}>
              <SpiderChart data={flavorProfile} size={Math.min(SCREEN_WIDTH - 80, 320)} />
            </View>
          </View>
        )}

        {/* Top Rated Cheeses */}
        {advancedStats.topRated.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <TrendingUp size={20} color={Colors.text} />
              <Text style={styles.sectionTitle}>Your Top Rated</Text>
            </View>
            <View style={styles.sectionCard}>
              {advancedStats.topRated.map((entry, index) => (
                <View key={entry.id} style={styles.topRatedRow}>
                  <Text style={styles.topRatedRank}>#{index + 1}</Text>
                  <View style={styles.topRatedInfo}>
                    <Text style={styles.topRatedName}>{entry.cheese.name}</Text>
                    <Text style={styles.topRatedType}>{entry.cheese.type} • {entry.cheese.origin_country}</Text>
                  </View>
                  <View style={styles.topRatedRating}>
                    <Text style={styles.topRatedRatingText}>{entry.rating}</Text>
                    <Text style={styles.topRatedRatingStar}>★</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Nerd Stats */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.nerdEmoji}>🤓</Text>
            <Text style={styles.sectionTitle}>Nerd Stats</Text>
          </View>
          <View style={styles.nerdStatsCard}>
            <View style={styles.nerdStatRow}>
              <Text style={styles.nerdStatLabel}>Cheese Diversity Index</Text>
              <Text style={styles.nerdStatValue}>
                {((advancedStats.uniqueTypes / 6) * 100).toFixed(0)}%
              </Text>
            </View>
            <View style={styles.nerdStatRow}>
              <Text style={styles.nerdStatLabel}>Geographic Coverage</Text>
              <Text style={styles.nerdStatValue}>{advancedStats.uniqueCountries} countries</Text>
            </View>
            <View style={styles.nerdStatRow}>
              <Text style={styles.nerdStatLabel}>Rating Completion</Text>
              <Text style={styles.nerdStatValue}>
                {((advancedStats.totalRated / entries.length) * 100).toFixed(0)}%
              </Text>
            </View>
            <View style={styles.nerdStatRow}>
              <Text style={styles.nerdStatLabel}>Total Tastings</Text>
              <Text style={styles.nerdStatValue}>{entries.length}</Text>
            </View>
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
    paddingTop: Platform.OS === 'web' ? Layout.spacing.m : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backButton: {
    padding: Layout.spacing.s,
    marginRight: Layout.spacing.m,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: Typography.sizes['2xl'],
    fontFamily: Typography.fonts.heading,
    color: Colors.text,
    letterSpacing: Typography.letterSpacing.tight,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  filterContainer: {
    flexDirection: 'row',
    marginHorizontal: Layout.spacing.m,
    marginTop: Layout.spacing.m,
    marginBottom: Layout.spacing.l,
    backgroundColor: '#F5F5F5',
    borderRadius: Layout.borderRadius.large,
    padding: 4,
  },
  filterButton: {
    flex: 1,
    paddingVertical: Layout.spacing.s,
    alignItems: 'center',
    borderRadius: Layout.borderRadius.medium,
  },
  filterButtonActive: {
    backgroundColor: Colors.background,
    ...Layout.shadow.small,
  },
  filterButtonText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.subtleText,
  },
  filterButtonTextActive: {
    color: Colors.text,
  },
  quickStatsContainer: {
    flexDirection: 'row',
    marginHorizontal: Layout.spacing.m,
    marginBottom: Layout.spacing.l,
    gap: Layout.spacing.m,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: Colors.card,
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    alignItems: 'center',
    ...Layout.shadow.small,
  },
  quickStatNumber: {
    fontSize: Typography.sizes['2xl'],
    fontFamily: Typography.fonts.display,
    color: Colors.text,
    marginVertical: 4,
  },
  quickStatLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  section: {
    marginBottom: Layout.spacing.l,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.s,
    marginHorizontal: Layout.spacing.m,
    marginBottom: Layout.spacing.m,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    marginHorizontal: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    padding: Layout.spacing.m,
    ...Layout.shadow.small,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Layout.spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  statRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.m,
    flex: 1,
  },
  statRank: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.primary,
    width: 30,
  },
  statName: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
    flex: 1,
  },
  statRowRight: {
    alignItems: 'flex-end',
    minWidth: 100,
  },
  statBar: {
    height: 4,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    marginBottom: 4,
    minWidth: 20,
  },
  statValue: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.subtleText,
  },
  flavorTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.s,
  },
  flavorTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0DB',
    paddingVertical: Layout.spacing.xs,
    paddingLeft: Layout.spacing.m,
    paddingRight: Layout.spacing.xs,
    borderRadius: Layout.borderRadius.large,
    gap: Layout.spacing.xs,
  },
  flavorTagText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.primary,
  },
  flavorTagBadge: {
    backgroundColor: Colors.primary,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  flavorTagCount: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.background,
  },
  chartCard: {
    backgroundColor: Colors.card,
    marginHorizontal: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    padding: Layout.spacing.m,
    alignItems: 'center',
    ...Layout.shadow.small,
  },
  topRatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Layout.spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  topRatedRank: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.display,
    color: Colors.primary,
    width: 40,
  },
  topRatedInfo: {
    flex: 1,
  },
  topRatedName: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
  },
  topRatedType: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginTop: 2,
  },
  topRatedRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  topRatedRatingText: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.display,
    color: Colors.text,
  },
  topRatedRatingStar: {
    fontSize: Typography.sizes.lg,
    color: '#FFD700',
  },
  nerdEmoji: {
    fontSize: 20,
  },
  nerdStatsCard: {
    backgroundColor: Colors.card,
    marginHorizontal: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: Layout.spacing.m,
    ...Layout.shadow.small,
  },
  nerdStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Layout.spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  nerdStatLabel: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
  },
  nerdStatValue: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  bottomSpacing: {
    height: 40,
  },
});
