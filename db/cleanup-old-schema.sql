-- ============================================
-- CLEANUP: Remove Old Schema Elements
-- ============================================
-- Run this if you previously ran an old version of the schema
-- that created tables/views we don't need

-- ============================================
-- 1. Drop Old Views (to fix timestamp mismatches)
-- ============================================
DROP VIEW IF EXISTS cheese_type_stats CASCADE;
DROP VIEW IF EXISTS producer_cheese_stats CASCADE;

-- ============================================
-- 2. Drop Unused cheese_ratings Tables
-- ============================================
-- We use cheese_box_entries instead, so these aren't needed
DROP TABLE IF EXISTS cheese_ratings CASCADE;
DROP TABLE IF EXISTS old_cheese_ratings CASCADE;

-- ============================================
-- 3. Drop Old Functions (will be recreated)
-- ============================================
DROP FUNCTION IF EXISTS get_top_producer_cheeses(UUID, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_producer_cheeses_by_type(UUID, DECIMAL, BOOLEAN, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS search_cheese_types(VARCHAR) CASCADE;

-- ============================================
-- 4. Drop Old RLS Policies (will be recreated)
-- ============================================
-- Drop policies on cheese_types
DROP POLICY IF EXISTS "Cheese types are viewable by everyone" ON cheese_types;
DROP POLICY IF EXISTS "Authenticated users can insert cheese types" ON cheese_types;
DROP POLICY IF EXISTS "Users can update their own cheese types" ON cheese_types;

-- Drop policies on producer_cheeses
DROP POLICY IF EXISTS "Producer cheeses are viewable by everyone" ON producer_cheeses;
DROP POLICY IF EXISTS "Authenticated users can insert producer cheeses" ON producer_cheeses;
DROP POLICY IF EXISTS "Users can update their own producer cheeses" ON producer_cheeses;
DROP POLICY IF EXISTS "Users can delete their own producer cheeses" ON producer_cheeses;

-- Drop old cheese_ratings policies (if they exist)
DROP POLICY IF EXISTS "Ratings are viewable by everyone" ON cheese_ratings;
DROP POLICY IF EXISTS "Authenticated users can insert ratings" ON cheese_ratings;
DROP POLICY IF EXISTS "Users can update their own ratings" ON cheese_ratings;
DROP POLICY IF EXISTS "Users can delete their own ratings" ON cheese_ratings;

-- ============================================
-- 5. Drop Old Triggers (will be recreated)
-- ============================================
DROP TRIGGER IF EXISTS update_cheese_types_updated_at ON cheese_types;
DROP TRIGGER IF EXISTS update_producer_cheeses_updated_at ON producer_cheeses;
DROP TRIGGER IF EXISTS update_cheese_ratings_updated_at ON cheese_ratings;

-- Drop the trigger function (will be recreated)
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ============================================
-- CLEANUP COMPLETE
-- ============================================
-- Now run cheese-hierarchy-schema.sql to recreate everything correctly
