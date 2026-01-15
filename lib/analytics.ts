import { Platform } from 'react-native';
import { supabase } from './supabase';
import Constants from 'expo-constants';

// Event categories for organization
export type EventCategory = 
  | 'feed'
  | 'search'
  | 'cheese'
  | 'pairing'
  | 'producer'
  | 'article'
  | 'social'
  | 'notification'
  | 'session'
  | 'ai'
  | 'share';

// All trackable events
export type EventName =
  // Feed events
  | 'feed_view'
  | 'feed_refresh'
  | 'feed_scroll_load_more'
  | 'feed_cheese_click'
  | 'feed_article_click'
  | 'feed_pairing_click'
  // Search events
  | 'search_cheese'
  | 'search_pairing'
  | 'search_user'
  | 'search_filter_apply'
  // Cheese events
  | 'cheese_view'
  | 'cheese_add_to_box'
  | 'cheese_rate'
  | 'cheese_wishlist_add'
  | 'cheese_wishlist_remove'
  | 'cheese_share'
  // Pairing events
  | 'pairing_view'
  | 'pairing_share'
  // Producer events
  | 'producer_view'
  // Article events
  | 'article_view'
  | 'article_share'
  // Social events
  | 'user_follow'
  | 'user_unfollow'
  | 'profile_view'
  | 'share_link_set'
  // Notification events
  | 'notification_click'
  | 'notifications_enabled'
  | 'notifications_disabled'
  // Session events
  | 'app_open'
  | 'signup'
  | 'login'
  | 'logout'
  // AI events
  | 'ai_scan_start'
  | 'ai_scan_success'
  | 'ai_scan_fail'
  // Page view events
  | 'analytics_page_view'
  | 'badges_page_view';

// Event properties type
export interface EventProperties {
  // IDs
  cheese_id?: string;
  pairing_id?: string;
  producer_id?: string;
  article_id?: string;
  user_id?: string;
  target_user_id?: string;
  notification_id?: string;
  
  // Search
  query?: string;
  results_count?: number;
  
  // Feed
  position?: number;
  feed_type?: string;
  
  // AI Scanner
  confidence?: string;
  error_message?: string;
  
  // Notifications
  notification_type?: string;
  
  // Ratings
  rating?: number;
  
  // Share
  share_method?: string;
  
  // Filters
  filters?: Record<string, string>;
  
  // Any additional custom properties
  [key: string]: any;
}

// Session ID for grouping events
let sessionId: string | null = null;

const generateSessionId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const getSessionId = (): string => {
  if (!sessionId) {
    sessionId = generateSessionId();
  }
  return sessionId;
};

// Reset session (call on app background/foreground)
export const resetSession = (): void => {
  sessionId = generateSessionId();
};

// Get platform string
const getPlatform = (): string => {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
};

// Get app version
const getAppVersion = (): string => {
  return Constants.expoConfig?.version || '1.0.0';
};

// Category mapping for events
const eventCategoryMap: Record<EventName, EventCategory> = {
  // Feed
  feed_view: 'feed',
  feed_refresh: 'feed',
  feed_scroll_load_more: 'feed',
  feed_cheese_click: 'feed',
  feed_article_click: 'feed',
  feed_pairing_click: 'feed',
  // Search
  search_cheese: 'search',
  search_pairing: 'search',
  search_user: 'search',
  search_filter_apply: 'search',
  // Cheese
  cheese_view: 'cheese',
  cheese_add_to_box: 'cheese',
  cheese_rate: 'cheese',
  cheese_wishlist_add: 'cheese',
  cheese_wishlist_remove: 'cheese',
  cheese_share: 'cheese',
  // Pairing
  pairing_view: 'pairing',
  pairing_share: 'pairing',
  // Producer
  producer_view: 'producer',
  // Article
  article_view: 'article',
  article_share: 'article',
  // Social
  user_follow: 'social',
  user_unfollow: 'social',
  profile_view: 'social',
  share_link_set: 'social',
  // Notification
  notification_click: 'notification',
  notifications_enabled: 'notification',
  notifications_disabled: 'notification',
  // Session
  app_open: 'session',
  signup: 'session',
  login: 'session',
  logout: 'session',
  // AI
  ai_scan_start: 'ai',
  ai_scan_success: 'ai',
  ai_scan_fail: 'ai',
  // Page views
  analytics_page_view: 'session',
  badges_page_view: 'session',
};

/**
 * Track an analytics event
 * Fire-and-forget - doesn't block UI
 */
export const trackEvent = async (
  eventName: EventName,
  properties?: EventProperties,
  userId?: string
): Promise<void> => {
  try {
    const category = eventCategoryMap[eventName];
    
    // Insert event asynchronously - don't await to avoid blocking UI
    supabase
      .from('analytics_events')
      .insert({
        event_name: eventName,
        event_category: category,
        user_id: userId || null,
        properties: properties || {},
        platform: getPlatform(),
        app_version: getAppVersion(),
        session_id: getSessionId(),
      })
      .then(({ error }) => {
        if (error) {
          console.log('Analytics error (non-blocking):', error.message);
        }
      });
  } catch (error) {
    // Silently fail - analytics should never break the app
    console.log('Analytics tracking failed (non-blocking)');
  }
};

/**
 * Convenience function to track with user from auth context
 */
