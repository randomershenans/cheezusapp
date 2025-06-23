-- Create a function to get badges with user progress
CREATE OR REPLACE FUNCTION get_user_badges_with_progress(user_id UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  description TEXT,
  icon VARCHAR,
  category VARCHAR,
  threshold INTEGER,
  progress INTEGER,
  completed BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.name,
    b.description,
    b.icon,
    b.category,
    b.threshold,
    COALESCE(ub.progress, 0) as progress,
    COALESCE(ub.completed, false) as completed
  FROM 
    badges b
  LEFT JOIN 
    user_badges ub ON b.id = ub.badge_id AND ub.user_id = get_user_badges_with_progress.user_id
  ORDER BY 
    b.category, 
    COALESCE(ub.completed, false), 
    b.threshold;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update cheese quantity badges
CREATE OR REPLACE FUNCTION update_cheese_quantity_badges() 
RETURNS TRIGGER AS $$
DECLARE
  user_id UUID;
  badge_id UUID;
  cheese_count INTEGER;
  badge_record RECORD;
BEGIN
  user_id := NEW.user_id;
  
  -- Count distinct cheeses for this user
  SELECT COUNT(DISTINCT cheese_id) INTO cheese_count
  FROM cheese_box_entries
  WHERE user_id = NEW.user_id;
  
  -- Update progress for all quantity badges
  FOR badge_record IN 
    SELECT id, threshold FROM badges WHERE category = 'quantity'
  LOOP
    -- Check if user already has this badge
    IF NOT EXISTS (
      SELECT 1 FROM user_badges 
      WHERE user_id = NEW.user_id AND badge_id = badge_record.id
    ) THEN
      -- Create new progress record
      INSERT INTO user_badges (user_id, badge_id, progress, completed)
      VALUES (
        NEW.user_id, 
        badge_record.id, 
        cheese_count, 
        cheese_count >= badge_record.threshold
      );
    ELSE
      -- Update existing progress record
      UPDATE user_badges
      SET 
        progress = cheese_count,
        completed = cheese_count >= badge_record.threshold,
        completed_at = CASE 
          WHEN cheese_count >= badge_record.threshold AND NOT completed 
          THEN CURRENT_TIMESTAMP 
          ELSE completed_at 
        END
      WHERE 
        user_id = NEW.user_id AND 
        badge_id = badge_record.id;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update cheese type specialty badges
CREATE OR REPLACE FUNCTION update_cheese_type_badges() 
RETURNS TRIGGER AS $$
DECLARE
  cheese_type TEXT;
  smelly_count INTEGER;
  fresh_count INTEGER;
  hard_count INTEGER;
BEGIN
  -- Get the cheese type
  SELECT type INTO cheese_type
  FROM cheeses
  WHERE id = NEW.cheese_id;
  
  -- Update counts for different cheese types
  SELECT COUNT(DISTINCT c.id) INTO smelly_count
  FROM cheese_box_entries e
  JOIN cheeses c ON e.cheese_id = c.id
  WHERE e.user_id = NEW.user_id 
    AND (c.type = 'blue' OR c.type = 'washed_rind');
    
  SELECT COUNT(DISTINCT c.id) INTO fresh_count
  FROM cheese_box_entries e
  JOIN cheeses c ON e.cheese_id = c.id
  WHERE e.user_id = NEW.user_id 
    AND c.type = 'fresh';
    
  SELECT COUNT(DISTINCT c.id) INTO hard_count
  FROM cheese_box_entries e
  JOIN cheeses c ON e.cheese_id = c.id
  WHERE e.user_id = NEW.user_id 
    AND (c.type = 'hard' OR c.type = 'semi_hard');
    
  -- Update Smelly Cheese Specialist badge
  PERFORM update_specific_badge(
    NEW.user_id, 
    (SELECT id FROM badges WHERE name = 'Smelly Cheese Specialist'), 
    smelly_count
  );
  
  -- Update Fresh Cheese Aficionado badge
  PERFORM update_specific_badge(
    NEW.user_id, 
    (SELECT id FROM badges WHERE name = 'Fresh Cheese Aficionado'), 
    fresh_count
  );
  
  -- Update Hard Cheese Enthusiast badge
  PERFORM update_specific_badge(
    NEW.user_id, 
    (SELECT id FROM badges WHERE name = 'Hard Cheese Enthusiast'), 
    hard_count
  );
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper function to update a specific badge
CREATE OR REPLACE FUNCTION update_specific_badge(
  p_user_id UUID, 
  p_badge_id UUID, 
  p_progress INTEGER
) 
RETURNS VOID AS $$
DECLARE
  badge_threshold INTEGER;
BEGIN
  -- Get the threshold for this badge
  SELECT threshold INTO badge_threshold
  FROM badges
  WHERE id = p_badge_id;
  
  -- Check if user already has this badge
  IF NOT EXISTS (
    SELECT 1 FROM user_badges 
    WHERE user_id = p_user_id AND badge_id = p_badge_id
  ) THEN
    -- Create new progress record
    INSERT INTO user_badges (user_id, badge_id, progress, completed)
    VALUES (
      p_user_id, 
      p_badge_id, 
      p_progress, 
      p_progress >= badge_threshold
    );
  ELSE
    -- Update existing progress record
    UPDATE user_badges
    SET 
      progress = p_progress,
      completed = p_progress >= badge_threshold,
      completed_at = CASE 
        WHEN p_progress >= badge_threshold AND NOT completed 
        THEN CURRENT_TIMESTAMP 
        ELSE completed_at 
      END
    WHERE 
      user_id = p_user_id AND 
      badge_id = p_badge_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create or replace the trigger functions
CREATE OR REPLACE FUNCTION update_badge_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Call specific badge update functions
  PERFORM update_cheese_quantity_badges();
  PERFORM update_cheese_type_badges();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to initialize all badges for a user (run when they view badges page)
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
      SELECT 1 FROM user_badges 
      WHERE user_id = initialize_user_badges.user_id 
      AND badge_id = badge_record.id
    ) THEN
      -- Create an initial record with 0 progress
      INSERT INTO user_badges (user_id, badge_id, progress, completed)
      VALUES (initialize_user_badges.user_id, badge_record.id, 0, false);
    END IF;
  END LOOP;
  
  -- Then trigger updates for all badge types
  PERFORM update_cheese_quantity_badges();
  PERFORM update_cheese_type_badges();
END;
$$ LANGUAGE plpgsql;
