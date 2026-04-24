-- ============================================================================
-- TASTE PROFILE RPC — v2 (quiz-aware, flavor-filtered, adventurousness-modulated)
-- ============================================================================
-- Phase 1 / Workstream 3. Supersedes the v1 functions in
-- db/enhanced-feed-recommendations.sql.
--
-- What's new vs v1:
--   1. get_user_taste_profile now returns a profile for EVERY user:
--        - cheese_count >= 4               → pure history (v1 behavior)
--        - cheese_count < 4 + quiz done    → history COALESCE seed (per-field)
--        - cheese_count = 0 + no/skipped   → materialized default_taste_profile
--      Previously the function returned NULL for users with zero cheeses,
--      which meant cold-start users got ZERO personalization.
--
--   2. Tier slugs now match constants/Tiers.ts exactly:
--        curious (0) → explorer (3) → connoisseur (10) → affineur (25) → maitre_fromager (75)
--
--   3. get_personalized_feed now actually filters/weights on
--      favorite_flavors via the producer_cheese_flavor_tags join. v1
--      computed favorite_flavors but never used it in the WHERE clause.
--
--   4. adventurousness modulates the recommendation set:
--        0 (mellow)  → suppress cheese_family IN ('Blue','Washed Rind')
--        1 (balanced)→ no change
--        2 (stinky)  → boost those families' weights
--
-- ----------------------------------------------------------------------------
-- LOAD ORDER (CRITICAL)
-- ----------------------------------------------------------------------------
-- This file MUST be loaded AFTER:
--   1. db/cheese-hierarchy-schema.sql       (base tables, producer_cheese_stats)
--   2. db/enhanced-feed-recommendations.sql (v1 RPCs — kept as reference; v2
--                                            overrides via CREATE OR REPLACE)
--   3. db/user-taste-seed-schema.sql        (user_taste_seed table)
--   4. db/default-taste-profile-view.sql    (default_taste_profile view)
--
-- CREATE OR REPLACE FUNCTION ensures the v2 definitions win when both
-- v1 and v2 are loaded.
--
-- Idempotent: safe to re-run.
-- ============================================================================


-- ============================================================================
-- 1. get_user_taste_profile (v2)
-- ============================================================================
-- Return shape is a JSONB object with the same keys the UI already consumes
-- (see lib/feed-service.ts UserTasteProfile), plus `tier` as a v2 slug.
--
-- Keys returned: cheese_count, tier, avg_rating, favorite_families,
-- favorite_types, favorite_flavors, favorite_countries, favorite_milk_types,
-- favorite_producers, top_rated_cheeses, tried_cheese_ids,
-- intensity_preference, adventurousness, seed_source.
--
-- seed_source is new and reports which branch the profile came from —
-- 'history' | 'history+seed' | 'seed' | 'default' — useful for debugging
-- and for the "Tune your feed" banner to know whether quiz data is in play.
--
-- NOTE: v1 returned JSON; v2 returns JSONB. PostgreSQL does not allow
-- CREATE OR REPLACE FUNCTION to change the return type, so we DROP first.
DROP FUNCTION IF EXISTS public.get_user_taste_profile(UUID);

CREATE OR REPLACE FUNCTION public.get_user_taste_profile(p_user_id UUID)
RETURNS JSONB AS $fn_taste_profile$
DECLARE
  v_cheese_count   INT;
  v_avg_rating     NUMERIC;
  v_tier           TEXT;

  -- Real history aggregates (may be empty if cheese_count is low)
  v_real_families   TEXT[];
  v_real_types      TEXT[];
  v_real_flavors    TEXT[];
  v_real_countries  TEXT[];
  v_real_milk       TEXT[];
  v_real_producers  UUID[];
  v_top_rated       JSONB;
  v_tried_ids       UUID[];

  -- Seed row (if present)
  v_seed            public.user_taste_seed%ROWTYPE;
  v_has_seed        BOOLEAN := false;
  v_seed_usable     BOOLEAN := false;  -- seed exists AND skipped=false AND completed_at IS NOT NULL

  -- Defaults (from materialized view)
  v_def_families    TEXT[];
  v_def_countries   TEXT[];
  v_def_milk        TEXT[];
  v_def_flavors     TEXT[];

  -- Final merged arrays
  v_out_families    TEXT[];
  v_out_types       TEXT[];
  v_out_flavors     TEXT[];
  v_out_countries   TEXT[];
  v_out_milk        TEXT[];
  v_out_producers   UUID[];

  v_intensity       SMALLINT;
  v_adventurousness SMALLINT;

  v_source          TEXT;
  v_profile         JSONB;
