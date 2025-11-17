-- ============================================
-- CHEESE HIERARCHY SYSTEM - SCHEMA
-- ============================================
-- Two-tier system: Cheese Types → Producer Cheeses
-- This allows for generic cheese types (Brie, Cheddar) with
-- multiple producer-specific versions (President Brie, etc.)

-- ============================================
-- 0. CREATE NORMALIZED FLAVOR TAGS SYSTEM
-- ============================================
-- Master list of flavor tags that users can select from
-- This replaces the old cheese_flavors table with a proper many-to-many structure

CREATE TABLE IF NOT EXISTS flavor_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT, -- Optional description of what this flavor means
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flavor_tags_name ON flavor_tags(name);

-- Insert common cheese flavor tags
INSERT INTO flavor_tags (name, description) VALUES
  ('Nutty', 'Nut-like flavors such as almond, hazelnut, or walnut'),
  ('Creamy', 'Rich, smooth, butter-like texture and taste'),
  ('Sharp', 'Strong, tangy, intense flavor'),
  ('Mild', 'Subtle, gentle flavor profile'),
  ('Tangy', 'Acidic, tart, zesty notes'),
  ('Earthy', 'Mushroom, soil, or cave-aged characteristics'),
  ('Fruity', 'Sweet or tart fruit notes'),
  ('Smoky', 'Smoke or wood-fired flavors'),
  ('Salty', 'Pronounced salt content'),
  ('Sweet', 'Natural sweetness'),
  ('Buttery', 'Rich butter notes'),
  ('Rich', 'Full-bodied, complex flavor'),
  ('Pungent', 'Strong, penetrating aroma and taste'),
  ('Floral', 'Flower-like aromatic notes'),
  ('Herbal', 'Herb or grass flavors'),
  ('Spicy', 'Peppery or hot notes'),
  ('Grassy', 'Fresh grass or hay flavors'),
  ('Mushroomy', 'Earthy mushroom characteristics'),
  ('Caramel', 'Caramelized, sweet cooked notes'),
  ('Woody', 'Wood or bark-like flavors'),
  ('Mineraly', 'Mineral or stone-like qualities'),
  ('Citrus', 'Lemon, orange, or citrus notes'),
  ('Savory', 'Umami, meaty flavors'),
  ('Barnyardy', 'Farmyard, animal characteristics'),
  ('Yeasty', 'Bread or yeast-like flavors')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 1. CHEESE TYPES TABLE (Parent/Generic)
-- ============================================
CREATE TABLE IF NOT EXISTS cheese_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL, -- Hard, Soft, Semi-soft, Fresh, Blue, Processed
  milk_type VARCHAR(50), -- Cow, Goat, Sheep, Mixed, Buffalo (NULL = varies by producer)
  
  -- Origin info (traditional/typical origin)
  origin_country VARCHAR(100),
  origin_region VARCHAR(100),
  
  -- General information about this cheese type
  description TEXT,
  flavor_profile TEXT,
  texture_notes TEXT,
  typical_ageing_period VARCHAR(50),
  
  -- Media & resources
  image_url TEXT, -- Generic representative image for the cheese type
  wikipedia_url TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cheese_types_name ON cheese_types(name);
CREATE INDEX IF NOT EXISTS idx_cheese_types_type ON cheese_types(type);

