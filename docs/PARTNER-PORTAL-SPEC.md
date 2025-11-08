# Partner Portal Development Specification

## Overview

The Partner Portal is a web-based admin interface that allows brand partners to create and manage sponsored content within the Cheezus app. Partners can sponsor **cheese pairings** (products like honey, wine, crackers) and **Cheezopedia articles** (educational content, recipes, guides).

**Technical Architecture:**
- Built as a web app (React/Next.js recommended)
- Uses **Supabase client directly** (same as the mobile app)
- Authentication via **Supabase Auth** with partner role
- Data access controlled by **Row Level Security (RLS) policies**
- No custom backend API needed - direct database access

### Business Model

**Sponsored Pairings:**
- **Basic (£5/month)**: Pairing page only - appears when users browse or search pairings
- **Premium (£10/month)**: Pairing page + Homepage feed promotion with featured placement

**Sponsored Articles:**
- **Standard (£8/month)**: Article page only - appears in Cheezopedia search/browse
- **Featured (£15/month)**: Article page + Homepage feed promotion

---

## Authentication & Security

### Supabase Auth Setup

**Partner Registration:**
```typescript
// Sign up a new partner
const { data, error } = await supabase.auth.signUp({
  email: 'partner@example.com',
  password: 'secure_password',
  options: {
    data: {
      role: 'partner',
      company_name: 'Yorkshire Bees',
    }
  }
});

// After signup, create partner record
await supabase.from('partners').insert({
  id: data.user.id,  // Same as auth.users.id
  company_name: 'Yorkshire Bees',
  contact_email: 'partner@example.com',
  subscription_tier: 'basic',
  subscription_status: 'active',
});
```

**Partner Login:**
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'partner@example.com',
  password: 'secure_password',
});
```

### Row Level Security (RLS) Policies

**CRITICAL:** Enable RLS on all tables and set up these policies:

#### `partners` Table
```sql
-- Partners can only view/edit their own record
CREATE POLICY "Partners can view own record" ON partners
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Partners can update own record" ON partners
  FOR UPDATE USING (auth.uid() = id);

-- Admins can view all
CREATE POLICY "Admins can view all partners" ON partners
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );
```

#### `cheese_pairings` Table
```sql
-- Partners can only insert if they have active subscription
CREATE POLICY "Partners can create pairings" ON cheese_pairings
  FOR INSERT WITH CHECK (
    auth.uid() = partner_id 
    AND EXISTS (
      SELECT 1 FROM partners 
      WHERE partners.id = auth.uid() 
      AND partners.subscription_status = 'active'
    )
  );

-- Partners can only update their own pairings
CREATE POLICY "Partners can update own pairings" ON cheese_pairings
  FOR UPDATE USING (auth.uid() = partner_id);

-- Partners can only view their own pairings
CREATE POLICY "Partners can view own pairings" ON cheese_pairings
  FOR SELECT USING (auth.uid() = partner_id);

-- Everyone can view active sponsored pairings (for the app)
CREATE POLICY "Public can view active sponsored pairings" ON cheese_pairings
  FOR SELECT USING (
    is_sponsored = true 
    AND sponsored_until > NOW()
  );
```

#### `cheese_pairing_matches` Table
```sql
-- Partners can create matches for their own pairings
CREATE POLICY "Partners can create matches" ON cheese_pairing_matches
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM cheese_pairings 
      WHERE cheese_pairings.id = pairing_id 
      AND cheese_pairings.partner_id = auth.uid()
    )
  );
```

#### `sponsored_placements` Table
```sql
-- Partners can only view their own placements
CREATE POLICY "Partners can view own placements" ON sponsored_placements
  FOR SELECT USING (auth.uid() = partner_id);

