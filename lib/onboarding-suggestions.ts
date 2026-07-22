/**
 * Turns the onboarding taste quiz answers into concrete cheeses the user can log or
 * wishlist in one tap.
 *
 * WHY THIS EXISTS: 284 of 651 profiles have never logged a single cheese. Dropping a new
 * user into a search box and hoping they think of something is the friction that produces
 * that number. They have just told us they like washed rind, France and goat's milk -
 * showing them four real cheeses matching that is a one-tap action instead of a recall
 * task.
 */
import { supabase } from './supabase';
import type { QuizAnswers } from './taste-seed-service';

export type SuggestedCheese = {
  id: string;
  name: string;
  producerName: string | null;
  imageUrl: string | null;
  originCountry: string | null;
  family: string | null;
  milkType: string | null;
  /** How many of the user's stated preferences this matched. Used for ordering. */
  score: number;
};

const SELECT =
  'id, full_name, product_name, producer_name, image_url, origin_country, family, milk_type';

/** Quiz offers this when the user has no country preference; it is not a real country. */
const ANY_COUNTRY = 'ANYWHERE';

/**
 * Quiz answer values do NOT equal the values stored in producer_cheeses, and the stored
 * data is not clean. Verified against all 1,515 rows that have an image:
 *
 *   quiz 'Soft Bloomy' -> stored 'Bloomy Rind' (278 rows). Exact match: 0 rows.
 *   quiz 'Fresh'       -> stored 'Fresh Cheese' (44), 'Fresh Goat Cheese' (12), 'Fresh' (11)
 *   quiz 'UK'          -> stored 'England', 'United Kingdom', 'Scotland', 'Wales', and
 *                         comma-joined values like 'England, Great Britain, United Kingdom'
 *   quiz 'US'          -> stored 'United States' (303), 'USA' (29), 'USA ' (trailing space)
 *   quiz 'Cow'         -> stored lowercase 'cow' (844). Only 6 rows are 'Cow'.
 *   milk_type also holds multi-values: 'cow, goat', 'cow, goat, sheep'.
 *
 * So matching is done with case-insensitive SUBSTRING patterns rather than equality,
 * which handles the case variants, the trailing whitespace and the comma-joined lists in
 * one go. Patterns are deliberately single words - they are interpolated into a PostgREST
 * or() filter, where a comma would be read as a separator.
 */
const FAMILY_PATTERNS: Record<string, string[]> = {
  'Soft Bloomy': ['bloomy', 'soft cheese'],
  Hard: ['hard', 'cheddar', 'alpine', 'pecorino'],
  Fresh: ['fresh'],
  Blue: ['blue'],
  'Washed Rind': ['washed'],
};

const COUNTRY_PATTERNS: Record<string, string[]> = {
  UK: ['united kingdom', 'england', 'scotland', 'wales', 'britain'],
  US: ['united states', 'usa'],
  France: ['france'],
  Italy: ['italy'],
  Spain: ['spain'],
  Netherlands: ['netherlands'],
  Switzerland: ['switzerland'],
};

const MILK_PATTERNS: Record<string, string[]> = {
  Cow: ['cow'],
  Goat: ['goat'],
  Sheep: ['sheep'],
  Buffalo: ['buffalo'],
};

/**
 * Cheeses a normal person has actually eaten.
 *
 * Taste matching on its own surfaced things like Podhalanski, Lebbene and
 * Blaenafon Pwll Ddu. They are real cheeses and they genuinely match "hard,
 * sheep, Spain", but nobody has tried them, so the whole step gets skipped and
 * the user logs nothing. The point of step 3 is a first log, not a good
 * recommendation.
 *
 * The list is drawn from what people actually do, not from taste: the
 * most-logged rows in cheese_box_entries (Manchego 47, Brie 40, Gruyere 26,
 * Burrata 24, smoked Gouda 22, Morbier 21) and the most-searched terms in
 * analytics (gouda, comte, brie, manchego, cheddar, mozzarella, parmesan).
 *
 * Matched as a case-insensitive substring so "Sharp Cheddar" and "Mature
 * Cheddar" both count, which exact matching would miss.
 */
const HOUSEHOLD_NAMES = [
  'cheddar', 'brie', 'camembert', 'gouda', 'edam', 'manchego', 'comte', 'comté',
  'gruyere', 'gruyère', 'emmental', 'mozzarella', 'burrata', 'parmesan',
  'parmigiano', 'pecorino', 'feta', 'halloumi', 'ricotta', 'mascarpone',
  'gorgonzola', 'roquefort', 'stilton', 'wensleydale', 'red leicester',
  'double gloucester', 'monterey jack', 'provolone', 'taleggio', 'reblochon',
  'munster', 'raclette', 'havarti', 'jarlsberg', 'morbier', 'mimolette',
  'port-salut', 'saint nectaire', 'fourme', 'epoisses', 'beaufort', 'brillat',
  'cottage cheese', 'cream cheese', 'paneer', 'queso fresco', 'boursin',
  'colby', 'asiago', 'gruyere aop', 'cotija', 'mahon', 'gubbeen',
];

