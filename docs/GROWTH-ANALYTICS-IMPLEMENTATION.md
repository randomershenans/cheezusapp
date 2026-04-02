# Growth Plan Analytics — Implementation Spec

**Created:** 1 April 2026
**Purpose:** Events that need to be added to `lib/analytics.ts` to measure the Cheezus Growth Plan (office-space/cheezus/GROWTH-PLAN.md)
**Status:** Ready for implementation

---

## Summary

The existing analytics system (68 events) covers core product usage. The growth plan requires **~30 new events** across 5 new categories plus enhancements to 3 existing events. None of the growth/social/invite funnel metrics can be measured today.

---

## 1. New Event Categories to Add

Add these to the `EventCategory` type:

```typescript
| 'invite'
| 'contact_sync'
| 'activity_feed'
| 'share_prompt'
| 'onboarding'
```

## 2. New Events to Add to `EventName` Type

### Invite Flow Funnel (`invite`)

| Event | Properties | What It Measures |
|-------|-----------|-----------------|
| `invite_prompt_shown` | `prompt_type`, `trigger` (after_log / milestone / home_card / in_app), `user_cheeses_count` | How many users see invite prompts |
| `invite_prompt_dismissed` | `prompt_type` | Dismiss rate — if >80%, placement/copy is wrong |
| `invite_tapped` | `prompt_type` | User started the invite flow |
| `invite_method_selected` | `method` (sms / whatsapp / link_copy / other) | Which share channel wins — double down on winner |
| `invite_sent` | `method` | Actually completed the share (not just opened share sheet) |
| `invite_link_opened` | `invite_code`, `referrer_id` | Recipient clicked the link (track via deep link handler) |
| `invite_converted_install` | `invite_code`, `referrer_id` | Recipient installed (attribution — may need server-side) |
| `invite_converted_signup` | `invite_code`, `referrer_id` | Recipient created account via invite |
| `invite_auto_follow_completed` | `inviter_id`, `invitee_id` | Deep link auto-follow worked (critical — if this breaks silently, the whole loop dies) |

### Contact Sync / Friend Discovery (`contact_sync`)

| Event | Properties | What It Measures |
|-------|-----------|-----------------|
| `contact_sync_prompt_shown` | `context` (onboarding / settings) | Is it surfacing? |
| `contact_sync_granted` | — | Opt-in rate — if <20%, copy needs to explain value better |
| `contact_sync_denied` | `reason` (dismissed / system_denied) | Why people say no |
| `contacts_matched` | `count` | How many existing users found per sync |
| `friend_suggestion_shown` | `suggestion_count` | Are we surfacing "people you may know"? |
| `follow_from_suggestion` | `target_user_id` | Are suggestions converting to follows? |

### Activity Feed (`activity_feed`)

| Event | Properties | What It Measures |
|-------|-----------|-----------------|
| `activity_feed_viewed` | — | Are people checking the feed? If low, not prominent enough |
| `activity_feed_scroll_depth` | `max_items_seen` | Reading or bouncing? |
| `activity_feed_tap` | `item_type` (log / cheese / profile), `item_id` | Feed driving engagement, not just eyeballs |

### Friend Notifications (`notification` — extend existing category)

| Event | Properties | What It Measures |
|-------|-----------|-----------------|
| `friend_notification_received` | `notification_type` | Notification actually delivered |
| `friend_notification_opened` | `notification_type` | Notification → app open — THE return trigger |
| `friend_notification_action_taken` | `notification_type`, `action` (log / wishlist / browse) | Did they act or just open and close? |

### Share Prompts (`share_prompt`)

| Event | Properties | What It Measures |
|-------|-----------|-----------------|
| `share_prompt_shown` | `trigger` (first_log / milestone / cheese_page / collection), `milestone_count` | Are prompts surfacing at natural moments? |
| `share_prompt_dismissed` | `trigger` | Are people closing them? |
| `share_prompt_tapped` | `trigger` | Did the prompt drive a share? |

### Onboarding (`onboarding`)

| Event | Properties | What It Measures |
|-------|-----------|-----------------|
| `app_first_open` | — | Timestamp of very first app open (for install → signup time calc) |
| `onboarding_step_viewed` | `step` (welcome / sign_in_method / profile_setup / contact_sync) | Where do people drop off in onboarding? |
| `onboarding_completed` | `method` (email / apple / google), `had_invite_code` | Full onboarding funnel completion |