-- ============================================
-- 2. PRODUCER CHEESES TABLE (Child/Specific)
-- ============================================
CREATE TABLE IF NOT EXISTS producer_cheeses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Link to parent cheese type
  cheese_type_id UUID NOT NULL REFERENCES cheese_types(id) ON DELETE CASCADE,
  
  -- Producer information
  producer_name VARCHAR(200) NOT NULL,
  product_name VARCHAR(200), -- Specific product name if different from cheese type
  
  -- Auto-generated full display name
  full_name VARCHAR(300) GENERATED ALWAYS AS (
    CASE 
      WHEN product_name IS NOT NULL THEN producer_name || ' ' || product_name
      ELSE producer_name
    END
  ) STORED,
  
  -- Producer-specific attributes (can override cheese type defaults)
  origin_country VARCHAR(100), -- Where this specific cheese is made
  origin_region VARCHAR(100),
  milk_type VARCHAR(50),
  ageing_period VARCHAR(50),
  description TEXT, -- Specific notes about this producer's version
  
  -- Additional producer details
  producer_location VARCHAR(200), -- Where the producer is based
  price_range INTEGER CHECK (price_range BETWEEN 1 AND 5), -- $ to $$$$$
  availability VARCHAR(50), -- "Widely Available", "Specialty Stores", "Limited", etc.
  
  -- Media
  image_url TEXT, -- Producer-specific cheese photo
  
  -- Quality control & tracking
  verified BOOLEAN DEFAULT FALSE, -- Admin verification for data quality
  added_by UUID REFERENCES auth.users(id),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure unique producer+product combination per cheese type
  UNIQUE(cheese_type_id, producer_name, product_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_producer_cheeses_type ON producer_cheeses(cheese_type_id);
CREATE INDEX IF NOT EXISTS idx_producer_cheeses_producer ON producer_cheeses(producer_name);
CREATE INDEX IF NOT EXISTS idx_producer_cheeses_added_by ON producer_cheeses(added_by);
CREATE INDEX IF NOT EXISTS idx_producer_cheeses_verified ON producer_cheeses(verified);

-- ============================================
-- 3. UPDATE CHEESE_BOX_ENTRIES TO USE PRODUCER_CHEESES
-- ============================================
-- cheese_box_entries is the source of truth for all ratings
-- It currently points to 'cheeses', we'll update it to point to 'producer_cheeses'
-- This will be handled in the migration script

-- Note: cheese_box_entries structure:
-- - id (uuid)
-- - user_id (uuid) → auth.users
-- - cheese_id (uuid) → currently points to 'cheeses', will point to 'producer_cheeses'
-- - rating (numeric)
-- - notes (text)
-- - created_at, updated_at (timestamp)

-- The table already exists, we just need to update the foreign key in migration

-- ============================================
-- 4. MANY-TO-MANY FLAVOR TAG RELATIONSHIPS
-- ============================================
-- Junction tables for normalized flavor tags
-- One cheese can have many flavors, one flavor can apply to many cheeses

-- Cheese type flavor tags (generic flavor profiles for cheese types)
CREATE TABLE IF NOT EXISTS cheese_type_flavor_tags (
  cheese_type_id UUID REFERENCES cheese_types(id) ON DELETE CASCADE,
  flavor_tag_id UUID REFERENCES flavor_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (cheese_type_id, flavor_tag_id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cheese_type_flavors_type ON cheese_type_flavor_tags(cheese_type_id);
CREATE INDEX IF NOT EXISTS idx_cheese_type_flavors_tag ON cheese_type_flavor_tags(flavor_tag_id);

-- Producer cheese flavor tags (specific flavor notes for producer cheeses)
CREATE TABLE IF NOT EXISTS producer_cheese_flavor_tags (
  producer_cheese_id UUID REFERENCES producer_cheeses(id) ON DELETE CASCADE,
  flavor_tag_id UUID REFERENCES flavor_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (producer_cheese_id, flavor_tag_id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_producer_cheese_flavors_cheese ON producer_cheese_flavor_tags(producer_cheese_id);
CREATE INDEX IF NOT EXISTS idx_producer_cheese_flavors_tag ON producer_cheese_flavor_tags(flavor_tag_id);

-- ============================================
-- 5. VIEWS FOR AGGREGATE STATISTICS
-- ============================================

-- View: Aggregate stats for each cheese type
-- Aggregates from cheese_box_entries (everyone's personal ratings)
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
-- Aggregates from cheese_box_entries (everyone's personal ratings)
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
-- 6. FUNCTIONS
-- ============================================

-- Function: Get top rated producer cheeses for a cheese type
CREATE OR REPLACE FUNCTION get_top_producer_cheeses(
  p_cheese_type_id UUID,
  p_limit INTEGER DEFAULT 10,
  p_min_ratings INTEGER DEFAULT 1
)
RETURNS TABLE (
  producer_cheese_id UUID,
  full_name VARCHAR,
  producer_name VARCHAR,
  product_name VARCHAR,
  image_url TEXT,
  rating_count BIGINT,
  average_rating NUMERIC,
  verified BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.id,
    pc.full_name,
    pc.producer_name,
    pc.product_name,
    pc.image_url,
    COUNT(cbe.id) as rating_count,
    ROUND(AVG(cbe.rating), 2) as average_rating,
    pc.verified
  FROM producer_cheeses pc
  LEFT JOIN cheese_box_entries cbe ON cbe.cheese_id = pc.id
  WHERE pc.cheese_type_id = p_cheese_type_id
  GROUP BY pc.id, pc.full_name, pc.producer_name, pc.product_name, pc.image_url, pc.verified
  HAVING COUNT(cbe.id) >= p_min_ratings  -- Only show cheeses with minimum ratings
  ORDER BY average_rating DESC, rating_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Get all producer cheeses for a cheese type with filters
CREATE OR REPLACE FUNCTION get_producer_cheeses_by_type(
  p_cheese_type_id UUID,
  p_min_rating DECIMAL DEFAULT 0,
  p_verified_only BOOLEAN DEFAULT FALSE,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  producer_cheese_id UUID,
  full_name VARCHAR,
  producer_name VARCHAR,
  image_url TEXT,
  rating_count BIGINT,
  average_rating NUMERIC,
  verified BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.id,
    pc.full_name,
    pc.producer_name,
    pc.image_url,
    COUNT(cbe.id) as rating_count,
    COALESCE(ROUND(AVG(cbe.rating), 2), 0) as average_rating,
    pc.verified
  FROM producer_cheeses pc
  LEFT JOIN cheese_box_entries cbe ON cbe.cheese_id = pc.id
  WHERE 
    pc.cheese_type_id = p_cheese_type_id
    AND (NOT p_verified_only OR pc.verified = TRUE)
  GROUP BY pc.id, pc.full_name, pc.producer_name, pc.image_url, pc.verified
  HAVING COALESCE(AVG(cbe.rating), 0) >= p_min_rating
  ORDER BY average_rating DESC, rating_count DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function: Search cheese types by name
CREATE OR REPLACE FUNCTION search_cheese_types(
  p_search_term VARCHAR
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  type VARCHAR,
  producer_count BIGINT,
  average_rating NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cts.id,
    cts.name,
    cts.type,
    cts.producer_count,
    cts.average_rating
  FROM cheese_type_stats cts
  WHERE cts.name ILIKE '%' || p_search_term || '%'
  ORDER BY cts.average_rating DESC, cts.total_ratings DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on new tables
ALTER TABLE cheese_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE producer_cheeses ENABLE ROW LEVEL SECURITY;
-- Note: cheese_box_entries already exists with its own RLS policies

-- Cheese Types: Read by everyone, write by authenticated users
CREATE POLICY "Cheese types are viewable by everyone"
  ON cheese_types FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert cheese types"
  ON cheese_types FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own cheese types"
  ON cheese_types FOR UPDATE
  USING (auth.uid() IN (SELECT added_by FROM producer_cheeses WHERE cheese_type_id = id))
  WITH CHECK (auth.uid() IN (SELECT added_by FROM producer_cheeses WHERE cheese_type_id = id));

-- Producer Cheeses: Read by everyone, write by authenticated users
CREATE POLICY "Producer cheeses are viewable by everyone"
  ON producer_cheeses FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert producer cheeses"
  ON producer_cheeses FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own producer cheeses"
  ON producer_cheeses FOR UPDATE
  USING (auth.uid() = added_by)
  WITH CHECK (auth.uid() = added_by);

CREATE POLICY "Users can delete their own producer cheeses"
  ON producer_cheeses FOR DELETE
  USING (auth.uid() = added_by);

-- Note: cheese_box_entries RLS policies are managed separately (existing table)
-- Users can only see/modify their own cheese box entries via existing RLS

-- ============================================
-- 8. TRIGGERS
-- ============================================

-- Update updated_at timestamp on changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cheese_types_updated_at
  BEFORE UPDATE ON cheese_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_producer_cheeses_updated_at
  BEFORE UPDATE ON producer_cheeses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Note: cheese_box_entries already has its own updated_at trigger (existing table)

-- ============================================
-- SCHEMA COMPLETE
-- ============================================
