# UI Changes Required for Cheese Hierarchy System

## Overview
Transform from flat cheese list to hierarchical: **Cheese Types → Producer Cheeses**

---

## 1. 🧀 CHEESE TYPE PAGE (NEW)
**Path**: `app/cheese-types/[id].tsx`

### What It Shows:
```
┌─────────────────────────────────────┐
│  [Hero Image - Generic Brie]        │
│  🧀 BRIE                            │
│  Soft • Cow's Milk • France         │
│  ⭐ 4.7 average (234 ratings)       │
│  📊 47 producers                     │
├─────────────────────────────────────┤
│  📝 Description                      │
│  Traditional French soft cheese...  │
│                                      │
│  🏷️ Flavors: Creamy, Buttery, Mild │
├─────────────────────────────────────┤
│  🏆 Top Rated Bries                 │
│  ┌──────────┬──────────┬──────────┐ │
│  │President │Ile France│Trader    │ │
│  │Brie      │Brie      │Joe's     │ │
│  │⭐ 4.9(45)│⭐ 4.8(38)│⭐ 4.2(102)│ │
│  │[Image]   │[Image]   │[Image]   │ │
│  └──────────┴──────────┴──────────┘ │
│  [See All 47 Brie Producers →]      │
├─────────────────────────────────────┤
│  💬 Recent Reviews                   │
│  (Latest from any producer)          │
└─────────────────────────────────────┘
```

### Data Source:
```typescript
// Get cheese type with stats
const cheeseType = await supabase
  .from('cheese_type_stats')
  .select('*')
  .eq('id', cheeseTypeId)
  .single();

// Get top producers
const { data: topProducers } = await supabase
  .rpc('get_top_producer_cheeses', {
    p_cheese_type_id: cheeseTypeId,
    p_limit: 6
  });

// Get flavor tags
const { data: flavors } = await supabase
  .from('cheese_type_flavor_tags')
  .select('flavor_tag_id, flavor_tags(name)')
  .eq('cheese_type_id', cheeseTypeId);
```

### Components Needed:
- `CheeseTypeHeader.tsx` - Hero section with aggregate stats
- `TopProducerGrid.tsx` - Grid of top 6 producers
- `FlavorTagsList.tsx` - Display flavor tags

---

## 2. 🏭 PRODUCER CHEESE DETAIL PAGE (UPDATED)
**Path**: `app/cheese/[id].tsx` → `app/producer-cheese/[id].tsx`

### What It Shows:
```
┌─────────────────────────────────────┐
│  [Product Image]                     │
│  President Brie                      │
│  ← Back to Brie Types                │
├─────────────────────────────────────┤
│  🏭 Producer: President              │
│  🧀 Type: Brie                       │
│  📍 Made in: France                  │
│  🥛 Milk: Cow                        │
│  💰 Price: $$                        │
│  ⭐ 4.9 (45 ratings)                 │
├─────────────────────────────────────┤
│  🏷️ Flavors: Creamy, Buttery        │
├─────────────────────────────────────┤
│  [➕ Add to My Cheese Box]           │
│  [⭐ Rate This Cheese]               │
├─────────────────────────────────────┤
│  📝 Reviews (45)                     │
│  [User reviews for this specific     │
│   President Brie]                    │
└─────────────────────────────────────┘
```

### Data Source:
```typescript
// Get producer cheese with stats
const { data: cheese } = await supabase
  .from('producer_cheese_stats')
  .select('*')
  .eq('id', producerCheeseId)
  .single();

// Get flavor tags
const { data: flavors } = await supabase
  .from('producer_cheese_flavor_tags')
  .select('flavor_tag_id, flavor_tags(name)')
  .eq('producer_cheese_id', producerCheeseId);

// Get reviews (from cheese_box_entries)
const { data: reviews } = await supabase
  .from('cheese_box_entries')
  .select('*, profiles(username, avatar_url)')
  .eq('cheese_id', producerCheeseId)
  .order('created_at', { ascending: false });
```

