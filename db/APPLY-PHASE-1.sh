#!/usr/bin/env bash
#
# Phase 1 migration runner for Cheezus.
#
# The Supabase Dashboard SQL editor has a bug where it injects
# `ALTER TABLE v_xxx ENABLE ROW LEVEL SECURITY` statements INSIDE PL/pgSQL
# function bodies, treating `DECLARE v_profile JSONB` as a new table.
# This corrupts the function and Postgres rejects the unterminated $$ string.
#
# This script bypasses the dashboard entirely by piping the SQL files to
# `psql` directly, in the correct load order.
#
# PREREQUISITES
#   1. psql installed (macOS: `brew install libpq && brew link --force libpq`)
#   2. Your Supabase DB URL. Find it at:
#      Supabase Dashboard → Project Settings → Database → Connection string
#      → "URI" format. Looks like:
#        postgresql://postgres:PASSWORD@db.xxxxx.supabase.co:5432/postgres
#   3. Export it before running:
#        export SUPABASE_DB_URL="postgresql://postgres:..."
#
# USAGE
#   cd /Users/ross/Desktop/Projects/cheezusapp
#   export SUPABASE_DB_URL="..."
#   bash db/APPLY-PHASE-1.sh
#
# Each file is applied with `\set ON_ERROR_STOP on` so a failure halts
# the run immediately rather than proceeding with a broken schema.

set -euo pipefail

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "ERROR: SUPABASE_DB_URL is not set." >&2
  echo "Get it from Supabase → Project Settings → Database → Connection string" >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql is not installed. Install via: brew install libpq && brew link --force libpq" >&2
  exit 1
fi

HERE="$(cd "$(dirname "$0")" && pwd)"

files=(
  "$HERE/add-funky-flavor-tag.sql"
  "$HERE/user-taste-seed-schema.sql"
  "$HERE/default-taste-profile-view.sql"
  "$HERE/taste-profile-rpc-v2.sql"
  "$HERE/public-profile-rpc.sql"
  "$HERE/profile-og-versioning.sql"
)

echo ""
echo "Applying Phase 1 migrations to: ${SUPABASE_DB_URL%%@*}@..."
echo ""

for f in "${files[@]}"; do
  name="$(basename "$f")"
  if [[ ! -f "$f" ]]; then
    echo "  ⚠ skip (missing): $name"
    continue
  fi
  echo "  ▶ $name"
  psql "$SUPABASE_DB_URL" \
    --set=ON_ERROR_STOP=on \
    --quiet \
    -f "$f"
done

echo ""
echo "✓ All Phase 1 SQL applied successfully."
echo ""
echo "Verify with:"
echo "  psql \"\$SUPABASE_DB_URL\" -c 'SELECT proname FROM pg_proc WHERE proname IN (''get_public_profile'',''get_user_taste_profile'',''get_personalized_feed'',''bump_profile_og_version'',''refresh_default_taste_profile'');'"
