-- ============================================================================
-- USER TASTE SEED SCHEMA
-- ============================================================================
-- Phase 1 / Workstream 3 — Taste Quiz foundation.
--
-- Stores the output of the onboarding taste quiz so that brand-new users
-- (cheese_count < 4) still get personalized recommendations. Once the user
-- has logged enough cheeses, real history takes over per-field inside
-- get_user_taste_profile().
--
-- One row per user, upserted. Seed fields match the arrays returned by
-- get_user_taste_profile() so the RPC can COALESCE real vs seed uniformly.
--
-- ----------------------------------------------------------------------------
-- LOAD ORDER
-- ----------------------------------------------------------------------------
-- This file is self-contained and can be loaded independently.
-- It must be loaded BEFORE db/taste-profile-rpc-v2.sql which references
-- user_taste_seed.
--
-- Dependencies already present in the DB:
--   - auth.users              (Supabase-managed)
--   - public.profiles         (Supabase-managed, extended below)
--   - public.flavor_tags      (db/cheese-hierarchy-schema.sql)
--
-- Idempotent: safe to re-run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. user_taste_seed TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_taste_seed (
  user_id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  favorite_families      TEXT[]      NOT NULL DEFAULT '{}',
  favorite_types         TEXT[]      NOT NULL DEFAULT '{}',
  favorite_flavors       TEXT[]      NOT NULL DEFAULT '{}',  -- matches flavor_tags.name
  favorite_countries     TEXT[]      NOT NULL DEFAULT '{}',
  favorite_milk_types    TEXT[]      NOT NULL DEFAULT '{}',
  intensity_preference   SMALLINT        NULL CHECK (intensity_preference IS NULL OR intensity_preference IN (-1, 0, 1)),
  adventurousness        SMALLINT        NULL CHECK (adventurousness      IS NULL OR adventurousness      IN (0, 1, 2)),
  skipped                BOOLEAN     NOT NULL DEFAULT false,
  completed_at           TIMESTAMPTZ     NULL,
  version                SMALLINT    NOT NULL DEFAULT 1,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.user_taste_seed IS 'One row per user — onboarding quiz output used to cold-start personalization until real rating history accumulates.';
COMMENT ON COLUMN public.user_taste_seed.favorite_flavors     IS 'Subset of flavor_tags.name (curated 10 — see constants/FlavorTags.ts).';
COMMENT ON COLUMN public.user_taste_seed.intensity_preference IS '-1 = mild, 0 = balanced, +1 = intense. Nullable when skipped.';
COMMENT ON COLUMN public.user_taste_seed.adventurousness      IS '0 = mellow (suppress blue/washed-rind), 1 = balanced, 2 = stinky (boost blue/washed-rind).';
COMMENT ON COLUMN public.user_taste_seed.skipped              IS 'True if the user chose to skip the quiz. Tracked for funnel analytics.';
COMMENT ON COLUMN public.user_taste_seed.completed_at         IS 'Set when the quiz is fully answered. Still set on skip? No — skipped rows have this NULL and skipped=true.';
COMMENT ON COLUMN public.user_taste_seed.version              IS 'Quiz definition version — bump when question set changes to allow re-prompting.';


-- ----------------------------------------------------------------------------
-- 2. updated_at TRIGGER
-- ----------------------------------------------------------------------------
-- Share a single trigger function across tables when possible.
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS TRIGGER AS $fn_touch$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$fn_touch$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_taste_seed_touch_updated_at ON public.user_taste_seed;
CREATE TRIGGER trg_user_taste_seed_touch_updated_at
  BEFORE UPDATE ON public.user_taste_seed
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_touch_updated_at();


-- ----------------------------------------------------------------------------
-- 3. INDEXES
-- ----------------------------------------------------------------------------
-- user_id is the PK — already indexed.
-- These secondary indexes support the materialized-view refresh and
-- funnel analytics queries ("how many skipped vs completed this week").
CREATE INDEX IF NOT EXISTS idx_user_taste_seed_completed_at ON public.user_taste_seed (completed_at);
CREATE INDEX IF NOT EXISTS idx_user_taste_seed_skipped      ON public.user_taste_seed (skipped);
CREATE INDEX IF NOT EXISTS idx_user_taste_seed_version      ON public.user_taste_seed (version);


-- ----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
-- Users can only read / insert / update their own seed row.
-- Deletes flow via ON DELETE CASCADE from auth.users.
ALTER TABLE public.user_taste_seed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_taste_seed_select_own" ON public.user_taste_seed;
CREATE POLICY "user_taste_seed_select_own"
  ON public.user_taste_seed
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_taste_seed_insert_own" ON public.user_taste_seed;
CREATE POLICY "user_taste_seed_insert_own"
  ON public.user_taste_seed
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_taste_seed_update_own" ON public.user_taste_seed;
CREATE POLICY "user_taste_seed_update_own"
  ON public.user_taste_seed
  FOR UPDATE
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Intentionally NO delete policy — we don't want clients deleting their seed.
-- Account deletion propagates via the FK cascade.


-- ----------------------------------------------------------------------------
-- 5. profiles.onboarding_quiz_completed_at
-- ----------------------------------------------------------------------------
-- Mirror of user_taste_seed.completed_at / skipped-timestamp, hoisted onto
-- profiles for cheap "has this user seen the quiz?" checks without a join.
-- Set by the client (or a trigger in a future pass) when the quiz finishes
-- OR is skipped — either outcome closes the onboarding gate.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_quiz_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.onboarding_quiz_completed_at
  IS 'Timestamp the user finished OR skipped the onboarding taste quiz. NULL = has not seen the quiz yet (router guard should route them to /onboarding/quiz).';
