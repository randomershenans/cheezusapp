# Database Installation Order

## If You Already Ran Old Schema (CLEANUP FIRST!)

If you previously ran an old version of the schema, run this first:

```sql
-- File: db/cleanup-old-schema.sql
-- Drops: old views, cheese_ratings table, old functions
```

This fixes timestamp mismatches and removes the `cheese_ratings` table we don't need.

---

## For Fresh Installation (No Existing Data)

Run these SQL files in order in your Supabase SQL Editor:

### 1. Prerequisites
```sql
-- File: db/00-prerequisites.sql
-- Creates: flavor_tags table, common tags, extensions
```

### 2. Hierarchy Schema
```sql
-- File: db/cheese-hierarchy-schema.sql
-- Creates: cheese_types, producer_cheeses, cheese_ratings tables
-- Creates: Views, functions, indexes, RLS policies
```

### 3. Skip Migration
**DO NOT RUN** `migrate-to-hierarchy.sql` for fresh installations.

---

## For Migration from Existing System

If you have existing `cheeses` table with data:

### 1. Backup First!
```sql
-- Backup your existing data
CREATE TABLE backup_cheeses AS SELECT * FROM cheeses;
CREATE TABLE backup_cheese_ratings AS SELECT * FROM cheese_ratings;
CREATE TABLE backup_cheese_flavor_tags AS SELECT * FROM cheese_flavor_tags;
```

### 2. Prerequisites
```sql
-- File: db/00-prerequisites.sql
```

### 3. Hierarchy Schema
```sql
-- File: db/cheese-hierarchy-schema.sql
```

### 4. Migrate Data
```sql
-- File: db/migrate-to-hierarchy.sql
-- NOTE: Remove the WHERE EXISTS clause on line 53 first
-- This migrates all your existing cheeses to the new structure
```

### 5. Verify Migration
```sql
-- Check counts match
SELECT 
  'cheese_types' as table_name, COUNT(*) as count FROM cheese_types
UNION ALL
SELECT 'producer_cheeses', COUNT(*) FROM producer_cheeses
UNION ALL
SELECT 'cheese_ratings', COUNT(*) FROM cheese_ratings
UNION ALL
SELECT 'original_cheeses', COUNT(*) FROM cheeses;

-- Verify no data loss
SELECT 
  (SELECT COUNT(*) FROM backup_cheese_ratings) as original_ratings,
  (SELECT COUNT(*) FROM cheese_ratings) as migrated_ratings;
```

---

## Quick Start SQL (Copy/Paste for Fresh Install)

Run this complete script in Supabase SQL Editor for a fresh installation:

```sql
-- ============================================
-- COMPLETE FRESH INSTALLATION
-- ============================================

-- 1. Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create flavor_tags
CREATE TABLE IF NOT EXISTS flavor_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Add common flavor tags
INSERT INTO flavor_tags (name) VALUES
  ('Nutty'), ('Creamy'), ('Sharp'), ('Mild'), ('Tangy'),
  ('Earthy'), ('Fruity'), ('Smoky'), ('Salty'), ('Sweet'),
  ('Buttery'), ('Rich'), ('Pungent'), ('Floral'), ('Herbal')
ON CONFLICT (name) DO NOTHING;

-- 4. Now copy/paste the entire contents of:
--    db/cheese-hierarchy-schema.sql

-- Done! Your database is ready.
```

---

## Troubleshooting

### Error: "relation flavor_tags does not exist"
**Solution:** Run `db/00-prerequisites.sql` first.

### Error: "relation cheeses does not exist" during migration
**Solution:** This is normal for fresh installs. Don't run `migrate-to-hierarchy.sql`.

### Error: "duplicate key value violates unique constraint"
**Solution:** Tables already exist. Either drop them first or use `IF NOT EXISTS` checks.

---

## What Each Script Does

| Script | Purpose | Run When |
|--------|---------|----------|
| `00-prerequisites.sql` | Creates flavor_tags, extensions | Always first |
| `cheese-hierarchy-schema.sql` | Creates main tables, views, functions | Always second |
| `migrate-to-hierarchy.sql` | Migrates old data | Only if you have existing data |

---

## After Installation

Test your setup:
```sql
-- Should return empty results for fresh install
SELECT * FROM cheese_type_stats;

-- Should work without errors
SELECT * FROM search_cheese_types('test');

-- Test adding a cheese type
INSERT INTO cheese_types (name, type, description)
VALUES ('Brie', 'Soft', 'A soft cow''s milk cheese')
RETURNING *;
```
