-- Create badges table
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(50) NOT NULL, -- Emoji or icon identifier
  category VARCHAR(100) NOT NULL, -- 'cheese_variety', 'pairing', 'exploration', etc.
  threshold INTEGER NOT NULL, -- Number required to earn the badge
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User badges progress tracking
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0, -- Current progress toward threshold
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, badge_id)
);

-- Add sample badges
INSERT INTO badges (name, description, icon, category, threshold) VALUES
-- Cheese quantity badges
('Cheese Beginner', 'Log your first 5 cheeses', '🧀', 'quantity', 5),
('Cheese Explorer', 'Log 25 different cheeses', '🧀', 'quantity', 25),
('Cheese Fiend', 'Log 50 different cheeses', '🧀', 'quantity', 50),
('Cheese Master', 'Log 100 different cheeses', '🧀', 'quantity', 100),

-- Cheese type badges
('Smelly Cheese Specialist', 'Log 10 different washed-rind or blue cheeses', '🦨', 'type_specialty', 10),
('Fresh Cheese Aficionado', 'Log 10 different fresh cheeses', '🥛', 'type_specialty', 10),
('Hard Cheese Enthusiast', 'Log 10 different aged hard cheeses', '🪨', 'type_specialty', 10),

-- Origin badges
('European Cheese Traveler', 'Log cheeses from 5 different European countries', '🇪🇺', 'origin', 5),
('World Cheese Explorer', 'Log cheeses from 10 different countries', '🌎', 'origin', 10),
('Rare Cheese Hunter', 'Log 5 rare or limited production cheeses', '🔍', 'rarity', 5),

-- Pairing badges
('Pairing Novice', 'Add 5 pairing notes to your cheese logs', '🍷', 'pairing', 5),
('Pairing Pro', 'Add 25 pairing notes to your cheese logs', '👨‍🍳', 'pairing', 25),
('Wine & Cheese Maven', 'Pair 15 different cheeses with wine', '🍇', 'pairing_specialty', 15),
('Beer & Cheese Maven', 'Pair 15 different cheeses with beer', '🍺', 'pairing_specialty', 15),

-- Engagement badges
('Cheezopedia Scholar', 'Read 20 articles in Cheezopedia', '📚', 'engagement', 20),
('Review Champion', 'Write 10 detailed cheese reviews', '✍️', 'engagement', 10);

-- Create functions to automatically update badge progress
CREATE OR REPLACE FUNCTION update_badge_progress() RETURNS TRIGGER AS $$
BEGIN
  -- This is a simplified version - in a real implementation, different events would trigger
  -- updates to different badge types based on complex conditions
  
  -- Example: Update cheese quantity badges when a user logs a new cheese
  -- You would add more complex logic depending on the badge category
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for badge updates (simplified example)
CREATE TRIGGER after_cheese_entry
AFTER INSERT ON cheese_box_entries
FOR EACH ROW
EXECUTE FUNCTION update_badge_progress();

-- Add necessary indexes
CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX idx_badges_category ON badges(category);