### Changes from Current:
- ❌ Remove: Direct rating at cheese level
- ✅ Add: Link to parent cheese type
- ✅ Add: Producer info (name, location)
- ✅ Add: "Add to cheese box" button (adds entry to cheese_box_entries)
- ✅ Update: Rating is via cheese box entry

---

## 3. 📋 ALL PRODUCERS LIST (NEW)
**Path**: `app/cheese-types/[id]/producers.tsx`

### What It Shows:
```
┌─────────────────────────────────────┐
│  All Brie Producers (47)             │
│  ┌─────────────────────────────────┐ │
│  │ Sort: [Rating ▼] [Price] [A-Z] │ │
│  │ Filter: [⭐⭐⭐⭐⭐] [$$$]       │ │
│  └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│  [Grid of producer cheese cards]     │
│  • President Brie - ⭐ 4.9 (45)     │
│    [Image] France • $$               │
│  • Ile de France - ⭐ 4.8 (38)      │
│    [Image] France • $$$              │
│  • Trader Joe's - ⭐ 4.2 (102)      │
│    [Image] USA • $                   │
│  ...                                 │
└─────────────────────────────────────┘
```

### Data Source:
```typescript
const { data: producers } = await supabase
  .rpc('get_producer_cheeses_by_type', {
    p_cheese_type_id: cheeseTypeId,
    p_min_rating: minRating,
    p_verified_only: showVerifiedOnly,
    p_limit: 50,
    p_offset: offset
  });
```

---

## 4. ➕ ADD CHEESE FLOW (MAJOR UPDATE)
**Path**: `app/cheese/new.tsx` → `app/add-cheese.tsx`

### New Two-Step Process:

### **STEP 1: Select Cheese Type**
```
┌─────────────────────────────────────┐
│  What type of cheese did you try?   │
├─────────────────────────────────────┤
│  [🔍 Search cheese types...]         │
│  Common: Brie, Cheddar, Gouda...     │
├─────────────────────────────────────┤
│  Recent:                             │
│  • Brie                              │
│  • Aged Cheddar                      │
│  • Manchego                          │
├─────────────────────────────────────┤
│  [+ Create New Cheese Type]          │
└─────────────────────────────────────┘
```

**Components:**
- `CheeseTypeSearch.tsx` - Autocomplete search
- `CreateCheeseType.tsx` - Modal for creating new type

### **STEP 2: Add Producer Details**
```
┌─────────────────────────────────────┐
│  Adding: Brie                        │
│  ← Change cheese type                │
├─────────────────────────────────────┤
│  🏭 Producer Details                 │
│  Producer Name: [President______]    │
│  Product Name: [________________]    │
│  (optional - leave blank if generic) │
│                                      │
│  📍 Where Made                       │
│  Country: [France____________]       │
│  Region: [Île-de-France______]       │
│                                      │
│  💰 Price Range                      │
│  [$ | $$ | $$$ | $$$$ | $$$$$]      │
│                                      │
│  📷 Photo                            │
│  [📷 Take Photo]                     │
│  [📁 Choose from Gallery]            │
│  [🤖 AI Analysis] (future)           │
│                                      │
│  🏷️ Flavors (select all that apply) │
│  ☑️ Creamy    ☑️ Buttery             │
│  ☐ Nutty      ☑️ Mild                │
│  ☐ Sharp      ☐ Tangy                │
│  [+ More flavors...]                 │
│                                      │
│  📝 Your Notes                       │
│  [Tried at dinner party, very       │
│   smooth and creamy...]              │
│                                      │
│  ⭐ Your Rating                      │
│  [⭐⭐⭐⭐⭐]                         │
│                                      │
│  📅 When did you try it?             │
│  [Today ▼]                           │
├─────────────────────────────────────┤
│  [Cancel]  [Add to My Cheese Box]   │
└─────────────────────────────────────┘
```

