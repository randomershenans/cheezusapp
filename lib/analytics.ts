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
  | 'share'
  | 'invite'
  | 'contact_sync'
  | 'activity_feed'
  | 'share_prompt'
  | 'onboarding';

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
  | 'badges_page_view'
  // Invite flow events
  | 'invite_prompt_shown'
  | 'invite_prompt_dismissed'
  | 'invite_tapped'
  | 'invite_method_selected'
  | 'invite_sent'
  | 'invite_link_opened'
  | 'invite_converted_install'
  | 'invite_converted_signup'
  | 'invite_auto_follow_completed'
  // Contact sync events
  | 'contact_sync_prompt_shown'
  | 'contact_sync_granted'
  | 'contact_sync_denied'
  | 'contacts_matched'
  | 'friend_suggestion_shown'
  | 'follow_from_suggestion'
  // Activity feed events
  | 'activity_feed_viewed'
  | 'activity_feed_scroll_depth'
  | 'activity_feed_tap'
  // Friend notification events
  | 'friend_notification_received'
  | 'friend_notification_opened'
  | 'friend_notification_action_taken'
  // Share prompt events
  | 'share_prompt_shown'
  | 'share_prompt_dismissed'
  | 'share_prompt_tapped'
  // Share events
  | 'profile_share'
  | 'event_share'
  | 'producer_share'
  // Onboarding events
  | 'app_first_open'
  | 'onboarding_step_viewed'
  | 'onboarding_completed';

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

  // Invite flow
  invite_code?: string;
  referrer_id?: string;
  inviter_id?: string;
  invitee_id?: string;
  prompt_type?: string;
  trigger?: string;
  method?: string;

  // Contact sync
  context?: string;
  reason?: string;
  count?: number;
  suggestion_count?: number;

  // Activity feed
  max_items_seen?: number;
  item_type?: string;
  item_id?: string;

  // Share prompts
  milestone_count?: number;

  // Onboarding
  step?: string;
  had_invite_code?: boolean;
  is_first_open?: boolean;

  // Follow source
  source?: string;

  // Action tracking
  action?: string;

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
  // Invite flow
  invite_prompt_shown: 'invite',
  invite_prompt_dismissed: 'invite',
  invite_tapped: 'invite',
  invite_method_selected: 'invite',
  invite_sent: 'invite',
  invite_link_opened: 'invite',
  invite_converted_install: 'invite',
  invite_converted_signup: 'invite',
  invite_auto_follow_completed: 'invite',
  // Contact sync
  contact_sync_prompt_shown: 'contact_sync',
  contact_sync_granted: 'contact_sync',
  contact_sync_denied: 'contact_sync',
  contacts_matched: 'contact_sync',
  friend_suggestion_shown: 'contact_sync',
  follow_from_suggestion: 'contact_sync',
  // Activity feed
  activity_feed_viewed: 'activity_feed',
  activity_feed_scroll_depth: 'activity_feed',
  activity_feed_tap: 'activity_feed',
  // Friend notifications
  friend_notification_received: 'notification',
  friend_notification_opened: 'notification',
  friend_notification_action_taken: 'notification',
  // Share prompts
  share_prompt_shown: 'share_prompt',
  share_prompt_dismissed: 'share_prompt',
  share_prompt_tapped: 'share_prompt',
  // Share
  profile_share: 'share',
  event_share: 'share',
  producer_share: 'share',
  // Onboarding
  app_first_open: 'onboarding',
  onboarding_step_viewed: 'onboarding',
  onboarding_completed: 'onboarding',
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
  trackUserFollow: (targetUserId: string, source: 'profile' | 'suggestion' | 'invite' | 'search' | 'auto_follow', userId?: string) =>
    trackEvent('user_follow', { target_user_id: targetUserId, source }, userId),
  
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
  trackAppOpen: (isFirstOpen?: boolean, userId?: string) => {
    resetSession();
    trackEvent('app_open', { is_first_open: isFirstOpen }, userId);
    if (isFirstOpen) {
      trackEvent('app_first_open', {}, userId);
    }
  },

  trackSignup: (method: 'email' | 'apple' | 'google', inviteCode?: string, userId?: string) =>
    trackEvent('signup', { method, invite_code: inviteCode }, userId),
  
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

  // Invite flow
  trackInvitePromptShown: (promptType: string, trigger: string, cheesesCount?: number, userId?: string) =>
    trackEvent('invite_prompt_shown', { prompt_type: promptType, trigger, count: cheesesCount }, userId),

  trackInvitePromptDismissed: (promptType: string, userId?: string) =>
    trackEvent('invite_prompt_dismissed', { prompt_type: promptType }, userId),

  trackInviteTapped: (promptType: string, userId?: string) =>
    trackEvent('invite_tapped', { prompt_type: promptType }, userId),

  trackInviteMethodSelected: (method: string, userId?: string) =>
    trackEvent('invite_method_selected', { method }, userId),

  trackInviteSent: (method: string, userId?: string) =>
    trackEvent('invite_sent', { method }, userId),

  trackInviteLinkOpened: (inviteCode: string, referrerId: string) =>
    trackEvent('invite_link_opened', { invite_code: inviteCode, referrer_id: referrerId }),

  trackInviteConvertedInstall: (inviteCode: string, referrerId: string) =>
    trackEvent('invite_converted_install', { invite_code: inviteCode, referrer_id: referrerId }),

  trackInviteConvertedSignup: (inviteCode: string, referrerId: string, userId?: string) =>
    trackEvent('invite_converted_signup', { invite_code: inviteCode, referrer_id: referrerId }, userId),

  trackInviteAutoFollowCompleted: (inviterId: string, inviteeId: string, userId?: string) =>
    trackEvent('invite_auto_follow_completed', { inviter_id: inviterId, invitee_id: inviteeId }, userId),

  // Contact sync
  trackContactSyncPromptShown: (context: string, userId?: string) =>
    trackEvent('contact_sync_prompt_shown', { context }, userId),

  trackContactSyncGranted: (userId?: string) =>
    trackEvent('contact_sync_granted', {}, userId),

  trackContactSyncDenied: (reason: string, userId?: string) =>
    trackEvent('contact_sync_denied', { reason }, userId),

  trackContactsMatched: (count: number, userId?: string) =>
    trackEvent('contacts_matched', { count }, userId),

  trackFriendSuggestionShown: (count: number, userId?: string) =>
    trackEvent('friend_suggestion_shown', { suggestion_count: count }, userId),

  trackFollowFromSuggestion: (targetUserId: string, userId?: string) =>
    trackEvent('follow_from_suggestion', { target_user_id: targetUserId }, userId),

  // Activity feed
  trackActivityFeedViewed: (userId?: string) =>
    trackEvent('activity_feed_viewed', {}, userId),

  trackActivityFeedScrollDepth: (maxItemsSeen: number, userId?: string) =>
    trackEvent('activity_feed_scroll_depth', { max_items_seen: maxItemsSeen }, userId),

  trackActivityFeedTap: (itemType: string, itemId: string, userId?: string) =>
    trackEvent('activity_feed_tap', { item_type: itemType, item_id: itemId }, userId),

  // Friend notifications
  trackFriendNotificationReceived: (notificationType: string, userId?: string) =>
    trackEvent('friend_notification_received', { notification_type: notificationType }, userId),

  trackFriendNotificationOpened: (notificationType: string, userId?: string) =>
    trackEvent('friend_notification_opened', { notification_type: notificationType }, userId),

  trackFriendNotificationActionTaken: (notificationType: string, action: string, userId?: string) =>
    trackEvent('friend_notification_action_taken', { notification_type: notificationType, action }, userId),

  // Share prompts
  trackSharePromptShown: (trigger: string, milestoneCount?: number, userId?: string) =>
    trackEvent('share_prompt_shown', { trigger, milestone_count: milestoneCount }, userId),

  trackSharePromptDismissed: (trigger: string, userId?: string) =>
    trackEvent('share_prompt_dismissed', { trigger }, userId),

  trackSharePromptTapped: (trigger: string, userId?: string) =>
    trackEvent('share_prompt_tapped', { trigger }, userId),

  // Onboarding
  trackAppFirstOpen: (userId?: string) =>
    trackEvent('app_first_open', {}, userId),

  trackOnboardingStepViewed: (step: string, userId?: string) =>
    trackEvent('onboarding_step_viewed', { step }, userId),

  trackOnboardingCompleted: (method: string, hadInviteCode: boolean, userId?: string) =>
    trackEvent('onboarding_completed', { method, had_invite_code: hadInviteCode }, userId),

  // Share helpers
  trackProfileShare: (method?: string, userId?: string) =>
    trackEvent('profile_share', { share_method: method }, userId),

  trackEventShare: (eventId: string, method?: string, userId?: string) =>
    trackEvent('event_share', { item_id: eventId, share_method: method }, userId),
};

export default Analytics;
