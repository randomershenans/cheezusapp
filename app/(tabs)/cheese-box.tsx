import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, TouchableOpacity, Image, Platform, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Plus, Star, Trash2, CreditCard as Edit3 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';

type CheeseBoxEntry = {
  id: string;
  rating?: number;
  notes?: string;
  created_at: string;
  cheese: {
    id: string;
    name: string;
    type: string;
    origin_country: string;
    image_url: string;
    description: string;
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
          cheese:cheeses (
            id,
            name,
            type,
            origin_country,
            image_url,
            description
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
      const type = entry.cheese.type;
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
          <Text style={styles.authTitle}>Sign in to access your Cheese Box</Text>
          <Text style={styles.authSubtitle}>
            Track your cheese tastings, rate your favorites, and build your personal cheese journey.
          </Text>
          <TouchableOpacity
            style={styles.authButton}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.authButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <Text style={styles.title}>My Cheese Box</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/add-cheese')}
        >
          <Plus size={20} color={Colors.background} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalCheeses}</Text>
            <Text style={styles.statLabel}>Cheeses Tried</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.averageRating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.favoriteType || 'N/A'}</Text>
            <Text style={styles.statLabel}>Favorite Type</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading your cheese box...</Text>
          </View>
        ) : entries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🧀</Text>
            <Text style={styles.emptyTitle}>Your cheese box is empty</Text>
            <Text style={styles.emptySubtitle}>
              Start building your cheese collection by adding your first tasting!
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
            {entries.map((entry) => (
              <View key={entry.id} style={styles.entryCard}>
                <TouchableOpacity
                  style={styles.entryContent}
                  onPress={() => router.push(`/cheese/${entry.cheese.id}`)}
                >
                  <Image 
                    source={{ uri: entry.cheese.image_url }} 
                    style={styles.entryImage}
                  />
                  <View style={styles.entryInfo}>
                    <Text style={styles.entryName}>{entry.cheese.name}</Text>
                    <Text style={styles.entryType}>
                      {entry.cheese.type} • {entry.cheese.origin_country}
                    </Text>
                    {entry.rating && (
                      <View style={styles.ratingContainer}>
                        {renderStars(entry.rating)}
                      </View>
                    )}
                    {entry.notes && (
                      <Text style={styles.entryNotes} numberOfLines={2}>
                        "{entry.notes}"
                      </Text>
                    )}
                    <Text style={styles.entryDate}>
                      Added {new Date(entry.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.entryActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => router.push(`/cheese/${entry.cheese.id}/edit`)}
                  >
                    <Edit3 size={16} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
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
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: Colors.text,
  },
  addButton: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: Layout.spacing.m,
    marginBottom: Layout.spacing.l,
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    ...Layout.shadow.small,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: Colors.subtleText,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  authPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xl,
  },
  authTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Layout.spacing.m,
  },
  authSubtitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: Colors.subtleText,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Layout.spacing.xl,
  },
  authButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Layout.spacing.xl,
    paddingVertical: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
  },
  authButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xl,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: Colors.subtleText,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Layout.spacing.l,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Layout.spacing.s,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: Colors.subtleText,
    textAlign: 'center',
    lineHeight: 24,
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
  },
  emptyButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  entriesContainer: {
    paddingHorizontal: Layout.spacing.m,
    gap: Layout.spacing.m,
  },
  entryCard: {
    backgroundColor: Colors.card,
    borderRadius: Layout.borderRadius.medium,
    overflow: 'hidden',
    ...Layout.shadow.small,
  },
  entryContent: {
    flexDirection: 'row',
    padding: Layout.spacing.m,
  },
  entryImage: {
    width: 80,
    height: 80,
    borderRadius: Layout.borderRadius.small,
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
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.text,
    marginBottom: 4,
  },
  entryType: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: Colors.subtleText,
    marginBottom: Layout.spacing.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: Layout.spacing.xs,
  },
  entryNotes: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: Colors.text,
    fontStyle: 'italic',
    marginBottom: Layout.spacing.xs,
  },
  entryDate: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
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
    borderRadius: Layout.borderRadius.small,
    backgroundColor: Colors.backgroundSecondary,
  },
  bottomSpacing: {
    height: Layout.spacing.xl,
  },
});