-- System can insert placements (or use service role)
```

---

## Database Schema

### Core Tables

#### 1. `partners` Table
Stores partner/brand information.

```sql
CREATE TABLE partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL UNIQUE,
  contact_phone TEXT,
  brand_logo_url TEXT,
  website_url TEXT,
  billing_email TEXT,
  subscription_tier TEXT CHECK (subscription_tier IN ('basic', 'premium', 'standard', 'featured')),
  subscription_status TEXT CHECK (subscription_status IN ('active', 'paused', 'cancelled')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Fields:**
- `company_name`: Brand name (e.g., "Yorkshire Bees")
- `brand_logo_url`: URL to brand logo image (displayed on sponsored content)
- `subscription_tier`: Current tier - determines what features they can use
- `subscription_status`: Whether their subscription is active

---

#### 2. `cheese_pairings` Table (Modified)
The main pairings table with sponsored content fields.

**Required Sponsored Fields:**
```sql
-- Core fields
id UUID PRIMARY KEY
pairing TEXT NOT NULL  -- e.g., "Wildflower Honey"
type TEXT CHECK (type IN ('food', 'drink'))
description TEXT
image_url TEXT  -- General pairing image

-- Sponsored content fields
is_sponsored BOOLEAN DEFAULT FALSE
partner_id UUID REFERENCES partners(id)
brand_name TEXT  -- e.g., "Yorkshire Bees"
brand_logo_url TEXT
product_name TEXT  -- e.g., "Artisan Wildflower Honey - 340g"
featured_image_url TEXT  -- High-quality product shot for hero
why_it_works TEXT  -- Detailed pairing explanation
purchase_url TEXT  -- Buy button link
price_range TEXT  -- e.g., "£8-12"
alternative_generic TEXT  -- e.g., "Any local wildflower honey"
alternative_suggestions TEXT[]  -- Specific alternatives
sponsored_until TIMESTAMPTZ  -- Expiration date

-- Homepage feed promotion (Premium tier only)
show_in_feed BOOLEAN DEFAULT FALSE
feed_until TIMESTAMPTZ  -- Feed expiration date
```

---

#### 3. `cheezopedia_entries` Table (Modified)
Articles/recipes/guides with sponsored content support.

**Required Sponsored Fields:**
```sql
-- Core fields
id UUID PRIMARY KEY
title TEXT NOT NULL
slug TEXT UNIQUE
content TEXT  -- Markdown content
content_type TEXT CHECK (content_type IN ('article', 'recipe', 'guide'))
image_url TEXT
author TEXT

-- Sponsored content fields
is_sponsored BOOLEAN DEFAULT FALSE
partner_id UUID REFERENCES partners(id)
brand_name TEXT
brand_logo_url TEXT
sponsored_message TEXT  -- Custom message from brand
sponsored_until TIMESTAMPTZ

-- Homepage feed promotion (Featured tier only)
show_in_feed BOOLEAN DEFAULT FALSE
feed_until TIMESTAMPTZ
```

---

#### 4. `sponsored_placements` Table (Optional - for tracking)
Tracks sponsored content performance and billing.

```sql
CREATE TABLE sponsored_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES partners(id) NOT NULL,
  content_type TEXT CHECK (content_type IN ('pairing', 'article')) NOT NULL,
  content_id UUID NOT NULL,
  placement_type TEXT CHECK (placement_type IN ('page_only', 'page_and_feed')) NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  monthly_cost DECIMAL(10,2) NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('active', 'expired', 'cancelled')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Partner Portal Features

### 1. Authentication & Dashboard

**Login Page:**
- Email/password authentication
- Password reset flow
- Role: `partner` user type

**Dashboard View:**
- Overview of active sponsored content
- Quick stats: impressions, clicks, active placements
- Upcoming renewal dates
- Current subscription tier

---

### 2. Create Sponsored Pairing

**UI Flow:**

#### Step 1: Basic Information
```
Form Fields:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ Pairing Name *
  (e.g., "Wildflower Honey")

□ Type *
  ○ Food  ○ Drink

□ General Description
  (Brief pairing description)

□ Pairing Image
  [Upload or URL]
  Dimensions: 1200x800px recommended
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### Step 2: Product Details (Sponsored Content)
```
Form Fields:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ Brand Name *
  [Auto-filled from partner profile]

□ Product Name *
  (e.g., "Artisan Wildflower Honey - 340g")

□ Featured Product Image *
  [Upload or URL]
  This appears as hero image
  Dimensions: 1200x1200px recommended

□ Why This Pairs Perfectly *
  [Rich text editor - 200-500 chars]
  Explain the pairing science/flavor

□ Purchase URL *
  (Where to buy - your store/Amazon/etc)

□ Price Range
  (e.g., "£8-12" or "$15-20")
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### Step 3: Alternatives (Optional but Recommended)
```
Form Fields:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ Generic Alternative
  (e.g., "Any local wildflower honey")

□ Specific Alternatives
  [Add multiple]
  • [Alternative product 1]
  • [Alternative product 2]
  • [+ Add another]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### Step 4: Link to Cheeses
```
UI:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Search and select cheeses this pairs with:

[Search cheeses...            ] 🔍

Selected Cheeses (3):
┌─────────────────────────────────┐
│ ✓ Camembert                     │
│ ✓ Brie                          │
│ ✓ Aged Cheddar                  │
└─────────────────────────────────┘

[+ Add more cheeses]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### Step 5: Sponsorship Duration & Tier
```
UI:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sponsorship Tier:

○ Basic (£5/month)
  • Pairing page with product showcase
  • Buy button
  • SEO optimization

● Premium (£10/month) ⭐ RECOMMENDED
  • Everything in Basic
  • Homepage feed promotion
  • Priority placement in search

Duration:
[Start Date] ───► [End Date]
  Jan 1, 2024      Jan 31, 2024

☑ Auto-renew monthly

Total: £10/month
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[← Back]  [Preview]  [Publish →]
```

---

### 3. Code Implementation: Create Pairing

**Using Supabase Client Directly:**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createSponsoredPairing(data: SponsoredPairingData) {
  // 1. Get current user (partner)
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  // 2. Get partner record (with their tier info)
  const { data: partner, error: partnerError } = await supabase
    .from('partners')
    .select('*')
    .eq('id', user.id)
    .single();
  
  if (partnerError || partner.subscription_status !== 'active') {
    throw new Error('Subscription inactive');
  }
  
  // 3. Check tier permissions
  if (data.show_in_feed && !['premium', 'featured'].includes(partner.subscription_tier)) {
    throw new Error('Feed promotion requires Premium tier');
  }
  
  // 4. Insert pairing (RLS will automatically set partner_id)
  const { data: pairing, error: pairingError } = await supabase
    .from('cheese_pairings')
    .insert({
      pairing: data.pairing,
      type: data.type,
      description: data.description,
      image_url: data.image_url,
      is_sponsored: true,
      partner_id: user.id,
      brand_name: data.brand_name,
      brand_logo_url: data.brand_logo_url,
      product_name: data.product_name,
      featured_image_url: data.featured_image_url,
      why_it_works: data.why_it_works,
      purchase_url: data.purchase_url,
      price_range: data.price_range,
      alternative_generic: data.alternative_generic,
      alternative_suggestions: data.alternative_suggestions,
      sponsored_until: data.sponsored_until,
      show_in_feed: data.show_in_feed,
      feed_until: data.feed_until,
    })
    .select()
    .single();
  
  if (pairingError) throw pairingError;
  
  // 5. Create cheese relationships in junction table
  const matchInserts = data.cheese_ids.map(cheeseId => ({
    cheese_id: cheeseId,
    pairing_id: pairing.id,
  }));
  
  const { error: matchError } = await supabase
    .from('cheese_pairing_matches')
    .insert(matchInserts);
  
  if (matchError) throw matchError;
  
  // 6. Create placement record (for tracking/billing)
  const { error: placementError } = await supabase
    .from('sponsored_placements')
    .insert({
      partner_id: user.id,
      content_type: 'pairing',
      content_id: pairing.id,
      placement_type: data.show_in_feed ? 'page_and_feed' : 'page_only',
      start_date: new Date().toISOString(),
      end_date: data.sponsored_until,
      monthly_cost: data.show_in_feed ? 10.00 : 5.00,
      status: 'active',
    });
  
  if (placementError) throw placementError;
  
  return pairing;
}
```

**Validation Rules:**
- ✅ All required fields must be present
- ✅ `featured_image_url` must be high-quality (validate dimensions/file size)
- ✅ `purchase_url` must be valid URL
- ✅ `sponsored_until` must be in the future
- ✅ If `show_in_feed = true`, require Premium tier
- ✅ Partner must have active subscription
- ✅ At least 1 cheese must be linked

---

### 4. Manage Existing Content

**List View:**
```
My Sponsored Pairings
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌────────────────────────────────────────────────────┐
│ 🍯 Wildflower Honey                         ACTIVE │
│ Yorkshire Bees • Premium Tier                      │
│ Expires: Dec 31, 2024 • Feed: Yes                  │
│ 1,234 impressions • 56 clicks                      │
│                                                     │
│ [Edit] [Pause] [Renew] [Analytics]                 │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│ 🍷 Sancerre Wine                            ACTIVE │
│ Loire Valley Wines • Basic Tier                    │
│ Expires: Jan 15, 2025 • Feed: No                   │
│ 892 impressions • 34 clicks                        │
│                                                     │
│ [Edit] [Upgrade] [Renew] [Analytics]               │
└────────────────────────────────────────────────────┘

[+ Create New Pairing]
```

**Actions Available:**
- **Edit**: Modify content (preserves ID/URL)
- **Pause**: Temporarily hide from app
- **Renew**: Extend sponsorship period
- **Upgrade**: Switch from Basic → Premium
- **Analytics**: View detailed performance

---

### 5. Create Sponsored Article

**Similar flow to pairings, but adapted for articles:**

```
Form Fields:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 1: Article Basics
□ Title *
□ Content Type (Article/Recipe/Guide)
□ Content * [Markdown editor]
□ Hero Image *
□ Author Name

Step 2: Sponsored Content
□ Brand Name [Auto-filled]
□ Sponsored Message
  (Custom message, e.g., "Brought to you by...")
□ Brand Logo Placement
  ○ Top of article  ○ Bottom of article

Step 3: Tier & Duration
○ Standard (£8/month) - Article only
● Featured (£15/month) - Article + Feed
  
Duration: [dates]

[Publish]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Database Insert:**
```typescript
await db.cheezopedia_entries.create({
  data: {
    title: data.title,
    slug: generateSlug(data.title),
    content: data.content,
    content_type: data.content_type,
    image_url: data.image_url,
    author: data.author,
    is_sponsored: true,
    partner_id: partnerId,
    brand_name: partner.company_name,
    brand_logo_url: partner.brand_logo_url,
    sponsored_message: data.sponsored_message,
    sponsored_until: data.sponsored_until,
    show_in_feed: data.show_in_feed,
    feed_until: data.feed_until,
  }
});
```

---

## Expiration & Renewal Logic

### Automated Processes

**Daily Cron Job:**
```typescript
async function checkExpiredSponsorship() {
  const now = new Date();
  
  // 1. Check expired pairings
  const expiredPairings = await db.cheese_pairings.findMany({
    where: {
      is_sponsored: true,
      sponsored_until: { lt: now },
    }
  });
  
  for (const pairing of expiredPairings) {
    // Check if auto-renew enabled
    const partner = await db.partners.findUnique({
      where: { id: pairing.partner_id }
    });
    
    if (partner.auto_renew && partner.subscription_status === 'active') {
      // Extend sponsorship
      await db.cheese_pairings.update({
        where: { id: pairing.id },
        data: {
          sponsored_until: addMonths(now, 1),
          feed_until: pairing.show_in_feed ? addMonths(now, 1) : null,
        }
      });
      
      // Create new billing record
      await createInvoice(partner.id, pairing.id);
    } else {
      // Convert to regular pairing (remove sponsored features)
      await db.cheese_pairings.update({
        where: { id: pairing.id },
        data: {
          is_sponsored: false,
          show_in_feed: false,
          // Keep content but mark as expired
        }
      });
      
      // Send expiration notification email
      await sendEmail(partner.contact_email, 'sponsorship-expired', {
        content: pairing.pairing,
      });
    }
  }
}
```

---

## Admin Features (for Cheezus Team)

### Admin Portal Additions

**Partner Management:**
- View all partners
- Approve/reject new partners
- Adjust subscription tiers manually
- Issue refunds
- View revenue analytics

**Content Moderation:**
- Review new sponsored content before publish
- Flag inappropriate content
- Edit/remove sponsored placements
- Manual override expiration dates

**Analytics Dashboard:**
- Total revenue by tier
- Top performing sponsored content
- Partner retention rates
- Feed engagement metrics

---

## Common Supabase Queries

### Authentication

```typescript
// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: email,
  password: password,
});

