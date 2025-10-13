-- Function to extend add_or_update_cheese to handle location data
CREATE OR REPLACE FUNCTION add_or_update_cheese_with_location(
  -- Original cheese parameters
  p_id UUID, -- NULL for new cheeses
  p_name VARCHAR,
  p_type cheese_type,
  p_milk_type milk_type,
  p_origin_country VARCHAR,
  p_origin_region VARCHAR,
  p_description TEXT,
  p_ageing_period VARCHAR,
  p_photo_url TEXT,
  p_user_id UUID,
  p_flavor_tags TEXT[],
  
  -- Location parameters (NULL if not associating with a location)
  p_location_id UUID, -- Existing location ID, NULL if creating new location
  p_location_name VARCHAR, -- Required if p_location_id is NULL
  p_location_description TEXT,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_elevation INTEGER,
  p_gi_type gi_type,
  p_gi_registration_number VARCHAR,
  p_gi_registration_date DATE,
  p_gi_product_category VARCHAR,
  p_gi_protection_status VARCHAR,
  p_traditional_methods TEXT,
  p_historical_significance TEXT,
  p_boundary TEXT, -- WKT format for polygon
  p_is_primary_location BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  cheese_id UUID,
  location_id UUID
) AS $$
DECLARE
  v_cheese_id UUID;
  v_location_id UUID;
  v_mapping_id UUID;
BEGIN
  -- First, add or update the cheese using the existing function
  v_cheese_id := add_or_update_cheese(
    p_id,
    p_name,
    p_type,
    p_milk_type,
    p_origin_country,
    p_origin_region,
    p_description,
    p_ageing_period,
    p_photo_url,
    p_user_id,
    p_flavor_tags
  );
  
  -- If location data is provided, add or update the location
  IF (p_location_id IS NOT NULL) OR (p_latitude IS NOT NULL AND p_longitude IS NOT NULL) THEN
    -- If location_id is provided, use it; otherwise create a new location
    IF p_location_id IS NOT NULL THEN
      v_location_id := p_location_id;
    ELSE
      -- Ensure location name is provided for new locations
      IF p_location_name IS NULL THEN
        RAISE EXCEPTION 'Location name is required when creating a new location';
      END IF;
      
      -- Create new location
      v_location_id := add_or_update_cheese_location(
        NULL, -- New location
        p_location_name,
        p_location_description,
        p_latitude,
        p_longitude,
        p_elevation,
        p_gi_type,
        p_gi_registration_number,
        p_gi_registration_date,
        p_gi_product_category,
        p_gi_protection_status,
        p_traditional_methods,
        p_historical_significance,
        p_boundary,
        p_user_id
      );
    END IF;
    
    -- Associate the cheese with the location
    v_mapping_id := associate_cheese_with_location(
      v_cheese_id,
      v_location_id,
      p_is_primary_location
    );
  END IF;
  
  -- Return the cheese_id and location_id (which may be NULL)
  RETURN QUERY SELECT v_cheese_id, v_location_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get cheese details with location information
CREATE OR REPLACE FUNCTION get_cheese_with_details(p_cheese_id UUID)
RETURNS TABLE (
  -- Cheese details
  id UUID,
  name VARCHAR,
  type cheese_type,
  milk milk_type,
  origin_country VARCHAR,
  origin_region VARCHAR,
  description TEXT,
  ageing_period VARCHAR,
  image_url TEXT,
  added_by UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  flavor_tags TEXT[],
  
  -- Primary location details (may be NULL)
  location_id UUID,
  location_name VARCHAR,
  location_description TEXT,
  coordinates GEOGRAPHY,
  elevation INTEGER,
  gi_type gi_type,
  gi_registration_number VARCHAR,
  gi_registration_date DATE,
  gi_product_category VARCHAR,
  gi_protection_status VARCHAR,
  traditional_methods TEXT,
  historical_significance TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.type,
    c.milk,
    c.origin_country,
    c.origin_region,
    c.description,
    c.ageing_period,
    c.image_url,
    c.added_by,
    c.created_at,
    c.updated_at,
    ARRAY(
      SELECT ft.name 
      FROM cheese_flavor_tags cft 
      JOIN flavor_tags ft ON cft.tag_id = ft.id 
      WHERE cft.cheese_id = c.id
    ) AS flavor_tags,
    
    -- Primary location details
    cl.id,
    cl.name,
    cl.description,
    cl.coordinates,
    cl.elevation,
    cl.gi_type,
    cl.gi_registration_number,
    cl.gi_registration_date,
    cl.gi_product_category,
    cl.gi_protection_status,
    cl.traditional_methods,
    cl.historical_significance
  FROM 
    cheeses c
  LEFT JOIN 
    cheese_location_mappings clm ON c.id = clm.cheese_id AND clm.is_primary = TRUE
  LEFT JOIN 
    cheese_locations cl ON clm.location_id = cl.id
  WHERE 
    c.id = p_cheese_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find cheeses by geographical indication
CREATE OR REPLACE FUNCTION find_cheeses_by_geographical_indication(
  p_gi_type gi_type DEFAULT NULL,
  p_gi_product_category VARCHAR DEFAULT NULL,
  p_gi_protection_status VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  cheese_id UUID,
  cheese_name VARCHAR,
  location_name VARCHAR,
  gi_type gi_type,
  gi_registration_number VARCHAR,
  gi_product_category VARCHAR,
  gi_protection_status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as cheese_id,
    c.name as cheese_name,
    cl.name as location_name,
    cl.gi_type,
    cl.gi_registration_number,
    cl.gi_product_category,
    cl.gi_protection_status
  FROM 
    cheeses c
  JOIN 
    cheese_location_mappings clm ON c.id = clm.cheese_id
  JOIN 
    cheese_locations cl ON clm.location_id = cl.id
  WHERE 
    (p_gi_type IS NULL OR cl.gi_type = p_gi_type) AND
    (p_gi_product_category IS NULL OR cl.gi_product_category ILIKE '%' || p_gi_product_category || '%') AND
    (p_gi_protection_status IS NULL OR cl.gi_protection_status ILIKE '%' || p_gi_protection_status || '%')
  ORDER BY 
    c.name,
    clm.is_primary DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;