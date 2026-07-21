-- Profile OG image cache-busting.
--
-- The edge function at supabase/functions/profile-og-image caches rendered
-- PNGs aggressively at the CDN. We bust the cache on any change that
-- affects the image — new top-4★ cheese, avatar change, name/tagline edit.
--
-- The caller (Cloudflare Worker / web page meta tags) includes ?v=<og_version>
-- in the URL. Same value = same PNG = CDN hit. Version bumps = fresh render.

-- 1) og_version column on profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS profile_og_version INT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_profiles_og_version ON profiles(id, profile_og_version);

-- 2) Trigger fn — bumps the counter
CREATE OR REPLACE FUNCTION public.bump_profile_og_version(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn_bump_og$
BEGIN
  UPDATE profiles
    SET profile_og_version = profile_og_version + 1
    WHERE id = p_user_id;
END;
$fn_bump_og$;

-- 3) Bump on profile edit (avatar, name, tagline, vanity_url)
CREATE OR REPLACE FUNCTION public.tg_bump_og_on_profile_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $fn_tg_og_profile$
BEGIN
  IF (NEW.avatar_url    IS DISTINCT FROM OLD.avatar_url)
  OR (NEW.name          IS DISTINCT FROM OLD.name)
  OR (NEW.tagline       IS DISTINCT FROM OLD.tagline)
  OR (NEW.vanity_url    IS DISTINCT FROM OLD.vanity_url) THEN
    NEW.profile_og_version := COALESCE(OLD.profile_og_version, 1) + 1;
  END IF;
  RETURN NEW;
END;
$fn_tg_og_profile$;

DROP TRIGGER IF EXISTS trg_bump_og_on_profile_change ON profiles;
CREATE TRIGGER trg_bump_og_on_profile_change
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_bump_og_on_profile_change();

-- 4) Bump on new ≥4★ cheese log (the image includes the top 4 by rating)
CREATE OR REPLACE FUNCTION public.tg_bump_og_on_cheese_log()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $fn_tg_og_cheese$
BEGIN
  -- Only cheeses that could realistically become "top shelf" count.
  -- A cheese rated below 4 won't displace an existing top-4, so skip.
  IF NEW.rating IS NOT NULL AND NEW.rating >= 4 THEN
    PERFORM public.bump_profile_og_version(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$fn_tg_og_cheese$;

DROP TRIGGER IF EXISTS trg_bump_og_on_cheese_log_insert ON cheese_box_entries;
CREATE TRIGGER trg_bump_og_on_cheese_log_insert
  AFTER INSERT ON cheese_box_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_bump_og_on_cheese_log();

DROP TRIGGER IF EXISTS trg_bump_og_on_cheese_log_update ON cheese_box_entries;
CREATE TRIGGER trg_bump_og_on_cheese_log_update
  AFTER UPDATE OF rating ON cheese_box_entries
  FOR EACH ROW
  WHEN (NEW.rating IS DISTINCT FROM OLD.rating AND (NEW.rating >= 4 OR OLD.rating >= 4))
  EXECUTE FUNCTION public.tg_bump_og_on_cheese_log();
