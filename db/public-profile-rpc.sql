-- get_public_profile(p_user_id UUID)
--
-- Hydrates everything the redesigned public profile needs in one round trip.
-- Returns JSONB with: profile, stats, top_shelf, countries, flavor_fingerprint, featured_badges.
--
-- IMPORTANT: Written as LANGUAGE sql (no PL/pgSQL DECLARE block) because the
-- Supabase SQL-editor dashboard has an auto-RLS feature that mis-parses
-- DECLARE'd variables like `v_profile` as new tables and injects
-- ALTER TABLE ... ENABLE RLS statements mid-function-body, corrupting it.
-- LANGUAGE sql uses inline subqueries instead, which the parser can't
-- confuse for table DDL.
--
-- Privacy: caller is responsible for gating on `profile.is_public` when
-- the viewer is not the owner. This function returns the data regardless.

CREATE OR REPLACE FUNCTION public.get_public_profile(p_user_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $fn_public_profile$
  SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id)
      THEN jsonb_build_object('profile', NULL)
    ELSE jsonb_build_object(
      'profile', (
        SELECT to_jsonb(p) FROM (
          SELECT id, name, tagline, location, avatar_url, is_public, created_at, vanity_url
          FROM profiles WHERE id = p_user_id
        ) p
      ),
      'stats', jsonb_build_object(
        'cheese_count',  COALESCE((SELECT COUNT(*)::int FROM cheese_box_entries WHERE user_id = p_user_id), 0),
        'country_count', COALESCE((
          SELECT COUNT(DISTINCT pcs.origin_country)::int
          FROM cheese_box_entries cbe
          JOIN producer_cheese_stats pcs ON pcs.id = cbe.cheese_id
          WHERE cbe.user_id = p_user_id AND pcs.origin_country IS NOT NULL
        ), 0),
        'avg_rating', (
          SELECT ROUND(AVG(rating)::numeric, 1)
          FROM cheese_box_entries
          WHERE user_id = p_user_id AND rating IS NOT NULL
        ),
        'followers', COALESCE((SELECT COUNT(*)::int FROM follows WHERE following_id = p_user_id), 0)
      ),
      'top_shelf', COALESCE((
        SELECT jsonb_agg(ts ORDER BY ts.rating DESC NULLS LAST, ts.created_at DESC)
        FROM (
          SELECT
            pc.id            AS cheese_id,
            -- Hide "Generic"/"Unknown" producer placeholder names — show the
            -- cheese type instead (e.g. "Brie de Meaux" rather than "Generic").
            CASE
              WHEN pc.producer_name ILIKE '%generic%' OR pc.producer_name ILIKE '%unknown%'
                THEN COALESCE(pcs.cheese_type_name, pc.full_name)
              ELSE pc.full_name
            END              AS name,
            CASE
              WHEN pc.producer_name ILIKE '%generic%' OR pc.producer_name ILIKE '%unknown%'
                THEN NULL
              ELSE pc.producer_name
            END              AS producer_name,
            pc.image_url,
            cbe.rating,
            cbe.created_at,
            pcs.origin_country AS country
          FROM cheese_box_entries cbe
          JOIN producer_cheeses pc         ON pc.id  = cbe.cheese_id
          LEFT JOIN producer_cheese_stats pcs ON pcs.id = cbe.cheese_id
          WHERE cbe.user_id = p_user_id
            AND cbe.rating IS NOT NULL
          ORDER BY cbe.rating DESC NULLS LAST, cbe.created_at DESC
          LIMIT 4
        ) ts
      ), '[]'::jsonb),
      'countries', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object('country', country, 'count', cnt)
          ORDER BY cnt DESC
        )
        FROM (
          SELECT pcs.origin_country AS country, COUNT(*)::int AS cnt
          FROM cheese_box_entries cbe
          JOIN producer_cheese_stats pcs ON pcs.id = cbe.cheese_id
          WHERE cbe.user_id = p_user_id AND pcs.origin_country IS NOT NULL
          GROUP BY pcs.origin_country
        ) c
      ), '[]'::jsonb),
      'flavor_fingerprint', COALESCE((
        SELECT jsonb_object_agg(axis, cnt)
        FROM (
          SELECT ft.name AS axis, COUNT(*)::int AS cnt
          FROM cheese_box_entries cbe
          JOIN producer_cheese_flavor_tags pcft ON pcft.producer_cheese_id = cbe.cheese_id
          JOIN flavor_tags ft                    ON ft.id = pcft.flavor_tag_id
          WHERE cbe.user_id = p_user_id
            AND cbe.rating IS NOT NULL
            AND cbe.rating >= 4
            AND ft.name IN ('Creamy','Nutty','Sharp','Earthy','Funky','Sweet')
          GROUP BY ft.name
        ) f
      ), '{}'::jsonb),
      'featured_badges', COALESCE((
        SELECT jsonb_agg(b ORDER BY b.priority, b.name)
        FROM (
          SELECT
            b.id, b.name, b.description, b.img_url, b.category,
            CASE
              WHEN LOWER(b.name) LIKE '%og%' OR LOWER(b.name) LIKE '%old world%' THEN 0
              WHEN b.category = 'special'     THEN 1
              WHEN b.category = 'event'       THEN 2
              WHEN b.category = 'achievement' THEN 3
              ELSE 4
            END AS priority
          FROM user_badges ub
          JOIN badges b ON b.id = ub.badge_id
          WHERE ub.user_id = p_user_id AND ub.completed = true
          ORDER BY priority, b.name
          LIMIT 4
        ) b
      ), '[]'::jsonb)
    )
  END;
$fn_public_profile$;

GRANT EXECUTE ON FUNCTION public.get_public_profile(UUID) TO anon, authenticated;

COMMENT ON FUNCTION public.get_public_profile(UUID)
  IS 'Single-call hydration for the redesigned public profile page. Pure SQL to dodge Supabase dashboard auto-RLS mis-parse of DECLARE blocks.';
