/**
 * Cheezus tier ladder — progression labels shown on the profile hero pill.
 *
 * Thresholds are measured in `cheese_box_entries.count` (cheeses logged).
 * Progresses from approachable English into real French cheesemonger
 * craft terminology — "Affineur" and "Maître Fromager" are legitimate
 * titles, not gamified nonsense.
 *
 * The RPC `get_user_taste_profile` returns the slug; the UI maps via
 * TIER_LABELS to the display string.
 */

export type TierSlug =
  | 'curious'
  | 'explorer'
  | 'connoisseur'
  | 'affineur'
  | 'maitre_fromager';

export type Tier = {
  slug: TierSlug;
  label: string;
  minCheeses: number;
  tagline: string;
};

export const TIERS: readonly Tier[] = [
  {
    slug: 'curious',
    label: 'Curious Palate',
    minCheeses: 0,
    tagline: 'Just starting the journey',
  },
  {
    slug: 'explorer',
    label: 'Cheese Explorer',
    minCheeses: 3,
    tagline: 'Finding your taste',
  },
  {
    slug: 'connoisseur',
    label: 'Connoisseur',
    minCheeses: 10,
    tagline: 'You know what you like',
  },
  {
    slug: 'affineur',
    label: 'Affineur',
    minCheeses: 25,
    tagline: 'Deep craft knowledge',
  },
  {
    slug: 'maitre_fromager',
    label: 'Maître Fromager',
    minCheeses: 75,
    tagline: 'Hall of Fame',
  },
] as const;

export const TIER_LABELS: Record<TierSlug, string> = TIERS.reduce(
  (acc, t) => ({ ...acc, [t.slug]: t.label }),
  {} as Record<TierSlug, string>
);

export function tierFromCheeseCount(count: number): Tier {
  let current = TIERS[0];
  for (const tier of TIERS) {
    if (count >= tier.minCheeses) current = tier;
  }
  return current;
}
