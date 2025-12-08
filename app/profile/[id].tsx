import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, User, MapPin, Lock, Users, Star, Award } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

type Profile = {
  id: string;
  name: string | null;
  tagline: string | null;
  location: string | null;
  avatar_url: string | null;
  is_public: boolean;
  created_at: string;
};

type CheeseEntry = {
  id: string;
  rating: number | null;
  created_at: string;
  producer_cheese: {
    id: string;
    full_name: string;
    image_url: string | null;
  };
};

export default function PublicProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [stats, setStats] = useState({
    cheeses: 0,
    followers: 0,
    following: 0,
    badges: 0,
  });
  const [recentCheeses, setRecentCheeses] = useState<CheeseEntry[]>([]);

  const isOwnProfile = user?.id === id;

  useEffect(() => {
    if (id) {
      fetchProfile();
      fetchStats();
      fetchRecentCheeses();
      if (user && !isOwnProfile) {
        checkFollowStatus();
      }
    }
  }, [id, user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, tagline, location, avatar_url, is_public, created_at')
        .eq('id', id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { count: cheesesCount } = await supabase
        .from('cheese_box_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', id);

      const { count: followersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', id);

      const { count: followingCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', id);

      const { count: badgesCount } = await supabase
        .from('user_badges')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', id)
        .eq('completed', true);

      setStats({
        cheeses: cheesesCount ?? 0,
        followers: followersCount ?? 0,
        following: followingCount ?? 0,
        badges: badgesCount ?? 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRecentCheeses = async () => {
    try {
      const { data, error } = await supabase
        .from('cheese_box_entries')
        .select(`
          id,
          rating,
          created_at,
          producer_cheese:producer_cheeses!cheese_id (
            id,
            full_name,
            image_url
          )
        `)
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(6);

      if (!error && data) {
        setRecentCheeses(data as any);
      }
    } catch (error) {
      console.error('Error fetching recent cheeses:', error);
    }
  };

  const checkFollowStatus = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', id)
        .maybeSingle();

      setIsFollowing(!!data);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleToggleFollow = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to follow users.');
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', id);
        setIsFollowing(false);
        setStats(prev => ({ ...prev, followers: prev.followers - 1 }));
      } else {
        await supabase
          .from('follows')
          .insert({ follower_id: user.id, following_id: id });
        setIsFollowing(true);
        setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Profile not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Private profile check
  if (!profile.is_public && !isOwnProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.privateContainer}>
          <Lock size={48} color={Colors.subtleText} />
          <Text style={styles.privateTitle}>Private Profile</Text>
          <Text style={styles.privateSubtitle}>
            This user has chosen to keep their profile private
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Info */}
        <View style={styles.profileSection}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <User size={40} color={Colors.subtleText} />
            </View>
          )}
          <Text style={styles.name}>{profile.name || 'Cheese Lover'}</Text>
          {profile.tagline && (
            <Text style={styles.tagline}>{profile.tagline}</Text>
          )}
          {profile.location && (
            <View style={styles.locationRow}>
              <MapPin size={14} color={Colors.subtleText} />
              <Text style={styles.location}>{profile.location}</Text>
            </View>
          )}

          {/* Follow Button */}
          {!isOwnProfile && (
            <TouchableOpacity
              style={[styles.followButton, isFollowing && styles.followingButton]}
              onPress={handleToggleFollow}
              disabled={followLoading}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color={isFollowing ? Colors.text : Colors.background} />
              ) : (
                <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.cheeses}</Text>
            <Text style={styles.statLabel}>Cheeses</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.followers}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.following}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.badges}</Text>
            <Text style={styles.statLabel}>Badges</Text>
          </View>
        </View>

        {/* Recent Cheeses */}
        {recentCheeses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Cheeses</Text>
            <View style={styles.cheesesGrid}>
              {recentCheeses.map((entry) => {
                const cheese = entry.producer_cheese as any;
                return (
                  <TouchableOpacity
                    key={entry.id}
                    style={styles.cheeseCard}
                    onPress={() => router.push(`/producer-cheese/${cheese?.id}`)}
                  >
                    <Image
                      source={{ uri: cheese?.image_url || 'https://via.placeholder.com/100?text=Cheese' }}
                      style={styles.cheeseImage}
                    />
                    {entry.rating && (
                      <View style={styles.ratingBadge}>
                        <Star size={10} color="#FFD700" fill="#FFD700" />
                        <Text style={styles.ratingText}>{entry.rating}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <View style={{ height: Layout.spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.m,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.heading,
    color: Colors.text,
  },
  privateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.xl,
  },
  privateTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
    marginTop: Layout.spacing.m,
  },
  privateSubtitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    textAlign: 'center',
    marginTop: Layout.spacing.s,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.l,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: Layout.spacing.m,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Layout.spacing.m,
  },
  name: {
    fontSize: Typography.sizes['2xl'],
    fontFamily: Typography.fonts.heading,
    color: Colors.text,
  },
  tagline: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginTop: Layout.spacing.xs,
    textAlign: 'center',
    paddingHorizontal: Layout.spacing.xl,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Layout.spacing.s,
    gap: 4,
  },
  location: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  followButton: {
    marginTop: Layout.spacing.m,
    backgroundColor: Colors.primary,
    paddingVertical: Layout.spacing.s,
    paddingHorizontal: Layout.spacing.xl,
    borderRadius: Layout.borderRadius.large,
    minWidth: 120,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.subtleText,
  },
  followButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.background,
  },
  followingButtonText: {
    color: Colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Layout.spacing.m,
    gap: Layout.spacing.s,
    marginBottom: Layout.spacing.l,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    alignItems: 'center',
    ...Layout.shadow.small,
  },
  statNumber: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.bodyBold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: Layout.spacing.m,
    marginBottom: Layout.spacing.l,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
    marginBottom: Layout.spacing.m,
  },
  cheesesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.s,
  },
  cheeseCard: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: Layout.borderRadius.medium,
    overflow: 'hidden',
    position: 'relative',
  },
  cheeseImage: {
    width: '100%',
    height: '100%',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2,
  },
  ratingText: {
    fontSize: 10,
    fontFamily: Typography.fonts.bodySemiBold,
    color: '#FFF',
  },
});
