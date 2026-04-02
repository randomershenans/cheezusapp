import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { User, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Analytics } from '@/lib/analytics';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

type SuggestedUser = {
  id: string;
  name: string | null;
  tagline: string | null;
  avatar_url: string | null;
  cheese_count: number;
};

type Props = {
  visible: boolean;
  onDismiss: () => void;
  userId: string;
};

export default function FollowSuggestions({ visible, onDismiss, userId }: Props) {
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [followingInProgress, setFollowingInProgress] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) {
      fetchSuggestedUsers();
    }
  }, [visible, userId]);

  const fetchSuggestedUsers = async () => {
    setLoading(true);
    try {
      // Fetch profiles ordered by creation date, excluding current user
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, name, tagline, avatar_url')
        .neq('id', userId)
        .order('created_at', { ascending: true })
        .limit(20);

      if (error) {
        console.error('Error fetching suggested users:', error);
        setLoading(false);
        return;
      }

      if (!profiles || profiles.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      // Get cheese counts for each user
      const usersWithCounts: SuggestedUser[] = await Promise.all(
        profiles.map(async (profile) => {
          const { count } = await supabase
            .from('cheese_box_entries')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id);

          return {
            ...profile,
            cheese_count: count || 0,
          };
        })
      );

      // Sort by cheese count descending, then take top 10
      const sorted = usersWithCounts
        .sort((a, b) => b.cheese_count - a.cheese_count)
        .slice(0, 10);

      setUsers(sorted);
      Analytics.trackFriendSuggestionShown(sorted.length, userId);
    } catch (error) {
      console.error('Error fetching suggested users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (targetUserId: string) => {
    // Optimistic update
    setFollowingInProgress((prev) => new Set(prev).add(targetUserId));

    try {
      await supabase
        .from('follows')
        .insert({ follower_id: userId, following_id: targetUserId });

      setFollowedIds((prev) => new Set(prev).add(targetUserId));
      Analytics.trackFollowFromSuggestion(targetUserId, userId);
      Analytics.trackUserFollow(targetUserId, 'suggestion', userId);
    } catch (error) {
      console.error('Error following user:', error);
    } finally {
      setFollowingInProgress((prev) => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
    }
  };

  const handleUnfollow = async (targetUserId: string) => {
    setFollowingInProgress((prev) => new Set(prev).add(targetUserId));

    try {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', userId)
        .eq('following_id', targetUserId);

      setFollowedIds((prev) => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
    } catch (error) {
      console.error('Error unfollowing user:', error);
    } finally {
      setFollowingInProgress((prev) => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
    }
  };

  const handleToggleFollow = (targetUserId: string) => {
    if (followedIds.has(targetUserId)) {
      handleUnfollow(targetUserId);
    } else {
      handleFollow(targetUserId);
    }
  };

  const renderUserItem = ({ item }: { item: SuggestedUser }) => {
    const isFollowed = followedIds.has(item.id);
    const isInProgress = followingInProgress.has(item.id);

    return (
      <View style={styles.userRow}>
        <View style={styles.userLeft}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <User size={24} color={Colors.subtleText} />
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {item.name || 'Cheese Lover'}
            </Text>
            {item.tagline ? (
              <Text style={styles.userTagline} numberOfLines={1}>
                {item.tagline}
              </Text>
            ) : null}
            <Text style={styles.cheeseCount}>
              {item.cheese_count} {item.cheese_count === 1 ? 'cheese' : 'cheeses'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.followButton, isFollowed && styles.followingButton]}
          onPress={() => handleToggleFollow(item.id)}
          disabled={isInProgress}
        >
          {isInProgress ? (
            <ActivityIndicator size="small" color={isFollowed ? Colors.subtleText : Colors.text} />
          ) : (
            <Text style={[styles.followButtonText, isFollowed && styles.followingButtonText]}>
              {isFollowed ? 'Following' : 'Follow'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const followedCount = followedIds.size;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onDismiss}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
            <X size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Suggested For You</Text>
          <View style={styles.closeButton} />
        </View>

        <View style={styles.intro}>
          <Text style={styles.introTitle}>Follow cheese lovers</Text>
          <Text style={styles.introSubtitle}>
            Follow people to see their cheese discoveries in your feed.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Finding cheese lovers...</Text>
          </View>
        ) : users.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No suggestions available yet.</Text>
          </View>
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) => item.id}
            renderItem={renderUserItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}

        <View style={styles.footer}>
          <TouchableOpacity style={styles.doneButton} onPress={onDismiss}>
            <Text style={styles.doneButtonText}>
              {followedCount > 0 ? `Done (${followedCount} followed)` : 'Skip'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
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
    paddingVertical: Layout.spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
  },
  intro: {
    paddingHorizontal: Layout.spacing.l,
    paddingTop: Layout.spacing.l,
    paddingBottom: Layout.spacing.m,
    alignItems: 'center',
  },
  introTitle: {
    fontSize: Typography.sizes['2xl'],
    fontFamily: Typography.fonts.heading,
    color: Colors.text,
    marginBottom: Layout.spacing.xs,
  },
  introSubtitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: Layout.spacing.m,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  listContent: {
    paddingHorizontal: Layout.spacing.m,
    paddingTop: Layout.spacing.s,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Layout.spacing.xs,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Layout.spacing.s,
  },
  userLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Layout.spacing.m,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: Layout.spacing.m,
  },
  avatarFallback: {
    backgroundColor: Colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
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
  cheeseCount: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.primaryDark,
    marginTop: 2,
  },
  followButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
    borderRadius: Layout.borderRadius.large,
    minWidth: 90,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: Colors.lightGray,
  },
  followButtonText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
  },
  followingButtonText: {
    color: Colors.subtleText,
  },
  footer: {
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.m,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  doneButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
  },
});