/**
 * Does this read as the plain version of a famous cheese, or as an artisan
 * variation on one?
 *
 * A bare "contains" test is not enough, and testing it proved that: "Caseificio
 * Pinzani Srl Pecorino Nero" and "Romaniae Terrae Pecorino Gran Riserva Del
 * Passatore" both contain "pecorino" and both scored top, which is exactly the
 * left-field result this is meant to stop. Nobody has eaten those. They have
 * eaten Pecorino Romano.
 *
 * So the name has to either START with the famous word, or be short enough
 * that the famous word is clearly the whole point of it. "Smoked Gouda" and
 * "Pecorino Romano" pass. A four-word producer name with a cheese buried in
 * the middle does not.
 */
const householdBoost = (displayName: string): number => {
  const lower = displayName.toLowerCase();
  const match = HOUSEHOLD_NAMES.find((h) => lower.includes(h));
  if (!match) return 0;
  if (lower.startsWith(match)) return 4;
  return displayName.length <= 20 ? 4 : 0;
};

/** Expand quiz answers into the DB patterns that actually match them. */
function patternsFor(values: string[], table: Record<string, string[]>): string[] {
  const out = new Set<string>();
  values.forEach((v) => {
    const mapped = table[v];
    if (mapped) mapped.forEach((p) => out.add(p));
    // Unmapped value (a new quiz option added later): fall back to the value itself
    // lowercased, so it degrades to a reasonable guess rather than silently matching
    // nothing.
    else if (!v.includes(',')) out.add(v.toLowerCase());
  });
  return Array.from(out);
}

/** Build a PostgREST or() filter of case-insensitive substring matches on one column. */
function ilikeOr(column: string, patterns: string[]): string {
  return patterns.map((p) => `${column}.ilike.%${p}%`).join(',');
}

type Row = {
  id: string;
  full_name: string | null;
  product_name: string | null;
  producer_name: string | null;
  image_url: string | null;
  origin_country: string | null;
  family: string | null;
  milk_type: string | null;
};

function clean(values?: string[]): string[] {
  if (!Array.isArray(values)) return [];
  return values.filter((v) => typeof v === 'string' && v && v !== ANY_COUNTRY);
}

/**
 * Fetch suggestions matching the user's taste answers.
 *
 * Runs one small query per matched attribute and merges client-side, rather than one
 * combined PostgREST `.or()` filter. The taste values include entries with spaces
 * ("Soft Bloomy", "Washed Rind"), which need manual quoting inside an `or()` string and
 * are a common source of silent zero-result queries. `.in()` is escaped by the client.
 *
 * Never throws - onboarding must not dead-end on a failed query. Returns [] and lets the
 * caller fall back to search.
 */
