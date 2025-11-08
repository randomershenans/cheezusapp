# Sponsored Pairings Implementation Guide 🎯

## What We Built

A stunning, premium pairing experience that allows partners to promote their products within the app. Think "X type of honey from Brand Y" with beautiful product showcases and smart alternatives.

## The User Experience

### For Regular Pairings
- Clean, simple view with cheese matches
- Standard description and imagery

### For Sponsored Pairings
**Gold-bordered premium card featuring:**

1. **✨ Featured Partner Badge** - Gold sparkle icon with "Featured Partner" text
2. **🏢 Brand Showcase** - Logo + brand name + specific product name
3. **📸 Featured Product Image** - High-quality hero shot of the actual product
4. **💡 Why It Works** - Orange-accented card explaining why this specific product pairs perfectly
5. **💰 Price Range** - Clear pricing info (e.g., "£5-10")
6. **🛍️ Shop Now Button** - Big, prominent orange button that opens purchase URL
7. **🔄 Can't Get This?** - Expandable alternatives section with:
   - Generic alternative (e.g., "Any wildflower honey")
   - Specific alternatives (e.g., "Rowse Wildflower Honey", "Beekeeper's Naturals")

## Database Schema

Run the SQL in `sponsored-pairings-schema.sql` to add these columns to `cheese_pairings`:

```sql
- is_sponsored (boolean) - Mark as sponsored content
- brand_name (text) - Brand/company name
- brand_logo_url (text) - Square logo image
- product_name (text) - Specific product name
- purchase_url (text) - Where to buy
- price_range (text) - e.g., "£8-12"
- why_it_works (text) - Marketing copy
- alternative_generic (text) - Generic alternative
- alternative_suggestions (text[]) - Specific alternatives
- featured_image_url (text) - Hero product image
- sponsored_until (timestamp) - When sponsorship ends
- partner_id (uuid) - Link to partner
- show_in_feed (boolean) - Display in homepage feed
- feed_until (timestamp) - When to stop showing in feed
```

## For Your Admin/Partners Page

### Partner Onboarding Flow
1. Partner pays £10 for placement
2. Upload:
   - Brand logo (square, 200x200px+)
   - Product image (16:9, 1200x675px+)
   - Purchase URL
   - Price range
   - "Why it works" copy (2-3 sentences)
   - Generic alternative text
   - 2-3 specific alternatives
3. Select which cheese(s) to attach to
4. Set duration (default: 30 days from `sponsored_until`)

### Example Data Entry
```javascript
{
  pairing: "Wildflower Honey",
  type: "food",
  is_sponsored: true,
  brand_name: "Yorkshire Bees",
  product_name: "Artisan Wildflower Honey - 340g",
  brand_logo_url: "https://...",
  featured_image_url: "https://...",
  purchase_url: "https://yorkshirebees.com/wildflower-honey",
  price_range: "£8-12",
  why_it_works: "Our cold-extracted wildflower honey preserves delicate floral notes that complement the creamy texture of aged cheddar without overpowering its nutty complexity.",
  alternative_generic: "Any raw wildflower or clover honey",
  alternative_suggestions: [
    "Rowse Wildflower Honey",
    "Beekeeper's Naturals B.Powered Honey",
    "Local farmers market honey"
  ],
  sponsored_until: "2025-12-08T00:00:00Z"
}
```

## Visual Design

### Gold Premium Aesthetic
- **Border**: 2px solid #FFD700 (gold)
- **Badge**: Cream background (#FFF9E6) with dark gold text
- **Sparkles icon**: Indicates premium content
- **Elevated shadow**: Gold glow effect

### Why It Works Card
- Orange accent (#FF6B35) left border
- Light orange background tint
- Stands out but feels native

### Alternatives Section
- Collapsible with smooth animation
- Orange accent color for interaction
- Clean bullet points for alternatives

## Monetization Flow

### Two Promotion Options

**Option 1: Pairing Page Only**
- Appears when users click on the pairing from a cheese
- Still beautiful, but more organic discovery
- Lower cost: £5

**Option 2: Pairing Page + Homepage Feed** 
- Everything from Option 1 PLUS
- Appears in homepage newsfeed (high visibility!)
- Gold "Featured Partner" badge on feed card
- More impressions = more clicks
- Higher cost: £10

### Feed Promotion
- Set `show_in_feed = true` to enable
- Set `feed_until` date (default: 30 days)
- Feed cards show:
  - Featured image
  - Brand logo
  - Product name
  - "Sponsored" badge
  - Tap to see full pairing details

### Example Pricing Tiers
```
Basic Pairing: £5 (30 days on pairing page only)
Feed Promotion: £10 (30 days on pairing page + homepage feed)
Premium Bundle: £25 (60 days both + article feature)
```

### Analytics to Track
- Impressions (views)
- Clicks on "Shop Now"
- Clicks on brand logo
- Alternative expansions
- Conversion tracking via UTM parameters in purchase_url

## Querying Feed Items

To fetch sponsored pairings for the homepage feed:

```typescript
// Fetch active sponsored pairings for feed
const { data: feedPairings, error } = await supabase
  .from('cheese_pairings')
  .select('*')
  .eq('show_in_feed', true)
  .gte('feed_until', new Date().toISOString())
  .order('created_at', { ascending: false })
  .limit(5);
```

Display these in the feed with:
- Smaller "Sponsored" badge (not full gold treatment)
- Featured image
- Brand logo in corner
- Product name as title
- "Tap to learn more" CTA
- When tapped → navigate to full pairing page with gold experience

## Next Steps

1. **Run the SQL migration** - Add columns to database
2. **Create Partners table** - Store partner info
3. **Build admin interface** - Form to create sponsored pairings
4. **Add payment integration** - Stripe for £5/£10 payments
5. **Add analytics tracking** - Record impressions/clicks
6. **Create partner dashboard** - Show their stats
7. **Build feed card component** - Display sponsored pairings in feed

## The Brilliant Bits 🌟

- **Non-intrusive** - Only shows when relevant to the cheese
- **User-first** - Always provides alternatives if they can't get the sponsored product
- **Beautiful** - Premium feel without being tacky
- **Transparent** - Clear "Featured Partner" badge
- **Actionable** - Direct purchase link
- **Educational** - "Why it works" adds value

Perfect for artisan producers, specialty food shops, and premium brands wanting to reach cheese enthusiasts! 🧀✨
