-- Create extension for geospatial functionality if not exists
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create enum type for geographical indication classification
CREATE TYPE gi_type AS ENUM (
  'PDO', -- Protected Designation of Origin
  'PGI', -- Protected Geographical Indication
  'TSG', -- Traditional Specialty Guaranteed
  'AOC', -- Appellation d'Origine Contrôlée
  'DOC', -- Denominazione di Origine Controllata
  'DOCG', -- Denominazione di Origine Controllata e Garantita
  'IGP', -- Indication Géographique Protégée
  'DOP', -- Denominazione di Origine Protetta
  'IGT', -- Indicazione Geografica Tipica
  'DO', -- Denominación de Origen
  'AVA', -- American Viticultural Area
  'OTHER' -- Other geographical indications
);

-- Create cheese_locations table
CREATE TABLE cheese_locations (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Geospatial data
  coordinates GEOGRAPHY(POINT) NOT NULL,
  elevation INTEGER, -- in meters above sea level
  boundary GEOGRAPHY(POLYGON), -- optional boundary of the region
  
  -- Geographical Indication classification
  gi_type gi_type, -- type of geographical indication (PDO, PGI, etc.)
  gi_registration_number VARCHAR(100), -- official registration number
  gi_registration_date DATE, -- when the GI was registered
  gi_product_category VARCHAR(100), -- product category under the GI
  gi_protection_status VARCHAR(50), -- current protection status
  
  -- Traditional and cultural aspects
  traditional_methods TEXT,
  historical_significance TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  added_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Create junction table to link cheeses to locations
CREATE TABLE cheese_location_mappings (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  cheese_id UUID NOT NULL REFERENCES cheeses(id),
  location_id BIGINT NOT NULL REFERENCES cheese_locations(id),
  is_primary BOOLEAN DEFAULT FALSE, -- indicates if this is the primary location for the cheese
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_deleted BOOLEAN DEFAULT FALSE,
  UNIQUE(cheese_id, location_id)
);

-- Create indexes for efficient querying
CREATE INDEX idx_cheese_locations_name ON cheese_locations(name);
CREATE INDEX idx_cheese_locations_gi_type ON cheese_locations(gi_type);
CREATE INDEX idx_cheese_locations_gi_registration_number ON cheese_locations(gi_registration_number);
CREATE INDEX idx_cheese_locations_gi_product_category ON cheese_locations(gi_product_category);
CREATE INDEX idx_cheese_locations_gi_protection_status ON cheese_locations(gi_protection_status);
CREATE INDEX idx_cheese_location_mappings_cheese_id ON cheese_location_mappings(cheese_id);
CREATE INDEX idx_cheese_location_mappings_location_id ON cheese_location_mappings(location_id);
CREATE INDEX idx_cheese_location_mappings_is_primary ON cheese_location_mappings(is_primary);

-- Create indexes for efficient filtering of soft-deleted records
CREATE INDEX idx_cheese_locations_is_deleted ON cheese_locations(is_deleted);
CREATE INDEX idx_cheese_location_mappings_is_deleted ON cheese_location_mappings(is_deleted);

-- Create spatial index for geospatial queries
CREATE INDEX idx_cheese_locations_coordinates ON cheese_locations USING GIST(coordinates);
CREATE INDEX idx_cheese_locations_boundary ON cheese_locations USING GIST(boundary);

-- Add Row Level Security (RLS) policies
ALTER TABLE cheese_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cheese_location_mappings ENABLE ROW LEVEL SECURITY;

-- Everyone can view non-deleted locations
CREATE POLICY cheese_locations_select_policy ON cheese_locations
  FOR SELECT USING (is_deleted = FALSE);

-- Only the creator can modify locations
CREATE POLICY cheese_locations_insert_policy ON cheese_locations
  FOR INSERT WITH CHECK (added_by = auth.uid());

CREATE POLICY cheese_locations_update_policy ON cheese_locations
  FOR UPDATE USING (added_by = auth.uid());

CREATE POLICY cheese_locations_delete_policy ON cheese_locations
  FOR DELETE USING (added_by = auth.uid());

-- Everyone can view non-deleted mappings
CREATE POLICY cheese_location_mappings_select_policy ON cheese_location_mappings
  FOR SELECT USING (is_deleted = FALSE);

-- Only users who can modify the cheese can modify its mappings
CREATE POLICY cheese_location_mappings_insert_policy ON cheese_location_mappings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM cheeses 
      WHERE id = cheese_location_mappings.cheese_id 
      AND added_by = auth.uid()
    )
  );

