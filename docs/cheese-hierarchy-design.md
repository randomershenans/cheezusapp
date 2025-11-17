# Cheese Hierarchy System Design

## Overview
Transform the cheese system from a flat structure to a hierarchical one: **Cheese Types → Producer-Specific Cheeses**

### The Problem
- Generic cheese types (Brie, Cheddar) vs specific producer versions (President Brie, Tillamook Cheddar)
- Users rate individual producer cheeses differently
- Need to show aggregate ratings for cheese types while allowing drill-down to specific producers

### The Solution
Two-tier architecture with smart aggregation and sexy UI navigation.

---

## Database Schema

### 1. `cheese_types` (Parent - Generic Cheese Types)
The master list of cheese types (Brie, Cheddar, Gouda, etc.)

```sql
CREATE TABLE cheese_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL, -- Hard, Soft, Semi-soft, Fresh, Blue, Processed
  milk_type VARCHAR(50), -- Cow, Goat, Sheep, Mixed, Buffalo (can be NULL for types that vary)
  origin_country VARCHAR(100), -- Traditional origin country (e.g., France for Brie)
  origin_region VARCHAR(100), -- Traditional origin region
  description TEXT, -- General description of this cheese type
  typical_ageing_period VARCHAR(50),
  flavor_profile TEXT, -- General flavor notes for this cheese type
  texture_notes TEXT, -- Typical texture characteristics
  image_url TEXT, -- Generic representative image
  wikipedia_url TEXT, -- Link to cheese type info
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_cheese_types_name ON cheese_types(name);
CREATE INDEX idx_cheese_types_type ON cheese_types(type);
```

### 2. `producer_cheeses` (Child - Specific Producer Versions)
Individual cheeses from specific producers

```sql
CREATE TABLE producer_cheeses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cheese_type_id UUID NOT NULL REFERENCES cheese_types(id) ON DELETE CASCADE,
  producer_name VARCHAR(200) NOT NULL, -- e.g., "President", "Tillamook"
  product_name VARCHAR(200), -- Specific product name if different from cheese type
  full_name VARCHAR(300) GENERATED ALWAYS AS (
    CASE 
      WHEN product_name IS NOT NULL THEN producer_name || ' ' || product_name
      ELSE producer_name || ' ' || (SELECT name FROM cheese_types WHERE id = cheese_type_id)
    END
  ) STORED, -- Auto-generated full name for display
  
  -- Producer-specific attributes (can override cheese type defaults)
  origin_country VARCHAR(100),
  origin_region VARCHAR(100),
  description TEXT, -- Specific notes about this producer's version
  ageing_period VARCHAR(50),
  milk_type VARCHAR(50),
  
  -- Additional producer info
  producer_location VARCHAR(200), -- Where this producer is based
  price_range INTEGER CHECK (price_range BETWEEN 1 AND 5), -- $ to $$$$$
  availability VARCHAR(50), -- e.g., "Widely Available", "Specialty Stores", "Limited"
  
  -- Media
  image_url TEXT, -- Producer-specific cheese photo
  
  -- Tracking
  added_by UUID REFERENCES auth.users(id),
  verified BOOLEAN DEFAULT FALSE, -- Admin verification for quality control
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure unique producer+product combo per cheese type
  UNIQUE(cheese_type_id, producer_name, product_name)
);

-- Indexes
CREATE INDEX idx_producer_cheeses_type ON producer_cheeses(cheese_type_id);
CREATE INDEX idx_producer_cheeses_producer ON producer_cheeses(producer_name);
CREATE INDEX idx_producer_cheeses_added_by ON producer_cheeses(added_by);
CREATE INDEX idx_producer_cheeses_verified ON producer_cheeses(verified);
```

### 3. Update `cheese_ratings` to work with new hierarchy

```sql
-- Modify existing cheese_ratings table
ALTER TABLE cheese_ratings RENAME TO old_cheese_ratings;

CREATE TABLE cheese_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  producer_cheese_id UUID NOT NULL REFERENCES producer_cheeses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  tasting_notes TEXT, -- Specific notes about this tasting
  tasted_at DATE, -- When they tried it
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- One rating per user per producer cheese
  UNIQUE(producer_cheese_id, user_id)
);

CREATE INDEX idx_ratings_producer_cheese ON cheese_ratings(producer_cheese_id);
CREATE INDEX idx_ratings_user ON cheese_ratings(user_id);
```

### 4. Keep flavor tags with hierarchy support

```sql
-- Flavor tags can apply to both cheese types and producer cheeses
CREATE TABLE cheese_type_flavor_tags (
  cheese_type_id UUID REFERENCES cheese_types(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES flavor_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (cheese_type_id, tag_id)
);

CREATE TABLE producer_cheese_flavor_tags (
  producer_cheese_id UUID REFERENCES producer_cheeses(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES flavor_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (producer_cheese_id, tag_id)
);
```

---

## Views & Functions for Sexy Data Access

### Aggregate Rating View

