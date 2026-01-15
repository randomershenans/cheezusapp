# Cheezus Analytics Events

## Overview
Event tracking system for understanding user behavior in the Cheezus app. All events are stored in the `analytics_events` table and can be queried from the admin portal.

## Database Setup
Run `db/analytics-events-schema.sql` in your Supabase SQL editor to create:
- `analytics_events` table
- Indexes for efficient querying
- Helper views for common analytics queries

## Event Categories

### Feed Events (`feed`)
| Event | Description | Properties |
|-------|-------------|------------|
| `feed_view` | User views home feed | - |
| `feed_refresh` | User pulls to refresh | - |
| `feed_scroll_load_more` | Infinite scroll triggered | - |
| `feed_cheese_click` | User clicks cheese from feed | `cheese_id`, `position` |
| `feed_article_click` | User clicks article from feed | `article_id` |
| `feed_pairing_click` | User clicks pairing from feed | `pairing_id` |

### Search Events (`search`)
| Event | Description | Properties |
|-------|-------------|------------|
| `search_cheese` | User searches for cheese | `query`, `results_count` |
| `search_pairing` | User searches for pairing | `query`, `results_count` |
| `search_user` | User searches for users | `query`, `results_count` |
| `search_filter_apply` | User applies filters | `filters` |

### Cheese Events (`cheese`)
| Event | Description | Properties |
|-------|-------------|------------|
| `cheese_view` | User views cheese detail | `cheese_id` |
| `cheese_add_to_box` | User adds cheese to box | `cheese_id`, `rating` |
| `cheese_rate` | User updates rating | `cheese_id`, `rating` |
| `cheese_wishlist_add` | User adds to wishlist | `cheese_id` |
| `cheese_wishlist_remove` | User removes from wishlist | `cheese_id` |
| `cheese_share` | User shares cheese | `cheese_id`, `share_method` |

### Pairing Events (`pairing`)
| Event | Description | Properties |
|-------|-------------|------------|
| `pairing_view` | User views pairing detail | `pairing_id` |
| `pairing_share` | User shares pairing | `pairing_id`, `share_method` |

### Producer Events (`producer`)
| Event | Description | Properties |
|-------|-------------|------------|
| `producer_view` | User views producer page | `producer_id` |

### Article Events (`article`)
| Event | Description | Properties |
|-------|-------------|------------|
| `article_view` | User views article | `article_id` |
| `article_share` | User shares article | `article_id`, `share_method` |

### Social Events (`social`)
| Event | Description | Properties |
|-------|-------------|------------|
| `user_follow` | User follows another user | `target_user_id` |
| `user_unfollow` | User unfollows another user | `target_user_id` |
| `profile_view` | User views a profile | `target_user_id` |
| `share_link_set` | User sets vanity URL | `vanity_url` |

### Notification Events (`notification`)
| Event | Description | Properties |
|-------|-------------|------------|
| `notification_click` | User clicks notification | `notification_type`, `notification_id` |
| `notifications_enabled` | User enables push notifications | - |
| `notifications_disabled` | User disables push notifications | - |

### Session Events (`session`)
| Event | Description | Properties |
|-------|-------------|------------|
| `app_open` | App opened/foregrounded | - |
| `signup` | User signs up | - |
| `login` | User logs in | - |
| `logout` | User logs out | - |

### AI Events (`ai`)
| Event | Description | Properties |
|-------|-------------|------------|
| `ai_scan_start` | User starts AI label scan | - |
| `ai_scan_success` | AI scan succeeded | `confidence` |
| `ai_scan_fail` | AI scan failed | `error_message` |

## Useful SQL Queries for Admin Portal

### Daily Active Users
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(DISTINCT user_id) as dau
FROM analytics_events
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Most Popular Cheeses (Last 7 Days)
```sql
SELECT 
  properties->>'cheese_id' as cheese_id,
  COUNT(*) as views
FROM analytics_events
WHERE event_name = 'cheese_view'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY properties->>'cheese_id'
ORDER BY views DESC
LIMIT 20;
```

### Search Queries Frequency
```sql
SELECT 
  properties->>'query' as search_term,
  COUNT(*) as search_count
FROM analytics_events
WHERE event_name IN ('search_cheese', 'search_pairing')
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY properties->>'query'
ORDER BY search_count DESC
LIMIT 50;
```

### User Engagement Funnel
```sql
SELECT
  COUNT(DISTINCT CASE WHEN event_name = 'feed_view' THEN user_id END) as viewed_feed,
  COUNT(DISTINCT CASE WHEN event_name = 'cheese_view' THEN user_id END) as viewed_cheese,
  COUNT(DISTINCT CASE WHEN event_name = 'cheese_add_to_box' THEN user_id END) as added_to_box,
  COUNT(DISTINCT CASE WHEN event_name = 'cheese_share' THEN user_id END) as shared
FROM analytics_events
WHERE created_at > NOW() - INTERVAL '7 days';
```

### Notification Engagement
```sql
SELECT 
  properties->>'notification_type' as type,
  COUNT(*) as clicks
FROM analytics_events
WHERE event_name = 'notification_click'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY properties->>'notification_type'
ORDER BY clicks DESC;
```

### AI Scanner Usage
```sql
SELECT 
  event_name,
  COUNT(*) as count,
  DATE(created_at) as date
FROM analytics_events
WHERE event_category = 'ai'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY event_name, DATE(created_at)
ORDER BY date DESC;
```

## Pre-built Views

The schema includes these views for easy querying:

- `analytics_daily_summary` - Daily event counts by type
- `analytics_user_engagement` - Per-user engagement metrics
- `analytics_popular_cheeses` - Most viewed/interacted cheeses
- `analytics_search_queries` - Search query analytics

## Usage in Code

```typescript
import { Analytics } from '@/lib/analytics';

// Track events with the Analytics helper
Analytics.trackCheeseView(cheeseId, userId);
Analytics.trackFeedRefresh(userId);
Analytics.trackSearchCheese(query, resultsCount, userId);

// Or use the generic trackEvent function
import { trackEvent } from '@/lib/analytics';
trackEvent('custom_event', { custom_prop: 'value' }, userId);
```

## Notes
- Events are fire-and-forget (non-blocking)
- Anonymous users can be tracked (user_id will be null)
- Session IDs group events within app sessions
- Platform (ios/android/web) is auto-detected