### Data Flow:
```typescript
// Step 1: Create/link to cheese type
let cheeseTypeId;
if (selectedExistingType) {
  cheeseTypeId = selectedExistingType.id;
} else {
  // Create new cheese type
  const { data: newType } = await supabase
    .from('cheese_types')
    .insert({
      name: formData.cheeseName,
      type: formData.cheeseType, // Hard, Soft, etc.
      milk_type: formData.milkType,
      description: formData.description,
      // ... other fields
    })
    .select()
    .single();
  cheeseTypeId = newType.id;
}

// Step 2: Create producer cheese
const { data: producerCheese } = await supabase
  .from('producer_cheeses')
  .insert({
    cheese_type_id: cheeseTypeId,
    producer_name: formData.producerName,
    product_name: formData.productName,
    origin_country: formData.country,
    origin_region: formData.region,
    price_range: formData.priceRange,
    image_url: uploadedPhotoUrl,
    added_by: userId,
  })
  .select()
  .single();

// Step 3: Add flavor tags
if (formData.selectedFlavors.length > 0) {
  await supabase
    .from('producer_cheese_flavor_tags')
    .insert(
      formData.selectedFlavors.map(flavorId => ({
        producer_cheese_id: producerCheese.id,
        flavor_tag_id: flavorId,
      }))
    );
}

// Step 4: Add to your cheese box (with rating)
await supabase
  .from('cheese_box_entries')
  .insert({
    user_id: userId,
    cheese_id: producerCheese.id, // Links to producer_cheese!
    rating: formData.rating,
    notes: formData.notes,
  });

// Redirect to producer cheese detail page
router.push(`/producer-cheese/${producerCheese.id}`);
```

### Components Needed:
- `CheeseTypeSelector.tsx` - Step 1 UI
- `ProducerCheeseForm.tsx` - Step 2 UI
- `FlavorTagSelector.tsx` - Multi-select for flavors
- `PriceRangeSelector.tsx` - $ to $$$$$ selector

---

## 5. 📦 CHEESE BOX (MINOR UPDATES)
**Path**: `app/(tabs)/cheese-box.tsx`

### What Changes:
```
┌─────────────────────────────────────┐
│  My Cheese Box (47 cheeses)          │
├─────────────────────────────────────┤
│  Sort: [Recent ▼] [Rating] [A-Z]    │
│  Filter: [All Types ▼] [⭐⭐⭐⭐⭐]  │
├─────────────────────────────────────┤
│  Yesterday                           │
│  • President Brie          ⭐⭐⭐⭐⭐ │
│    "Creamy and delicious..."         │
│    [Edit] [Delete]                   │
│                                      │
│  Last Week                           │
│  • Tillamook Aged Cheddar  ⭐⭐⭐⭐  │
│    "Sharp but not too strong"        │
│    [Edit] [Delete]                   │
└─────────────────────────────────────┘
```

### Data Source:
```typescript
// Get user's cheese box entries with producer cheese details
const { data: entries } = await supabase
  .from('cheese_box_entries')
  .select(`
    *,
    producer_cheese:producer_cheeses!cheese_id(
      id,
      full_name,
      producer_name,
      image_url,
      cheese_type:cheese_types!cheese_type_id(
        name,
        type
      )
    )
  `)
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

### Changes Needed:
- ✅ Update query to join with `producer_cheeses` and `cheese_types`
- ✅ Display: "President Brie" instead of just "Brie"
- ✅ Show cheese type as subtitle: "Brie • Soft Cheese"
- ✅ Rating is already personal (no change)
- ✅ Notes are already personal (no change)
- ✅ Clicking entry goes to producer cheese detail page

### Components Affected:
- Update `CheeseBoxCard.tsx` to show producer + type
- Update data fetching in `cheese-box.tsx`

---

## 6. 🏠 HOME FEED (UPDATE)
**Path**: `app/(tabs)/index.tsx`

### What Changes:
Show cheese types (not individual producers) in the feed

```
┌─────────────────────────────────────┐
│  Trending Cheese Types               │
├─────────────────────────────────────┤
│  [Brie Card]                         │
│  ⭐ 4.7 avg • 234 ratings           │
│  47 producers                        │
│                                      │
│  [Aged Cheddar Card]                 │
│  ⭐ 4.8 avg • 512 ratings           │
│  89 producers                        │
└─────────────────────────────────────┘
```

### Data Source:
```typescript
const { data: trending } = await supabase
  .from('cheese_type_stats')
  .select('*')
  .order('total_ratings', { ascending: false })
  .limit(10);