## 3. Enhancements to Existing Events

### `user_follow` → add `source` property
```typescript
// BEFORE
trackUserFollow: (targetUserId: string, userId?: string) =>
  trackEvent('user_follow', { target_user_id: targetUserId }, userId),

// AFTER
trackUserFollow: (targetUserId: string, source: 'profile' | 'suggestion' | 'invite' | 'search' | 'auto_follow', userId?: string) =>
  trackEvent('user_follow', { target_user_id: targetUserId, source }, userId),
```

### `signup` → add `method` and `invite_code`
```typescript
// BEFORE
trackSignup: (userId?: string) =>
  trackEvent('signup', {}, userId),

// AFTER
trackSignup: (method: 'email' | 'apple' | 'google', inviteCode?: string, userId?: string) =>
  trackEvent('signup', { method, invite_code: inviteCode }, userId),
```

### `app_open` → add `is_first_open` flag
```typescript
// Track whether this is the very first open (use AsyncStorage flag)
trackAppOpen: (isFirstOpen?: boolean, userId?: string) => {
  resetSession();
  trackEvent('app_open', { is_first_open: isFirstOpen }, userId);
  if (isFirstOpen) {
    trackEvent('app_first_open', {}, userId);
  }
},
```

## 4. New EventProperties to Add

```typescript
export interface EventProperties {
  // ... existing properties ...

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
}
```

## 5. New Helper Functions to Add to `Analytics` Object

```typescript
// Invite flow
trackInvitePromptShown: (promptType: string, trigger: string, cheesesCount?: number, userId?: string) => ...
trackInvitePromptDismissed: (promptType: string, userId?: string) => ...
trackInviteTapped: (promptType: string, userId?: string) => ...
trackInviteMethodSelected: (method: string, userId?: string) => ...
trackInviteSent: (method: string, userId?: string) => ...
trackInviteLinkOpened: (inviteCode: string, referrerId: string) => ...
trackInviteConvertedSignup: (inviteCode: string, referrerId: string, userId?: string) => ...
trackInviteAutoFollowCompleted: (inviterId: string, inviteeId: string, userId?: string) => ...

// Contact sync
trackContactSyncPromptShown: (context: string, userId?: string) => ...
trackContactSyncGranted: (userId?: string) => ...
trackContactSyncDenied: (reason: string, userId?: string) => ...
trackContactsMatched: (count: number, userId?: string) => ...
trackFriendSuggestionShown: (count: number, userId?: string) => ...
trackFollowFromSuggestion: (targetUserId: string, userId?: string) => ...

// Activity feed
trackActivityFeedViewed: (userId?: string) => ...
trackActivityFeedScrollDepth: (maxItemsSeen: number, userId?: string) => ...
trackActivityFeedTap: (itemType: string, itemId: string, userId?: string) => ...

// Friend notifications
trackFriendNotificationReceived: (notificationType: string, userId?: string) => ...
trackFriendNotificationOpened: (notificationType: string, userId?: string) => ...
trackFriendNotificationActionTaken: (notificationType: string, action: string, userId?: string) => ...

// Share prompts
trackSharePromptShown: (trigger: string, milestoneCount?: number, userId?: string) => ...
trackSharePromptDismissed: (trigger: string, userId?: string) => ...
trackSharePromptTapped: (trigger: string, userId?: string) => ...

// Onboarding
trackAppFirstOpen: (userId?: string) => ...
trackOnboardingStepViewed: (step: string, userId?: string) => ...
trackOnboardingCompleted: (method: string, hadInviteCode: boolean, userId?: string) => ...
```

## 6. Where to Instrument (Screens/Components)

| Event Group | Where to Add Tracking Calls |
|------------|---------------------------|
| Invite prompts | New invite prompt component (to be built) — after logging cheese, milestone screens, home screen card |
| Invite sent | Share sheet handler — need to detect completion vs cancellation |
| Invite deep links | `app/@[username].tsx` or new deep link handler — track `invite_link_opened`, auto-follow |
| Contact sync | New contact sync screen (to be built) — during onboarding or from settings |
| Activity feed | New activity feed component (to be built) — `onViewableItemsChanged` for scroll depth |
| Friend notifications | `app/notifications.tsx` — filter for friend-type notifications |
| Share prompts | New share prompt component — after `cheese_add_to_box`, milestone check, cheese detail page |
| Onboarding | `app/auth/signup.tsx`, `app/auth/login.tsx` — add method tracking |
| First open | `app/_layout.tsx` — AsyncStorage check on mount |
| Follow source | `app/profile/[id].tsx`, follower suggestions, invite auto-follow — pass source param |