CREATE POLICY cheese_location_mappings_update_policy ON cheese_location_mappings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM cheeses 
      WHERE id = cheese_location_mappings.cheese_id 
      AND added_by = auth.uid()
    )
  );

CREATE POLICY cheese_location_mappings_delete_policy ON cheese_location_mappings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM cheeses 
      WHERE id = cheese_location_mappings.cheese_id 
      AND added_by = auth.uid()
    )
  );

-- Create function to get location details for a cheese
CREATE OR REPLACE FUNCTION get_cheese_locations(p_cheese_id UUID)
RETURNS TABLE (
  id BIGINT,
  name VARCHAR,
  description TEXT,
  coordinates GEOGRAPHY,
  elevation INTEGER,
  gi_type gi_type,
  gi_registration_number VARCHAR,
  gi_registration_date DATE,
  gi_product_category VARCHAR,
  gi_protection_status VARCHAR,
  traditional_methods TEXT,
  historical_significance TEXT,
  is_primary BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
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
    cl.historical_significance,
    clm.is_primary
  FROM 
    cheese_locations cl
  JOIN 
    cheese_location_mappings clm ON cl.id = clm.location_id
  WHERE 
    clm.cheese_id = p_cheese_id
    AND cl.is_deleted = FALSE
    AND clm.is_deleted = FALSE
  ORDER BY 
    clm.is_primary DESC, 
    cl.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to find cheeses by location proximity
CREATE OR REPLACE FUNCTION find_cheeses_by_location(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_radius INTEGER -- radius in meters
)
RETURNS TABLE (
  cheese_id UUID,
  cheese_name VARCHAR,
  location_name VARCHAR,
  distance DOUBLE PRECISION -- distance in meters
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as cheese_id,
    c.name as cheese_name,
    cl.name as location_name,
    ST_Distance(
      cl.coordinates::geography, 
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
    ) as distance
  FROM 
    cheeses c
  JOIN 
    cheese_location_mappings clm ON c.id = clm.cheese_id
  JOIN 
    cheese_locations cl ON clm.location_id = cl.id
  WHERE 
    ST_DWithin(
      cl.coordinates::geography,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
      p_radius
    )
    AND cl.is_deleted = FALSE
    AND clm.is_deleted = FALSE
  ORDER BY 
    distance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to add or update a cheese location
CREATE OR REPLACE FUNCTION add_or_update_cheese_location(
  p_id BIGINT, -- NULL for new locations
  p_name VARCHAR,
  p_description TEXT,
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
  p_user_id UUID
)
RETURNS BIGINT AS $$
DECLARE
  location_id BIGINT;
BEGIN
  IF p_id IS NULL THEN
    -- Create new location
    INSERT INTO cheese_locations (
      name,
      description,
      coordinates,
      elevation,
      gi_type,
      gi_registration_number,
      gi_registration_date,
      gi_product_category,
      gi_protection_status,
      traditional_methods,
      historical_significance,
      boundary,
      added_by
    ) VALUES (
      p_name,
      p_description,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
      p_elevation,
      p_gi_type,
      p_gi_registration_number,
      p_gi_registration_date,
      p_gi_product_category,
      p_gi_protection_status,
      p_traditional_methods,
      p_historical_significance,
      CASE WHEN p_boundary IS NOT NULL 
        THEN ST_GeomFromText(p_boundary, 4326)::geography 
        ELSE NULL 
      END,
      p_user_id
    )
    RETURNING id INTO location_id;
  ELSE
    -- Update existing location
    UPDATE cheese_locations
    SET
      name = p_name,
      description = p_description,
      coordinates = ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
      elevation = p_elevation,
      gi_type = p_gi_type,
      gi_registration_number = p_gi_registration_number,
      gi_registration_date = p_gi_registration_date,
      gi_product_category = p_gi_product_category,
      gi_protection_status = p_gi_protection_status,
      traditional_methods = p_traditional_methods,
      historical_significance = p_historical_significance,
      boundary = CASE WHEN p_boundary IS NOT NULL 
        THEN ST_GeomFromText(p_boundary, 4326)::geography 
        ELSE boundary 
      END,
      updated_at = CURRENT_TIMESTAMP
    WHERE
      id = p_id AND added_by = p_user_id
    RETURNING id INTO location_id;
  END IF;
  RETURN location_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to associate a cheese with a location
CREATE OR REPLACE FUNCTION associate_cheese_with_location(
  p_cheese_id UUID,
  p_location_id BIGINT,
  p_is_primary BOOLEAN DEFAULT FALSE
)
RETURNS BIGINT AS $$
DECLARE
  mapping_id BIGINT;
BEGIN
  -- If setting this as primary, unset any existing primary
  IF p_is_primary THEN
    UPDATE cheese_location_mappings
    SET 
      is_primary = FALSE,
      updated_at = CURRENT_TIMESTAMP
    WHERE 
      cheese_id = p_cheese_id 
      AND is_primary = TRUE
      AND is_deleted = FALSE;
  END IF;
  
  -- Check if mapping already exists (including soft-deleted ones)
  SELECT id INTO mapping_id
  FROM cheese_location_mappings
  WHERE cheese_id = p_cheese_id AND location_id = p_location_id;
  
  IF mapping_id IS NULL THEN
    -- Create new mapping
    INSERT INTO cheese_location_mappings (
      cheese_id,
      location_id,
      is_primary,
      is_deleted
    ) VALUES (
      p_cheese_id,
      p_location_id,
      p_is_primary,
      FALSE
    )
    RETURNING id INTO mapping_id;
  ELSE
    -- Check if mapping is soft-deleted
    IF EXISTS (
      SELECT 1 FROM cheese_location_mappings
      WHERE id = mapping_id AND is_deleted = TRUE
    ) THEN
      -- Restore and update the mapping
      UPDATE cheese_location_mappings
      SET 
        is_primary = p_is_primary,
        is_deleted = FALSE,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = mapping_id
      RETURNING id INTO mapping_id;
    ELSE
      -- Update existing active mapping
      UPDATE cheese_location_mappings
      SET 
        is_primary = p_is_primary,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = mapping_id
      RETURNING id INTO mapping_id;
    END IF;
  END IF;
  
  RETURN mapping_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to soft delete a cheese location
CREATE OR REPLACE FUNCTION soft_delete_cheese_location(
  p_location_id BIGINT,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  success BOOLEAN := FALSE;
BEGIN
  -- Soft delete the location
  UPDATE cheese_locations
  SET 
    is_deleted = TRUE,
    updated_at = CURRENT_TIMESTAMP
  WHERE 
    id = p_location_id 
    AND added_by = p_user_id
    AND is_deleted = FALSE
  RETURNING TRUE INTO success;
  
  -- If location was successfully soft deleted, also soft delete all mappings
  IF success THEN
    UPDATE cheese_location_mappings
    SET 
      is_deleted = TRUE,
      updated_at = CURRENT_TIMESTAMP
    WHERE 
      location_id = p_location_id
      AND is_deleted = FALSE;
  END IF;
  
  RETURN success;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to soft delete a cheese location mapping
CREATE OR REPLACE FUNCTION soft_delete_cheese_location_mapping(
  p_mapping_id BIGINT,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  success BOOLEAN := FALSE;
BEGIN
  UPDATE cheese_location_mappings
  SET 
    is_deleted = TRUE,
    updated_at = CURRENT_TIMESTAMP
  WHERE 
    id = p_mapping_id
    AND is_deleted = FALSE
    AND EXISTS (
      SELECT 1 FROM cheeses 
      WHERE id = cheese_location_mappings.cheese_id 
      AND added_by = p_user_id
    )
  RETURNING TRUE INTO success;
  
  RETURN success;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore a soft-deleted cheese location
CREATE OR REPLACE FUNCTION restore_cheese_location(
  p_location_id BIGINT,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  success BOOLEAN := FALSE;
BEGIN
  UPDATE cheese_locations
  SET 
    is_deleted = FALSE,
    updated_at = CURRENT_TIMESTAMP
  WHERE 
    id = p_location_id 
    AND added_by = p_user_id
    AND is_deleted = TRUE
  RETURNING TRUE INTO success;
  
  RETURN success;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore a soft-deleted cheese location mapping
CREATE OR REPLACE FUNCTION restore_cheese_location_mapping(
  p_mapping_id BIGINT,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  success BOOLEAN := FALSE;
BEGIN
  UPDATE cheese_location_mappings
  SET 
    is_deleted = FALSE,
    updated_at = CURRENT_TIMESTAMP
  WHERE 
    id = p_mapping_id
    AND is_deleted = TRUE
    AND EXISTS (
      SELECT 1 FROM cheeses 
      WHERE id = cheese_location_mappings.cheese_id 
      AND added_by = p_user_id
    )
  RETURNING TRUE INTO success;
  
  RETURN success;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

