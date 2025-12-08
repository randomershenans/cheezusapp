# Cheezus Notification System

## Overview

The notification system consists of:
- **In-app notifications** - Shown in the notification bell/center
- **Push notifications** - Sent to device (requires additional setup)
- **User preferences** - Toggle notifications on/off by type

---

## Database Tables

### `notifications`
Stores all notifications for users.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Who receives the notification |
| `type` | TEXT | Notification type (see types below) |
| `title` | TEXT | Notification title |
| `body` | TEXT | Notification message |
| `data` | JSONB | Additional data (user_id, cheese_id, etc.) |
| `read` | BOOLEAN | Has user seen it? |
| `push_sent` | BOOLEAN | Was push notification sent? |
| `created_at` | TIMESTAMPTZ | When created |

### `notification_settings`
User preferences for notifications.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `user_id` | UUID | - | Primary key |
| `push_enabled` | BOOLEAN | true | Master push toggle |
| `push_follows` | BOOLEAN | true | Push for new followers |
| `push_badges` | BOOLEAN | true | Push for badges |
| `push_social_activity` | BOOLEAN | true | Push for friend activity |
| `push_recommendations` | BOOLEAN | true | Push for trending/suggestions |
| `push_reminders` | BOOLEAN | true | Push for reminders |
| `in_app_*` | BOOLEAN | true | Same toggles for in-app |
| `quiet_hours_enabled` | BOOLEAN | false | No pushes during quiet hours |
| `quiet_hours_start` | TIME | 22:00 | Quiet hours start |
| `quiet_hours_end` | TIME | 08:00 | Quiet hours end |

---

## Notification Types

### Core Social (Automatic Triggers)

#### 1. `follow`
**When:** Someone follows you
**Trigger:** `on_follow_notify` on `follows` table INSERT
**Title:** "New Follower! 👋"
**Body:** "[Name] started following you"
**Data:**
```json
{
  "user_id": "uuid",
  "user_name": "Ross",
  "user_avatar": "https://..."
}
```
**Navigation:** Tapping opens follower's profile

---

#### 2. `badge_earned`
**When:** You unlock a badge
**Trigger:** `on_badge_earned_notify` on `user_badges` table INSERT/UPDATE (when `completed` becomes true)
**Title:** "Badge Unlocked! 🏆"
**Body:** "You earned the '[Badge Name]' badge!"
**Data:**
```json
{
  "badge_id": "uuid",
  "badge_name": "Cheese Explorer",
  "badge_icon": "🧀"
}
```
**Navigation:** Tapping opens badges page

---

#### 3. `cheese_approved`
**When:** A cheese you submitted gets approved
**Trigger:** `on_cheese_approved_notify` on `producer_cheeses` table UPDATE (when `status` becomes 'approved')
**Title:** "Cheese Approved! ✅"
**Body:** "Your cheese '[Cheese Name]' is now live!"
**Data:**
```json
{
  "cheese_id": "uuid",
  "cheese_name": "Époisses de Bourgogne"
}
```
**Navigation:** Tapping opens the cheese page

---

#### 4. `cheese_copied`
**When:** Someone adds a cheese to their box that you have in yours
**Trigger:** `on_cheese_copied_notify` on `cheese_box_entries` table INSERT
**Title:** "Your Taste is Spreading! 🔥"
**Body:** "[Name] added [Cheese] to their box from yours!"
**Data:**
```json
{
  "user_id": "uuid",
  "user_name": "Emma",
  "cheese_id": "uuid",
  "cheese_name": "Manchego"
}
```
**Navigation:** Tapping opens the cheese page

---

### Social Feed (Automatic Triggers)

#### 5. `following_logged_cheese`
**When:** Someone you follow logs a cheese to their box
**Trigger:** `on_cheese_log_notify_followers` on `cheese_box_entries` table INSERT
**Title:** "🧀 [Name] tried a cheese!"
**Body:** "[Name] just logged [Cheese Name]"
**Data:**
```json
{
  "user_id": "uuid",
  "user_name": "Sarah",
  "user_avatar": "https://...",
  "cheese_id": "uuid",
  "cheese_name": "Comté",
  "cheese_image": "https://...",
  "rating": 4.5
}
```
**Navigation:** Tapping opens the cheese page

---

