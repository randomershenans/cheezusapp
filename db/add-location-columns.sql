-- Add latitude/longitude columns to producers table for map integration
-- Run this migration in Supabase SQL Editor

-- Add lat/lng columns to producers
ALTER TABLE producers 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Create index for geo queries (finding nearby producers)
CREATE INDEX IF NOT EXISTS idx_producers_location 
ON producers(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add lat/lng columns to producer_cheeses for origin location (optional, can use producer's location)
ALTER TABLE producer_cheeses 
ADD COLUMN IF NOT EXISTS origin_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS origin_longitude DECIMAL(11, 8);

-- Create index for producer_cheeses location
CREATE INDEX IF NOT EXISTS idx_producer_cheeses_location 
ON producer_cheeses(origin_latitude, origin_longitude) 
WHERE origin_latitude IS NOT NULL AND origin_longitude IS NOT NULL;

-- Helper function to find producers within a radius (in km)
-- Uses Haversine formula for distance calculation
CREATE OR REPLACE FUNCTION find_nearby_producers(
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_radius_km DECIMAL DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  region TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  distance_km DECIMAL,
  image_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name::TEXT,
    p.address::TEXT,
    NULL::TEXT as city,
    p.country::TEXT,
    p.region::TEXT,
    p.latitude,
    p.longitude,
    (
      6371 * acos(
        cos(radians(p_latitude)) * cos(radians(p.latitude)) *
        cos(radians(p.longitude) - radians(p_longitude)) +
        sin(radians(p_latitude)) * sin(radians(p.latitude))
      )
    )::DECIMAL as distance_km,
    p.image_url::TEXT
  FROM producers p
  WHERE p.latitude IS NOT NULL 
    AND p.longitude IS NOT NULL
    AND (
      6371 * acos(
        cos(radians(p_latitude)) * cos(radians(p.latitude)) *
        cos(radians(p.longitude) - radians(p_longitude)) +
        sin(radians(p_latitude)) * sin(radians(p.latitude))
      )
    ) <= p_radius_km
  ORDER BY distance_km ASC;
END;
$$;

-- Helper function to find shops within a radius (in km)
CREATE OR REPLACE FUNCTION find_nearby_shops(
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_radius_km DECIMAL DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  distance_km DECIMAL,
  image_url TEXT,
  shop_type TEXT,
  is_verified BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name::TEXT,
    s.address::TEXT,
    s.city::TEXT,
    s.country::TEXT,
    s.latitude,
    s.longitude,
    (
      6371 * acos(
        cos(radians(p_latitude)) * cos(radians(s.latitude)) *
        cos(radians(s.longitude) - radians(p_longitude)) +
        sin(radians(p_latitude)) * sin(radians(s.latitude))
      )
    )::DECIMAL as distance_km,
    s.image_url::TEXT,
    s.shop_type::TEXT,
    s.is_verified
  FROM shops s
  WHERE s.latitude IS NOT NULL 
    AND s.longitude IS NOT NULL
    AND s.status = 'active'
    AND (
      6371 * acos(
        cos(radians(p_latitude)) * cos(radians(s.latitude)) *
        cos(radians(s.longitude) - radians(p_longitude)) +
        sin(radians(p_latitude)) * sin(radians(s.latitude))
      )
    ) <= p_radius_km
  ORDER BY distance_km ASC;
END;
$$;

-- Helper function to find cheeses within a radius (uses producer's location or cheese's own origin location)
CREATE OR REPLACE FUNCTION find_nearby_cheeses(
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_radius_km DECIMAL DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  producer_name TEXT,
  producer_id UUID,
  latitude DECIMAL,
  longitude DECIMAL,
  distance_km DECIMAL,
  image_url TEXT,
  cheese_type_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.id,
    COALESCE(pc.full_name, pc.product_name, ct.name)::TEXT as name,
    p.name::TEXT as producer_name,
    p.id as producer_id,
    COALESCE(pc.origin_latitude, p.latitude) as latitude,
    COALESCE(pc.origin_longitude, p.longitude) as longitude,
    (
      6371 * acos(
        cos(radians(p_latitude)) * cos(radians(COALESCE(pc.origin_latitude, p.latitude))) *
        cos(radians(COALESCE(pc.origin_longitude, p.longitude)) - radians(p_longitude)) +
        sin(radians(p_latitude)) * sin(radians(COALESCE(pc.origin_latitude, p.latitude)))
      )
    )::DECIMAL as distance_km,
    pc.image_url::TEXT,
    ct.name::TEXT as cheese_type_name
  FROM producer_cheeses pc
  JOIN producers p ON pc.producer_id = p.id
  LEFT JOIN cheese_types ct ON pc.cheese_type_id = ct.id
  WHERE (
      (pc.origin_latitude IS NOT NULL AND pc.origin_longitude IS NOT NULL)
      OR (p.latitude IS NOT NULL AND p.longitude IS NOT NULL)
    )
    AND (
      6371 * acos(
        cos(radians(p_latitude)) * cos(radians(COALESCE(pc.origin_latitude, p.latitude))) *
        cos(radians(COALESCE(pc.origin_longitude, p.longitude)) - radians(p_longitude)) +
        sin(radians(p_latitude)) * sin(radians(COALESCE(pc.origin_latitude, p.latitude)))
      )
    ) <= p_radius_km
  ORDER BY distance_km ASC
  LIMIT 100;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION find_nearby_producers TO authenticated, anon;
GRANT EXECUTE ON FUNCTION find_nearby_shops TO authenticated, anon;
GRANT EXECUTE ON FUNCTION find_nearby_cheeses TO authenticated, anon;

-- Example: Update a producer's location (for your backend to use)
-- UPDATE producers SET latitude = 48.8566, longitude = 2.3522 WHERE id = 'producer-uuid';

-- Example: Query nearby producers within 25km of Paris
-- SELECT * FROM find_nearby_producers(48.8566, 2.3522, 25);