export async function getOnboardingSuggestions(
  answers: QuizAnswers,
  opts?: { limit?: number; excludeCheeseIds?: string[] }
): Promise<SuggestedCheese[]> {
  const limit = opts?.limit ?? 6;
  const exclude = new Set(opts?.excludeCheeseIds ?? []);

  const families = clean(answers?.favoriteFamilies);
  const countries = clean(answers?.favoriteCountries);
  const milks = clean(answers?.favoriteMilkTypes);

  const familyPatterns = patternsFor(families, FAMILY_PATTERNS);
  const countryPatterns = patternsFor(countries, COUNTRY_PATTERNS);
  const milkPatterns = patternsFor(milks, MILK_PATTERNS);

  // Pull a candidate pool per attribute. Over-fetch so scoring has something to rank;
  // image_url is required because a picker of grey placeholders converts badly.
  const perQuery = 25;
  const queries: Array<Promise<{ data: Row[] | null }>> = [];

  if (familyPatterns.length) {
    queries.push(
      supabase.from('producer_cheeses').select(SELECT)
        .or(ilikeOr('family', familyPatterns))
        .not('image_url', 'is', null).limit(perQuery) as any
    );
  }
  if (countryPatterns.length) {
    queries.push(
      supabase.from('producer_cheeses').select(SELECT)
        .or(ilikeOr('origin_country', countryPatterns))
        .not('image_url', 'is', null).limit(perQuery) as any
    );
  }
  if (milkPatterns.length) {
    queries.push(
      supabase.from('producer_cheeses').select(SELECT)
        .or(ilikeOr('milk_type', milkPatterns))
        .not('image_url', 'is', null).limit(perQuery) as any
    );
  }

  /**
   * The household pool, fetched ALWAYS and regardless of taste answers.
   *
   * Pulled as "every Generic row with a picture" and filtered to known names in
   * JS rather than with an or() of 50 ilike patterns. The generic producer is
   * where the plain versions of famous cheeses live ("Generic Manchego"), the
   * payload is a few hundred small rows, and doing the name matching locally
   * avoids the PostgREST quoting traps that this file has been bitten by
   * before: a comma or a space inside an or() pattern silently matches nothing.
   */
  queries.push(
    supabase.from('producer_cheeses').select(SELECT)
      .eq('producer_name', 'Generic')
      .not('product_name', 'is', null)
      .not('image_url', 'is', null)
      .limit(500) as any
  );

  // No stated preferences at all (every question skipped): fall back to anything
  // presentable rather than showing an empty screen.
  if (queries.length === 1) {
    queries.push(
      supabase.from('producer_cheeses').select(SELECT)
        .not('image_url', 'is', null).limit(perQuery) as any
    );
  }

  let rows: Row[] = [];
  // Supabase query builders are THENABLE but are not Promises: they implement
  // .then() and nothing else. Calling .catch() on one throws
  // "x.catch is not a function", which the outer try/catch then swallowed,
  // making this function silently return [] on every single call. Wrapping in
  // Promise.resolve() turns each builder into a real promise that .catch()
  // exists on. Do not "simplify" this back.
  const results = await Promise.all(
    queries.map((q) =>
      Promise.resolve(q).catch((err) => {
        console.warn('[onboarding] one suggestion query failed:', err);
        return { data: null } as { data: Row[] | null };
      })
    )
  );
  results.forEach((r) => {
    if (r?.data) rows = rows.concat(r.data);
  });

  // Dedupe by id, scoring each cheese by how many stated preferences it satisfies so the
  // strongest matches surface first.
  const byId = new Map<string, SuggestedCheese>();
  for (const row of rows) {
    if (!row?.id || exclude.has(row.id)) continue;
    if (byId.has(row.id)) continue;

    // Score with the same case-insensitive substring rule used to fetch, so a row that
    // matched on one attribute is still credited for the others. Equality would score
    // almost everything 0 given the stored values ('Bloomy Rind' vs 'Soft Bloomy').
    const hit = (value: string | null, patterns: string[]) =>
      !!value && patterns.some((p) => value.toLowerCase().includes(p));

    let score = 0;
    if (hit(row.family, familyPatterns)) score += 1;
    if (hit(row.origin_country, countryPatterns)) score += 1;
    if (hit(row.milk_type, milkPatterns)) score += 1;

    // Many catalogue rows carry the literal producer_name "Generic", which makes
    // full_name read as "Generic Saint Nectaire". Show the cheese on its own in that
    // case, and suppress the producer line entirely.
    //
    // Falling back to full_name is not enough: when product_name is also null the
    // result was the bare word "Generic" as the cheese's name. So strip the prefix
    // off full_name, and drop any row that still has nothing real left to show.
    const isGeneric = (row.producer_name || '').trim().toLowerCase() === 'generic';
    const stripped = (row.full_name || '').replace(/^\s*generic\s+/i, '').trim();
    const displayName = isGeneric
      ? row.product_name?.trim() || stripped
      : row.full_name?.trim() || row.product_name?.trim() || '';

    // A suggestion tile with no readable name is worse than one fewer tile.
    if (!displayName || displayName.toLowerCase() === 'generic') continue;

    /**
     * Recognition outweighs taste match, deliberately and by a wide margin.
     *
     * A perfect three-way taste match on a cheese nobody has heard of is worth
     * less here than a plain Cheddar, because this screen is scored on whether
     * a first cheese gets logged at all, not on how good the recommendation
     * was. Worth 4 so it always beats a full house of taste matches, while
     * taste still orders the household names among themselves.
     *
     * Scored on the DISPLAY name, after the "Generic " prefix is stripped, so
     * it judges the thing the user actually reads on the tile.
     */
    score += householdBoost(displayName);

    byId.set(row.id, {
      id: row.id,
      name: displayName,
      producerName: isGeneric ? null : row.producer_name,
      imageUrl: row.image_url,
      originCountry: row.origin_country,
      family: row.family,
      milkType: row.milk_type,
      score,
    });
  }

  /**
   * Spread the picks, do not just take the top six.
   *
   * Scoring alone returned Manchego followed by five different Pecorinos for
   * "hard, Spain, sheep", and three Camemberts and two Bries for the French
   * bloomy answers. Every one is recognisable, which was the fix above working,
   * but as a grid it reads as one cheese repeated and gives someone who does
   * not like that cheese nothing at all to tap.
   *
   * Two per family of name, taken in score order, so the strongest of each
   * still leads. Anything left over backfills at the end rather than shrinking
   * the grid, since a short grid is worse than a slightly repetitive one.
   */
  const ranked = Array.from(byId.values()).sort((a, b) => b.score - a.score);

  const groupOf = (name: string): string => {
    const lower = name.toLowerCase();
    return HOUSEHOLD_NAMES.find((h) => lower.includes(h)) ?? lower;
  };

  const picked: SuggestedCheese[] = [];
  const spare: SuggestedCheese[] = [];
  const perGroup = new Map<string, number>();
  for (const c of ranked) {
    const g = groupOf(c.name);
    const n = perGroup.get(g) ?? 0;
    if (n >= 2) {
      spare.push(c);
      continue;
    }
    perGroup.set(g, n + 1);
    picked.push(c);
    if (picked.length >= limit) break;
  }

  return picked.concat(spare).slice(0, limit);
}