// Logout
await supabase.auth.signOut();

// Get current user
const { data: { user } } = await supabase.auth.getUser();
```

### Dashboard Data

```typescript
// Get partner info + stats
const { data: partner } = await supabase
  .from('partners')
  .select('*')
  .eq('id', user.id)
  .single();

// Get all partner's pairings
const { data: pairings } = await supabase
  .from('cheese_pairings')
  .select('*')
  .eq('partner_id', user.id)
  .order('created_at', { ascending: false });

// Get performance stats
const { data: placements } = await supabase
  .from('sponsored_placements')
  .select('impressions, clicks')
  .eq('partner_id', user.id);
```

### List Partner's Pairings

```typescript
const { data: pairings, error } = await supabase
  .from('cheese_pairings')
  .select(`
    *,
    cheese_count:cheese_pairing_matches(count)
  `)
  .eq('partner_id', user.id)
  .order('created_at', { ascending: false });
```

### Update Pairing

```typescript
const { data, error } = await supabase
  .from('cheese_pairings')
  .update({
    product_name: newName,
    price_range: newPrice,
    // ... other fields
  })
  .eq('id', pairingId)
  .eq('partner_id', user.id)  // RLS ensures this
  .select()
  .single();
```

### Pause/Unpause Pairing

```typescript
// Pause
await supabase
  .from('cheese_pairings')
  .update({ is_sponsored: false })
  .eq('id', pairingId);

