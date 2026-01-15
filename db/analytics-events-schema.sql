-- Analytics Events Table for Cheezus App
-- This table stores all user analytics events for the admin portal

-- Create the analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event identification
  event_name TEXT NOT NULL,
  event_category TEXT NOT NULL,
  
  -- User context (nullable for anonymous users)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Event properties (flexible JSON for different event types)
  properties JSONB DEFAULT '{}',
  
  -- Context
  platform TEXT DEFAULT 'mobile', -- 'ios', 'android', 'web'
  app_version TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Session tracking (optional)
  session_id TEXT
);

-- Indexes for efficient querying in admin portal
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_category ON analytics_events(event_category);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_platform ON analytics_events(platform);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_name_date 
  ON analytics_events(event_name, created_at DESC);

-- RLS Policies
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow inserts from authenticated and anonymous users
CREATE POLICY "Anyone can insert events" ON analytics_events
  FOR INSERT
  WITH CHECK (true);

-- Only allow service role to read (for admin portal)
CREATE POLICY "Service role can read all events" ON analytics_events
  FOR SELECT
  USING (auth.role() = 'service_role');

-- Allow admin users to read all events (for web admin portal)
CREATE POLICY "Admin users can read all events" ON analytics_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Helpful views for admin portal

-- Daily event counts
CREATE OR REPLACE VIEW analytics_daily_summary AS
SELECT 
  DATE(created_at) as date,
  event_name,
  event_category,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT session_id) as unique_sessions
FROM analytics_events
GROUP BY DATE(created_at), event_name, event_category
ORDER BY date DESC, event_count DESC;

-- User engagement summary
CREATE OR REPLACE VIEW analytics_user_engagement AS
SELECT 
  user_id,
  COUNT(*) as total_events,
  COUNT(DISTINCT event_name) as unique_event_types,
  MIN(created_at) as first_event,
  MAX(created_at) as last_event,
  COUNT(DISTINCT DATE(created_at)) as active_days
FROM analytics_events
WHERE user_id IS NOT NULL
GROUP BY user_id
ORDER BY total_events DESC;

-- Popular cheeses (most viewed/interacted)
CREATE OR REPLACE VIEW analytics_popular_cheeses AS
SELECT 
  properties->>'cheese_id' as cheese_id,
  COUNT(*) FILTER (WHERE event_name = 'cheese_view') as views,
  COUNT(*) FILTER (WHERE event_name = 'cheese_add_to_box') as added_to_box,
  COUNT(*) FILTER (WHERE event_name = 'cheese_share') as shares,
  COUNT(*) FILTER (WHERE event_name = 'cheese_wishlist') as wishlisted
FROM analytics_events
WHERE event_category = 'cheese' AND properties->>'cheese_id' IS NOT NULL
GROUP BY properties->>'cheese_id'
ORDER BY views DESC;

-- Search analytics
CREATE OR REPLACE VIEW analytics_search_queries AS
SELECT 
  properties->>'query' as search_query,
  event_name,
  COUNT(*) as search_count,
  AVG((properties->>'results_count')::int) as avg_results
FROM analytics_events
WHERE event_category = 'search'
GROUP BY properties->>'query', event_name
ORDER BY search_count DESC;

-- Comment: Run this SQL in your Supabase SQL editor to set up analytics tracking