#### 6. `following_earned_badge`
**When:** Someone you follow earns a badge
**Trigger:** `on_badge_notify_followers` on `user_badges` table INSERT/UPDATE
**Title:** "🎉 [Name] earned a badge!"
**Body:** "[Name] just unlocked '[Badge Name]'"
**Data:**
```json
{
  "user_id": "uuid",
  "user_name": "Mike",
  "user_avatar": "https://...",
  "badge_id": "uuid",
  "badge_name": "Cheese Connoisseur",
  "badge_icon": "🏅"
}
```
**Navigation:** Tapping opens their profile

---

#### 7. `following_added_wishlist`
**When:** Someone you follow adds a cheese to their wishlist
**Trigger:** `on_wishlist_notify_followers` on `wishlists` table INSERT
**Title:** "💛 [Name] wants to try something!"
**Body:** "[Name] added [Cheese] to their wishlist"
**Data:**
```json
{
  "user_id": "uuid",
  "user_name": "Alex",
  "user_avatar": "https://...",
  "cheese_id": "uuid",
  "cheese_name": "Gruyère",
  "cheese_image": "https://..."
}
```
**Navigation:** Tapping opens the cheese page

---

### Milestones (Automatic Triggers)

#### 8. `friend_milestone`
**When:** Someone you follow hits a cheese count milestone (10, 25, 50, 100, 250, 500)
**Trigger:** `on_milestone_notify_followers` on `cheese_box_entries` table INSERT
**Title:** "🎊 [Name] hit [X] cheeses!"
**Body:** "Celebrate with them! They just reached a major milestone."
**Data:**
```json
{
  "user_id": "uuid",
  "user_name": "Ross",
  "user_avatar": "https://...",
  "milestone": 50
}
```
**Navigation:** Tapping opens their profile

---

#### 9. `milestone_approaching`
**When:** You're 1 cheese away from a milestone
**Trigger:** `on_milestone_approaching` on `cheese_box_entries` table INSERT
**Title:** "Almost There! 🎯"
**Body:** "Just 1 more cheese to hit [X]!"
**Data:**
```json
{
  "next_milestone": 50,
  "current_count": 49
}
```
**Navigation:** Tapping opens cheese box

---

### Scheduled Notifications (Cron Jobs)

These run on a schedule via pg_cron.

#### 10. `trending_cheese`
**Schedule:** Every Monday at 9am UTC
**Cron:** `0 9 * * 1`
**Function:** `send_trending_cheese_notifications()`
**Logic:** Finds the most-added cheese in the last 7 days, notifies users who haven't tried it
**Title:** "📈 Trending This Week!"
**Body:** "[Cheese Name] - [X] people tried it!"
**Data:**
```json
{
  "cheese_id": "uuid",
  "cheese_name": "Brie de Meaux",
  "cheese_image": "https://...",
  "add_count": 47
}
```

---

#### 11. `wishlist_reminder`
**Schedule:** Every Wednesday at 10am UTC
**Cron:** `0 10 * * 3`
**Function:** `send_wishlist_reminders()`
**Logic:** Finds wishlist items older than 7 days that haven't been tried yet
**Title:** "Still on Your List! 💛"
**Body:** "Ready to try [Cheese Name]?"
**Data:**
```json
{
  "cheese_id": "uuid",
  "cheese_name": "Roquefort",
  "cheese_image": "https://..."
}
```

---

#### 12. `inactive_nudge`
**Schedule:** Every Friday at 11am UTC
**Cron:** `0 11 * * 5`
**Function:** `send_inactive_nudges()`
**Logic:** Finds users who haven't logged a cheese in 7+ days, won't spam (max 1 per week)
**Title:** "We Miss You! 🧀"
**Body:** "Your friends tried [X] cheeses this week!" or "New cheeses are waiting to be discovered!"
**Data:**
```json
{
  "friend_activity_count": 12
}
```

---

#### 13. `weekly_leaderboard`
**Schedule:** Every Sunday at 6pm UTC
**Cron:** `0 18 * * 0`
**Function:** `send_weekly_leaderboard()`
**Logic:** Notifies top 10 users of the week with their rank
**Title:** "🥇 #1 This Week!" / "🥈 #2 This Week!" / "🏅 Top 10 This Week!"
**Body:** "You tried [X] cheeses and ranked #[Y]!"
**Data:**
```json
{
  "rank": 1,
  "cheese_count": 15
}
```