## 7. Supabase Schema Update

Add new analytics views for growth dashboard:

```sql
-- Invite funnel view
CREATE OR REPLACE VIEW analytics_invite_funnel AS
SELECT
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE event_name = 'invite_prompt_shown') as prompts_shown,
  COUNT(*) FILTER (WHERE event_name = 'invite_prompt_dismissed') as prompts_dismissed,
  COUNT(*) FILTER (WHERE event_name = 'invite_tapped') as invites_tapped,
  COUNT(*) FILTER (WHERE event_name = 'invite_sent') as invites_sent,
  COUNT(*) FILTER (WHERE event_name = 'invite_link_opened') as links_opened,
  COUNT(*) FILTER (WHERE event_name = 'invite_converted_signup') as signups
FROM analytics_events
WHERE event_category = 'invite'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Social health dashboard view
CREATE OR REPLACE VIEW analytics_social_health AS
SELECT
  DATE(created_at) as date,
  COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'activity_feed_viewed') as feed_viewers,
  COUNT(*) FILTER (WHERE event_name = 'activity_feed_tap') as feed_taps,
  COUNT(*) FILTER (WHERE event_name = 'friend_notification_opened') as notif_opens,
  COUNT(*) FILTER (WHERE event_name = 'friend_notification_action_taken') as notif_actions,
  COUNT(*) FILTER (WHERE event_name = 'user_follow') as follows,
  COUNT(*) FILTER (WHERE event_name = 'follow_from_suggestion') as follows_from_suggestions
FROM analytics_events
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Retention by friend cohort (weekly)
-- Users WITH friends vs WITHOUT friends
CREATE OR REPLACE VIEW analytics_retention_by_friends AS
WITH user_friends AS (
  SELECT DISTINCT user_id, TRUE as has_friends
  FROM analytics_events
  WHERE event_name = 'user_follow'
),
weekly_active AS (
  SELECT
    user_id,
    DATE_TRUNC('week', created_at) as week
  FROM analytics_events
  WHERE event_name IN ('app_open', 'feed_view', 'cheese_view')
  GROUP BY user_id, DATE_TRUNC('week', created_at)
)
SELECT
  wa.week,
  COALESCE(uf.has_friends, FALSE) as has_friends,
  COUNT(DISTINCT wa.user_id) as active_users
FROM weekly_active wa
LEFT JOIN user_friends uf ON wa.user_id = uf.user_id
GROUP BY wa.week, COALESCE(uf.has_friends, FALSE)
ORDER BY wa.week DESC;
```

## 8. Growth Plan Metric → Event Mapping

| Growth Plan Metric | Events Needed | Status |
|-------------------|--------------|--------|
| Install → Account Rate | `app_first_open` + `signup` | **NEW** (app_first_open) |
| Time from install to account | `app_first_open` timestamp vs `signup` timestamp | **NEW** |
| Invites sent per WET user | `invite_sent` per user per week | **NEW** |
| Invite → Install rate | `invite_link_opened` → `invite_converted_install` | **NEW** |
| Invite → Account rate | `invite_converted_signup` / `invite_converted_install` | **NEW** |
| Users with ≥1 mutual follow | Query `follows` table (not analytics) | **EXISTS** (DB query) |
| D1/D7/D30 retention (friend cohort) | `app_open` + `follows` table join | **EXISTS** (needs SQL view) |
| Push notification open rate | `friend_notification_received` → `friend_notification_opened` | **NEW** |
| WET growth | `cheese_add_to_box` per unique user per week | **EXISTS** |
| Share events per WAU | `share_prompt_tapped` + existing share events | **PARTIAL** |
| K-factor | `invite_sent` × `invite_converted_signup` / total users | **NEW** |
| Contact sync opt-in rate | `contact_sync_granted` / `contact_sync_prompt_shown` | **NEW** |
| Median follows per user | Query `follows` table | **EXISTS** (DB query) |
| Feed views per user per week | `activity_feed_viewed` per user per week | **NEW** |

---

*This spec covers analytics instrumentation only. The features themselves (invite flow, contact sync, activity feed, share prompts) need to be built as separate tasks. The events should be added to `lib/analytics.ts` first so they're ready to call when the features land.*