```sql
-- Get aggregate stats for cheese types
CREATE OR REPLACE VIEW cheese_type_stats AS
SELECT 
  ct.id,
  ct.name,
  ct.type,
  COUNT(DISTINCT pc.id) as producer_count,
  COUNT(DISTINCT cr.id) as total_ratings,
  ROUND(AVG(cr.rating), 2) as average_rating,
  COUNT(DISTINCT cr.user_id) as unique_raters
FROM cheese_types ct
LEFT JOIN producer_cheeses pc ON pc.cheese_type_id = ct.id
LEFT JOIN cheese_ratings cr ON cr.producer_cheese_id = pc.id
GROUP BY ct.id, ct.name, ct.type;

-- Get top rated producer cheeses for a cheese type
CREATE OR REPLACE FUNCTION get_top_producer_cheeses(
  p_cheese_type_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  producer_cheese_id UUID,
  full_name VARCHAR,
  producer_name VARCHAR,
  image_url TEXT,
  rating_count INTEGER,
  average_rating NUMERIC,
  verified BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.id,
    pc.full_name,
    pc.producer_name,
    pc.image_url,
    COUNT(cr.id)::INTEGER as rating_count,
    ROUND(AVG(cr.rating), 2) as average_rating,
    pc.verified
  FROM producer_cheeses pc
  LEFT JOIN cheese_ratings cr ON cr.producer_cheese_id = pc.id
  WHERE pc.cheese_type_id = p_cheese_type_id
  GROUP BY pc.id, pc.full_name, pc.producer_name, pc.image_url, pc.verified
  HAVING COUNT(cr.id) > 0  -- Only show rated cheeses
  ORDER BY average_rating DESC, rating_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
```

---

## Migration Strategy

### Phase 1: Create New Tables (Zero Downtime)
```sql
-- Run the schema above - creates new tables alongside existing ones
```

### Phase 2: Data Migration
```sql
-- Migrate existing cheeses to new structure
-- Strategy: Each existing cheese becomes a producer cheese with a generic type

-- Step 1: Create cheese types from unique cheese names
INSERT INTO cheese_types (name, type, milk_type, origin_country, origin_region, description, typical_ageing_period, image_url)
SELECT DISTINCT 
  name,
  type,
  milk,
  origin_country,
  origin_region,
  description,
  ageing_period,
  image_url
FROM cheeses
ON CONFLICT (name) DO NOTHING;

-- Step 2: Migrate existing cheeses as "Generic Producer" entries
-- (or we can ask users to add producer info later)
INSERT INTO producer_cheeses (
  cheese_type_id,
  producer_name,
  product_name,
  description,
  image_url,
  added_by,
  created_at
)
SELECT 
  ct.id,
  'Generic', -- Default producer name
  NULL, -- No specific product name
  c.description,
  c.image_url,
  c.added_by,
  c.created_at
FROM cheeses c
JOIN cheese_types ct ON ct.name = c.name;

-- Step 3: Migrate ratings
INSERT INTO cheese_ratings (producer_cheese_id, user_id, rating, review, created_at, updated_at)
SELECT 
  pc.id,
  ocr.user_id,
  ocr.rating,
  ocr.review,
  ocr.created_at,
  ocr.updated_at
FROM old_cheese_ratings ocr
JOIN cheeses c ON c.id = ocr.cheese_id
JOIN cheese_types ct ON ct.name = c.name
JOIN producer_cheeses pc ON pc.cheese_type_id = ct.id AND pc.producer_name = 'Generic';

-- Step 4: Migrate flavor tags
INSERT INTO producer_cheese_flavor_tags (producer_cheese_id, tag_id)
SELECT DISTINCT
  pc.id,
  cft.tag_id
FROM cheese_flavor_tags cft
JOIN cheeses c ON c.id = cft.cheese_id
JOIN cheese_types ct ON ct.name = c.name
JOIN producer_cheeses pc ON pc.cheese_type_id = ct.id AND pc.producer_name = 'Generic';
```

---

## UI/UX Flow - The Sexy Part 🔥

### 1. **Home Feed / Discover**
```
┌─────────────────────────────────────┐
│  🧀 Trending Cheese Types           │
├─────────────────────────────────────┤
│  [Tile: Brie]                       │
│  ⭐ 4.7 avg · 234 ratings           │
│  🏭 47 producers                    │
│                                     │
│  [Tile: Aged Cheddar]               │
│  ⭐ 4.8 avg · 512 ratings           │
│  🏭 89 producers                    │
└─────────────────────────────────────┘
```

