/**
 * Shared constants, types, and helpers for share-card components.
 *
 * Each card is laid out on a 1080x1920 canvas (9:16 stories-native).
 * Inline styles only — the canvas is rendered offscreen and captured
 * via `react-native-view-shot`, so tokens can't rely on runtime theme.
 */

export const STORIES_WIDTH = 1080;
export const STORIES_HEIGHT = 1920;
export const FEED_WIDTH = 1080;
export const FEED_HEIGHT = 1080;

export const BRAND = {
  cream: '#FFFEF7',
  creamDeep: '#FBF4DD',
  gold: '#FCD95B',
  goldDeep: '#EAB308',
  text: '#2C3E50',
  textSubtle: '#7F8C8D',
  ink: '#1F2937',
  waxPaper: '#F5EFD7',
  border: 'rgba(44,62,80,0.08)',
};

export const FONTS = {
  display: 'SpaceGrotesk-Bold',
  displayMedium: 'SpaceGrotesk-SemiBold',
  body: 'Inter-Regular',
  bodyMedium: 'Inter-Medium',
  bodySemiBold: 'Inter-SemiBold',
  bodyBold: 'Inter-Bold',
};

/**
 * Simple deterministic string hash (djb2-ish). Used to pick a copy variant
 * stably per user + card, so the same user sees the same variant per card
 * type across renders (allowing A/B measurement later).
 */
export function hashString(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  return h >>> 0; // unsigned
}

export function pickVariant<T>(seed: string, variants: readonly T[]): T {
  if (variants.length === 0) throw new Error('pickVariant: empty variants');
  const idx = hashString(seed) % variants.length;
  return variants[idx];
}

/** Truncate to N chars, trimming trailing punctuation and adding an ellipsis. */
export function truncate(text: string, max: number): string {
  if (!text) return '';
  if (text.length <= max) return text;
  return text.slice(0, max - 1).replace(/[\s,;:]+$/, '') + '…';
}

/** Extract the first sentence from a note (up to `.!?`), capped at `max` chars. */
export function firstSentence(text: string | null | undefined, max = 80): string {
  if (!text) return '';
  const trimmed = text.trim();
  const match = trimmed.match(/^[^.!?]+[.!?]?/);
  const sentence = (match ? match[0] : trimmed).trim();
  return truncate(sentence, max);
}
