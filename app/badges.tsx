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
import { TouchableOpacity } from 'react-native';
import { Trophy, ArrowLeft, CheckCircle, Circle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Analytics } from '@/lib/analytics';
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
  img_url?: string;
  category: string;
  threshold: number;
  progress: number;
  completed: boolean;
}

export default function BadgeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCompletedFirst, setShowCompletedFirst] = useState(true);
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
    Analytics.trackBadgesPageView(user?.id);
  }, []);
  
  const onRefresh = () => {
    setRefreshing(true);
    fetchBadges();
  };
  
  // Group badges - either by completion status or by category
  const groupedBadges = badges.reduce((acc, badge) => {
    let groupKey: string;
    
    if (showCompletedFirst) {
      // Group by completion status
      groupKey = badge.completed ? 'completed' : 'in_progress';
    } else {
      // Group by category
      groupKey = badge.category;
    }
    
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(badge);
    return acc;
  }, {} as Record<string, Badge[]>);
  
  // Sort the groups so completed comes first
  const sortedGroupEntries = Object.entries(groupedBadges).sort(([a], [b]) => {
    if (showCompletedFirst) {
      if (a === 'completed') return -1;
      if (b === 'completed') return 1;
    }
    return a.localeCompare(b);
  });
  
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
      
      {/* Simple header with back button */}
      <View style={styles.simpleHeader}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Badges</Text>
      </View>
      
      {/* Progress summary */}
      <View style={styles.summaryCard}>
        <Trophy size={40} color="#FCD95B" />
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
      
      {/* Filter toggle */}
      <View style={styles.filterRow}>
        <TouchableOpacity 
          style={[styles.filterButton, showCompletedFirst && styles.filterButtonActive]}
          onPress={() => setShowCompletedFirst(true)}
        >
          <CheckCircle size={16} color={showCompletedFirst ? '#1F2937' : Colors.text} />
          <Text style={[styles.filterText, showCompletedFirst && styles.filterTextActive]}>Completed First</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterButton, !showCompletedFirst && styles.filterButtonActive]}
          onPress={() => setShowCompletedFirst(false)}
        >
          <Circle size={16} color={!showCompletedFirst ? '#1F2937' : Colors.text} />
          <Text style={[styles.filterText, !showCompletedFirst && styles.filterTextActive]}>By Category</Text>
        </TouchableOpacity>
      </View>
      
      {/* Badge list */}
      <FlatList
        data={sortedGroupEntries}
        keyExtractor={([category]) => category}
        renderItem={({ item: [category, categoryBadges] }) => (
          <View style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{formatCategory(category)}</Text>
            {categoryBadges
              .sort((a, b) => {
                if (showCompletedFirst) {
                  // Show completed badges first
                  if (a.completed && !b.completed) return -1;
                  if (!a.completed && b.completed) return 1;
                }
                // Otherwise sort by progress percentage
                const aPercent = a.progress / a.threshold;
                const bPercent = b.progress / b.threshold;
                return bPercent - aPercent;
              })
              .map(badge => (
                <BadgeProgressCard
                  key={badge.id}
                  icon={badge.icon}
                  imgUrl={badge.img_url}
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
  simpleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.m,
    paddingTop: Layout.spacing.l,
  },
  backButton: {
    padding: Layout.spacing.s,
    marginRight: Layout.spacing.m,
  },
  pageTitle: {
    fontFamily: Typography.fonts.headingMedium,
    fontSize: Typography.sizes.xl,
    color: Colors.text,
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
    backgroundColor: '#FCD95B',
    borderRadius: 4,
  },
  statsSubtitle: {
    fontFamily: Typography.fonts.bodyMedium,
    fontSize: Typography.sizes.sm,
    color: Colors.subtleText,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Layout.spacing.m,
    marginTop: Layout.spacing.m,
    marginBottom: Layout.spacing.s,
    paddingHorizontal: Layout.spacing.m,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Layout.spacing.s,
    paddingHorizontal: Layout.spacing.m,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterButtonActive: {
    backgroundColor: '#FCD95B',
    borderColor: '#FCD95B',
  },
  filterText: {
    fontFamily: Typography.fonts.bodyMedium,
    fontSize: Typography.sizes.sm,
    color: Colors.text,
  },
  filterTextActive: {
    color: '#1F2937',
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
