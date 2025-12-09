import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, Image, FlatList, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, User } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

type FollowUser = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  tagline: string | null;
};

type TabType = 'followers' | 'following';

export default function FollowersScreen() {
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<TabType>((tab as TabType) || 'followers');
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFollowers();
      fetchFollowing();
    }
  }, [user]);

  const fetchFollowers = async () => {
    if (!user) return;
    try {
      // Get follower IDs first
      const { data: followData, error: followError } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', user.id);

      if (followError) {
        console.error('Error fetching follower IDs:', followError);
        return;
      }

      if (followData && followData.length > 0) {
        const followerIds = followData.map(f => f.follower_id);
        
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, name, avatar_url, tagline')
          .in('id', followerIds);

        if (!profileError && profileData) {
          setFollowers(profileData);
        }
      }
    } catch (error) {
      console.error('Error fetching followers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowing = async () => {
    if (!user) return;
    try {
      // Get following IDs first
      const { data: followData, error: followError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (followError) {
        console.error('Error fetching following IDs:', followError);
        return;
      }

      if (followData && followData.length > 0) {
        const followingIds = followData.map(f => f.following_id);
        
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, name, avatar_url, tagline')
          .in('id', followingIds);

        if (!profileError && profileData) {
          setFollowing(profileData);
        }
      }
    } catch (error) {
      console.error('Error fetching following:', error);
    }
  };

  const handleUnfollow = async (userId: string) => {
    if (!user) return;
    try {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId);
      
      // Refresh following list
      fetchFollowing();
    } catch (error) {
      console.error('Error unfollowing:', error);
    }
  };

  const renderUserItem = ({ item }: { item: FollowUser }) => (
    <TouchableOpacity 
      style={styles.userCard}
      onPress={() => router.push(`/profile/${item.id}`)}
    >
      {item.avatar_url ? (
        <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <User size={24} color={Colors.subtleText} />
        </View>
      )}
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name || 'Cheese Lover'}</Text>
        {item.tagline && (
          <Text style={styles.userTagline} numberOfLines={1}>{item.tagline}</Text>
        )}
      </View>
      {activeTab === 'following' && (
        <TouchableOpacity 
          style={styles.unfollowButton}
          onPress={() => handleUnfollow(item.id)}
        >
          <Text style={styles.unfollowButtonText}>Unfollow</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  const currentList = activeTab === 'followers' ? followers : following;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>
          {activeTab === 'followers' ? 'Followers' : 'Following'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'followers' && styles.tabActive]}
          onPress={() => setActiveTab('followers')}
        >
          <Text style={[styles.tabText, activeTab === 'followers' && styles.tabTextActive]}>
            Followers ({followers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'following' && styles.tabActive]}
          onPress={() => setActiveTab('following')}
        >
          <Text style={[styles.tabText, activeTab === 'following' && styles.tabTextActive]}>
            Following ({following.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : currentList.length === 0 ? (
        <View style={styles.emptyState}>
          <User size={48} color={Colors.subtleText} />
          <Text style={styles.emptyTitle}>
            {activeTab === 'followers' ? 'No followers yet' : 'Not following anyone'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'followers' 
              ? 'Share your cheese journey to attract followers!'
              : 'Discover cheese lovers to follow'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={currentList}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  title: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.heading,
    color: Colors.text,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: Layout.spacing.m,
    marginBottom: Layout.spacing.m,
    gap: Layout.spacing.s,
  },
  tab: {
    flex: 1,
    paddingVertical: Layout.spacing.s,
    alignItems: 'center',
    borderRadius: Layout.borderRadius.large,
    backgroundColor: Colors.backgroundSecondary,
  },
  tabActive: {
    backgroundColor: '#FEF9E7',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  tabTextActive: {
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: Layout.spacing.m,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    marginBottom: Layout.spacing.s,
    ...Layout.shadow.small,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: Layout.spacing.m,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Layout.spacing.m,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
  },
  userTagline: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginTop: 2,
  },
  unfollowButton: {
    paddingVertical: Layout.spacing.xs,
    paddingHorizontal: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.subtleText,
  },
  unfollowButtonText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.subtleText,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.xl,
  },
  emptyTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
    marginTop: Layout.spacing.m,
  },
  emptySubtitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    textAlign: 'center',
    marginTop: Layout.spacing.s,
  },
});
