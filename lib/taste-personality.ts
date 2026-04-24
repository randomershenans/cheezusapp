/**
 * Rule-based personality tagline generator.
 *
 * Pure function — no AI, no network. Maps a completed set of quiz answers
 * to a short shareable tagline shown on the result screen.
 *
 * Rules are ordered from most specific to least — first match wins. Fallbacks
 * at the bottom catch sparse answer sets.
 *
 * Examples:
 *   adventurousness=2 + flavor Funky + country France  → "Adventurous Francophile with a blue streak"
 *   adventurousness=0 + milk Cow + country UK          → "Traditionalist, comforted by an English cheddar"
 *   milk Goat + flavor Funky                            → "Goat whisperer, funky side"
 */

import type { QuizAnswers } from './taste-seed-service';

const has = <T>(arr: T[] | undefined, v: T) => !!arr && arr.includes(v);
const any = <T>(arr: T[] | undefined, vs: T[]) => !!arr && arr.some((x) => vs.includes(x));
const count = <T>(arr: T[] | undefined): number => (arr ? arr.length : 0);

export function derivePersonalityTagline(answers: QuizAnswers): string {
  const {
    favoriteFlavors,
    favoriteCountries,
    favoriteMilkTypes,
    favoriteFamilies,
    favoriteTypes,
    intensityPreference,
    adventurousness,
  } = answers;

  const flavorCount    = count(favoriteFlavors);
  const countryCount   = count(favoriteCountries?.filter((c) => c !== 'ANYWHERE'));
  const milkCount      = count(favoriteMilkTypes);

  // ── Tier 1: high-specificity combos ──────────────────────────────────────
  if (adventurousness === 2 && any(favoriteFamilies, ['Blue', 'Washed Rind']) && has(favoriteCountries, 'France')) {
    return 'Adventurous Francophile with a blue streak';
  }

  if (adventurousness === 2 && has(favoriteFlavors, 'Funky') && has(favoriteMilkTypes, 'Sheep')) {
    return 'Funk chaser, sheep-milk devotee';
  }

  if (adventurousness === 0 && has(favoriteMilkTypes, 'Cow') && has(favoriteCountries, 'UK')) {
    return 'Traditionalist, comforted by an English cheddar';
  }

  if (adventurousness === 0 && any(favoriteFlavors, ['Creamy', 'Sweet']) && has(favoriteMilkTypes, 'Cow')) {
    return 'Gentle palate, raised on cream and honey';
  }

  if (has(favoriteMilkTypes, 'Goat') && has(favoriteFlavors, 'Funky')) {
    return 'Goat whisperer, funky side';
  }

  if (has(favoriteMilkTypes, 'Buffalo') && has(favoriteCountries, 'Italy')) {
    return 'Buffalo-milk Italophile';
  }

  if (has(favoriteCountries, 'France') && any(favoriteFamilies, ['Soft Bloomy', 'Washed Rind'])) {
    return 'Francophile with soft-ripened tendencies';
  }

  if (has(favoriteCountries, 'Spain') && has(favoriteMilkTypes, 'Sheep')) {
    return 'Spanish sheep-milk romantic';
  }

  if (has(favoriteCountries, 'Italy') && any(favoriteFamilies, ['Hard', 'Fresh'])) {
    return 'Italy-leaning, all ends of the spectrum';
  }

  if (has(favoriteCountries, 'Netherlands') && any(favoriteTypes, ['Gouda'])) {
    return 'Aged-Dutch devotee';
  }

  if (has(favoriteCountries, 'Switzerland') && any(favoriteFlavors, ['Nutty', 'Earthy'])) {
    return 'Alpine purist with a nutty streak';
  }

  // ── Tier 2: style profiles ───────────────────────────────────────────────
  if (intensityPreference === 1 && adventurousness === 2) {
    return 'Cheese thrill-seeker — the stinkier the better';
  }

  if (intensityPreference === -1 && adventurousness === 0) {
    return 'Fresh and gentle — cheese as comfort';
  }

  if (countryCount >= 3 && flavorCount >= 3) {
    return 'Eclectic palate, widely traveled';
  }

  if (milkCount >= 3) {
    return 'Milk-curious — dabbling across the barn';
  }

  if (flavorCount >= 2 && has(favoriteFlavors, 'Funky')) {
    return 'Funk-forward with range';
  }

  if (has(favoriteFlavors, 'Creamy') && has(favoriteFlavors, 'Nutty')) {
    return 'Creamy-nutty classicist';
  }

  if (has(favoriteFlavors, 'Sharp') && has(favoriteFlavors, 'Tangy')) {
    return 'Sharp-and-tangy type — bring on the cheddar';
  }

  // ── Tier 3: adventurousness fallbacks ────────────────────────────────────
  if (adventurousness === 2) return 'Stinky cheese enthusiast';
  if (adventurousness === 1) return 'Cheese explorer, up for anything';
  if (adventurousness === 0) return 'Gentle palate, crowd-pleasers first';

  // ── Final fallback ───────────────────────────────────────────────────────
  return 'Cheese curious';
}