```

---

## 7. 🔍 SEARCH (UPDATE)
**Path**: Search functionality

### What Changes:
Search both cheese types AND producer cheeses

```typescript
// Search cheese types
const { data: cheeseTypes } = await supabase
  .rpc('search_cheese_types', { p_search_term: query });

// Search producer cheeses
const { data: producers } = await supabase
  .from('producer_cheese_stats')
  .select('*')
  .or(`full_name.ilike.%${query}%, producer_name.ilike.%${query}%`)
  .limit(10);

// Combine results
const results = {
  cheeseTypes,
  producers
};
```

---

## PRIORITY ORDER FOR IMPLEMENTATION

### Phase 1: Core Functionality (Do First)
1. ✅ **Add Cheese Flow** - Most important user action
   - `CheeseTypeSelector.tsx`
   - `ProducerCheeseForm.tsx`
   - `FlavorTagSelector.tsx`
   
2. ✅ **Cheese Box Updates** - Users need to see their cheeses
   - Update data fetching
   - Update card display

### Phase 2: Discovery (Do Second)
3. ✅ **Producer Cheese Detail Page**
   - Rename/update existing cheese detail
   - Add producer info
   - Link to cheese type

4. ✅ **Cheese Type Page** (NEW)
   - Create new page
   - Show aggregate stats
   - Top producers grid

### Phase 3: Browse & Discover (Do Third)
5. ✅ **All Producers List**
6. ✅ **Home Feed Updates**
7. ✅ **Search Updates**

---

## SERVICE LAYER NEEDED

Create these TypeScript services first:

### `lib/cheese-types-service.ts`
```typescript
export const getCheeseTypes = async (filters?: Filters) => { }
export const getCheeseTypeById = async (id: string) => { }
export const searchCheeseTypes = async (query: string) => { }
export const createCheeseType = async (data: CreateCheeseTypeInput) => { }
```

### `lib/producer-cheese-service.ts`
```typescript
export const getProducerCheeses = async (cheeseTypeId: string) => { }
export const getProducerCheeseById = async (id: string) => { }
export const getTopProducersByType = async (typeId: string, limit: number) => { }
export const createProducerCheese = async (data: CreateProducerCheeseInput) => { }
export const addProducerCheeseToBox = async (cheeseId: string, rating: number, notes: string) => { }
```

### `lib/flavor-tags-service.ts`
```typescript
export const getAllFlavorTags = async () => { }
export const getFlavorTagsForCheese = async (cheeseId: string) => { }
export const updateFlavorTags = async (cheeseId: string, tagIds: string[]) => { }
```

---

## SUMMARY

**Files to Create:**
- `app/cheese-types/[id].tsx` - Cheese type page
- `app/cheese-types/[id]/producers.tsx` - All producers list
- `app/producer-cheese/[id].tsx` - Producer cheese detail (rename existing)
- `components/cheese-type/*` - New components
- `components/producer-cheese/*` - New components
- `lib/cheese-types-service.ts` - New service
- `lib/producer-cheese-service.ts` - New service
- `lib/flavor-tags-service.ts` - New service

**Files to Update:**
- `app/cheese/new.tsx` → Complete rewrite for two-step flow
- `app/(tabs)/cheese-box.tsx` → Update queries and display
- `app/(tabs)/index.tsx` → Show cheese types instead of individual cheeses

**Complexity**: High, but extremely valuable! This transforms your app from basic to professional-grade. 🚀
