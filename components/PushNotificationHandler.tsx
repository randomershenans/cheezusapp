import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  registerForPushNotifications,
  setupNotificationListeners,
  getInitialNotification,
  setBadgeCount,
} from '@/lib/push-notifications';
import { supabase } from '@/lib/supabase';

export default function PushNotificationHandler() {
  const router = useRouter();
  const { user } = useAuth();
  const notificationListener = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Skip push notification setup on web
    if (Platform.OS === 'web') return;

    if (user) {
      // Register for push notifications
      registerForPushNotifications(user.id);

      // Check if app was opened from a notification
      getInitialNotification().then((response) => {
        if (response) {
          handleNotificationNavigation(response.notification.request.content.data);
        }
      });

      // Set up listeners
      notificationListener.current = setupNotificationListeners(
        // When notification received in foreground
        (notification) => {
          console.log('Notification received:', notification);
          // Update badge count
          updateBadgeCount();
        },
        // When user taps notification
        (response) => {
          console.log('Notification tapped:', response);
          handleNotificationNavigation(response.notification.request.content.data);
        }
      );

      // Update badge count on mount
      updateBadgeCount();
    } else {
      // User logged out - remove token
      // Note: We can't remove token here as we don't have the user ID
      // Token removal should happen in the logout flow
    }

    return () => {
      if (notificationListener.current) {
        notificationListener.current();
      }
    };
  }, [user]);

  const updateBadgeCount = async () => {
    if (!user) return;
    
    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (count !== null) {
        setBadgeCount(count);
      }
    } catch (error) {
      console.error('Error updating badge count:', error);
    }
  };

  const handleNotificationNavigation = (data: Record<string, unknown> | undefined) => {
    if (!data) return;

    const { type, user_id, cheese_id, badge_id } = data as {
      type?: string;
      user_id?: string;
      cheese_id?: string;
      badge_id?: string;
    };

    // Small delay to ensure app is ready
    setTimeout(() => {
      switch (type) {
        case 'follow':
        case 'following_earned_badge':
        case 'friend_milestone':
          if (user_id) {
            router.push(`/profile/${user_id}`);
          }
          break;

        case 'cheese_approved':
        case 'cheese_copied':
        case 'following_logged_cheese':
        case 'following_added_wishlist':
        case 'trending_cheese':
        case 'wishlist_reminder':
        case 'similar_recommendation':
          if (cheese_id) {
            router.push(`/producer-cheese/${cheese_id}`);
          }
          break;

        case 'badge_earned':
          router.push('/badges');
          break;

        case 'milestone_approaching':
        case 'weekly_leaderboard':
          router.push('/(tabs)/cheese-box');
          break;

        case 'inactive_nudge':
          router.push('/(tabs)');
          break;

        default:
          // Open notifications page for unknown types
          router.push('/notifications');
          break;
      }
    }, 100);
  };

  // This component doesn't render anything
  return null;
}
