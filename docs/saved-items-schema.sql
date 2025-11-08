-- Saved Items Table
-- Allows users to bookmark articles, recipes, and pairings

CREATE TABLE saved_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('article', 'recipe', 'pairing')),
  item_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate saves
  UNIQUE(user_id, item_type, item_id)
);

-- Index for fast lookups
CREATE INDEX idx_saved_items_user ON saved_items(user_id);
CREATE INDEX idx_saved_items_type ON saved_items(user_id, item_type);

-- RLS Policies
ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;

-- Users can only view their own saved items
CREATE POLICY "Users can view own saved items" ON saved_items
  FOR SELECT USING (auth.uid() = user_id);

-- Users can save items
CREATE POLICY "Users can save items" ON saved_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can remove their saved items
CREATE POLICY "Users can remove saved items" ON saved_items
  FOR DELETE USING (auth.uid() = user_id);

-- Example data (for testing)
-- INSERT INTO saved_items (user_id, item_type, item_id) 
-- VALUES 
--   ('user-uuid-here', 'article', 'article-uuid'),
--   ('user-uuid-here', 'pairing', 'pairing-uuid');
