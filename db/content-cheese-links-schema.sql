-- Content-Cheese Links Schema
-- Enables bi-directional linking between content (articles, recipes, guides) and cheeses
-- Created: January 2026

-- Junction table linking cheezopedia content to cheeses
-- Supports linking to both cheese_types (broad) and producer_cheeses (specific)
CREATE TABLE IF NOT EXISTS content_cheese_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to the content (article, recipe, guide)
  content_id UUID NOT NULL REFERENCES cheezopedia_entries(id) ON DELETE CASCADE,
  
  -- Link to cheese type (broad category like "Brie", "Gouda")
  cheese_type_id UUID REFERENCES cheese_types(id) ON DELETE CASCADE,
  
  -- Optional: Link to specific producer cheese (like "President Brie")
  producer_cheese_id UUID REFERENCES producer_cheeses(id) ON DELETE SET NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Ensure at least one cheese reference exists
  CONSTRAINT must_have_cheese_reference CHECK (
    cheese_type_id IS NOT NULL OR producer_cheese_id IS NOT NULL
  ),
  
  -- Prevent duplicate links
  CONSTRAINT unique_content_cheese_link UNIQUE (content_id, cheese_type_id, producer_cheese_id)
);

-- Index for fast lookups from content side
CREATE INDEX IF NOT EXISTS idx_content_cheese_links_content 
  ON content_cheese_links(content_id);

-- Index for fast lookups from cheese type side (for cheese detail pages)
CREATE INDEX IF NOT EXISTS idx_content_cheese_links_cheese_type 
  ON content_cheese_links(cheese_type_id) 
  WHERE cheese_type_id IS NOT NULL;

-- Index for fast lookups from producer cheese side
CREATE INDEX IF NOT EXISTS idx_content_cheese_links_producer_cheese 
  ON content_cheese_links(producer_cheese_id) 
  WHERE producer_cheese_id IS NOT NULL;

-- Enable RLS
ALTER TABLE content_cheese_links ENABLE ROW LEVEL SECURITY;

-- Everyone can view links
CREATE POLICY "Anyone can view content cheese links"
  ON content_cheese_links FOR SELECT
  USING (true);

-- Only authenticated users can create links (admin portal will handle this)
CREATE POLICY "Authenticated users can create content cheese links"
  ON content_cheese_links FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Only the creator can delete links
CREATE POLICY "Creators can delete their content cheese links"
  ON content_cheese_links FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Get cheeses linked to a piece of content (for article/recipe pages)
-- Returns both cheese types and producer cheeses with display info
-- If only cheese_type_id is linked, finds a matching producer_cheese for image/navigation
CREATE OR REPLACE FUNCTION get_content_cheeses(p_content_id UUID, p_limit INT DEFAULT 6)
RETURNS TABLE (
  link_id UUID,
  cheese_type_id UUID,
  cheese_type_name TEXT,
  cheese_type_category TEXT,
  producer_cheese_id UUID,
  producer_cheese_name TEXT,
  producer_name TEXT,
  image_url TEXT,
  origin_country TEXT,
  avg_rating NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ccl.id AS link_id,
    ct.id AS cheese_type_id,
    ct.name::TEXT AS cheese_type_name,
    ct.type::TEXT AS cheese_type_category,
    COALESCE(ccl.producer_cheese_id, pc_fallback.id) AS producer_cheese_id,
    COALESCE(pc.full_name, pc_fallback.full_name)::TEXT AS producer_cheese_name,
    COALESCE(p.name, pc.producer_name, pc_fallback.producer_name)::TEXT AS producer_name,
    COALESCE(pc.image_url, pc_fallback.image_url, ct.image_url)::TEXT AS image_url,
    COALESCE(pc.origin_country, pc_fallback.origin_country, ct.origin_country)::TEXT AS origin_country,
    NULL::NUMERIC AS avg_rating
  FROM content_cheese_links ccl
  LEFT JOIN cheese_types ct ON ccl.cheese_type_id = ct.id
  LEFT JOIN producer_cheeses pc ON ccl.producer_cheese_id = pc.id
  LEFT JOIN producers p ON pc.producer_id = p.id
  -- Fallback: find a producer_cheese matching the cheese_type when no producer_cheese_id is set
  LEFT JOIN LATERAL (
    SELECT pf.id, pf.full_name, pf.producer_name, pf.image_url, pf.origin_country
    FROM producer_cheeses pf
    WHERE pf.cheese_type_id = ccl.cheese_type_id
      AND ccl.producer_cheese_id IS NULL
    ORDER BY pf.image_url IS NOT NULL DESC, pf.created_at DESC
    LIMIT 1
  ) pc_fallback ON true
  WHERE ccl.content_id = p_content_id
  ORDER BY ccl.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Get content linked to a cheese type (for cheese detail pages)
-- Returns articles, recipes, guides
CREATE OR REPLACE FUNCTION get_cheese_content(
  p_cheese_type_id UUID, 
  p_producer_cheese_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 4
)
RETURNS TABLE (
  content_id UUID,
  content_type TEXT,
  title TEXT,
  description TEXT,
  image_url TEXT,
  reading_time_minutes INT,
  source_type TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.id AS content_id,
    ce.content_type::TEXT,
    ce.title::TEXT,
    ce.description::TEXT,
    ce.image_url::TEXT,
    ce.reading_time_minutes,
    'cheezopedia'::TEXT AS source_type
  FROM content_cheese_links ccl
  JOIN cheezopedia_entries ce ON ccl.content_id = ce.id
  WHERE 
    ccl.cheese_type_id = p_cheese_type_id
    OR ccl.producer_cheese_id = p_producer_cheese_id
  ORDER BY ce.published_at DESC
  LIMIT p_limit;
END;
$$;

-- Count total content for a cheese (for "see more" functionality)
CREATE OR REPLACE FUNCTION count_cheese_content(
  p_cheese_type_id UUID, 
  p_producer_cheese_id UUID DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_count INT;
BEGIN
  SELECT COUNT(*) INTO total_count
  FROM content_cheese_links ccl
  WHERE 
    ccl.cheese_type_id = p_cheese_type_id
    OR ccl.producer_cheese_id = p_producer_cheese_id;
  
  RETURN total_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_content_cheeses TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_cheese_content TO authenticated, anon;
GRANT EXECUTE ON FUNCTION count_cheese_content TO authenticated, anon;
