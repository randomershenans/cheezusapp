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

  // No stated preferences at all (every question skipped): fall back to anything
  // presentable rather than showing an empty screen.
  if (!queries.length) {
    queries.push(
      supabase.from('producer_cheeses').select(SELECT)
        .not('image_url', 'is', null).limit(perQuery) as any
    );
  }

  let rows: Row[] = [];
  try {
    const results = await Promise.all(queries.map((q) => q.catch(() => ({ data: null }))));
    results.forEach((r) => {
      if (r?.data) rows = rows.concat(r.data);
    });
  } catch (err) {
    console.warn('[onboarding] suggestion query failed:', err);
    return [];
  }

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
    const isGeneric = (row.producer_name || '').trim().toLowerCase() === 'generic';
    const displayName = isGeneric
      ? row.product_name || row.full_name || 'Unnamed cheese'
      : row.full_name || row.product_name || 'Unnamed cheese';

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

  return Array.from(byId.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
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
