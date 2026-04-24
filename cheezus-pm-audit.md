# PM Audit — Cheezus (Food & Drink sector lens)

_Date: 2026-04-24_

**Framing:** Cheezus is positioned where Vivino was in 2012 — a social logging app for a specialist food category with a knowledge barrier, pairing logic, and regional identity. The bones are right. The strategic gaps are around **intent, moments of use, and what makes cheese different from wine/beer.**

---

## What's working

- **Data model is strong.** Producer ↔ cheese ↔ cheese-type hierarchy, pairings, content, awards, geolocation — you've built the ontology that most cheese apps skip. This is your moat.
- **Personalized feed infrastructure** (recs/trending/discovery/awards mix in `lib/feed-service.ts`) is ahead of where most food apps ever get.
- **Producer pages** (hero video, story, gallery, verified) — best-in-class vs. comparable apps.
- **Analytics coverage** on invite/share/social funnels is genuinely thorough. You'll be able to measure what gets suggested below.

---

## Strategic tensions to resolve

### 1. The "moment of use" problem is not solved

Wine apps win because users open them **at the shelf** or **with a pour in hand**. Beer apps win at **the bar**. The home surface is a feed — feeds require users to open the app with no specific purpose, which is the hardest behavior to earn in food/drink.

Cheese's "moments" are: (a) at a cheesemonger counter, (b) at a dinner party / board, (c) at a supermarket, (d) after trying something at a friend's or restaurant, (e) planning a meal. **None of these are well-served by the current home screen.**

→ Add an explicit **"At the counter"** mode: a big home CTA that drops users into scan → rate → save in ≤2 taps. Vivino's entire growth was built on this single moment.

### 2. Add-cheese flow is too many steps

3 steps (search → choose destination → form) vs. Vivino's 1 (point camera at label). `lib/label-scanner.ts` suggests this is in progress — **prioritize it ruthlessly**. Until the log is a 1-tap action, logging volume will lag. Every milestone/streak/feed feature downstream depends on log count.

### 3. Cold-start taste profile

A new user's feed is generic until they log cheeses, but they can't intelligently choose what to log without a profile. Classic chicken-and-egg.

→ **Onboarding taste quiz**: 8–10 forced-choice questions ("Gouda or Manchego?", "Funky or mild?", "Soft or hard?"). Seeds the taste profile before first log. Vivino, Delectable, every meaningful food app does a variant of this. The taste fields already exist — they just aren't captured upfront.

### 4. Pairings are the product for cheese, but they're buried

For wine, pairings are a "nice to have." For **cheese, pairings are existential** — people eat cheese with something 95% of the time. `cheese_pairings` data exists but it's a feed slot, not a first-class layer on every cheese detail.

→ Every cheese detail page should open with: **"Pair with →"** (wine, fruit, bread, honey, charcuterie). This is the single biggest content-to-utility gap.

### 5. Sharing is profile-centric, but cheese is moment-centric

Cheese content that goes viral on social: cheese boards, "countries I've cheesed," annual wrapped, taste personality quizzes. The current viral loop (`components/ShareProfileCard.tsx`) asks a user with ~3 cheeses logged to share a thin profile page. Non-users won't engage.

→ Build **shareable artifacts**, not shareable profiles:
- "Cheese Board Builder" — pick 3-5, get serving order + pairings, auto-generate an Instagrammable card
- "Cheese Passport" — world map with countries conquered
- "Year in Cheese" wrapped

---

## On the current release specifically

### Map
The map is visually cool but lacks a **primary job**. Users don't know whether to open it to "find a shop near me," "plan a trip," or "explore where cheeses come from." Pick one. Recommendation: **"Find cheese near me right now"** — cheesemonger counters and shops that stock specific cheeses from the user's wishlist. Ties map to wishlist → purchase intent → conversion.

### Follow/Share push
- The **FollowSuggestions modal** surfaces strangers to new users with no social graph. People don't want to follow random cheese lovers — they want to follow *people they know* or *voices they respect*. Better seeds: (a) contacts import, (b) "cheesemongers and writers we recommend," (c) producers they can follow directly.
- **ShareProfileCard** needs the profile page to be valuable to a non-user who lands on it. The web preview has to be a rich, install-driving page with the friend's top cheeses, photos, ratings. If not, shares leak. Audit the `/@{vanity}` web experience.
- **Milestone share prompt** at 5 cheeses is well-timed but the share message is generic ("I've tried 5 cheeses"). Make the artifact visual: auto-generate a stylized card with the cheeses, ratings, and a headline. That's what gets posted to stories.

### Add-cheese ("new")
Streamline to 2 steps max. Rating should be capturable **in the feed card itself** for cheeses already in your box — no modal needed.

---

## Opportunities, prioritized