// Unpause
await supabase
  .from('cheese_pairings')
  .update({ 
    is_sponsored: true,
    sponsored_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  })
  .eq('id', pairingId);
```

### Search Cheeses (for linking)

```typescript
const { data: cheeses } = await supabase
  .from('cheeses')
  .select('id, name, type, origin_country, image_url')
  .ilike('name', `%${searchTerm}%`)
  .limit(20);
```

### Upload Image to Supabase Storage

```typescript
const file = event.target.files[0];

// Upload to storage bucket
const { data: uploadData, error: uploadError } = await supabase.storage
  .from('partner-images')
  .upload(`${user.id}/${Date.now()}_${file.name}`, file);

if (!uploadError) {
  // Get public URL
  const { data } = supabase.storage
    .from('partner-images')
    .getPublicUrl(uploadData.path);
  
  const imageUrl = data.publicUrl;
}
```

---

## UI/UX Guidelines

### Design System
- Use Cheezus brand colors (primary: #FCD95B, background: #FFF8E7)
- Match app's card-based layout
- Mobile-responsive
- Clear CTAs for upgrades (Basic → Premium)

### Key Screens

1. **Login/Register**
2. **Dashboard** (overview + quick actions)
3. **Create Pairing** (multi-step form)
4. **Manage Pairings** (list + edit)
5. **Create Article** (markdown editor)
6. **Analytics** (charts + metrics)
7. **Billing** (invoices + subscription)
8. **Settings** (profile + branding)

---

## Example Data Flow

### Creating a Sponsored Pairing with Feed Promotion

```mermaid
1. Partner logs in
   ↓
