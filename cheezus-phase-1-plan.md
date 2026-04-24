# Cheezus — Phase 1 Execution Plan

_Last updated: 2026-04-24_

Source: strategic audit in [cheezus-pm-audit.md](cheezus-pm-audit.md) → four scoping agents → locked decisions below.

**Goal:** grow from 370 organic users (Jan–Apr 2026) by making every existing share surface do more work. Not "add more features." Leverage on what already ships.

Phase 1 = four workstreams. Social seeding deferred to Phase 2.

---

## TL;DR — Workstream Summary

| # | Workstream | Ships | Effort |
|---|------------|-------|--------|
| 0 | Quick wins | URL fix, missing share analytics, curated flavor tags, tier ladder | ✅ shipped this session |
| 1 | Public profile redesign | Mobile redesign + web OG image + web polish | ~13 eng days |
| 2 | Share artifacts | Visual card generation + copy rewrites across 9 surfaces | ~4 weeks |
| 3 | Taste quiz | 8-question onboarding, feeds the taste profile, result-as-share-artifact | ~5 eng days |
| — | (Phase 2) Social seeding | Contacts import + producer follows + curated seeds | Deferred |

---

## What Shipped This Session

### Quick wins (immediate)

- **URL fix** — `cheezus.app` → `cheezus.co` across:
  - [components/SharePromptModal.tsx](components/SharePromptModal.tsx)
  - [components/ShareProfileCard.tsx](components/ShareProfileCard.tsx)
  - [components/MilestoneSharePrompt.tsx](components/MilestoneSharePrompt.tsx) (also added missing `@` prefix on vanity URL to match deep-link handler)
- **Added missing `trackProducerShare`** analytics event + wired into [app/producer/[id].tsx](app/producer/[id].tsx) share handler
- **Wired dead share button** on [app/cheese/[id].tsx](app/cheese/[id].tsx) — was `{/* Handle share */}` no-op, now fires `trackCheeseShare` via full Share API
- **Upgraded [app/event/[id].tsx](app/event/[id].tsx)** share from SMS-only `Linking.openURL('sms:...')` to full Share API — now shares to WhatsApp, Twitter, Instagram, etc.
- **Curated 10-tag flavor shortlist** — [constants/FlavorTags.ts](constants/FlavorTags.ts)
- **Added "Funky" flavor tag** — [db/add-funky-flavor-tag.sql](db/add-funky-flavor-tag.sql). Replaces clinical "Pungent" on consumer surfaces.
- **Tier ladder constants** — [constants/Tiers.ts](constants/Tiers.ts). 5 tiers: Curious Palate → Cheese Explorer → Connoisseur → Affineur → Maître Fromager.

### Previously shipped (from earlier in conversation)

- Auth on app resume (`AppState` listener + session rehydrate) — [contexts/AuthContext.tsx](contexts/AuthContext.tsx), [lib/supabase.ts](lib/supabase.ts)
- Wrong table name in follower count query (`followers` → `follows`) — [app/(tabs)/index.tsx:148](app/(tabs)/index.tsx)
- Feed race fix — waits for auth `loading` before querying

---

## Workstream 1: Public Profile Redesign

**Decisions locked:**
- Top Shelf = auto (4 highest-rated cheeses)
- Exact star ratings shown (Vivino-style, not Beli-style relative ranks)
- 5-tier ladder: Curious Palate / Cheese Explorer / Connoisseur / Affineur / Maître Fromager
- Passport = **mini interactive world-map** (not flag chip row). Countries fill proportional to cheese count. Tap → drawer of logged cheeses from that country.

**Phases:**
- **Phase 0 — URL fix** ✅ done
- **Phase 1 — Mobile in-app redesign** (~4-6 days + 2d for mini-map). Componentized rebuild of [app/profile/[id].tsx](app/profile/[id].tsx):
  - New: `components/profile/ProfileHero.tsx` (avatar + name + tagline + tier pill + wheel-slice pattern bg)
  - New: `components/profile/ProfileStatsTrio.tsx` (Cheeses / Countries / Avg ★ — drop Following count from public view)
  - New: `components/profile/TopShelfGrid.tsx` (4 highest-rated, 2-col, photo-dominant)
  - New: `components/profile/TasteFingerprint.tsx` (6-axis SVG radar chart driven by [constants/FlavorTags.ts](constants/FlavorTags.ts) → `TASTE_FINGERPRINT_AXES`)
  - New: `components/profile/PassportMap.tsx` (interactive SVG world-map)
  - New: `components/profile/FeaturedBadges.tsx` (max 4 badges)
  - New: `components/profile/InstallOrFollowCTA.tsx`
  - New: `lib/profile-service.ts` (single `fetchPublicProfile` call)
  - New SQL: `db/public-profile-rpc.sql` — `get_public_profile(p_user_id)` composing existing `get_user_taste_profile` + top-rated + country count + badges in one RPC
