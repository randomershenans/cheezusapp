import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, TouchableOpacity, Image, Platform, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Plus, Star, Trash2, Pen, TrendingUp, Award, Heart, BarChart3 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

type CheeseBoxEntry = {
  id: string;
  rating?: number;
  notes?: string;
  created_at: string;
  producer_cheese: {
    id: string;
    full_name: string;
    producer_name: string;
    product_name?: string;
    image_url?: string;
    cheese_type: {
      id: string;
      name: string;
      type: string;
      origin_country?: string;
    };
  };
};

export default function CheeseBoxScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [entries, setEntries] = useState<CheeseBoxEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCheeses: 0,
    averageRating: 0,
    favoriteType: '',
  });

  useEffect(() => {
    if (user) {
      fetchCheeseBoxEntries();
    }
  }, [user]);

  const fetchCheeseBoxEntries = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('cheese_box_entries')
        .select(`
          id,
          rating,
          notes,
          created_at,
          producer_cheese:producer_cheeses!cheese_id (
            id,
            full_name,
            producer_name,
            product_name,
            image_url,
            cheese_type:cheese_types!cheese_type_id (
              id,
              name,
              type,
              origin_country
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setEntries(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching cheese box entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (entries: CheeseBoxEntry[]) => {
    const totalCheeses = entries.length;
    const ratingsSum = entries.reduce((sum, entry) => sum + (entry.rating || 0), 0);
    const averageRating = totalCheeses > 0 ? ratingsSum / totalCheeses : 0;
    
    // Find most common cheese type
    const typeCounts = entries.reduce((acc, entry) => {
      const type = entry.producer_cheese.cheese_type.type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const favoriteType = Object.keys(typeCounts).reduce((a, b) => 
      typeCounts[a] > typeCounts[b] ? a : b, ''
    );

    setStats({
      totalCheeses,
      averageRating,
      favoriteType,
    });
  };

  const handleDeleteEntry = async (entryId: string) => {
    Alert.alert(
      'Remove Cheese',
      'Are you sure you want to remove this cheese from your box?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('cheese_box_entries')
                .delete()
                .eq('id', entryId);

              if (error) throw error;
              
              // Refresh the list
              fetchCheeseBoxEntries();
            } catch (error) {
              console.error('Error deleting entry:', error);
              Alert.alert('Error', 'Failed to remove cheese from your box');
            }
          },
        },
      ]
    );
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        size={14}
        color={index < rating ? '#FFD700' : '#E0E0E0'}
        fill={index < rating ? '#FFD700' : 'none'}
      />
    ));
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authPrompt}>
          <View style={styles.authIcon}>
            <Heart size={48} color={Colors.primary} />
          </View>
          <Text style={styles.authTitle}>Your Personal Cheese Journey</Text>
          <Text style={styles.authSubtitle}>
            Track your cheese tastings, rate your favorites, and build your personal cheese collection. 
            Join thousands of cheese enthusiasts discovering amazing flavors.
          </Text>
          <TouchableOpacity
            style={styles.authButton}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.authButtonText}>Start Your Journey</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.authSecondaryButton}
            onPress={() => router.push('/auth/signup')}
          >
            <Text style={styles.authSecondaryButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Cheese Box</Text>
          <Text style={styles.subtitle}>Your personal cheese collection</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/add-cheese')}
        >
          <Plus size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <TrendingUp size={20} color={Colors.primary} />
            </View>
            <Text style={styles.statNumber}>{stats.totalCheeses}</Text>
            <Text style={styles.statLabel}>Cheeses Tried</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Star size={20} color="#FFD700" />
            </View>
            <Text style={styles.statNumber}>{stats.averageRating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Award size={20} color={Colors.success} />
            </View>
            <Text style={styles.statNumber}>{stats.favoriteType || 'N/A'}</Text>
            <Text style={styles.statLabel}>Favorite Type</Text>
          </View>
        </View>

        {entries.length > 0 && (
          <TouchableOpacity
            style={styles.analyticsButton}
            onPress={() => router.push('/analytics')}
          >
            <View style={styles.analyticsButtonContent}>
              <BarChart3 size={20} color={Colors.primary} />
              <Text style={styles.analyticsButtonText}>Elite Analytics</Text>
            </View>
            <Text style={styles.analyticsButtonSubtext}>
              Deep dive into your cheese stats
            </Text>
          </TouchableOpacity>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingSpinner} />
            <Text style={styles.loadingText}>Loading your cheese collection...</Text>
          </View>
        ) : entries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>🧀</Text>
            </View>
            <Text style={styles.emptyTitle}>Your cheese box is empty</Text>
            <Text style={styles.emptySubtitle}>
              Start building your cheese collection by adding your first tasting! 
              Discover new flavors and track your favorites.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/add-cheese')}
            >
              <Plus size={20} color={Colors.background} />
              <Text style={styles.emptyButtonText}>Add Your First Cheese</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.entriesContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Collection</Text>
              <Text style={styles.sectionCount}>{entries.length} cheeses</Text>
            </View>
            {entries.map((entry) => (
              <View key={entry.id} style={styles.entryCard}>
                <TouchableOpacity
                  style={styles.entryContent}
                  onPress={() => router.push(`/producer-cheese/${entry.producer_cheese.id}`)}
                >
                  <Image 
                    source={{ 
                      uri: entry.producer_cheese.image_url || 'https://via.placeholder.com/90?text=Cheese'
                    }} 
                    style={styles.entryImage}
                  />
                  <View style={styles.entryInfo}>
                    <Text style={styles.entryName}>{entry.producer_cheese.full_name}</Text>
                    <Text style={styles.entryType}>
                      {entry.producer_cheese.cheese_type.name} • {entry.producer_cheese.cheese_type.type}
                    </Text>
                    {entry.producer_cheese.cheese_type.origin_country && (
                      <Text style={styles.entryOrigin}>
                        📍 {entry.producer_cheese.cheese_type.origin_country}
                      </Text>
                    )}
                    {entry.rating && (
                      <View style={styles.ratingContainer}>
                        {renderStars(entry.rating)}
                        <Text style={styles.ratingText}>({entry.rating}/5)</Text>
                      </View>
                    )}
                    {entry.notes && (
                      <Text style={styles.entryNotes} numberOfLines={2}>
                        "{entry.notes}"
                      </Text>
                    )}
                    <Text style={styles.entryDate}>
                      Added {new Date(entry.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.entryActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteEntry(entry.id)}
                  >
                    <Trash2 size={16} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
  },
  title: {
    fontSize: Typography.sizes['3xl'],
    fontFamily: Typography.fonts.heading,
    color: Colors.text,
    letterSpacing: Typography.letterSpacing.tight,
  },
  subtitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginTop: 4,
  },
  addButton: {
    backgroundColor: '#FCD95B',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...Layout.shadow.medium,
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Layout.spacing.m,
    marginBottom: Layout.spacing.l,
    gap: Layout.spacing.m,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    alignItems: 'center',
    ...Layout.shadow.small,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FFFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Layout.spacing.s,
  },
  statNumber: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.display,
    color: Colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.subtleText,
    textAlign: 'center',
  },
  analyticsButton: {
    marginHorizontal: Layout.spacing.m,
    marginBottom: Layout.spacing.l,
    backgroundColor: Colors.card,
    borderRadius: Layout.borderRadius.large,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: Layout.spacing.m,
    ...Layout.shadow.small,
  },
  analyticsButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.s,
    marginBottom: 4,
  },
  analyticsButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
  },
  analyticsButtonSubtext: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  authPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xl,
  },
  authIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF0DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Layout.spacing.l,
  },
  authTitle: {
    fontSize: Typography.sizes['2xl'],
    fontFamily: Typography.fonts.heading,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Layout.spacing.m,
    letterSpacing: Typography.letterSpacing.tight,
  },
  authSubtitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    textAlign: 'center',
    lineHeight: Typography.sizes.base * Typography.lineHeights.normal,
    marginBottom: Layout.spacing.xl,
  },
  authButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Layout.spacing.xl,
    paddingVertical: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    marginBottom: Layout.spacing.m,
    ...Layout.shadow.medium,
  },
  authButtonText: {
    color: Colors.background,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
  },
  authSecondaryButton: {
    backgroundColor: '#FFF0DB',
    paddingHorizontal: Layout.spacing.xl,
    paddingVertical: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
  },
  authSecondaryButtonText: {
    color: Colors.primary,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xl,
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF0DB',
    marginBottom: Layout.spacing.m,
  },
  loadingText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.subtleText,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xl,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF0DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Layout.spacing.l,
  },
  emptyIconText: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Layout.spacing.s,
  },
  emptySubtitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    textAlign: 'center',
    lineHeight: Typography.sizes.base * Typography.lineHeights.normal,
    marginBottom: Layout.spacing.xl,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Layout.spacing.l,
    paddingVertical: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    gap: Layout.spacing.s,
    ...Layout.shadow.medium,
  },
  emptyButtonText: {
    color: Colors.background,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
  },
  entriesContainer: {
    paddingHorizontal: Layout.spacing.m,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.m,
  },
  sectionTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
  },
  sectionCount: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.subtleText,
  },
  entryCard: {
    backgroundColor: Colors.card,
    borderRadius: Layout.borderRadius.large,
    marginBottom: Layout.spacing.m,
    overflow: 'hidden',
    ...Layout.shadow.medium,
  },
  entryContent: {
    flexDirection: 'row',
    padding: Layout.spacing.m,
  },
  entryImage: {
    width: 90,
    height: 90,
    borderRadius: Layout.borderRadius.medium,
    marginRight: Layout.spacing.m,
    ...Platform.select({
      web: {
        objectFit: 'cover',
      },
    }),
  },
  entryInfo: {
    flex: 1,
  },
  entryName: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
    marginBottom: 4,
    lineHeight: Typography.sizes.lg * Typography.lineHeights.tight,
  },
  entryType: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginBottom: Layout.spacing.xs,
  },
  entryOrigin: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginBottom: Layout.spacing.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.xs,
    marginBottom: Layout.spacing.xs,
  },
  ratingText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.subtleText,
  },
  entryNotes: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
    fontStyle: 'italic',
    marginBottom: Layout.spacing.xs,
    lineHeight: Typography.sizes.sm * Typography.lineHeights.normal,
  },
  entryDate: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  entryActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Layout.spacing.m,
    paddingBottom: Layout.spacing.m,
    gap: Layout.spacing.s,
  },
  actionButton: {
    padding: Layout.spacing.s,
    borderRadius: Layout.borderRadius.medium,
    backgroundColor: '#F8FFFE',
  },
  deleteButton: {
    backgroundColor: '#FFE8EC',
  },
  bottomSpacing: {
    height: Layout.spacing.xl,
  },
});