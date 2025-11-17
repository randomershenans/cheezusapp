-- ============================================
-- PREREQUISITES FOR CHEESE HIERARCHY SYSTEM
-- ============================================
-- Run this FIRST before cheese-hierarchy-schema.sql
-- This ensures all required extensions exist

-- ============================================
-- 1. ENABLE REQUIRED EXTENSIONS
-- ============================================
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. VERIFY EXISTING TABLES
-- ============================================
-- Check that required tables exist
DO $$ 
BEGIN
  -- Verify cheese_flavors table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cheese_flavors') THEN
    RAISE WARNING 'cheese_flavors table does not exist yet - it will be needed for flavor migration';
  ELSE
    RAISE NOTICE 'Found existing cheese_flavors table ✓';
  END IF;
  
  -- Verify cheeses table exists (if doing migration)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cheeses') THEN
    RAISE NOTICE 'Found existing cheeses table - migration will preserve this data ✓';
  ELSE
    RAISE NOTICE 'No existing cheeses table - this is a fresh installation';
  END IF;
END $$;

-- ============================================
-- PREREQUISITES COMPLETE
-- ============================================
-- Your existing tables:
-- - cheese_flavors (id, cheese_id, flavor)
-- - cheeses (your current cheese table)
-- 
-- Next: Run cheese-hierarchy-schema.sql