BEGIN
  -- ---------- 1a. cheese_count & avg_rating ----------
  SELECT COUNT(*)::INT, ROUND(AVG(rating)::numeric, 2)
    INTO v_cheese_count, v_avg_rating
  FROM cheese_box_entries
  WHERE user_id = p_user_id AND rating IS NOT NULL;

  -- ---------- 1b. tier slug (matches constants/Tiers.ts) ----------
  v_tier := CASE
    WHEN v_cheese_count >= 75 THEN 'maitre_fromager'
    WHEN v_cheese_count >= 25 THEN 'affineur'
    WHEN v_cheese_count >= 10 THEN 'connoisseur'
    WHEN v_cheese_count >=  3 THEN 'explorer'
    ELSE                          'curious'
  END;

  -- ---------- 1c. real history aggregates ----------
  -- Build arrays in the same order / with the same filters as v1.
  -- Empty-array (not NULL) is the "no signal" value so the NULLIF merge works.
  SELECT COALESCE(ARRAY_AGG(family ORDER BY avg_r DESC, cnt DESC), '{}'::TEXT[])
    INTO v_real_families
  FROM (
    SELECT pcs.cheese_family AS family, AVG(cbe.rating) AS avg_r, COUNT(*) AS cnt
    FROM cheese_box_entries cbe
    JOIN producer_cheese_stats pcs ON pcs.id = cbe.cheese_id
    WHERE cbe.user_id = p_user_id AND cbe.rating >= 4 AND pcs.cheese_family IS NOT NULL
    GROUP BY pcs.cheese_family
    ORDER BY avg_r DESC, cnt DESC
    LIMIT 3
  ) s;

  SELECT COALESCE(ARRAY_AGG(type_name ORDER BY avg_r DESC, cnt DESC), '{}'::TEXT[])
    INTO v_real_types
  FROM (
    SELECT pcs.cheese_type_name AS type_name, AVG(cbe.rating) AS avg_r, COUNT(*) AS cnt
    FROM cheese_box_entries cbe
    JOIN producer_cheese_stats pcs ON pcs.id = cbe.cheese_id
    WHERE cbe.user_id = p_user_id AND cbe.rating >= 4 AND pcs.cheese_type_name IS NOT NULL
    GROUP BY pcs.cheese_type_name
    ORDER BY avg_r DESC, cnt DESC
    LIMIT 5
  ) s;

  SELECT COALESCE(ARRAY_AGG(flavor_name ORDER BY cnt DESC), '{}'::TEXT[])
    INTO v_real_flavors
  FROM (
    SELECT ft.name AS flavor_name, COUNT(*) AS cnt
    FROM cheese_box_entries cbe
    JOIN producer_cheese_flavor_tags pcft ON pcft.producer_cheese_id = cbe.cheese_id
    JOIN flavor_tags ft ON ft.id = pcft.flavor_tag_id
    WHERE cbe.user_id = p_user_id AND cbe.rating >= 4
    GROUP BY ft.name
    ORDER BY cnt DESC
    LIMIT 5
  ) s;

  SELECT COALESCE(ARRAY_AGG(country ORDER BY avg_r DESC, cnt DESC), '{}'::TEXT[])
    INTO v_real_countries
  FROM (
    SELECT pcs.origin_country AS country, AVG(cbe.rating) AS avg_r, COUNT(*) AS cnt
    FROM cheese_box_entries cbe
    JOIN producer_cheese_stats pcs ON pcs.id = cbe.cheese_id
    WHERE cbe.user_id = p_user_id AND cbe.rating >= 4 AND pcs.origin_country IS NOT NULL
    GROUP BY pcs.origin_country
    ORDER BY avg_r DESC, cnt DESC
    LIMIT 3
  ) s;

  SELECT COALESCE(ARRAY_AGG(milk ORDER BY avg_r DESC, cnt DESC), '{}'::TEXT[])
    INTO v_real_milk
  FROM (
    SELECT pcs.milk_type AS milk, AVG(cbe.rating) AS avg_r, COUNT(*) AS cnt
    FROM cheese_box_entries cbe
    JOIN producer_cheese_stats pcs ON pcs.id = cbe.cheese_id
    WHERE cbe.user_id = p_user_id AND cbe.rating >= 4 AND pcs.milk_type IS NOT NULL
    GROUP BY pcs.milk_type
    ORDER BY avg_r DESC, cnt DESC
    LIMIT 2
  ) s;

  -- Top producers — exclude the catch-all 'Generic' / 'Unknown' producer_name
  -- so we don't surface "Because you love cheeses by Generic" as a feed reason.
  SELECT COALESCE(ARRAY_AGG(producer_id ORDER BY avg_r DESC, cnt DESC), '{}'::UUID[])
    INTO v_real_producers
  FROM (
    SELECT pcs.producer_id, AVG(cbe.rating) AS avg_r, COUNT(*) AS cnt
    FROM cheese_box_entries cbe
    JOIN producer_cheese_stats pcs ON pcs.id = cbe.cheese_id
    WHERE cbe.user_id = p_user_id
      AND cbe.rating >= 4
      AND pcs.producer_id IS NOT NULL
      AND pcs.producer_name IS NOT NULL
      AND pcs.producer_name NOT ILIKE '%generic%'
      AND pcs.producer_name NOT ILIKE '%unknown%'
    GROUP BY pcs.producer_id
    ORDER BY avg_r DESC, cnt DESC
    LIMIT 3
  ) s;

  -- Top rated cheese info (unchanged from v1)
  SELECT COALESCE(jsonb_agg(ci), '[]'::jsonb)
    INTO v_top_rated
  FROM (
    SELECT jsonb_build_object(
      'name', CASE
        WHEN pcs.producer_name ILIKE '%generic%' OR pcs.producer_name ILIKE '%unknown%'
          THEN pcs.cheese_type_name
        ELSE pcs.full_name
      END,
      'family',    pcs.cheese_family,
      'country',   pcs.origin_country,
      'milk_type', pcs.milk_type,
      'type_name', pcs.cheese_type_name
    ) AS ci
    FROM cheese_box_entries cbe
    JOIN producer_cheese_stats pcs ON pcs.id = cbe.cheese_id
    WHERE cbe.user_id = p_user_id AND cbe.rating >= 4
    ORDER BY cbe.rating DESC, cbe.created_at DESC
    LIMIT 10
  ) t;

  SELECT COALESCE(ARRAY_AGG(cheese_id), '{}'::UUID[])
    INTO v_tried_ids
  FROM cheese_box_entries
  WHERE user_id = p_user_id;

  -- ---------- 1d. load seed row if present ----------
  SELECT * INTO v_seed FROM public.user_taste_seed WHERE user_id = p_user_id;
  v_has_seed    := FOUND;
  v_seed_usable := v_has_seed
                   AND v_seed.skipped = false
                   AND v_seed.completed_at IS NOT NULL;

  -- ---------- 1e. load defaults from materialized view ----------
  -- This is a 1-row view; LIMIT 1 is belt-and-braces.
  SELECT
    COALESCE(favorite_families,    '{}'::TEXT[]),
    COALESCE(favorite_countries,   '{}'::TEXT[]),
    COALESCE(favorite_milk_types,  '{}'::TEXT[]),
    COALESCE(favorite_flavors,     '{}'::TEXT[])
    INTO
    v_def_families,
    v_def_countries,
    v_def_milk,
    v_def_flavors
  FROM public.default_taste_profile
  LIMIT 1;

  -- Guard against the view never having been refreshed / no rows.
  v_def_families  := COALESCE(v_def_families,  '{}'::TEXT[]);
  v_def_countries := COALESCE(v_def_countries, '{}'::TEXT[]);
  v_def_milk      := COALESCE(v_def_milk,      '{}'::TEXT[]);
  v_def_flavors   := COALESCE(v_def_flavors,   '{}'::TEXT[]);

  -- ---------- 1f. merge ----------
  IF v_cheese_count >= 4 THEN
    -- Pure history.
    v_out_families  := v_real_families;
    v_out_types     := v_real_types;
    v_out_flavors   := v_real_flavors;
    v_out_countries := v_real_countries;
    v_out_milk      := v_real_milk;
    v_out_producers := v_real_producers;
    v_source        := 'history';

  ELSIF v_seed_usable THEN
    -- Merge: history wins per-field, seed fills gaps, defaults fill remaining gaps.
    v_out_families  := COALESCE(NULLIF(v_real_families,  '{}'::TEXT[]),
                        COALESCE(NULLIF(v_seed.favorite_families, '{}'::TEXT[]), v_def_families));
    v_out_types     := COALESCE(NULLIF(v_real_types,     '{}'::TEXT[]),
                        v_seed.favorite_types);  -- no default-view equivalent for types
    v_out_flavors   := COALESCE(NULLIF(v_real_flavors,   '{}'::TEXT[]),
                        COALESCE(NULLIF(v_seed.favorite_flavors, '{}'::TEXT[]), v_def_flavors));
    v_out_countries := COALESCE(NULLIF(v_real_countries, '{}'::TEXT[]),
                        COALESCE(NULLIF(v_seed.favorite_countries, '{}'::TEXT[]), v_def_countries));
    v_out_milk      := COALESCE(NULLIF(v_real_milk,      '{}'::TEXT[]),
                        COALESCE(NULLIF(v_seed.favorite_milk_types, '{}'::TEXT[]), v_def_milk));
    v_out_producers := v_real_producers;  -- seed has no producer signal
    v_source        := CASE WHEN v_cheese_count = 0 THEN 'seed' ELSE 'history+seed' END;

  ELSE
    -- cheese_count = 0 with no seed OR skipped, OR cheese_count in [1,3]
    -- with no seed/skipped → fall back to default where history is empty.
    v_out_families  := COALESCE(NULLIF(v_real_families,  '{}'::TEXT[]), v_def_families);
    v_out_types     := v_real_types;  -- no default
    v_out_flavors   := COALESCE(NULLIF(v_real_flavors,   '{}'::TEXT[]), v_def_flavors);
    v_out_countries := COALESCE(NULLIF(v_real_countries, '{}'::TEXT[]), v_def_countries);
    v_out_milk      := COALESCE(NULLIF(v_real_milk,      '{}'::TEXT[]), v_def_milk);
    v_out_producers := v_real_producers;
    v_source        := CASE WHEN v_cheese_count = 0 THEN 'default' ELSE 'history' END;
  END IF;

  -- Intensity / adventurousness come straight from seed when available.
  v_intensity       := CASE WHEN v_has_seed THEN v_seed.intensity_preference ELSE NULL END;
  v_adventurousness := CASE WHEN v_has_seed THEN v_seed.adventurousness      ELSE NULL END;

  -- ---------- 1g. build JSONB ----------
  v_profile := jsonb_build_object(
    'cheese_count',         v_cheese_count,
    'tier',                 v_tier,
    'avg_rating',           v_avg_rating,
    'favorite_families',    to_jsonb(v_out_families),
    'favorite_types',       to_jsonb(v_out_types),
    'favorite_flavors',     to_jsonb(v_out_flavors),
    'favorite_countries',   to_jsonb(v_out_countries),
    'favorite_milk_types',  to_jsonb(v_out_milk),
    'favorite_producers',   to_jsonb(v_out_producers),
    'top_rated_cheeses',    COALESCE(v_top_rated, '[]'::jsonb),
    'tried_cheese_ids',     to_jsonb(v_tried_ids),
    'intensity_preference', v_intensity,
    'adventurousness',      v_adventurousness,
    'seed_source',          v_source
  );

  RETURN v_profile;
