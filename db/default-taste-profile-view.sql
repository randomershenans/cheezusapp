-- ============================================================================
-- DEFAULT TASTE PROFILE (MATERIALIZED VIEW)
-- ============================================================================
-- Phase 1 / Workstream 3 — cold-start fallback.
--
-- When a brand-new user skips the taste quiz AND has zero rating history,
-- we still want non-random personalization. This view pre-computes the
-- globally top-rated signals (families, countries, milk types, flavors)
-- from cheese_box_entries with rating >= 4, so the RPC can hand those
-- back as the user's "default" taste profile.
--
-- Refreshed on a schedule (e.g. nightly via pg_cron or a Supabase cron
-- edge function) via refresh_default_taste_profile().
--
-- ----------------------------------------------------------------------------
-- LOAD ORDER
-- ----------------------------------------------------------------------------
-- Load AFTER db/cheese-hierarchy-schema.sql (producer_cheese_stats view,
-- flavor_tags, producer_cheese_flavor_tags must exist).
-- Load BEFORE db/taste-profile-rpc-v2.sql (which queries this view).
--
-- Idempotent: uses CREATE MATERIALIZED VIEW IF NOT EXISTS. To pick up
-- a schema change, DROP MATERIALIZED VIEW IF EXISTS default_taste_profile
-- first, then re-run this file.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. MATERIALIZED VIEW: default_taste_profile
-- ----------------------------------------------------------------------------
-- Single-row view holding the global defaults as text arrays, matching
-- the shape the taste-profile RPC returns per field.
--
-- Uses sub-selects so each field has an independent LIMIT — unlike a
-- single GROUP BY which would force the same bucket dimension.
CREATE MATERIALIZED VIEW IF NOT EXISTS public.default_taste_profile AS
SELECT
  -- Top 3 cheese_family (by count of 4+ ratings)
  ( SELECT COALESCE(ARRAY_AGG(cheese_family ORDER BY c DESC), '{}'::TEXT[])
    FROM (
      SELECT pcs.cheese_family, COUNT(*) AS c
      FROM cheese_box_entries cbe
      JOIN producer_cheese_stats pcs ON pcs.id = cbe.cheese_id
      WHERE cbe.rating >= 4
        AND pcs.cheese_family IS NOT NULL
      GROUP BY pcs.cheese_family
      ORDER BY c DESC
      LIMIT 3
    ) s
  ) AS favorite_families,

  -- Top 5 origin_country
  ( SELECT COALESCE(ARRAY_AGG(origin_country ORDER BY c DESC), '{}'::TEXT[])
    FROM (
      SELECT pcs.origin_country, COUNT(*) AS c
      FROM cheese_box_entries cbe
      JOIN producer_cheese_stats pcs ON pcs.id = cbe.cheese_id
      WHERE cbe.rating >= 4
        AND pcs.origin_country IS NOT NULL
      GROUP BY pcs.origin_country
      ORDER BY c DESC
      LIMIT 5
    ) s
  ) AS favorite_countries,

  -- Top 3 milk_type
  ( SELECT COALESCE(ARRAY_AGG(milk_type ORDER BY c DESC), '{}'::TEXT[])
    FROM (
      SELECT pcs.milk_type, COUNT(*) AS c
      FROM cheese_box_entries cbe
      JOIN producer_cheese_stats pcs ON pcs.id = cbe.cheese_id
      WHERE cbe.rating >= 4
        AND pcs.milk_type IS NOT NULL
      GROUP BY pcs.milk_type
      ORDER BY c DESC
      LIMIT 3
    ) s
  ) AS favorite_milk_types,

  -- Top 10 flavor_tag names (via producer_cheese_flavor_tags join)
  ( SELECT COALESCE(ARRAY_AGG(flavor_name ORDER BY c DESC), '{}'::TEXT[])
    FROM (
      SELECT ft.name AS flavor_name, COUNT(*) AS c
      FROM cheese_box_entries cbe
      JOIN producer_cheese_flavor_tags pcft ON pcft.producer_cheese_id = cbe.cheese_id
      JOIN flavor_tags ft ON ft.id = pcft.flavor_tag_id
      WHERE cbe.rating >= 4
      GROUP BY ft.name
      ORDER BY c DESC
      LIMIT 10
    ) s
  ) AS favorite_flavors,

  now() AS refreshed_at;

COMMENT ON MATERIALIZED VIEW public.default_taste_profile
  IS 'Single-row global taste defaults used to cold-start users who skipped the quiz AND have no rating history. Refresh via refresh_default_taste_profile().';


-- ----------------------------------------------------------------------------
-- 2. UNIQUE INDEX (required for REFRESH MATERIALIZED VIEW CONCURRENTLY)
-- ----------------------------------------------------------------------------
-- The view has exactly one row. We build a unique index on a constant
-- expression so that concurrent refresh is possible (useful if this is
-- ever refreshed during live traffic).
CREATE UNIQUE INDEX IF NOT EXISTS idx_default_taste_profile_singleton
  ON public.default_taste_profile ((refreshed_at IS NOT NULL));


-- ----------------------------------------------------------------------------
-- 3. refresh_default_taste_profile()
-- ----------------------------------------------------------------------------
-- Wrap the REFRESH in a SECURITY DEFINER function so scheduled jobs can
-- call it without needing ownership. Tries CONCURRENTLY first (requires
-- the unique index) and falls back to a plain refresh on first run
-- (when the view has never been populated).
CREATE OR REPLACE FUNCTION public.refresh_default_taste_profile()
RETURNS VOID AS $fn_refresh_default$
BEGIN
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.default_taste_profile;
  EXCEPTION WHEN OTHERS THEN
    -- CONCURRENTLY fails on the very first refresh (before the view has
    -- any data) or if the unique index is missing. Fall back to plain.
    REFRESH MATERIALIZED VIEW public.default_taste_profile;
  END;
END;
$fn_refresh_default$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.refresh_default_taste_profile()
  IS 'Refreshes the default_taste_profile materialized view. Schedule nightly.';


-- ----------------------------------------------------------------------------
-- 4. INITIAL POPULATION
-- ----------------------------------------------------------------------------
-- Populate once at install time so the RPC has data to return immediately.
-- Safe to re-run — REFRESH is idempotent.
SELECT public.refresh_default_taste_profile();
