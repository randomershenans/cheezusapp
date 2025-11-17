-- ============================================
-- DATA MIGRATION: Flat Cheese System → Hierarchy
-- ============================================
-- This script migrates existing cheese data to the new hierarchy system
-- Run AFTER cheese-hierarchy-schema.sql has been executed

-- ============================================
-- PRE-MIGRATION CHECKS
-- ============================================
-- Check if old tables exist
DO $$ 
BEGIN
  -- Check if cheeses table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cheeses') THEN
    RAISE NOTICE 'No existing cheeses table found - skipping data migration';
    RAISE NOTICE 'This is normal for new installations';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Found existing cheeses table - proceeding with migration';
END $$;

-- ============================================
-- STEP 1: Create Cheese Types from Existing Cheeses
-- ============================================
-- Strategy: Group existing cheeses by name to create cheese types
-- Each unique cheese name becomes a cheese type
-- NOTE: This will only run if the cheeses table exists

-- Only migrate if cheeses table exists
INSERT INTO cheese_types (
  name, 
  type, 
  milk_type, 
  origin_country, 
  origin_region, 
  description, 
  typical_ageing_period, 
  image_url,
  created_at
)
SELECT DISTINCT ON (name)
  name,
  type::VARCHAR,  -- Cast ENUM to VARCHAR
  milk::VARCHAR,  -- Cast ENUM to VARCHAR
  origin_country,
  origin_region,
  description,
  ageing_period,
  image_url,
  MIN(created_at) as created_at  -- Use earliest creation date
FROM cheeses
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cheeses')
GROUP BY 
  name, type, milk, origin_country, origin_region, 
  description, ageing_period, image_url
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- STEP 2: Extract Unique Flavors and Create Tags
-- ============================================
-- Parse existing cheese_flavors text and create normalized flavor_tags
-- This identifies all unique flavor values and adds them to flavor_tags

INSERT INTO flavor_tags (name)
SELECT DISTINCT 
  TRIM(INITCAP(cf.flavor)) as normalized_flavor
FROM cheese_flavors cf
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cheese_flavors')
  AND TRIM(cf.flavor) != ''
  AND TRIM(cf.flavor) IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- STEP 3: Create Flavor Tag Relationships for Cheese Types
-- ============================================
-- Link cheese types to their flavor tags based on original data
-- A cheese type gets all unique flavors from cheeses with that name

INSERT INTO cheese_type_flavor_tags (cheese_type_id, flavor_tag_id)
SELECT DISTINCT
  ct.id as cheese_type_id,
  ft.id as flavor_tag_id
FROM cheese_flavors cf
JOIN cheeses c ON c.id = cf.cheese_id
JOIN cheese_types ct ON ct.name = c.name
JOIN flavor_tags ft ON ft.name = TRIM(INITCAP(cf.flavor))
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cheese_flavors')
ON CONFLICT DO NOTHING;

-- ============================================
-- STEP 4: Create Producer Cheeses from Existing Cheeses
-- ============================================
-- Option A: Create "Generic" producer entries (recommended for clean migration)
-- This creates a generic producer for each cheese type

INSERT INTO producer_cheeses (
  cheese_type_id,
  producer_name,
  product_name,
  origin_country,
  origin_region,
  milk_type,
  ageing_period,
  description,
  image_url,
  added_by,
  verified,
  created_at
)
SELECT 
  ct.id as cheese_type_id,
  'Generic' as producer_name,  -- Default generic producer
  NULL as product_name,
  c.origin_country,
  c.origin_region,
  c.milk::VARCHAR,
  c.ageing_period,
  c.description,
  c.image_url,
  c.added_by,
  TRUE as verified,  -- Mark migrated entries as verified
  c.created_at
FROM cheeses c
JOIN cheese_types ct ON ct.name = c.name;

-- ============================================
-- STEP 5: Update cheese_box_entries to Point to Producer Cheeses
-- ============================================
-- Update existing cheese_box_entries.cheese_id to point to the new producer_cheeses
-- Currently points to 'cheeses', needs to point to 'producer_cheeses'