---

### Future/Manual Notifications

#### 14. `system`
**When:** Manual announcements (new features, maintenance, etc.)
**Function:** `send_system_announcement(title, body, data)`
**Usage:**
```sql
SELECT send_system_announcement(
  'New Feature! 🎉',
  'You can now share your cheese box with friends!',
  '{"feature": "sharing"}'::jsonb
);
```

---

## Helper Functions

### `notify_followers(user_id, type, title, body, data)`
Sends a notification to all followers of a user. Used internally by social triggers.

### `send_notification_to_user(user_id, type, title, body, data)`
Send a single notification to a specific user. Useful for testing or custom notifications.

```sql
SELECT send_notification_to_user(
  'user-uuid-here',
  'system',
  'Test Notification',
  'This is a test!',
  '{}'::jsonb
);
```

---

## App Components

### `NotificationBell` (`components/NotificationBell.tsx`)
- Shows bell icon with unread count badge
- Used on all main tab screens (Home, Discover, Cheese Box, Profile)
- Has realtime subscription for live updates
- Tapping navigates to `/notifications`

### Notifications Page (`app/notifications.tsx`)
- Lists all notifications
- Pull to refresh
- Mark all as read button
- Settings button → notification settings
- Tapping notification marks as read and navigates appropriately

### Notification Settings (`app/notification-settings.tsx`)
- Master push toggle
- Individual toggles by category
- In-app notification toggles
- Quiet hours setting

---

## Cron Job Management

### View scheduled jobs
```sql
SELECT * FROM cron.job;
```

### Disable a job
```sql
UPDATE cron.job SET active = false WHERE jobname = 'trending-cheese-weekly';
```

### Re-enable a job
```sql
UPDATE cron.job SET active = true WHERE jobname = 'trending-cheese-weekly';
```

### Delete a job
```sql
SELECT cron.unschedule('trending-cheese-weekly');
```

### Manually run a scheduled function
```sql
SELECT send_trending_cheese_notifications();
SELECT send_wishlist_reminders();
SELECT send_inactive_nudges();
SELECT send_weekly_leaderboard();
```

---

## Push Notifications

Push notifications are fully implemented!

### How It Works

1. **App Launch**: `PushNotificationHandler` component registers for push permissions
2. **Token Storage**: Expo push token saved to `push_tokens` table
3. **Notification Created**: Database trigger calls Edge Function
4. **Edge Function**: Checks user settings, quiet hours, then sends via Expo Push API
5. **Device Receives**: Push appears on device, tapping navigates to relevant screen

### Database Table: `push_tokens`

```sql
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### App Components

- **`lib/push-notifications.ts`** - Registration, token management, listeners
- **`components/PushNotificationHandler.tsx`** - Handles registration and navigation on tap
- **`supabase/functions/send-push-notification/`** - Edge Function that sends pushes

### Edge Function Deployment

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy send-push-notification
```

### Database Webhook Setup

1. Go to **Database → Webhooks** in Supabase Dashboard
2. Create webhook:
   - **Name**: `send-push-notification`
   - **Table**: `notifications`
   - **Events**: `INSERT`
   - **Type**: `Supabase Edge Function`
   - **Function**: `send-push-notification`

### User Settings Respected

The Edge Function checks:
- `push_enabled` - Master toggle
- `push_follows`, `push_badges`, `push_social_activity`, `push_recommendations`, `push_reminders` - Category toggles
- `quiet_hours_enabled`, `quiet_hours_start`, `quiet_hours_end` - No pushes during quiet hours

### Logout Behavior

When user logs out, their push token is removed from the database to prevent receiving notifications for that account

---

## Testing

### Create a test notification
```sql
SELECT send_notification_to_user(
  'your-user-id',
  'system',
  'Test! 🧀',
  'If you see this, notifications work!',
  '{}'::jsonb
);
```

### Simulate a follow (triggers notification)
```sql
INSERT INTO follows (follower_id, following_id)
VALUES ('follower-uuid', 'your-uuid');
```

### Check recent notifications
```sql
SELECT * FROM notifications 
ORDER BY created_at DESC 
LIMIT 20;
```

### Check unread count for a user
```sql
SELECT COUNT(*) FROM notifications 
WHERE user_id = 'your-uuid' AND read = false;
```
