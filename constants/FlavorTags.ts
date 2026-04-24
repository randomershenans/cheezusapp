/**
 * Curated flavor tag shortlist for consumer-facing surfaces
 * (taste quiz, profile taste fingerprint, cheese detail tags).
 *
 * The full `flavor_tags` table has 25 entries including clinical terms
 * like "Barnyardy" and "Yeasty". This shortlist is the consumer-friendly
 * 10 that users actually see. The full set stays in the DB for detailed
 * producer-cheese metadata.
 *
 * "Funky" is a NEW tag added to the DB seed — it's the defining word for
 * cheese people and replaces clinical "Pungent" on consumer surfaces.
 */

export type FlavorTag = {
  name: string;
  description: string;
  emoji: string;
};

export const CURATED_FLAVOR_TAGS: readonly FlavorTag[] = [
  { name: 'Creamy',  description: 'Rich, smooth, butter-like',            emoji: '🥛' },
  { name: 'Nutty',   description: 'Almond, hazelnut, walnut',             emoji: '🌰' },
  { name: 'Sharp',   description: 'Strong, tangy, intense',               emoji: '⚡' },
  { name: 'Tangy',   description: 'Acidic, tart, zesty',                  emoji: '🍋' },
  { name: 'Earthy',  description: 'Mushroom, cave-aged, terroir',         emoji: '🌿' },
  { name: 'Sweet',   description: 'Natural sweetness, caramel notes',     emoji: '🍯' },
  { name: 'Smoky',   description: 'Smoke or wood-fired',                  emoji: '🔥' },
  { name: 'Funky',   description: 'Bold, barnyard, washed-rind character', emoji: '🧀' },
  { name: 'Savory',  description: 'Umami, meaty depth',                   emoji: '🍖' },
  { name: 'Fruity',  description: 'Apple, pear, fresh fruit notes',       emoji: '🍎' },
] as const;

export const CURATED_FLAVOR_TAG_NAMES = CURATED_FLAVOR_TAGS.map((t) => t.name);

/**
 * The 6 axes of the profile Taste Fingerprint radar chart.
 * Chosen for maximum visual distinction across user profiles.
 */
export const TASTE_FINGERPRINT_AXES = [
  'Creamy',
  'Nutty',
  'Sharp',
  'Earthy',
  'Funky',
  'Sweet',
] as const;