-- First, drop views that depend on cheese_box_entries.cheese_id
DROP VIEW IF EXISTS cheese_type_stats CASCADE;
DROP VIEW IF EXISTS producer_cheese_stats CASCADE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cheese_box_entries') THEN
    -- Add temporary column to map to producer cheeses
    ALTER TABLE cheese_box_entries ADD COLUMN IF NOT EXISTS new_cheese_id UUID;
    
    -- Map existing cheese_id to corresponding producer_cheese_id
    UPDATE cheese_box_entries cbe
    SET new_cheese_id = pc.id
    FROM cheeses c
    JOIN cheese_types ct ON ct.name = c.name
    JOIN producer_cheeses pc ON pc.cheese_type_id = ct.id AND pc.producer_name = 'Generic'
    WHERE cbe.cheese_id = c.id;
    
    -- Drop old foreign key constraint if it exists
    ALTER TABLE cheese_box_entries DROP CONSTRAINT IF EXISTS cheese_box_entries_cheese_id_fkey;
    
    -- Drop old column
    ALTER TABLE cheese_box_entries DROP COLUMN IF EXISTS cheese_id;
    
    -- Rename new column
    ALTER TABLE cheese_box_entries RENAME COLUMN new_cheese_id TO cheese_id;
    
    -- Add new foreign key to producer_cheeses
    ALTER TABLE cheese_box_entries 
    ADD CONSTRAINT cheese_box_entries_cheese_id_fkey 
    FOREIGN KEY (cheese_id) REFERENCES producer_cheeses(id) ON DELETE CASCADE;
    
    -- Add index for performance
    CREATE INDEX IF NOT EXISTS idx_cheese_box_entries_cheese ON cheese_box_entries(cheese_id);
    
    RAISE NOTICE 'Updated cheese_box_entries to point to producer_cheeses ✓';
  ELSE
    RAISE NOTICE 'No cheese_box_entries table found - skipping';
  END IF;
END $$;

-- ============================================
-- STEP 6: Create Flavor Tag Relationships for Producer Cheeses
-- ============================================
-- Link producer cheeses to their flavor tags based on original data
INSERT INTO producer_cheese_flavor_tags (producer_cheese_id, flavor_tag_id)
SELECT DISTINCT
  pc.id as producer_cheese_id,
  ft.id as flavor_tag_id
FROM cheese_flavors cf
JOIN cheeses c ON c.id = cf.cheese_id
JOIN cheese_types ct ON ct.name = c.name
JOIN producer_cheeses pc ON pc.cheese_type_id = ct.id 
  AND pc.producer_name = 'Generic'
JOIN flavor_tags ft ON ft.name = TRIM(INITCAP(cf.flavor))
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cheese_flavors')
ON CONFLICT DO NOTHING;

-- ============================================
-- STEP 7: Update User Badge Progress
-- ============================================
-- Update badge progress to use new producer_cheeses table
-- This recounts all cheese_box_entries for each user
-- NOTE: Only runs if user_badges table exists

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_badges') THEN
    
    -- Update badge progress for quantity-based badges
    -- Progress = count of unique producer cheeses tried
    UPDATE user_badges ub
    SET 
      progress = (
        SELECT COUNT(DISTINCT cbe.cheese_id)
        FROM cheese_box_entries cbe
        WHERE cbe.user_id = ub.user_id
      ),
      completed = (
        SELECT COUNT(DISTINCT cbe.cheese_id)
        FROM cheese_box_entries cbe
        WHERE cbe.user_id = ub.user_id
      ) >= (SELECT threshold FROM badges WHERE id = ub.badge_id),
      completed_at = CASE 
        WHEN (
          SELECT COUNT(DISTINCT cbe.cheese_id)
          FROM cheese_box_entries cbe
          WHERE cbe.user_id = ub.user_id
        ) >= (SELECT threshold FROM badges WHERE id = ub.badge_id) AND completed = false
        THEN NOW()
        ELSE completed_at
      END;
    
    RAISE NOTICE 'Updated user badge progress for all users ✓';
  ELSE
    RAISE NOTICE 'No user_badges table found - skipping badge progress update';
  END IF;
END $$;

-- ============================================
-- STEP 8: Recreate Views with Updated Schema
-- ============================================
-- Recreate the views now that cheese_box_entries points to producer_cheeses