### Now (0–4 weeks)
1. Ship the label/barcode scanner to 1-tap cheese logging. This unblocks everything.
2. Onboarding taste quiz (8–10 questions) → seeds `user_taste_profile` before first log.
3. Pairings promoted to first section of every cheese detail page.
4. Audit the public web profile page — ensure it drives installs (rich preview, top cheeses, CTA).
5. Fix the social seeding — replace "random cheese lovers" with contacts / producers / recommended creators.

### Next (1–3 months)
6. **Cheese Board Builder** — killer share artifact, serves dinner-party moment. High virality potential.
7. **"At the counter" mode** — prominent home CTA, location-aware, "what should I buy tonight" suggestions from wishlist + taste match.
8. **Passport/map of countries cheesed** — shareable, satisfies collector psychology (same instinct that makes Untappd work).
9. Thematic badges — "French Conquest," "Goat Whisperer," "Rind Adventurer" — far more shareable than "5 cheeses logged."
10. Content/pairing/cheese linking — when you log a Brie, surface the Brie article + Brie pairings + Brie producers in a unified bottom-sheet.

### Later (3–6 months)
11. **Monetization layer** — affiliate links on pairings (wine shops, online cheesemongers like Murray's, Neal's Yard), producer-verified-paid tier, cheese-of-the-month box partnerships. The sponsored pairings infrastructure is already built — just needs supply.
12. **Annual Wrapped** — Spotify-style year-end artifact. Drops in December, huge share spike.
13. Restaurant menu integration (log a cheese from a restaurant menu / cheese flight).
14. Cheese events — tastings, classes, cheese-rolling. Location infra already exists.

---

## Call-outs to debate

- **Is this an enthusiast tool or a discovery tool?** These pull in different directions. Enthusiast = depth (tasting notes, detailed reviews, aging, terroir). Discovery = breadth (recommendations, social, impulse). Currently leaning enthusiast in data model but discovery in UX. Pick a primary audience.
- **Who writes the content?** Cheezopedia at scale is hard. Editorial team, UGC reviews, or AI-assisted from producer data? All three have precedent; decide explicitly.
- **Producers as users, not just data.** Verified producers should be able to post updates, announce new batches, host AMAs. Biggest underexploited asset in the current data model.

---

## Bottom line

The product is more sophisticated than most at this stage. The gap isn't features — it's **sharpening the moments of use and making the outputs (boards, passports, wrapped) as strong as the inputs (log, rate).**

---

## Appendix — Product inventory (as of audit)

### Core tabs
- **Home** (`app/(tabs)/index.tsx`): Personalized feed — recs (30%) / trending (25%) / discovery (25%) / awards (20%) + articles + sponsored pairings + following activity.
- **Discover** (`app/(tabs)/discover.tsx`): Map-first, list fallback. Nearby producers/shops/cheeses within 100km.
- **Cheese Box** (`app/(tabs)/cheese-box.tsx`): Tried + Wishlist tabs. Grid/list. Stats.
- **Profile** (`app/(tabs)/profile.tsx`): Stats, badges, follower counts, saved items, vanity URL.
- **Floating "+"**: Routes to `/add-cheese`.

### Key features shipped
- Personalized feed with taste matching
- MapBox-based discovery
- 3-step cheese-logging flow (search → destination → form)
- Rating (0–5), notes, photo, pairings
- Follows, vanity URLs, deep links (`cheezus://@vanity`, `cheezus://profile/{uuid}`)
- Follow suggestions modal for new users (0 following)
- ShareProfileCard (0 followers) and MilestoneSharePrompt (5/10/25/50/100 cheeses)
- Badges, tier system (new/starting/building/connoisseur)
- Cheezopedia articles, recipes, producer spotlights
- Sponsored cheese pairings with brand partnerships
- Push notifications for friend activity

### Analytics events around growth
- `share_prompt_shown` / `share_prompt_tapped` / `share_prompt_dismissed`
- `profile_share` (with share_method)
- `user_follow` / `follow_from_suggestion`
- `invite_prompt_shown` → `invite_sent` → `invite_converted_install` → `invite_converted_signup` → `invite_auto_follow_completed` (infra in place)
- Feed: `feed_cheese_click` (with position), `feed_scroll_load_more`, `feed_refresh`

### No current monetization
- No IAP / Stripe / subscriptions detected
- Sponsored pairings are the only revenue surface (infra built, supply unclear)

### Known UX gaps
- No taste quiz onboarding
- No flavor/sensory-based search
- Pairings not integrated into cheese detail pages
- No DMs, no @mentions in notes, no recommendation-to-friend
- Cheezopedia likely thin (<50 articles)
- No bulk wishlist → shopping path
- Wishlist has `priority` column unused in UI
- Empty states minimal
