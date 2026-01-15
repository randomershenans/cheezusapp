-- Fix: Only notify users when someone they FOLLOW adds a cheese that's in their box
-- Previously this notified for ANY user adding the cheese, which was too noisy
-- Also skip notifications for "Generic" producer cheeses (not meaningful)

CREATE OR REPLACE FUNCTION notify_on_cheese_copied()
RETURNS TRIGGER AS $$
DECLARE
  owner_record RECORD;
  actor_name TEXT;
  cheese_name TEXT;
  producer_name TEXT;
  v_cheese_id UUID;
  v_user_id UUID;
BEGIN
  v_cheese_id := NEW.cheese_id;
  v_user_id := NEW.user_id;

  -- Get the cheese name and producer
  SELECT pc.full_name, pc.producer_name INTO cheese_name, producer_name
  FROM producer_cheeses pc
  WHERE pc.id = v_cheese_id;

  -- Clean up "Generic" from cheese name - use just the product name instead
  IF producer_name = 'Generic' OR cheese_name ILIKE 'Generic %' THEN
    -- Remove "Generic " prefix from full_name to get just the cheese name
    cheese_name := TRIM(REGEXP_REPLACE(cheese_name, '^Generic\s+', '', 'i'));
  END IF;
  
  -- Skip if we still have no meaningful name
  IF cheese_name IS NULL OR cheese_name = '' THEN
    RETURN NEW;
  END IF;

  -- Get the name of the person who added the cheese
  SELECT name INTO actor_name
  FROM profiles
  WHERE id = v_user_id;

  -- Find all users who have this cheese in their box AND follow the person who just added it
  FOR owner_record IN
    SELECT DISTINCT cbe.user_id
    FROM cheese_box_entries cbe
    INNER JOIN follows f ON f.follower_id = cbe.user_id AND f.following_id = v_user_id
    WHERE cbe.cheese_id = v_cheese_id
      AND cbe.user_id != v_user_id
  LOOP
    -- Insert notification
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      owner_record.user_id,
      'cheese_copied',
      'Great taste!',
      COALESCE(actor_name, 'Someone you follow') || ' also tried ' || COALESCE(cheese_name, 'a cheese you love'),
      jsonb_build_object(
        'cheese_id', v_cheese_id,
        'user_id', v_user_id,
        'user_name', actor_name
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comment: Run this in Supabase SQL editor to fix the cheese_copied notification
-- Now users only get notified when someone they FOLLOW adds a cheese in their box