-- View: Aggregate stats for each cheese type
CREATE OR REPLACE VIEW cheese_type_stats AS
SELECT 
  ct.id,
  ct.name,
  ct.type,
  ct.milk_type,
  ct.origin_country,
  ct.image_url,
  COUNT(DISTINCT pc.id) as producer_count,
  COUNT(DISTINCT cbe.id) as total_ratings,
  COALESCE(ROUND(AVG(cbe.rating), 2), 0) as average_rating,
  COUNT(DISTINCT cbe.user_id) as unique_raters,
  MAX(cbe.created_at)::timestamp with time zone as last_rated_at
FROM cheese_types ct
LEFT JOIN producer_cheeses pc ON pc.cheese_type_id = ct.id
LEFT JOIN cheese_box_entries cbe ON cbe.cheese_id = pc.id
GROUP BY ct.id, ct.name, ct.type, ct.milk_type, ct.origin_country, ct.image_url;

-- View: Producer cheese with aggregated ratings
CREATE OR REPLACE VIEW producer_cheese_stats AS
SELECT 
  pc.id,
  pc.cheese_type_id,
  ct.name as cheese_type_name,
  pc.producer_name,
  pc.product_name,
  pc.full_name,
  pc.image_url,
  pc.price_range,
  pc.availability,
  pc.verified,
  COUNT(cbe.id) as rating_count,
  COALESCE(ROUND(AVG(cbe.rating), 2), 0) as average_rating,
  MAX(cbe.created_at)::timestamp with time zone as last_rated_at
FROM producer_cheeses pc
JOIN cheese_types ct ON ct.id = pc.cheese_type_id
LEFT JOIN cheese_box_entries cbe ON cbe.cheese_id = pc.id
GROUP BY 
  pc.id, pc.cheese_type_id, ct.name, pc.producer_name, 
  pc.product_name, pc.full_name, pc.image_url, 
  pc.price_range, pc.availability, pc.verified;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the migration was successful

-- Check cheese type counts
-- SELECT 'Cheese Types Created' as metric, COUNT(*) as count FROM cheese_types
-- UNION ALL
-- SELECT 'Producer Cheeses Created', COUNT(*) FROM producer_cheeses
-- UNION ALL
-- SELECT 'Ratings Migrated', COUNT(*) FROM cheese_ratings
-- UNION ALL
-- SELECT 'Original Cheeses', COUNT(*) FROM cheeses
-- UNION ALL
-- SELECT 'Original Ratings', COUNT(*) FROM old_cheese_ratings;

-- Check for any orphaned ratings
-- SELECT COUNT(*) as orphaned_ratings
-- FROM old_cheese_ratings ocr
-- LEFT JOIN cheese_ratings cr ON cr.user_id = ocr.user_id
-- WHERE cr.id IS NULL;

-- Check average ratings consistency
-- SELECT 
--   ct.name,
--   (SELECT AVG(rating) FROM old_cheese_ratings ocr 
--    JOIN cheeses c ON c.id = ocr.cheese_id 
--    WHERE c.name = ct.name) as old_avg,
--   (SELECT AVG(cr.rating) FROM cheese_ratings cr
--    JOIN producer_cheeses pc ON pc.id = cr.producer_cheese_id
--    WHERE pc.cheese_type_id = ct.id) as new_avg
-- FROM cheese_types ct
-- LIMIT 20;

-- ============================================
-- POST-MIGRATION CLEANUP (Run after verification)
-- ============================================
-- WARNING: Only run these after confirming migration success!

-- Drop old tables (DANGER - backs up data first!)
-- CREATE TABLE backup_cheeses AS SELECT * FROM cheeses;
-- CREATE TABLE backup_old_cheese_ratings AS SELECT * FROM old_cheese_ratings;
-- CREATE TABLE backup_cheese_flavor_tags AS SELECT * FROM cheese_flavor_tags;

-- DROP TABLE IF EXISTS cheese_flavor_tags;
-- DROP TABLE IF EXISTS cheeses;
-- DROP TABLE IF EXISTS old_cheese_ratings;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Next steps:
-- 1. Verify data integrity using queries above
-- 2. Test app functionality with new schema
-- 3. Update application code to use new tables
-- 4. Once confident, run cleanup to remove old tables
