# Cheezus — Growth Audit & Strategy to 100k

**Prepared as:** PM / growth review of the live product + codebase
**Date:** 29 May 2026
**Status today:** ~650 downloads, ~500 signups. Target: 100,000.
**Read this first:** You do not have a product problem. You have a *distribution* problem, and a specific one — you built a world-class **app** *and* a web companion (`cheezus-web`), but the web companion is a **client-rendered SPA that Google can't read.** For a cheese product, search is where most of the growth lives, and you're invisible in it.

> **Correction (29 May, after reviewing `cheezus-web`):** My first pass audited only the app repo and concluded "there is no web surface." That was wrong — there's a full content site + admin CMS + AI article generator on cheezus.co. The accurate finding is narrower and more encouraging: **the web surface exists but is SEO-invisible.** Sections 0, 2 and 5 below reflect the corrected view. The good news — most of the engine is already built; the missing piece is crawlability.

---

## 0. TL;DR — the one thing

> **Your own strategy says "the Cheezopedia IS the content" and "a Brie en Croûte recipe should rank on Google." You built the site, the CMS, and even an AI article generator to feed it — but it's a client-rendered SPA, so Google sees an empty shell on every page. You built the road and made it invisible.**

650 downloads with a **77% download→signup rate** (500/650) is not a leaky funnel — that conversion is *excellent*. It tells us the product converts the people who find it. The constraint is **almost nobody finds it.** That's top-of-funnel awareness, and the single highest-leverage fix is to **make your existing web content engine crawlable, and give every cheese its own page.**

The path to 100k, in priority order:

1. **Make the web engine crawlable + extend it** — server-render the public site, add a page per cheese (they're modals today), wire per-page meta + sitemap + JSON-LD, then batch-generate content. The compounding channel. *This is the 150x — and it's mostly already built.*
2. **Instrument and prove retention** *before* you pour traffic in — otherwise 100k downloads becomes 5k users.
3. **Own "cheese" in the App Store** (ASO), then localise the store listing for cheese-loving countries.
4. **Seed creators + activate your two cheat codes** (World Cheese Awards, cheesemongers).
5. **Then** localise the app properly, and **then** turn monetisation back on.

Everything below expands these, with metrics and a 90-day plan.

---

## 1. What you've actually built (credit where due)

This is a genuinely impressive, post-MVP product. Stack: React Native + Expo (SDK 54), Supabase, Mapbox, GPT-4o Vision label scanner, custom analytics. Highlights:

- **A real data moat in the making** — the hierarchical model (Cheese *Type* → *Producer* cheese) is the correct, hard-to-copy structure. 1,198 types + 1,192 producer cheeses = ~2,390 entries.
- **A sophisticated recommendation engine** — server-side taste profiles with *specific* reasons ("Because you love cheeses by Président"). Better than most Series-A consumer apps.
- **AI label scanning** — the Vivino-style scan-to-log that collapses logging friction. This is your activation weapon.
- **Excellent analytics instrumentation** — ~100 event types covering the full funnel. Most teams would kill for this.
- **You've shipped fast.** The March doc lists push notifications, the follow graph, onboarding, and sharing as "not yet done." They're all *in the code now*. That's strong velocity — we just need to point it at distribution instead of features.
- **You've also built the web companion** (`cheezus-web`): a content site on cheezus.co, a Yoast-style admin CMS, an **AI article generator** (GPT-4o-mini → Supabase), content-cheese linking, deep/universal links, a self-built newsletter system (Mailchimp replaced), and GA. The growth infrastructure is *largely built* — it's just not crawlable (see §5).

**Verdict:** product quality is not your problem. You've over-invested in product and under-invested in distribution and content. You have a Ferrari with no fuel and no roads.

---

## 2. The audit — plan vs. reality gaps

A good audit surfaces where the story and the truth have drifted. Three material gaps:

| Your strategy says… | The codebase / live reality is… | Implication |
|---|---|---|
| "The Cheezopedia IS the content"; content should rank on Google | **The web site exists (`cheezus-web`, React SPA on cheezus.co) but is SEO-invisible:** client-rendered (empty `index.html` shell on every route), hardcoded identical meta on all pages, no sitemap/robots/JSON-LD, and **cheeses are modals, not URLs** (zero rankable cheese pages). | Your stated #1 growth engine **is built but switched off to Google.** Fixing crawlability is the highest-leverage work in the whole business — and far smaller than building from scratch. |
| Freemium + B2B sponsorship model with revenue projections | **Premium was removed** (`cc9c50f`); there is **no monetisation live**. £0 model. | Correct call for this stage — but the plan and the product have diverged. Sequence it back in later (§9). |
| Database is "the most authoritative cheese database"; Cheezopedia full of articles/recipes/guides | 2,390 cheeses imported (good), but **no Cheezopedia article seeds in the repo** — only schema + functions. Pairings appear to be test data only. | "Cold content" — the risk *you yourself flagged* as high. Empty rooms in a beautiful museum. **Verify counts in Supabase.** |

None of this is failure — it's the normal state of a solo/small-team build that prioritised the app. But it tells you exactly where the next 6 months should go.

**Other notable gaps:** no automated tests; OpenAI key still flagged for client→Edge-Function migration before scale (do this before any traffic push — a leaked key at volume is a real bill); no retention dashboard despite great raw event data (you're flying with a black box where the cockpit instruments exist but aren't wired to a screen).

---

## 3. The core diagnosis — why you're at 650, not 65,000

Three reasons, in order of impact:

**A. No compounding acquisition channel.** Everything driving your 650 downloads is *spiky and manual* (personal channels, word of mouth). You have no channel that grows while you sleep. For a cheese app, that channel is **search** — and you're not in it.

**B. Cheese is a low-frequency passion.** People buy notable cheese weekly at most; they log maybe monthly. This is the defining constraint and it cuts two ways:
   - In-app virality alone *cannot* be your engine (low usage frequency = low share volume = K-factor below 1). It's an amplifier, not a motor.
   - You must give people **reasons to open between purchases** (content, pairings, "what do I do with this cheese", social feed) or retention collapses.

**C. You don't yet know your retention.** With ~500 users you have enough to measure D1/D7/D30, but there's no dashboard. **This is the most important number in the company right now** and you can't see it. If D30 is 5%, scaling to 100k downloads yields ~5k real users and you've burned your launch. If it's 25%+, you have a rocket. *Find out before you fuel it.*

---

## 4. How 100k actually happens (the model)

100k is very achievable in **12–18 months**, but only with the *compounding* channel built. Illustrative model (directional, not a forecast) showing where the volume comes from at maturity:

| Channel | Mechanism | Why it fits cheese | Realistic 12–18mo contribution |
|---|---|---|---|
| **Programmatic + editorial SEO (web)** | 3,000–5,000 indexable pages from your data + GPT | Cheese is one of the most-searched food topics on earth; near-zero app competition for it | **30–60k** (compounding, the backbone) |
| **ASO** (incl. localised) | Own "cheese app / tracker / pairing" | High-volume, low-competition keyword | 10–25k |
| **Creator seeding** | 30–50 cheese micro-influencers | Cheese TikTok/IG is real and engaged | 5–25k (spiky) |
| **WCA + cheesemonger QR** | In-context, high-intent | Your structural cheat codes | 5–15k |
| **PR** | "Vivino for cheese, built solo" | Ready-made narrative for food media | 2–10k (spiky) |
| **Share/viral loops** | Stat cards, board maker, quiz | Amplifies all of the above | ×1.1–1.3 multiplier |

**The point of this table:** without the web/SEO engine you're left with only spiky, manual channels — a permanent grind to 100k. *With* it, you build an asset that compounds. That's why §5 is priority #1.

---

## 5. PRIORITY #1 — Make the web content engine crawlable (then extend it)

This is the unlock — and you've already built most of it. `cheezus-web` has the content site, a Yoast-style admin CMS, an AI article generator (GPT-4o-mini → Supabase), content-cheese linking, and a newsletter system. You also own the two hardest ingredients: **structured data (2,390 cheeses)** and **an AI writer wired in.** The one missing thing is the one that matters most: **Google can read none of it**, because the site is a client-rendered SPA.

### 5.0 Fix crawlability first — the prerequisite for everything below
Today every route returns an empty `<div id="root"></div>` shell with identical hardcoded meta; no sitemap, no robots.txt, no structured data; and cheeses render as **modals with no URL.** Until this is fixed, generating content is pouring water into a pipe with no outlet. The fix:

- **Server-render / statically generate the public pages.** Recommended: move the *public* surface (home, `/discover`, per-article, and new per-cheese pages) to **Next.js with SSG + ISR**, reading the same Supabase. Keep the existing React-SPA admin CMS as-is — it needs no SEO. This matches your existing Next.js plan for the partner portal, preserves the CMS you built, and ships real HTML on every page. *(Faster stopgap if you don't want to migrate yet: `react-helmet-async` per-route meta + build-time prerender of known routes + a dynamic sitemap function. But for thousands of pages and a 100k goal, do it properly with Next.)*
- **Give every cheese a URL** (`/cheese/[slug]`) instead of a modal — 2,390 instantly-indexable pages from data you already have.
- **Per-page `<title>` / `<meta>` / Open Graph**, a **`sitemap.xml`** generated from Supabase, a **`robots.txt`**, and **JSON-LD** (`schema.org/Article` for Cheezopedia, a Product/Food schema for cheeses) for rich snippets.
- **Smart app banners** on every page (`apple-itunes-app` meta + Android equivalent) so mobile web visitors convert to installs.

With that in place, everything below actually ranks:

### 5.1 Programmatic SEO — thousands of pages from data you already own
For every cheese and pairing, auto-generate web pages on `cheezus.co` from templates + GPT, each targeting real search demand:

- `cheezus.co/cheese/[name]` — "What is Comté? Taste, origin, what to pair" (× ~2,390)
- `cheezus.co/pairing/[wine]-and-[cheese]` — "What wine goes with Manchego?"
- `cheezus.co/compare/[a]-vs-[b]` — "Brie vs Camembert" (huge evergreen volume)
- `cheezus.co/like/[name]` — "Cheeses like Gruyère" (powered by your taste-match engine — your recommendation logic literally becomes SEO content)
- `cheezus.co/serve/[name]` — "What to serve with a [cheese] board"

That's **5 templates × thousands of entities = 10,000+ indexable pages**, each ending in a soft CTA: *"Log and rate [cheese] — get the app."* This is exactly how Vivino, Zapier, and every data-rich consumer company grew. You are uniquely positioned because the data + AI already exist.

**Caveat to do it right:** Google penalises thin, mass-produced pages. Use your *real* community ratings, *real* metadata, and *real* taste-match results so each page is genuinely useful, not GPT filler. Quality bar per page, then scale.

### 5.2 Editorial Cheezopedia — fill the rooms
Seed **50–100 cornerstone articles** targeting head-term searches with real volume:
- "What does brie taste like / why does my brie smell of ammonia"
- "Best cheeses for a cheese board" / "How to build a cheese board"
- "Cheese and wine pairing guide for beginners"
- "Raw vs pasteurised", "What is PDO/AOC", milk-type guides, region guides

Each article links bi-directionally to cheese pages (you already built that linking) → every article is a discovery surface *and* an app on-ramp.

### 5.3 Two web "lead magnets" that double as viral loops
- **Cheese Board Generator (web, free)** — you already planned a Board Maker. Build the *web* version first as top-of-funnel: pick occasion + guests → curated board + shopping list + a **shareable image**. "Save your board → get the app." Inherently linkable and shareable.
- **"Find your palate" quiz** — a viral "what cheese are you / find your palate" quiz. Doubles as your onboarding taste-profile (which you need anyway) and as a share unit.

### 5.4 Make in-app moments shareable *as images*
Your share prompts currently share links. Links are weak social units; **images** are strong. Generate a beautiful **"Your Cheese Year / Palate Profile" card** (Spotify-Wrapped style) from the stats you already compute — countries, top flavours, the radar chart. That's what gets posted to stories.

**Stack note:** the blocker isn't the app's Expo web export — it's that `cheezus-web` is a **client-rendered SPA**, so Google gets an empty shell. Server-render the public surface (Next.js SSG/ISR) so content ships in the initial HTML. Your plan already specifies Next.js for the partner portal, so the muscle exists.

---

## 6. PRIORITY #2 — Retention before you scale

Pouring 100k into a bucket of unknown leakiness is the classic way to waste a launch. Before the acquisition push:

1. **Wire a retention dashboard** from your existing `analytics_events` (Supabase + a simple Metabase/Next dashboard, or pipe to PostHog/Amplitude free tier). You have the data; you just can't see it. Non-negotiable, week 1.
2. **Watch the "second log."** The single most predictive activation event in logging apps is the **2nd** entry, not the 1st. Measure % of signups who log ≥2 cheeses, and the time between. Drive it with the post-first-log nudge + a "you're 1 cheese from your first badge" hook.
3. **Engineer reasons to return** for a low-frequency app: weekly "new this week / near you" push, wishlist reminders, friend-activity notifications (built — make sure they fire), and the content surfaces from §5.
4. **Define your North Star around retained value, not vanity** (see §10).

**Rule:** don't spend a pound or an hour on paid acquisition until D30 retention is measured and you've moved the second-log rate. Get the bucket sealed, *then* fill it.

---

## 7. PRIORITY #3 — ASO + the acquisition channels you can start now

- **ASO:** Own the word "cheese." Title/subtitle, keyword field, and **screenshots that sell the outcome** ("Remember every cheese", "Know what to pair", "Scan any label"). This is free and you likely rank already with little competition. A/B test screenshots via store experiments.
- **Creators:** Seed 30–50 cheese micro-influencers (cheesemongers, food creators) with a personal ask + a vanity handle (`@`). Micro > macro for niche trust. Give them something to show: the scan, the palate card.
- **World Cheese Awards (your cheat code):** the most concentrated room of target users on earth. QR → cheese → producer page → download. Onboard top producers' showcase pages *before* the event so there's something to scan into.
- **Cheesemonger shelf-talkers:** "Log this cheese in Cheezus" cards at the counter. Zero cost, perfect context, high trust.
- **PR:** "The Vivino of cheese, built by one person, tied to the World Cheese Awards" is a clean food-media story. Pitch Decanter, Guardian Food, Delicious, Borough Market.
- **Paid:** *last.* Only once retention is known and a monetisation signal exists, run small tests to learn CAC. Don't buy installs into a £0-LTV, unmeasured-retention app.

---

## 8. Language / i18n — your specific question, sequenced

You're right that language is a big add — cheese's true heartland is **non-English** (France, Italy, Spain, Germany, Netherlands, Switzerland are the most cheese-literate nations alive). But the naive version (translate the UI) is the *least* valuable 20%. Do it in this order of ROI:

1. **Localised ASO first (cheap, do now).** Translate just the *App Store listing* (title, keywords, screenshots) into FR/IT/ES/DE. You can get download lift in those markets **without translating the app at all.** Run it as a cheap test to see which markets respond.
2. **Localised programmatic web content (high ROI).** Generate the §5 SEO pages in target languages with GPT. "Quel vin avec le Comté?" is searched constantly in France and you'd own it. This is the real prize — content localisation, not chrome localisation.
3. **App UI localisation (i18next) — once a market proves out.** Today, **zero i18n exists; all strings are hardcoded** (~3–5 weeks per language to externalise + translate ~500–1,000 strings across 35 screens). Worth it, but only for a market you've *already validated* via steps 1–2. Build the i18n scaffolding once; adding languages then becomes cheap.
4. **The hard part nobody mentions: localising the *cheese data*.** A French user judges you on whether French cheeses are rich and correct, not whether the buttons are French. Budget for data/content localisation per market — that's the moat, and it's where most "we localised!" apps fall down.

**Net:** yes to language — but as *localised ASO + localised content first*, full app translation second, and only for markets that prove out. Don't lead with UI translation.

---

## 9. Monetisation — when and how (not yet, but stay ready)

Removing premium at 500 users was the right call — monetising now would choke growth and the data's too thin. Sequence it back in:

- **Now → ~10k engaged users:** stay free. Optimise growth + retention only.
- **First revenue = B2B sponsored content** (your existing model). It taxes *brands*, not users, so it doesn't hurt growth — and your audience (food-literate, high-spend) is exactly who artisan brands want. The "always show generic alternatives" trust rule is genuinely smart; keep it. This can fund the growth engine.
- **Premium subscription later,** gated on *power-user* value (export, board maker, deep taste analytics, ad-free), once you have a population of power users to convert. High-WTP audience supports it — just not at this stage.

Monetisation is a *distraction from your actual constraint* (awareness) for now, except B2B sponsorship as a growth-funder.

---

## 10. How to measure it — the metrics that matter

You have superb event data and no scoreboard. Fix the scoreboard.

### North Star: **Monthly Active Loggers (MAL)**
Unique users who log ≥1 cheese in a trailing 30 days. *Why:* it fuses acquisition + activation + retention + the single valuable action (a log = both user value and a brick in your data moat). Vanity downloads don't move it; real engagement does.

### The funnel to instrument (AARRR), with targets to beat
| Stage | Metric | Where you are / target |
|---|---|---|
| Acquisition | Downloads by source (store search, web, QR, share) | Add source attribution; web should become #1 |
| Activation | **First log within 24h**; **second log within 7d** | Second log is the real activation — measure & optimise |
| Retention | **D1 / D7 / D30** of signups | *Unknown today — measure week 1.* Aim D30 ≥ 25% |
| Referral | K-factor; share→install; web→app conversion | Amplifier; expect <1, that's fine |
| Revenue | (later) B2B partners, then premium conversion | Not yet |

### Growth-efficiency metrics
Organic vs. paid mix, **web sessions → app downloads**, indexed-page count & ranking keywords, content-attributed installs, CAC (when paid starts).

### Guardrails
Notification opt-in rate, crash-free sessions, scan success rate, moderation/data-quality on user submissions.

**Do this week:** stand up one dashboard (Metabase on Supabase, or pipe events to PostHog free) showing MAL, the funnel, and D1/D7/D30. One screen. It will change every decision you make.

---

## 11. The 90-day plan

**Days 1–30 — See clearly & seal the bucket**
- [ ] Retention/funnel dashboard live (MAL, D1/D7/D30, second-log rate).
- [ ] Migrate OpenAI key to Edge Function (pre-scale safety).
- [ ] ASO overhaul (title, keywords, outcome-driven screenshots) + store A/B test.
- [ ] Ship the §5.4 shareable "Palate / Cheese Year" image card.
- [ ] **Crawlability fix kickoff** (highest-leverage item here): SSR/SSG the public `cheezus-web` surface (Next.js), add per-cheese URLs, per-page meta + sitemap + robots + JSON-LD, smart app banners.

**Days 31–60 — Build the engine**
- [ ] Launch programmatic SEO v1: 2 templates (cheese page, pairing page) across all cheeses, quality-gated, sitemap submitted.
- [ ] Batch-run your existing AI article generator → publish 20–50 cornerstone Cheezopedia articles (now crawlable), each with cheese links + app CTA.
- [ ] Ship the web Cheese Board Generator (lead magnet + share loop).
- [ ] Optimise the second-log: nudge + first-badge hook; measure the lift.

**Days 61–90 — Pour fuel**
- [ ] Programmatic SEO v2: add compare/like/serve templates; localised ASO for 2 test markets (FR + IT).
- [ ] Creator seeding: 30 cheese micro-influencers with vanity handles.
- [ ] PR push + WCA producer onboarding pipeline for the autumn event.
- [ ] Review the scoreboard: is web becoming the #1 source? Is D30 ≥ 25%? Let the data pick where the next quarter's effort goes.

---

## 12. What I would NOT do right now

- **Don't build more app features** (Board Maker AR, photo-to-type ML, etc.). Feature-building is the comfortable trap when the real gap is distribution. Resist it.
- **Don't turn monetisation on** at this scale (except groundwork for B2B).
- **Don't fully translate the app** before validating a market with cheap localised ASO + content.
- **Don't buy paid installs** before retention is measured and a monetisation signal exists.
- **Don't mass-publish thin AI pages** — Google will punish it. Quality bar per page, *then* scale.

---

## 13. The bottom line

You've already done the hard, rare thing: built a genuinely good, data-rich, well-architected product in a category with real passion and **no dominant player.** That's the part most people can't do. What's left is the part most builders neglect: **distribution.**

The 150x isn't hiding in a new feature. It's in turning the cheese data and AI you already own into a **compounding web/content engine**, **sealing the retention bucket** before you fill it, and **owning search and the store** in the world's most cheese-loving markets. Do that, and 100k is a *when*, not an *if*.

*The cheeses are already in the database. The job now is making sure the world can find them — starting with Google.*