export const createTracker = (userId?: string) => {
  return (eventName: EventName, properties?: EventProperties) => {
    trackEvent(eventName, properties, userId);
  };
};

// Pre-built tracking functions for common events
export const Analytics = {
  // Feed
  trackFeedView: (userId?: string) => 
    trackEvent('feed_view', {}, userId),
  
  trackFeedRefresh: (userId?: string) => 
    trackEvent('feed_refresh', {}, userId),
  
  trackFeedLoadMore: (userId?: string) => 
    trackEvent('feed_scroll_load_more', {}, userId),
  
  trackFeedCheeseClick: (cheeseId: string, position: number, userId?: string) => 
    trackEvent('feed_cheese_click', { cheese_id: cheeseId, position }, userId),
  
  // Search
  trackSearchCheese: (query: string, resultsCount: number, userId?: string) => 
    trackEvent('search_cheese', { query, results_count: resultsCount }, userId),
  
  trackSearchPairing: (query: string, resultsCount: number, userId?: string) => 
    trackEvent('search_pairing', { query, results_count: resultsCount }, userId),
  
  trackSearchUser: (query: string, resultsCount: number, userId?: string) => 
    trackEvent('search_user', { query, results_count: resultsCount }, userId),
  
  // Cheese
  trackCheeseView: (cheeseId: string, userId?: string) => 
    trackEvent('cheese_view', { cheese_id: cheeseId }, userId),
  
  trackCheeseAddToBox: (cheeseId: string, rating?: number, userId?: string) => 
    trackEvent('cheese_add_to_box', { cheese_id: cheeseId, rating }, userId),
  
  trackCheeseRate: (cheeseId: string, rating: number, userId?: string) => 
    trackEvent('cheese_rate', { cheese_id: cheeseId, rating }, userId),
  
  trackCheeseWishlistAdd: (cheeseId: string, userId?: string) => 
    trackEvent('cheese_wishlist_add', { cheese_id: cheeseId }, userId),
  
  trackCheeseWishlistRemove: (cheeseId: string, userId?: string) => 
    trackEvent('cheese_wishlist_remove', { cheese_id: cheeseId }, userId),
  
  trackCheeseShare: (cheeseId: string, method?: string, userId?: string) => 
    trackEvent('cheese_share', { cheese_id: cheeseId, share_method: method }, userId),
  
  // Pairing
  trackPairingView: (pairingId: string, userId?: string) => 
    trackEvent('pairing_view', { pairing_id: pairingId }, userId),
  
  trackPairingShare: (pairingId: string, method?: string, userId?: string) => 
    trackEvent('pairing_share', { pairing_id: pairingId, share_method: method }, userId),
  
  // Producer
  trackProducerView: (producerId: string, userId?: string) => 
    trackEvent('producer_view', { producer_id: producerId }, userId),
  
  // Article
  trackArticleView: (articleId: string, userId?: string) => 
    trackEvent('article_view', { article_id: articleId }, userId),
  
  trackArticleShare: (articleId: string, method?: string, userId?: string) => 
    trackEvent('article_share', { article_id: articleId, share_method: method }, userId),
  
  // Social
  trackUserFollow: (targetUserId: string, userId?: string) => 
    trackEvent('user_follow', { target_user_id: targetUserId }, userId),
  
  trackUserUnfollow: (targetUserId: string, userId?: string) => 
    trackEvent('user_unfollow', { target_user_id: targetUserId }, userId),
  
  trackProfileView: (profileUserId: string, userId?: string) => 
    trackEvent('profile_view', { target_user_id: profileUserId }, userId),
  
  trackShareLinkSet: (vanityUrl: string, userId?: string) => 
    trackEvent('share_link_set', { vanity_url: vanityUrl }, userId),
  
  // Notifications
  trackNotificationClick: (notificationType: string, notificationId?: string, userId?: string) => 
    trackEvent('notification_click', { notification_type: notificationType, notification_id: notificationId }, userId),
  
  trackNotificationsEnabled: (userId?: string) => 
    trackEvent('notifications_enabled', {}, userId),
  
  trackNotificationsDisabled: (userId?: string) => 
    trackEvent('notifications_disabled', {}, userId),
  
  // Session
  trackAppOpen: (userId?: string) => {
    resetSession();
    trackEvent('app_open', {}, userId);
  },
  
  trackSignup: (userId?: string) => 
    trackEvent('signup', {}, userId),
  
  trackLogin: (userId?: string) => 
    trackEvent('login', {}, userId),
  
  trackLogout: (userId?: string) => 
    trackEvent('logout', {}, userId),
  
  // AI Scanner
  trackAIScanStart: (userId?: string) => 
    trackEvent('ai_scan_start', {}, userId),
  
  trackAIScanSuccess: (confidence: string, userId?: string) => 
    trackEvent('ai_scan_success', { confidence }, userId),
  
  trackAIScanFail: (errorMessage?: string, userId?: string) => 
    trackEvent('ai_scan_fail', { error_message: errorMessage }, userId),
  
  // Page views
  trackAnalyticsPageView: (userId?: string) => 
    trackEvent('analytics_page_view', {}, userId),
  
  trackBadgesPageView: (userId?: string) => 
    trackEvent('badges_page_view', {}, userId),
};

export default Analytics;
