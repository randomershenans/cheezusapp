-- Partners table for managing brand relationships (CREATE THIS FIRST)
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  website_url TEXT,
  contact_email TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- IMPORTANT: The cheese_pairings table currently has cheese_id which creates a 1:1 relationship.
-- We need to REMOVE cheese_id and create a proper many-to-many relationship.
-- This allows one pairing (e.g., "Wildflower Honey") to work with multiple cheeses.

-- Remove the old cheese_id foreign key constraint if it exists
ALTER TABLE cheese_pairings DROP CONSTRAINT IF EXISTS cheese_pairings_cheese_id_fkey;

-- Enhanced cheese_pairings table for sponsored content
-- Add these columns to existing cheese_pairings table:
ALTER TABLE cheese_pairings ADD COLUMN IF NOT EXISTS description TEXT; -- General pairing description
ALTER TABLE cheese_pairings ADD COLUMN IF NOT EXISTS image_url TEXT; -- General pairing image
ALTER TABLE cheese_pairings ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN DEFAULT FALSE;
ALTER TABLE cheese_pairings ADD COLUMN IF NOT EXISTS brand_name TEXT;
ALTER TABLE cheese_pairings ADD COLUMN IF NOT EXISTS brand_logo_url TEXT;
ALTER TABLE cheese_pairings ADD COLUMN IF NOT EXISTS product_name TEXT; -- Specific product name
ALTER TABLE cheese_pairings ADD COLUMN IF NOT EXISTS purchase_url TEXT;
ALTER TABLE cheese_pairings ADD COLUMN IF NOT EXISTS price_range TEXT; -- e.g., "£5-10"
ALTER TABLE cheese_pairings ADD COLUMN IF NOT EXISTS why_it_works TEXT; -- Marketing copy
ALTER TABLE cheese_pairings ADD COLUMN IF NOT EXISTS alternative_generic TEXT; -- e.g., "Any wildflower honey"
ALTER TABLE cheese_pairings ADD COLUMN IF NOT EXISTS alternative_suggestions TEXT[]; -- Array of specific alternatives
ALTER TABLE cheese_pairings ADD COLUMN IF NOT EXISTS sponsored_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE cheese_pairings ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES partners(id);
ALTER TABLE cheese_pairings ADD COLUMN IF NOT EXISTS featured_image_url TEXT; -- High quality product shot
ALTER TABLE cheese_pairings ADD COLUMN IF NOT EXISTS show_in_feed BOOLEAN DEFAULT FALSE; -- Display in homepage newsfeed
ALTER TABLE cheese_pairings ADD COLUMN IF NOT EXISTS feed_until TIMESTAMP WITH TIME ZONE; -- When to stop showing in feed

