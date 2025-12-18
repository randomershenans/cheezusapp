import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, UserPlus, Heart, Star, MessageCircle, Award, Check, CheckCheck, Settings } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

type NotificationType = 
  | 'follow'
  | 'like'
  | 'comment'
  | 'badge_earned'
  | 'following_earned_badge'
  | 'following_logged_cheese'
  | 'following_added_wishlist'
  | 'cheese_copied'
  | 'friend_milestone'
  | 'trending_cheese'
  | 'similar_recommendation'
  | 'new_from_producer'
  | 'award_winner'
  | 'seasonal_cheese'
  | 'cheese_near_you'
  | 'wishlist_reminder'
  | 'cheese_approved'
  | 'system';

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: {
    user_id?: string;
    user_name?: string;
    user_avatar?: string;
    cheese_id?: string;
    badge_id?: string;
    badge_name?: string;
    badge_description?: string;
    badge_icon?: string;
    producer_id?: string;
  };
  read: boolean;
  created_at: string;
};

type BadgeModalData = {
  name: string;
  description: string;
  icon: string;
} | null;

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [badgeModal, setBadgeModal] = useState<BadgeModalData>(null);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate based on type
    switch (notification.type) {
      // Profile navigation
      case 'follow':
      case 'friend_milestone':
        if (notification.data?.user_id) {
          router.push(`/profile/${notification.data.user_id}`);
        }
        break;
      
      // Cheese navigation
      case 'like':
      case 'comment':
      case 'following_logged_cheese':
      case 'following_added_wishlist':
      case 'cheese_copied':
      case 'trending_cheese':
      case 'similar_recommendation':
      case 'new_from_producer':
      case 'award_winner':
      case 'seasonal_cheese':
      case 'cheese_near_you':
      case 'wishlist_reminder':
      case 'cheese_approved':
        if (notification.data?.cheese_id) {
          router.push(`/producer-cheese/${notification.data.cheese_id}`);
        }
        break;
      
      // Badge modal
      case 'badge_earned':
      case 'following_earned_badge':
        if (notification.data?.badge_name) {
          setBadgeModal({
            name: notification.data.badge_name,
            description: notification.data.badge_description || 'Achievement unlocked!',
            icon: notification.data.badge_icon || '🏆',
          });
        } else {
          router.push('/badges');
        }
        break;
      
      default:
        break;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow':
      case 'friend_milestone':
        return <UserPlus size={20} color="#3B82F6" />;
      case 'like':
        return <Heart size={20} color="#EF4444" />;
      case 'comment':
        return <MessageCircle size={20} color="#10B981" />;
      case 'badge_earned':
      case 'following_earned_badge':
        return <Award size={20} color="#F59E0B" />;
      case 'following_logged_cheese':
      case 'following_added_wishlist':
      case 'cheese_copied':
        return <Star size={20} color="#8B5CF6" />;
      case 'trending_cheese':
      case 'similar_recommendation':
      case 'new_from_producer':
      case 'award_winner':
      case 'seasonal_cheese':
      case 'cheese_near_you':
      case 'wishlist_reminder':
      case 'cheese_approved':
        return <Star size={20} color={Colors.primary} />;
      default:
        return <Bell size={20} color={Colors.subtleText} />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Badge Detail Modal */}
      <Modal
        visible={badgeModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setBadgeModal(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setBadgeModal(null)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalIcon}>{badgeModal?.icon}</Text>
            <Text style={styles.modalTitle}>{badgeModal?.name}</Text>
            <Text style={styles.modalDescription}>{badgeModal?.description}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setBadgeModal(null);
                router.push('/badges');
              }}
            >
              <Text style={styles.modalButtonText}>View All Badges</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setBadgeModal(null)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.headerButton} onPress={markAllAsRead}>
              <CheckCheck size={20} color={Colors.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/notification-settings')}>
            <Settings size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Bell size={48} color={Colors.subtleText} />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>
              When someone follows you or interacts with your cheeses, you'll see it here
            </Text>
          </View>
        ) : (
          <View style={styles.notificationList}>
            {notifications.map(notification => (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationItem,
                  !notification.read && styles.notificationUnread,
                ]}
                onPress={() => handleNotificationPress(notification)}
              >
                <View style={styles.notificationIcon}>
                  {getNotificationIcon(notification.type)}
                </View>
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationTitle}>{notification.title}</Text>
                  <Text style={styles.notificationBody} numberOfLines={2}>
                    {notification.body}
                  </Text>
                  <Text style={styles.notificationTime}>
                    {formatTimeAgo(notification.created_at)}
                  </Text>
                </View>
                {!notification.read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
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
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Layout.spacing.s,
  },
  title: {
    flex: 1,
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.heading,
    color: Colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Layout.spacing.xxl,
  },
  loadingText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.xl,
    paddingVertical: Layout.spacing.xxl,
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
  notificationList: {
    paddingVertical: Layout.spacing.s,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.m,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  notificationUnread: {
    backgroundColor: 'rgba(252, 217, 91, 0.08)',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Layout.spacing.m,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
    marginBottom: 2,
  },
  notificationBody: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    lineHeight: Typography.sizes.sm * 1.4,
  },
  notificationTime: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginTop: Layout.spacing.xs,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: Layout.spacing.s,
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xl,
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: Layout.borderRadius.large,
    padding: Layout.spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  modalIcon: {
    fontSize: 64,
    marginBottom: Layout.spacing.m,
  },
  modalTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.heading,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Layout.spacing.s,
  },
  modalDescription: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    textAlign: 'center',
    marginBottom: Layout.spacing.l,
    lineHeight: Typography.sizes.base * 1.5,
  },
  modalButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Layout.spacing.m,
    paddingHorizontal: Layout.spacing.xl,
    borderRadius: Layout.borderRadius.medium,
    marginBottom: Layout.spacing.s,
    width: '100%',
  },
  modalButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
    textAlign: 'center',
  },
  modalCloseButton: {
    paddingVertical: Layout.spacing.s,
  },
  modalCloseText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
});