### 2. **Cheese Type Page** (e.g., "Brie")
```
┌─────────────────────────────────────┐
│  [Hero Image]                       │
│  🧀 BRIE                            │
│  ⭐ 4.7 average rating              │
│  📊 234 ratings from 47 producers   │
│                                     │
│  [Description of Brie in general]   │
│                                     │
│  🏆 Top Rated Bries                 │
│  ┌───────────┬───────────┐          │
│  │ President │ Ile de    │          │
│  │ Brie      │ France    │          │
│  │ ⭐ 4.9    │ ⭐ 4.8    │          │
│  └───────────┴───────────┘          │
│                                     │
│  [See All 47 Brie Producers →]     │
│                                     │
│  💬 Recent Reviews                  │
│  [Latest reviews from any producer] │
└─────────────────────────────────────┘
```

### 3. **All Producers View** (Expandable)
```
┌─────────────────────────────────────┐
│  All Brie Producers (47)            │
│  [Filter: Rating | Price | Country] │
├─────────────────────────────────────┤
│  [Grid of producer cheese tiles]    │
│  • President Brie - ⭐ 4.9 (45)     │
│  • Ile de France - ⭐ 4.8 (38)      │
│  • Trader Joe's - ⭐ 4.2 (102)      │
│  ...                                │
└─────────────────────────────────────┘
```

### 4. **Producer Cheese Detail Page**
```
┌─────────────────────────────────────┐
│  [Product Image]                    │
│  President Brie                     │
│  ← Back to Brie Types               │
│                                     │
│  🏭 Producer: President             │
│  📍 Made in: France                 │
│  💰 Price: $$                       │
│  ⭐ 4.9 (45 ratings)                │
│                                     │
│  [Rate this cheese]                 │
│  [Add to my cheeses]                │
│                                     │
│  📝 Reviews                         │
│  [User reviews for this specific    │
│   producer's brie]                  │
└─────────────────────────────────────┘
```

### 5. **Add New Cheese Flow**
```
Step 1: Select Cheese Type
  → Search/Browse cheese types (Brie, Cheddar, etc.)
  → Or "Create new cheese type" (admin/power users)

Step 2: Producer Details
  → Producer name
  → Specific product name (optional)
  → Location
  → Price range
  → Photo upload
  → Tasting notes

Step 3: Rate & Review
  → Your rating
  → Review
  → When you tried it
```

---

## Code Structure

### API/Service Layer

```typescript
// lib/cheese-types-service.ts
export interface CheeseType {
  id: string;
  name: string;
  type: string;
  averageRating: number;
  producerCount: number;
  totalRatings: number;
  // ... etc
}

export const getCheeseTypes = async (filters?: CheeseTypeFilters): Promise<CheeseType[]>
export const getCheeseTypeById = async (id: string): Promise<CheeseType>
export const getTopProducersByType = async (typeId: string, limit: number): Promise<ProducerCheese[]>

// lib/producer-cheese-service.ts
export interface ProducerCheese {
  id: string;
  cheeseTypeId: string;
  cheeseTypeName: string;
  producerName: string;
  fullName: string;
  averageRating: number;
  // ... etc
}

export const getProducerCheeses = async (cheeseTypeId: string): Promise<ProducerCheese[]>
export const getProducerCheeseById = async (id: string): Promise<ProducerCheese>
export const createProducerCheese = async (data: CreateProducerCheeseInput): Promise<ProducerCheese>
export const rateProducerCheese = async (cheeseId: string, rating: number, review?: string): Promise<void>
```

### Component Structure

```
components/
  cheese-type/
    CheeseTypeCard.tsx       // Tile for cheese type with aggregate stats
    CheeseTypeHeader.tsx     // Hero section on cheese type page
    CheeseTypeStats.tsx      // Aggregate statistics display
    TopProducersGrid.tsx     // Grid of top rated producers
    
  producer-cheese/
    ProducerCheeseCard.tsx   // Tile for individual producer cheese
    ProducerCheeseDetail.tsx // Full detail view
    ProducerCheeseForm.tsx   // Form to add new producer cheese
    
  ratings/
    RatingInput.tsx          // Rate a producer cheese
    ReviewList.tsx           // List of reviews
    AggregateRating.tsx      // Display average rating with breakdown
```

---

## Benefits of This Approach

✅ **Scalable**: Can handle thousands of producers per cheese type
✅ **Flexible**: Easy to add new attributes (certifications, awards, etc.)
✅ **Clean Data**: Separates generic cheese info from producer-specific
✅ **Great UX**: Users can browse by type OR by specific producer
✅ **SEO Friendly**: Each cheese type + producer cheese has its own page
✅ **Analytics**: Can track which cheese types and producers are most popular
✅ **Gamification**: Badges for trying X different Bries, etc.
✅ **Monetization**: Can add sponsored producers, featured listings, etc.

---

## Next Steps

1. **Review & approve this design**
2. **Run database migrations**
3. **Update API service layer**
4. **Build new UI components**
5. **Migrate existing user data**
6. **Soft launch with existing users**
7. **Add producer verification system**
8. **Build admin tools for managing cheese types**

## Questions to Consider

- Do we want users to be able to create new cheese types, or admin-only?
- Should we verify producers before they show up in top lists?
- Do we want to add a producer profile page (all cheeses from one producer)?
- Should we track cheese availability by location/store?