- **Phase 2 — Web OG image + meta** (~3-4 days). New Supabase edge function `supabase/functions/profile-og-image/` using Satori + resvg-js to render 1200×630 PNGs. Cloudflare Worker injects `og:*` tags on `/@*` routes so iMessage/WhatsApp/Twitter previews are rich. New column `profiles.profile_og_version` with trigger to bump on new top-4★ cheese log (cache invalidation).
- **Phase 3 — Web landing polish** (~2-3 days). Detect web, swap Follow → "Get Cheezus" CTA with App Store/Play badges. Sticky bottom install bar. Smart App Banner meta.

**Still open for v1:** private profile handling on web share link (padlock vs install CTA?), anonymous viewer content caps.

---

## Workstream 2: Share Artifacts

**Decisions locked:**
- Post-log card gated to **4★+ OR cheese with a written note (≥20 chars)** — avoids negativity surface + share fatigue
- Format: **9:16 stories-native default** (1080×1920), with 1:1 feed auto-crop variant (1080×1080)
- Tech: `react-native-view-shot` + offscreen React views (ships in days, reuses brand tokens)
- Copy: sharper variants for A/B — "Just rated a stunning {cheese}" / "New favorite unlocked" / "{cheese} — {rating}★. Worth it."
- Fix all missing analytics events ✅ done

**Phases:**
- **Phase 1 — Foundation + Post-log card** (~1 week, highest frequency surface first)
  - Install `react-native-view-shot`
  - New: `components/share-cards/ShareCardRenderer.tsx` (offscreen host + capture util)
  - New: `lib/shareCard.ts` — `generateAndShare(cardType, props)` public API
  - New: `components/share-cards/JustLoggedCard.tsx`
  - Gate logic in [app/add-cheese.tsx](app/add-cheese.tsx) on rating ≥ 4 OR note.length ≥ 20
  - Swap [components/SharePromptModal.tsx](components/SharePromptModal.tsx) to preview card, keep text fallback on capture error
  - New analytics events: `share_card_rendered`, `share_card_render_failed`, `share_card_image_shared` with `card_type` + `variant` property
- **Phase 2 — Milestone card** (~2-3 days). Card preview inside [components/MilestoneSharePrompt.tsx](components/MilestoneSharePrompt.tsx) for 5/10/25/50/100.
- **Phase 3 — Profile card** (~1 week). Reuses Phase 1 profile data work → top-3 cheese grid, stat strip, tagline. Replaces text-only current [components/ShareProfileCard.tsx](components/ShareProfileCard.tsx).
- **Phase 4 — Badge card + detail page refreshes** (~1 week). New share CTA on `app/badges.tsx` + badge-detail. Refreshed cheese/producer/article/event pages use card-based share.
- **Phase 5 — A/B + polish** (ongoing). Server-controlled variant assignment, stories-vs-feed toggle.

**Dependency:** Phase 3 (Profile card) reuses data from Workstream 1 Phase 1. Ship profile work first to de-risk share card.

---

## Workstream 3: Taste Quiz

**Decisions locked:**
- 8 questions, Tinder-style (tap a photo, autoadvance)
- Skippable with friction (text link, not button) — skip rate tracked
- Multi-selects capped at 3 (forces signal)
- Retake available from Settings
- **Result page is a shareable artifact** — "Your cheese taste: Adventurous Francophile with a blue streak" — ties into Workstream 2
- Flavor tag vocabulary curated to 10 (see [constants/FlavorTags.ts](constants/FlavorTags.ts)) — drops clinical terms, adds "Funky"
- Quality bar: licensed/commissioned photography (not stock), "Tuning your feed…" reveal animation, reward-feel result page

**Architectural finding (critical):** `get_user_taste_profile` is a function, not a table. Cold-start users literally get zero personalization today (recs branch skipped when profile NULL). **Separately — flavor tags are computed but never used in the recommendation WHERE clause. Quiz is the moment to finally wire them up.**

**Data model:**
- New table `user_taste_seed` (one row per user, upserted):
  ```
  user_id UUID PK REFERENCES auth.users(id)
  favorite_families TEXT[]
  favorite_types TEXT[]
  favorite_flavors TEXT[]      -- matches flavor_tags.name (curated 10)
  favorite_countries TEXT[]
  favorite_milk_types TEXT[]
  intensity_preference SMALLINT  -- -1, 0, +1
  adventurousness SMALLINT        -- 0, 1, 2
  skipped BOOLEAN DEFAULT false
  completed_at TIMESTAMPTZ
  version SMALLINT DEFAULT 1
  ```