END;
$fn_taste_profile$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_taste_profile(UUID)
  IS 'v2: returns a non-null taste profile for every user by merging real history, quiz seed, and global defaults. Tier slugs match constants/Tiers.ts.';


-- ============================================================================
-- 2. get_personalized_feed (v2)
-- ============================================================================
-- Same signature / same return shape as v1, but:
--   - joins producer_cheese_flavor_tags to actually use favorite_flavors
--   - applies adventurousness modulation on cheese_family in
--     ('Blue','Washed Rind')
--   - always runs the personalized branch because get_user_taste_profile
--     now returns non-null for cold-start users too
--
-- v1 returned JSON; v2 returns JSONB. Drop first to change the return type.
DROP FUNCTION IF EXISTS public.get_personalized_feed(UUID, INT, INT, UUID[]);

CREATE OR REPLACE FUNCTION public.get_personalized_feed(
  p_user_id     UUID DEFAULT NULL,
  p_limit       INT  DEFAULT 20,
  p_offset      INT  DEFAULT 0,
  p_exclude_ids UUID[] DEFAULT '{}'
)
RETURNS JSONB AS $fn_feed$
DECLARE
  v_profile         JSONB;
  v_result          JSONB;
  v_tried_ids       UUID[];
  v_fav_families    TEXT[];
  v_fav_countries   TEXT[];
  v_fav_milk        TEXT[];
  v_fav_producers   UUID[];
  v_fav_types       TEXT[];
  v_fav_flavors     TEXT[];
  v_adventurousness SMALLINT;

  v_recommendations JSONB;
  v_trending        JSONB;
  v_discovery       JSONB;
  v_awards          JSONB;
  v_articles        JSONB;
  v_sponsored       JSONB;

  -- Families considered "stinky" for adventurousness modulation.
  v_stinky_families TEXT[] := ARRAY['Blue', 'Washed Rind'];