2. Selects "Create Pairing"
   ↓
3. Fills out form (product details, images, etc.)
   ↓
4. Selects "Premium" tier (£10/month)
   ↓
5. Enables "Show in feed" toggle
   ↓
6. Links to 3 cheeses
   ↓
7. Clicks "Publish"
   ↓
8. Backend validates partner subscription
   ↓
9. Creates pairing record with is_sponsored=true, show_in_feed=true
   ↓
10. Creates 3 records in cheese_pairing_matches junction table
   ↓
11. Creates sponsored_placement record
   ↓
12. Returns success + pairing ID
   ↓
13. Pairing now appears:
    - On linked cheese detail pages
    - In pairing search results
    - In homepage feed (gold border)
    - When users tap → full sponsored page with buy button
```

---

## Testing Checklist

### Before Launch

- [ ] Partner can register and login
- [ ] Partner can create basic pairing (£5 tier)
- [ ] Partner can create premium pairing (£10 tier)
- [ ] Feed promotion only works for premium tier
- [ ] Pairing appears on linked cheese pages
- [ ] Pairing appears in homepage feed (if premium)
- [ ] Buy button opens correct URL
- [ ] Alternatives dropdown works
- [ ] Expiration dates are enforced
- [ ] Auto-renew extends sponsorship
- [ ] Non-renewed content converts to regular pairing
- [ ] Partner can edit existing pairings
- [ ] Analytics show correct metrics
- [ ] Invoices are generated correctly
- [ ] Admin can moderate content
- [ ] Email notifications work

---

## Security Considerations

1. **Authentication:**
   - JWT tokens with expiration
   - Role-based access (partner vs admin)
   - Rate limiting on API

2. **Data Validation:**
   - Sanitize all inputs
   - Validate URLs before storing
   - Check file uploads (type, size)
   - Prevent SQL injection

3. **Permissions:**
   - Partners can only edit their own content
   - Admins can edit all content
   - Expired subscriptions = no edit access

4. **Payment:**
   - Use Stripe/PayPal for billing
   - Store payment tokens, not cards
   - PCI compliance if handling cards

---

## Future Enhancements

### Phase 2 Features
- A/B testing for different product images
- Automated performance reports (weekly email)
- Bulk upload (CSV import)
- White-label portal (partners.cheezusapp.com)
- Integration with e-commerce platforms
- Discount codes tracking
- Affiliate link support
- Multi-user accounts (team access)

---

## Recommended Tech Stack

### Frontend
- **Framework:** Next.js 14+ with App Router (React)
- **Styling:** Tailwind CSS (matches Cheezus brand)
- **Forms:** React Hook Form + Zod validation
- **Rich Text:** TipTap or SimpleMDE for markdown editing
- **UI Components:** shadcn/ui or Radix UI

### Backend
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Storage:** Supabase Storage (for image uploads)
- **Real-time:** Supabase Realtime (optional for live stats)

### Third-Party Services
- **Payment Processing:** Stripe Checkout + Subscriptions
- **Email:** Supabase Edge Functions + SendGrid/Resend
- **Analytics:** Supabase Analytics + Mixpanel (optional)

### Deployment
- **Hosting:** Vercel (perfect for Next.js)
- **Domain:** partners.cheezusapp.com
- **Environment:** Uses same Supabase project as mobile app

### Key Configuration

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Support

For questions during development:
- Technical spec: This document
- Database schema: `/docs/sponsored-pairings-schema.sql`
- App integration: `/docs/SPONSORED-PAIRINGS-GUIDE.md`
- Design mockups: [Link to Figma/designs]

---

**Last Updated:** November 8, 2024
**Version:** 1.0
