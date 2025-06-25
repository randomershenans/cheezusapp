-- Fix for badge function trigger issue
-- This script refactors badge functions to work properly in both trigger and non-trigger contexts

-- 1. First, create user-specific versions of the badge update functions

-- Function to update cheese quantity badges for a specific user
CREATE OR REPLACE FUNCTION update_cheese_quantity_badges_for_user(user_id UUID) 
RETURNS VOID AS $$
DECLARE
  cheese_count INTEGER;
  badge_record RECORD;
BEGIN
  -- Count distinct cheeses for this user
  SELECT COUNT(DISTINCT cheese_id) INTO cheese_count
  FROM cheese_box_entries e
  WHERE e.user_id = update_cheese_quantity_badges_for_user.user_id;
  
  -- Update progress for all quantity badges
  FOR badge_record IN 
    SELECT id, threshold FROM badges WHERE category = 'quantity'
  LOOP
    -- Check if user already has this badge
    IF NOT EXISTS (
      SELECT 1 FROM user_badges ub
      WHERE ub.user_id = update_cheese_quantity_badges_for_user.user_id AND ub.badge_id = badge_record.id
    ) THEN
      -- Create new progress record
      INSERT INTO user_badges (user_id, badge_id, progress, completed)
      VALUES (
        update_cheese_quantity_badges_for_user.user_id, 
        badge_record.id, 
        cheese_count,
        cheese_count >= badge_record.threshold
      );
    ELSE
      -- Update existing record
      UPDATE user_badges ub
      SET 
        progress = cheese_count,
        completed = cheese_count >= badge_record.threshold
      WHERE 
        ub.user_id = update_cheese_quantity_badges_for_user.user_id AND 
        ub.badge_id = badge_record.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update cheese type badges for a specific user
CREATE OR REPLACE FUNCTION update_cheese_type_badges_for_user(user_id UUID) 
RETURNS VOID AS $$
DECLARE
  type_count INTEGER;
  badge_record RECORD;
BEGIN
  -- Count distinct cheese types for this user
  SELECT COUNT(DISTINCT c.type) INTO type_count
  FROM cheese_box_entries e
  JOIN cheeses c ON e.cheese_id = c.id
  WHERE e.user_id = update_cheese_type_badges_for_user.user_id;
  
  -- Update progress for all type variety badges
  FOR badge_record IN 
    SELECT id, threshold FROM badges WHERE category = 'type_variety'
  LOOP
    -- Check if user already has this badge
    IF NOT EXISTS (
      SELECT 1 FROM user_badges ub
      WHERE ub.user_id = update_cheese_type_badges_for_user.user_id AND ub.badge_id = badge_record.id
    ) THEN
      -- Create new progress record
      INSERT INTO user_badges (user_id, badge_id, progress, completed)
      VALUES (
        update_cheese_type_badges_for_user.user_id, 
        badge_record.id, 
        type_count,
        type_count >= badge_record.threshold
      );
    ELSE
      -- Update existing record
      UPDATE user_badges ub
      SET 
        progress = type_count,
        completed = type_count >= badge_record.threshold
      WHERE 
        ub.user_id = update_cheese_type_badges_for_user.user_id AND 
        ub.badge_id = badge_record.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create a function that updates all badges for a specific user
CREATE OR REPLACE FUNCTION update_all_badges_for_user(user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Call all the specific badge update functions
  PERFORM update_cheese_quantity_badges_for_user(user_id);
  PERFORM update_cheese_type_badges_for_user(user_id);
  -- Add more badge update functions here as they are created
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fix the trigger function to use the NEW record properly
CREATE OR REPLACE FUNCTION update_badge_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the function that updates all badges for the user in the NEW record
  PERFORM update_all_badges_for_user(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Fix the initialize_user_badges function
CREATE OR REPLACE FUNCTION initialize_user_badges(user_id UUID)
RETURNS VOID AS $$
DECLARE
  badge_record RECORD;
BEGIN
  -- For each badge
  FOR badge_record IN SELECT id FROM badges
  LOOP
    -- If the user doesn't have this badge yet
    IF NOT EXISTS (
      SELECT 1 FROM user_badges ub
      WHERE ub.user_id = initialize_user_badges.user_id 
      AND ub.badge_id = badge_record.id
    ) THEN
      -- Create an initial record with 0 progress
      INSERT INTO user_badges (user_id, badge_id, progress, completed)
      VALUES (initialize_user_badges.user_id, badge_record.id, 0, false);
    END IF;
  END LOOP;
  
  -- Then update all badges for this user using the new function
  PERFORM update_all_badges_for_user(user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Drop the old problematic functions that try to access NEW directly
DROP FUNCTION IF EXISTS update_cheese_quantity_badges() CASCADE;
DROP FUNCTION IF EXISTS update_cheese_type_badges() CASCADE;