-- Junction table for many-to-many relationship between cheeses and pairings
-- This allows one pairing to be associated with multiple cheeses
CREATE TABLE IF NOT EXISTS cheese_pairing_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cheese_id UUID NOT NULL REFERENCES cheeses(id) ON DELETE CASCADE,
  pairing_id UUID NOT NULL REFERENCES cheese_pairings(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(cheese_id, pairing_id) -- Prevent duplicate matches
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_cheese_pairing_matches_cheese ON cheese_pairing_matches(cheese_id);
CREATE INDEX IF NOT EXISTS idx_cheese_pairing_matches_pairing ON cheese_pairing_matches(pairing_id);

-- Migrate existing data from cheese_id to junction table
-- This safely moves any existing cheese-pairing relationships to the new structure
INSERT INTO cheese_pairing_matches (cheese_id, pairing_id)
SELECT cheese_id, id 
FROM cheese_pairings 
WHERE cheese_id IS NOT NULL
ON CONFLICT (cheese_id, pairing_id) DO NOTHING;

-- Optional: Remove cheese_id column after migration (uncomment if you want to clean up)
-- ALTER TABLE cheese_pairings DROP COLUMN IF EXISTS cheese_id;

-- Sponsored content tracking
CREATE TABLE IF NOT EXISTS sponsored_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pairing_id UUID REFERENCES cheese_pairings(id),
  partner_id UUID REFERENCES partners(id),
  placement_type TEXT, -- 'pairing', 'article', 'feed'
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  amount_paid DECIMAL(10,2),
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick sponsored lookups
CREATE INDEX IF NOT EXISTS idx_pairings_sponsored ON cheese_pairings(is_sponsored) WHERE is_sponsored = TRUE;
CREATE INDEX IF NOT EXISTS idx_pairings_sponsored_until ON cheese_pairings(is_sponsored, sponsored_until) WHERE is_sponsored = TRUE;
CREATE INDEX IF NOT EXISTS idx_pairings_feed ON cheese_pairings(show_in_feed, feed_until) WHERE show_in_feed = TRUE;

-- ============================================================================
-- SEED DATA - Test Examples
-- ============================================================================

-- Insert test partners
INSERT INTO partners (name, logo_url, description, website_url, contact_email, is_active)
VALUES 
  (
    'Yorkshire Bees',
    'https://images.unsplash.com/photo-1587049352846-4a222e784da4?q=80&w=400',
    'Award-winning artisan honey producers from the Yorkshire Dales. Our bees forage on wildflower meadows to create complex, nuanced honeys perfect for cheese.',
    'https://yorkshirebees.com',
    'hello@yorkshirebees.com',
    true
  ),
  (
    'The Wine Collective',
    'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=400',
    'Specialist wine merchants curating exceptional natural wines from small European producers.',
    'https://thewinecollective.co.uk',
    'tastings@thewinecollective.co.uk',
    true
  )
ON CONFLICT (id) DO NOTHING;

-- Get the partner IDs (you'll need to update these with actual IDs after running)
-- For now, we'll insert pairings first, then update them

-- Insert sponsored honey pairing
INSERT INTO cheese_pairings (
  pairing, 
  type, 
  description,
  image_url,
  is_sponsored,
  brand_name,
  brand_logo_url,
  product_name,
  purchase_url,
  price_range,
  why_it_works,
  alternative_generic,
  alternative_suggestions,
  featured_image_url,
  sponsored_until,
  show_in_feed,
  feed_until
)
VALUES (
  'Wildflower Honey',
  'food',
  'The delicate floral notes of wildflower honey create a beautiful contrast with aged, nutty cheeses.',
  'https://images.unsplash.com/photo-1587049352846-4a222e784da4?q=80&w=1200',
  true,
  'Yorkshire Bees',
  'https://images.unsplash.com/photo-1587049352846-4a222e784da4?q=80&w=400',
  'Artisan Wildflower Honey - 340g',
  'https://yorkshirebees.com/products/wildflower-honey',
  '£8-12',
  'Our cold-extracted wildflower honey preserves delicate floral notes from Yorkshire meadows. The natural sweetness complements the savory depth of aged cheddar while the subtle herbal undertones enhance creamy blues without overpowering their complex flavor profiles.',
  'Any raw wildflower or clover honey',
  ARRAY[
    'Rowse Wildflower Honey',
    'Beekeeper''s Naturals Honey',
    'Local farmers market raw honey',
    'Manuka honey (for stronger cheeses)'
  ],
  'https://images.unsplash.com/photo-1587049352851-8d4e89133924?q=80&w=1200',
  NOW() + INTERVAL '30 days',
  true,
  NOW() + INTERVAL '30 days'
)
ON CONFLICT DO NOTHING;

-- Insert sponsored wine pairing
INSERT INTO cheese_pairings (
  pairing, 
  type, 
  description,
  image_url,
  is_sponsored,
  brand_name,
  brand_logo_url,
  product_name,
  purchase_url,
  price_range,
  why_it_works,
  alternative_generic,
  alternative_suggestions,
  featured_image_url,
  sponsored_until,
  show_in_feed,
  feed_until
)
VALUES (
  'Sancerre',
  'drink',
  'This crisp Loire Valley white wine is a classic pairing for goat cheeses.',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=1200',
  true,
  'The Wine Collective',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=400',
  'Domaine Vacheron Sancerre 2022',
  'https://thewinecollective.co.uk/products/vacheron-sancerre',
  '£25-35',
  'This biodynamic Sancerre from Domaine Vacheron offers vibrant minerality and citrus notes that cut through the creaminess of fresh goat cheese. The wine''s crisp acidity refreshes the palate while its subtle flinty character enhances the earthy undertones in aged chèvre.',
  'Any crisp white wine with good acidity (Sauvignon Blanc, dry Riesling, or Albariño)',
  ARRAY[
    'New Zealand Sauvignon Blanc',
    'Chablis (unoaked Chardonnay)',
    'Grüner Veltliner',
    'Vermentino'
  ],
  'https://images.unsplash.com/photo-1547595628-c61a29f496f0?q=80&w=1200',
  NOW() + INTERVAL '30 days',
  true,
  NOW() + INTERVAL '30 days'
)
ON CONFLICT DO NOTHING;

-- Insert a non-sponsored example for comparison
INSERT INTO cheese_pairings (
  pairing, 
  type, 
  description,
  image_url,
  is_sponsored
)
VALUES (
  'Fig Jam',
  'food',
  'Sweet and jammy, fig preserves add a fruity contrast to salty, aged cheeses.',
  'https://images.unsplash.com/photo-1571833735999-97e4ba3c5efb?q=80&w=1200',
  false
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Link Pairings to Cheeses (Many-to-Many)
-- ============================================================================
-- NOTE: To link these pairings to actual cheeses, you'll need to:
-- 1. Get the pairing IDs: SELECT id, pairing FROM cheese_pairings WHERE pairing IN ('Wildflower Honey', 'Sancerre', 'Fig Jam');
-- 2. Get cheese IDs from your cheeses table
-- 3. Insert into cheese_pairing_matches table
--
-- Example:
-- INSERT INTO cheese_pairing_matches (cheese_id, pairing_id)
-- VALUES 
--   ('cheese-uuid-1', 'honey-pairing-uuid'),
--   ('cheese-uuid-2', 'honey-pairing-uuid'),  -- Same honey works with multiple cheeses!
--   ('cheese-uuid-3', 'sancerre-pairing-uuid')
-- ON CONFLICT DO NOTHING;
--
-- This allows Wildflower Honey to be associated with Cheddar, Brie, Blue cheese, etc.
