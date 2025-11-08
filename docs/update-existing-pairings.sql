-- Update existing sponsored pairings to show in feed
-- Run this AFTER the main migration if the pairings already exist

UPDATE cheese_pairings 
SET 
  show_in_feed = true,
  feed_until = NOW() + INTERVAL '30 days'
WHERE 
  pairing IN ('Wildflower Honey', 'Sancerre')
  AND is_sponsored = true;

-- Verify the update
SELECT 
  id, 
  pairing, 
  brand_name, 
  is_sponsored, 
  show_in_feed, 
  feed_until,
  feed_until > NOW() as is_active_in_feed
FROM cheese_pairings 
WHERE is_sponsored = true
ORDER BY pairing;