BEGIN
  -- 2a. profile (always non-null for logged-in users under v2)
  IF p_user_id IS NOT NULL THEN
    v_profile := public.get_user_taste_profile(p_user_id);
  END IF;

  IF v_profile IS NOT NULL THEN
    SELECT COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_profile->'tried_cheese_ids'))::UUID[], '{}')       INTO v_tried_ids;
    SELECT COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_profile->'favorite_families')),          '{}')     INTO v_fav_families;
    SELECT COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_profile->'favorite_countries')),         '{}')     INTO v_fav_countries;
    SELECT COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_profile->'favorite_milk_types')),        '{}')     INTO v_fav_milk;
    SELECT COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_profile->'favorite_producers'))::UUID[], '{}')     INTO v_fav_producers;
    SELECT COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_profile->'favorite_types')),             '{}')     INTO v_fav_types;
    SELECT COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_profile->'favorite_flavors')),           '{}')     INTO v_fav_flavors;
    v_adventurousness := NULLIF(v_profile->>'adventurousness', '')::SMALLINT;
  ELSE
    v_tried_ids       := '{}';
    v_fav_families    := '{}';
    v_fav_countries   := '{}';
    v_fav_milk        := '{}';
    v_fav_producers   := '{}';
    v_fav_types       := '{}';
    v_fav_flavors     := '{}';
    v_adventurousness := NULL;
  END IF;

  v_tried_ids := v_tried_ids || p_exclude_ids;

  -- 2b. PERSONALIZED RECOMMENDATIONS
  IF v_profile IS NOT NULL
     AND ( array_length(v_fav_families,  1) > 0
        OR array_length(v_fav_countries, 1) > 0
        OR array_length(v_fav_flavors,   1) > 0
        OR array_length(v_fav_milk,      1) > 0
        OR array_length(v_fav_producers, 1) > 0
        OR array_length(v_fav_types,     1) > 0 )
  THEN
    -- Score each candidate, optionally filter out "stinky" families when
    -- adventurousness = 0, optionally boost them when adventurousness = 2,
    -- then take the top N with a random tiebreaker for variety.
    SELECT jsonb_agg(item) INTO v_recommendations
    FROM (
      SELECT jsonb_build_object(
        'id',   cand.id,
        'type', 'recommendation',
        'cheese', jsonb_build_object(
          'id',                cand.id,
          'full_name',         cand.full_name,
          'cheese_type_name',  cand.cheese_type_name,
          'cheese_family',     cand.cheese_family,
          'producer_name',     cand.producer_name,
          'producer_id',       cand.producer_id,
          'origin_country',    cand.origin_country,
          'image_url',         cand.image_url,
          'awards_image_url',  cand.awards_image_url,
          'average_rating',    cand.average_rating,
          'rating_count',      cand.rating_count
        ),
        'reason', CASE
          -- Only surface the producer reason if the name is meaningful —
          -- NEVER show "by Generic" / "by Unknown" to users.
          WHEN cand.producer_id = ANY(v_fav_producers)
               AND cand.producer_name IS NOT NULL
               AND cand.producer_name NOT ILIKE '%generic%'
               AND cand.producer_name NOT ILIKE '%unknown%' THEN
            'Because you love cheeses by ' || cand.producer_name

          WHEN cand.cheese_type_name = ANY(v_fav_types) THEN
            'Because you liked ' || cand.cheese_type_name

          -- New flavor-tag reason (takes priority over family-only when matching)
          WHEN cand.flavor_match IS NOT NULL THEN
            'Because you love ' || LOWER(cand.flavor_match) || ' cheeses'

          WHEN cand.cheese_family = ANY(v_fav_families) AND cand.origin_country = ANY(v_fav_countries) THEN
            'Because you enjoy ' || LOWER(cand.cheese_family) || ' cheeses from ' || cand.origin_country

          WHEN cand.cheese_family = ANY(v_fav_families) THEN
            'Because you like ' || LOWER(cand.cheese_family) || ' cheeses'

          WHEN cand.origin_country = ANY(v_fav_countries) THEN
            'Because you enjoy cheeses from ' || cand.origin_country

          WHEN cand.milk_type = ANY(v_fav_milk) THEN
            'Because you enjoy ' || LOWER(cand.milk_type) || ' milk cheeses'

          ELSE 'Picked for your palate'
        END
      ) AS item
      FROM (
        SELECT
          pcs.*,
          -- Flavor match: find one of the user's favorite flavors that this
          -- cheese has tagged. First match wins (for the reason string).
          ( SELECT ft.name
            FROM producer_cheese_flavor_tags pcft
            JOIN flavor_tags ft ON ft.id = pcft.flavor_tag_id
            WHERE pcft.producer_cheese_id = pcs.id
              AND ft.name = ANY(v_fav_flavors)
            LIMIT 1
          ) AS flavor_match,
          -- Weighted score — higher = better match.
          (
              (CASE WHEN pcs.producer_id      = ANY(v_fav_producers) THEN 5 ELSE 0 END)
            + (CASE WHEN pcs.cheese_type_name = ANY(v_fav_types)     THEN 4 ELSE 0 END)
            + (CASE WHEN pcs.cheese_family    = ANY(v_fav_families)  THEN 3 ELSE 0 END)
            + (CASE WHEN pcs.origin_country   = ANY(v_fav_countries) THEN 2 ELSE 0 END)
            + (CASE WHEN pcs.milk_type        = ANY(v_fav_milk)      THEN 1 ELSE 0 END)
            + (CASE WHEN EXISTS (
                  SELECT 1 FROM producer_cheese_flavor_tags pcft
                  JOIN flavor_tags ft ON ft.id = pcft.flavor_tag_id
                  WHERE pcft.producer_cheese_id = pcs.id
                    AND ft.name = ANY(v_fav_flavors)
                ) THEN 3 ELSE 0 END)
            -- Adventurousness modulation: big bump for "stinky" families when
            -- the user opted in to adventure.
            + (CASE WHEN v_adventurousness = 2
                     AND pcs.cheese_family = ANY(v_stinky_families)
                    THEN 4 ELSE 0 END)
          ) AS match_score
        FROM producer_cheese_stats pcs
        WHERE pcs.id != ALL(v_tried_ids)
          AND (
               pcs.cheese_family    = ANY(v_fav_families)
            OR pcs.origin_country   = ANY(v_fav_countries)
            OR pcs.milk_type        = ANY(v_fav_milk)
            OR pcs.producer_id      = ANY(v_fav_producers)
            OR pcs.cheese_type_name = ANY(v_fav_types)
            OR EXISTS (
                SELECT 1 FROM producer_cheese_flavor_tags pcft
                JOIN flavor_tags ft ON ft.id = pcft.flavor_tag_id
                WHERE pcft.producer_cheese_id = pcs.id
                  AND ft.name = ANY(v_fav_flavors)
              )
          )
          -- adventurousness = 0 → suppress stinky families entirely.
          AND (
               v_adventurousness IS DISTINCT FROM 0
            OR pcs.cheese_family IS NULL
            OR NOT (pcs.cheese_family = ANY(v_stinky_families))
          )
      ) cand
      -- match_score must be > 0 to avoid zero-signal junk
      WHERE cand.match_score > 0
      ORDER BY cand.match_score DESC, random()
      LIMIT GREATEST(p_limit * 4 / 10, 2)
    ) rec;
  END IF;

  -- 2c. TRENDING (unchanged from v1 except JSONB).
  SELECT jsonb_agg(item) INTO v_trending
  FROM (
    SELECT jsonb_build_object(
      'id',   pcs.id,
      'type', 'trending',
      'cheese', jsonb_build_object(
        'id',               pcs.id,
        'full_name',        pcs.full_name,
        'cheese_type_name', pcs.cheese_type_name,
        'cheese_family',    pcs.cheese_family,
        'producer_name',    pcs.producer_name,
        'producer_id',      pcs.producer_id,
        'origin_country',   pcs.origin_country,
        'image_url',        pcs.image_url,
        'awards_image_url', pcs.awards_image_url,
        'average_rating',   pcs.average_rating,
        'rating_count',     pcs.rating_count
      ),
      'reason', 'Rated ' || ROUND(pcs.average_rating::numeric, 1)
                         || ' by ' || pcs.rating_count
                         || ' taster' || CASE WHEN pcs.rating_count > 1 THEN 's' ELSE '' END
    ) AS item
    FROM producer_cheese_stats pcs
    WHERE pcs.id != ALL(v_tried_ids)
      AND pcs.rating_count > 0
      -- Still respect adventurousness=0 on trending.
      AND (
           v_adventurousness IS DISTINCT FROM 0
        OR pcs.cheese_family IS NULL
        OR NOT (pcs.cheese_family = ANY(v_stinky_families))
      )
    ORDER BY pcs.rating_count DESC, pcs.average_rating DESC
    LIMIT CASE WHEN v_profile IS NULL THEN p_limit * 4 / 10 ELSE p_limit * 25 / 100 END
  ) trend;

  -- 2d. DISCOVERY
  SELECT jsonb_agg(item) INTO v_discovery
  FROM (
    SELECT jsonb_build_object(
      'id',   pcs.id,
      'type', 'discovery',
      'cheese', jsonb_build_object(
        'id',               pcs.id,
        'full_name',        pcs.full_name,
        'cheese_type_name', pcs.cheese_type_name,
        'cheese_family',    pcs.cheese_family,
        'producer_name',    pcs.producer_name,
        'producer_id',      pcs.producer_id,
        'origin_country',   pcs.origin_country,
        'image_url',        pcs.image_url,
        'awards_image_url', pcs.awards_image_url,
        'average_rating',   pcs.average_rating,
        'rating_count',     pcs.rating_count
      ),
      'reason', CASE
        WHEN pcs.cheese_family IS NOT NULL AND pcs.origin_country IS NOT NULL THEN
          'Explore this ' || LOWER(pcs.cheese_family) || ' cheese from ' || pcs.origin_country
        WHEN pcs.origin_country IS NOT NULL THEN
          'Discover a taste of ' || pcs.origin_country
        WHEN pcs.cheese_family IS NOT NULL THEN
          'Try this ' || LOWER(pcs.cheese_family) || ' cheese'
        ELSE 'A new cheese to discover'
      END
    ) AS item
    FROM producer_cheese_stats pcs
    WHERE pcs.id != ALL(v_tried_ids)
      AND (
           v_adventurousness IS DISTINCT FROM 0
        OR pcs.cheese_family IS NULL
        OR NOT (pcs.cheese_family = ANY(v_stinky_families))
      )
    ORDER BY random()
    LIMIT p_limit * 2 / 10
  ) disc;

  -- 2e. AWARD WINNERS
  SELECT jsonb_agg(item) INTO v_awards
  FROM (
    SELECT jsonb_build_object(
      'id',   pcs.id,
      'type', 'award_winner',
      'cheese', jsonb_build_object(
        'id',               pcs.id,
        'full_name',        pcs.full_name,
        'cheese_type_name', pcs.cheese_type_name,
        'cheese_family',    pcs.cheese_family,
        'producer_name',    pcs.producer_name,
        'producer_id',      pcs.producer_id,
        'origin_country',   pcs.origin_country,
        'image_url',        pcs.image_url,
        'awards_image_url', pcs.awards_image_url,
        'average_rating',   pcs.average_rating,
        'rating_count',     pcs.rating_count
      ),
      'reason', CASE
        WHEN pcs.origin_country IS NOT NULL THEN
          'Award-winning ' || LOWER(COALESCE(pcs.cheese_family, 'cheese')) || ' from ' || pcs.origin_country
        ELSE
          'Award-winning ' || LOWER(COALESCE(pcs.cheese_family, 'cheese'))
      END
    ) AS item
    FROM producer_cheese_stats pcs
    WHERE pcs.id != ALL(v_tried_ids)
      AND pcs.awards_image_url IS NOT NULL
      AND (
           v_adventurousness IS DISTINCT FROM 0
        OR pcs.cheese_family IS NULL
        OR NOT (pcs.cheese_family = ANY(v_stinky_families))
      )
    ORDER BY pcs.average_rating DESC
    LIMIT CASE WHEN v_profile IS NULL THEN p_limit * 2 / 10 ELSE p_limit * 1 / 10 END
  ) awards;

  -- 2f. ARTICLES (unchanged).
  SELECT jsonb_agg(article) INTO v_articles
  FROM (
    SELECT jsonb_build_object(
      'id',           ce.id,
      'type',         'article',
      'title',        ce.title,
      'description',  ce.description,
      'image_url',    ce.image_url,
      'content_type', ce.content_type,
      'reading_time', ce.reading_time_minutes
    ) AS article
    FROM cheezopedia_entries ce
    WHERE ce.visible_in_feed = true
    ORDER BY ce.published_at DESC
    LIMIT p_limit * 2 / 10
  ) arts;

  -- 2g. SPONSORED (unchanged).
  SELECT jsonb_agg(sponsored) INTO v_sponsored
  FROM (
    SELECT jsonb_build_object(
      'id',                 cp.id,
      'type',               'sponsored',
      'pairing',            cp.pairing,
      'pairing_type',       cp.type,
      'description',        cp.description,
      'image_url',          cp.image_url,
      'featured_image_url', cp.featured_image_url,
      'brand_name',         cp.brand_name,
      'brand_logo_url',     cp.brand_logo_url,
      'product_name',       cp.product_name
    ) AS sponsored
    FROM cheese_pairings cp
    WHERE cp.show_in_feed = true
      AND cp.feed_until >= NOW()
    ORDER BY random()
    LIMIT GREATEST(p_limit * 1 / 10, 1)
  ) spons;

  v_result := jsonb_build_object(
    'profile',         v_profile,
    'recommendations', COALESCE(v_recommendations, '[]'::jsonb),
    'trending',        COALESCE(v_trending,        '[]'::jsonb),
    'discovery',       COALESCE(v_discovery,       '[]'::jsonb),
    'awards',          COALESCE(v_awards,          '[]'::jsonb),
    'articles',        COALESCE(v_articles,        '[]'::jsonb),
    'sponsored',       COALESCE(v_sponsored,       '[]'::jsonb)
  );

  RETURN v_result;
END;
$fn_feed$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_personalized_feed(UUID, INT, INT, UUID[])
  IS 'v2: wires favorite_flavors into the recommendation filter and applies adventurousness modulation on Blue/Washed Rind families.';