/**
 * Log a cheese to the user's cheese box.
 *
 * Deliberately the two-column minimum. rating and notes are nullable and every existing
 * call site already writes null for them; asking a brand-new user to rate something they
 * may not have eaten yet is exactly the friction this step exists to remove.
 *
 * Flat result shape rather than a discriminated union - this project compiles with
 * `strict` unset, so unions do not narrow on a boolean.
 */
/**
 * Free-text search for the onboarding picker.
 *
 * Suggestions can only ever be a guess at what someone has eaten. This is the
 * escape hatch for the person who is standing there thinking "I had a Comte
 * last week" and cannot see it on the grid. Without it the only options are
 * pick something you have not tried, or skip, and skipping is what produces
 * the 286 accounts that never log anything.
 *
 * Deliberately narrower than the main app search: name only, has an image, and
 * capped small. This is a nudge to log one thing, not a browsing surface.
 *
 * Never throws, for the same reason getOnboardingSuggestions does not.
 */
export async function searchCheesesForOnboarding(
  query: string,
  opts?: { limit?: number; excludeCheeseIds?: string[] }
): Promise<SuggestedCheese[]> {
  const term = query.trim();
  if (term.length < 2) return [];

  const exclude = new Set(opts?.excludeCheeseIds ?? []);
  // A comma would be read as a separator inside the or() filter below, and a
  // percent would widen the match to everything.
  const safe = term.replace(/[,%()]/g, ' ').trim();
  if (!safe) return [];

  let rows: Row[] = [];
  try {
    const q = supabase
      .from('producer_cheeses')
      .select(SELECT)
      .or(`product_name.ilike.%${safe}%,full_name.ilike.%${safe}%`)
      .not('image_url', 'is', null)
      .limit(24);
    const res = await Promise.resolve(q as any).catch((err: unknown) => {
      console.warn('[onboarding] search failed:', err);
      return { data: null } as { data: Row[] | null };
    });
    if (res?.data) rows = res.data;
  } catch (err) {
    console.warn('[onboarding] search threw:', err);
    return [];
  }

  const out: SuggestedCheese[] = [];
  for (const row of rows) {
    if (!row?.id || exclude.has(row.id)) continue;

    const isGeneric = (row.producer_name || '').trim().toLowerCase() === 'generic';
    const stripped = (row.full_name || '').replace(/^\s*generic\s+/i, '').trim();
    const displayName = isGeneric
      ? row.product_name?.trim() || stripped
      : row.full_name?.trim() || row.product_name?.trim() || '';
    if (!displayName || displayName.toLowerCase() === 'generic') continue;

    out.push({
      id: row.id,
      name: displayName,
      producerName: isGeneric ? null : row.producer_name,
      imageUrl: row.image_url,
      originCountry: row.origin_country,
      family: row.family,
      milkType: row.milk_type,
      // Exact-ish matches first: someone typing "brie" wants Brie, not
      // Brillat-Savarin, and ilike gives no ordering of its own.
      score: displayName.toLowerCase().startsWith(safe.toLowerCase()) ? 1 : 0,
    });
  }

  return out.sort((a, b) => b.score - a.score).slice(0, opts?.limit ?? 12);
}

export async function logCheeseToBox(
  userId: string,
  cheeseId: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('cheese_box_entries')
    .insert({ user_id: userId, cheese_id: cheeseId });

  if (error) {
    console.warn('[onboarding] cheese_box_entries insert failed:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/**
 * Add a cheese to the user's wishlist.
 *
 * NOTE the table is `wishlists`, plural. app/add-cheese.tsx used the singular form for
 * months against a relation that does not exist, so every "Add to Wishlist" from that
 * screen failed. Do not copy that spelling.
 */
export async function addCheeseToWishlist(
  userId: string,
  cheeseId: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('wishlists')
    .insert({ user_id: userId, cheese_id: cheeseId });

  if (error) {
    console.warn('[onboarding] wishlists insert failed:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