- Add to `profiles`: `onboarding_quiz_completed_at TIMESTAMPTZ`
- Rewrite `get_user_taste_profile` RPC to `COALESCE` real history with seed (real wins as `cheese_count` grows)
- Extend `get_personalized_feed` WHERE to filter on `favorite_flavors` via `producer_cheese_flavor_tags`
- Add `adventurousness` modulation: high → boost washed-rind/blue; low → suppress
- Add `'seeded'` tier value between `'curious'` and `'explorer'`

**Quiz question set (8):**
1. "Pick your cheese board hero." — 4 photos (brie / cheddar / blue / aged gouda). Seeds `cheese_family`, `cheese_type_name`.
2. "Funky or fresh?" — Époisses vs burrata. Seeds family + `intensity_preference`.
3. "Soft or hard?" — Camembert vs Parmigiano.
4. "Which milks are you into? (pick any, max 3)" — Cow / Goat / Sheep / Buffalo.
5. "Which flavor pulls you in? (pick up to 3)" — chips from curated 10.
6. "Where should your feed wander? (pick any, max 3)" — France / Italy / UK / Spain / Switzerland / Netherlands / US / Anywhere.
7. "How adventurous?" — 3-choice: Keep it mellow / I'll try anything / Stinky please.
8. "Gouda or Manchego?" — Tiebreaker (aged Dutch cow vs firm Spanish sheep).

**Flow:**
- New users: post-signup email confirm → login → router guard routes to `/onboarding/quiz` (skippable)
- Existing users (cheese_count < 3): "Tune your feed in 60s" banner at top of feed, dismissable, re-appears every 7 days until engaged or user logs ≥5 cheeses
- Skip fallback: synthetic default profile from globally top-rated families/countries/milk types (materialized view `default_taste_profile`)

**Phases:**
- **Phase 1** — Data model (0.5d). `db/user-taste-seed-schema.sql`, extend `db/enhanced-feed-recommendations.sql`, migration.
- **Phase 2** — Quiz UI (~3d). New `app/onboarding/` route. Stateful single screen. Components: `QuestionPair`, `QuestionMulti`, `QuestionChips`, `QuizProgressBar`. Question definitions in `constants/QuizQuestions.ts` so designer edits don't touch logic. Bundled hero images at `assets/images/quiz/`.
- **Phase 3** — Signup wiring (~1d). Router guard in `app/_layout.tsx`, update `app/auth/callback.tsx` to route fresh signups to `/onboarding/quiz`.
- **Phase 4** — Existing-user banner (~0.5d).
- **Phase 5** — Result share artifact (fast-follow). Ties into Workstream 2 tech.

**Content blocking:** Q1-Q3, Q8 need hero cheese photography (~15-20 images). ~$200 stock budget, 2-3 weeks lead time if commissioning.

---

## Workstream 4 (Phase 2 — Deferred): Social Seeding

Parked for after Phase 1 lands. Full scoping plan captured in agent output. Headline:
- Contacts import (privacy-preserving SHA-256 hash matching, no raw contacts ever stored)
- Producer-as-followable (`follows.target_type` enum: `user` | `producer`)
- Curated creator list (`curated_seed_accounts` table, 40 hand-picked at launch across monger/writer/chef/team/press)
- Replaces stranger-suggestion modal with 3-stage flow

Prerequisites captured: needs phone capture at signup (also enables SMS verification).

---

## Recommended Sequencing (Phase 1)

**This week**
- ✅ Quick wins (URL fix, missing events, curated tags, tier ladder)
- Flavor tag curation baked into DB + constants
- Foundation SQL: `user_taste_seed` table, extended `get_user_taste_profile` RPC, `onboarding_quiz_completed_at` column

**Weeks 1-2**
- Profile redesign Phase 1 (mobile in-app) — biggest single share-conversion lever

**Weeks 2-3**
- Share artifact Phase 1 (post-log card)

**Weeks 3-4 (parallel tracks)**
- Taste quiz Phases 1-4 (eng)
- Hero photography sourcing (content ops)
- Profile redesign Phase 2 (web OG image)

**Weeks 4-5**
- Share artifact Phases 2-3 (milestone card + profile card — latter reuses profile work)
- Taste quiz Phase 5 (result share artifact)

**Weeks 5-6**
- Share artifact Phase 4 (badge + detail pages)
- Profile redesign Phase 3 (web landing polish)

**Total:** ~6 weeks end-to-end. Quick wins + foundation already shipped this session.

---

## Analytics Signals to Watch Post-Launch

From the scoping plans:
- **Activation:** quiz completion rate, quiz skip rate, D1 retention (quiz-completed vs skipped cohort)
- **Virality:** share_prompt_shown → share_card_rendered → share_card_image_shared funnel
- **Share destination quality:** profile_view rate from shared links → install_converted rate
- **Cold-start fix:** click-through rate on recommendations category for new cohort (should be non-zero post-quiz)
