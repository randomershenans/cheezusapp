import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Trophy } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Layout from '@/constants/Layout';
import BadgeProgressCard from '@/components/BadgeProgressCard';

// Types for badge data
interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  threshold: number;
  progress: number;
  completed: boolean;
}

export default function BadgeScreen() {
  const router = useRouter();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalBadges: 0,
    earnedBadges: 0,
    percentComplete: 0,
  });

  // Fetch badges and user progress
  const fetchBadges = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.replace('/sign-in');
        return;
      }
      
      // Get all badges with user progress
      const { data, error } = await supabase
        .rpc('get_user_badges_with_progress', { user_id: user.id });
      
      if (error) {
        console.error('Error fetching badges:', error);
        return;
      }
      
      if (data) {
        setBadges(data);
        
        // Calculate stats
        const earned = data.filter(badge => badge.completed).length;
        setStats({
          totalBadges: data.length,
          earnedBadges: earned,
          percentComplete: data.length > 0 ? Math.round((earned / data.length) * 100) : 0,
        });
      }
    } catch (error) {
      console.error('Error in badge fetching:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Initial load and refresh handler
  useEffect(() => {
    fetchBadges();
  }, []);
  
  const onRefresh = () => {
    setRefreshing(true);
    fetchBadges();
  };
  
  // Group badges by category for section headers
  const groupedBadges = badges.reduce((acc, badge) => {
    const category = badge.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(badge);
    return acc;
  }, {} as Record<string, Badge[]>);
  
  // Format category names for display
  const formatCategory = (category: string) => {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Show badge details (placeholder for future implementation)
  const handleBadgePress = (badge: Badge) => {
    // Could navigate to a detail screen or show a modal with details
    console.log('Badge pressed:', badge.name);
  };
  
  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your badges...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header with stats */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Badges</Text>
          <Text style={styles.subtitle}>
            Track your cheese journey achievements
          </Text>
        </View>
      </View>
      
      {/* Progress summary */}
      <View style={styles.summaryCard}>
        <Trophy size={40} color={Colors.primary} />
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>
            {stats.earnedBadges} of {stats.totalBadges} badges earned
          </Text>
          <View style={styles.progressBarContainer}>
            <View 
              style={[
                styles.progressBar, 
                { width: `${stats.percentComplete}%` }
              ]} 
            />
          </View>
          <Text style={styles.statsSubtitle}>
            {stats.percentComplete}% Complete
          </Text>
        </View>
      </View>
      
      {/* Badge list */}
      <FlatList
        data={Object.entries(groupedBadges)}
        keyExtractor={([category]) => category}
        renderItem={({ item: [category, categoryBadges] }) => (
          <View style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{formatCategory(category)}</Text>
            {categoryBadges
              .sort((a, b) => {
                // Show completed badges last
                if (a.completed && !b.completed) return 1;
                if (!a.completed && b.completed) return -1;
                // Otherwise sort by progress percentage
                const aPercent = a.progress / a.threshold;
                const bPercent = b.progress / b.threshold;
                return bPercent - aPercent;
              })
              .map(badge => (
                <BadgeProgressCard
                  key={badge.id}
                  icon={badge.icon}
                  name={badge.name}
                  description={badge.description}
                  progress={badge.progress}
                  threshold={badge.threshold}
                  completed={badge.completed}
                  onPress={() => handleBadgePress(badge)}
                />
              ))}
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.m,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: Typography.fonts.heading,
    fontSize: Typography.sizes['3xl'],
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: Typography.fonts.body,
    fontSize: Typography.sizes.base,
    color: Colors.subtleText,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: '4%',
    width: '92%',
    borderRadius: Layout.borderRadius.large,
    padding: Layout.spacing.m,
    ...Layout.shadow.medium,
  },
  statsContainer: {
    flex: 1,
    marginLeft: Layout.spacing.m,
  },
  statsTitle: {
    fontFamily: Typography.fonts.bodySemiBold,
    fontSize: Typography.sizes.base,
    color: Colors.text,
    marginBottom: Layout.spacing.xs,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: Layout.spacing.xs,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  statsSubtitle: {
    fontFamily: Typography.fonts.bodyMedium,
    fontSize: Typography.sizes.sm,
    color: Colors.subtleText,
  },
  categorySection: {
    marginTop: Layout.spacing.l,
    marginBottom: Layout.spacing.m,
  },
  categoryTitle: {
    fontFamily: Typography.fonts.headingMedium,
    fontSize: Typography.sizes.lg,
    color: Colors.text,
    paddingHorizontal: Layout.spacing.m,
    marginBottom: Layout.spacing.m,
  },
  listContent: {
    paddingBottom: Layout.spacing.xl * 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: Typography.fonts.bodyMedium,
    fontSize: Typography.sizes.base,
    color: Colors.subtleText,
    marginTop: Layout.spacing.m,
  },
});
