/**
 * Onboarding Taste Quiz — question definitions.
 *
 * 8 questions, designed to seed `user_taste_seed` so brand-new users (cheese_count < 4)
 * still get personalized recommendations from day one.
 *
 * Design principles:
 *  - Mostly Tinder-style tap-a-photo with autoadvance (types: 'pair', 'grid').
 *  - Multi-selects capped at 3 so users commit to a signal.
 *  - One 3-choice list ('choice') for adventurousness — no photos needed.
 *  - Question copy stays in this file so designers can edit without touching logic.
 *
 * Hero photography: currently points to remote Unsplash URLs. Once licensed/
 * commissioned shots are in `assets/images/quiz/`, swap the `imageUrl` strings
 * for `require('@/assets/images/quiz/<file>.jpg')` imports.
 *
 * See: cheezus-phase-1-plan.md → Workstream 3 → "Quiz question set (8)"
 */

import { CURATED_FLAVOR_TAGS } from './FlavorTags';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QuizOptionValue =
  | string
  | number
  | { [key: string]: unknown };

export type QuizOption = {
  /** Value persisted to user_taste_seed / used by reducer to build QuizAnswers. */
  value: QuizOptionValue;
  /** User-facing label below the photo / next to the emoji. */
  label: string;
  /** Optional subtitle shown under the label (e.g., country, milk type). */
  sublabel?: string;
  /**
   * Hero image source. Accepts either a remote URL string OR the result of
   * a `require('@/assets/images/quiz/x.jpg')` call (a number). Components
   * should branch on `typeof imageSource === 'string'`.
   */
  imageUrl?: string | number;
  /** Emoji fallback / decoration for non-photo questions (milk types, countries, flavors). */
  emoji?: string;
  /** ISO country code for flag rendering on the countries question. */
  countryCode?: string;
};

export type QuizQuestionType =
  | 'pair'    // 2-photo forced choice (Tinder-style)
  | 'grid'    // 4-photo pick one
  | 'multi'   // multi-select grid (milk types, countries)
  | 'chips'   // multi-select chips (flavors)
  | 'choice'; // vertical list of text options (adventurousness)

export type QuizQuestion = {
  id: string;
  type: QuizQuestionType;
  question: string;
  subtitle?: string;
  /** Max number of options the user can select (for 'multi' / 'chips'). Ignored otherwise. */
  maxSelections?: number;
  options: QuizOption[];
};

// ---------------------------------------------------------------------------
// Hero photos — bundled from assets/images/quiz/. Bundling > remote so the
// quiz works offline and there's no chance of a hero image timing out mid-flow.
// ---------------------------------------------------------------------------

const IMG = {
  q1Brie:        require('@/assets/images/quiz/q1-brie.jpg'),
  q1Cheddar:     require('@/assets/images/quiz/q1-cheddar.jpg'),
  q1Blue:        require('@/assets/images/quiz/q1-blue.jpg'),
  q1AgedGouda:   require('@/assets/images/quiz/q1-aged-gouda.jpg'),
  q2Epoisses:    require('@/assets/images/quiz/q2-epoisses.jpg'),
  q2Burrata:     require('@/assets/images/quiz/q2-burrata.jpg'),
  q3Camembert:   require('@/assets/images/quiz/q3-camembert.jpg'),
  q3Parmigiano:  require('@/assets/images/quiz/q3-parmigiano.jpg'),
  q8Gouda:       require('@/assets/images/quiz/q8-gouda.jpg'),
  q8Manchego:    require('@/assets/images/quiz/q8-manchego.jpg'),
};

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export const QUIZ_QUESTIONS: readonly QuizQuestion[] = [
  // Q1 — Cheese board hero (4-photo pick one)
  {
    id: 'board_hero',
    type: 'grid',
    question: 'Pick your cheese board hero.',
    subtitle: 'Which one are you reaching for first?',
    options: [
      {
        value: { family: 'Soft Bloomy', type: 'Brie', flavors: ['Creamy'] },
        label: 'Creamy Brie',
        sublabel: 'Soft, buttery, pillowy',
        imageUrl: IMG.q1Brie,
        emoji: '🧀',
      },
      {
        value: { family: 'Hard', type: 'Cheddar', flavors: ['Sharp'] },
        label: 'Sharp Cheddar',
        sublabel: 'Bold, tangy, punchy',
        imageUrl: IMG.q1Cheddar,
        emoji: '🟠',
      },
      {
        value: { family: 'Blue', type: 'Blue', flavors: ['Funky'] },
        label: 'Blue',
        sublabel: 'Pungent, salty, striking',
        imageUrl: IMG.q1Blue,
        emoji: '🔵',
      },
      {
        value: { family: 'Hard', type: 'Gouda', flavors: ['Nutty', 'Sweet'] },
        label: 'Aged Gouda',
        sublabel: 'Caramel, crystals, nutty',
        imageUrl: IMG.q1AgedGouda,
        emoji: '🟡',
      },
    ],
  },

  // Q2 — Funky or fresh?
  {
    id: 'funky_or_fresh',
    type: 'pair',
    question: 'Funky or fresh?',
    subtitle: 'Trust your gut.',
    options: [
      {
        value: {
          family: 'Washed Rind',
          type: 'Époisses',
          flavors: ['Funky'],
          intensity: 1,
        },
        label: 'Époisses',
        sublabel: 'Washed-rind, stinky, intense',
        imageUrl: IMG.q2Epoisses,
        emoji: '🧅',
      },
      {
        value: {
          family: 'Fresh',
          type: 'Burrata',
          flavors: ['Creamy'],
          intensity: -1,
        },
        label: 'Burrata',
        sublabel: 'Fresh, milky, clean',
        imageUrl: IMG.q2Burrata,
        emoji: '🥛',
      },
    ],
  },

  // Q3 — Soft or hard?
  {
    id: 'soft_or_hard',
    type: 'pair',
    question: 'Soft or hard?',
    subtitle: 'Texture preference.',
    options: [
      {
        value: { family: 'Soft Bloomy', type: 'Camembert' },
        label: 'Camembert',
        sublabel: 'Soft, oozy, rich',
        imageUrl: IMG.q3Camembert,
        emoji: '🫕',
      },
      {
        value: { family: 'Hard', type: 'Parmigiano Reggiano', flavors: ['Nutty', 'Savory'] },
        label: 'Parmigiano',
        sublabel: 'Hard, crystalline, savoury',
        imageUrl: IMG.q3Parmigiano,
        emoji: '🧱',
      },
    ],
  },

  // Q4 — Milk types (multi, max 3)
  {
    id: 'milk_types',
    type: 'multi',
    question: 'Which milks are you into?',
    subtitle: 'Pick up to 3.',
    maxSelections: 3,
    options: [
      { value: 'Cow',     label: 'Cow',     emoji: '🐄' },
      { value: 'Goat',    label: 'Goat',    emoji: '🐐' },
      { value: 'Sheep',   label: 'Sheep',   emoji: '🐑' },
      { value: 'Buffalo', label: 'Buffalo', emoji: '🐃' },
    ],
  },

  // Q5 — Flavors (chips, max 3) — driven by CURATED_FLAVOR_TAGS
  {
    id: 'flavors',
    type: 'chips',
    question: 'Which flavors pull you in?',
    subtitle: 'Pick up to 3.',
    maxSelections: 3,
    options: CURATED_FLAVOR_TAGS.map((tag) => ({
      value: tag.name,
      label: tag.name,
      sublabel: tag.description,
      emoji: tag.emoji,
    })),
  },

  // Q6 — Countries (multi, max 3) — "Anywhere" is a special value
  {
    id: 'countries',
    type: 'multi',
    question: 'Where should your feed wander?',
    subtitle: 'Pick up to 3. "Anywhere" keeps it global.',
    maxSelections: 3,
    options: [
      { value: 'France',      label: 'France',      emoji: '🇫🇷', countryCode: 'FR' },
      { value: 'Italy',       label: 'Italy',       emoji: '🇮🇹', countryCode: 'IT' },
      { value: 'UK',          label: 'UK',          emoji: '🇬🇧', countryCode: 'GB' },
      { value: 'Spain',       label: 'Spain',       emoji: '🇪🇸', countryCode: 'ES' },
      { value: 'Switzerland', label: 'Switzerland', emoji: '🇨🇭', countryCode: 'CH' },
      { value: 'Netherlands', label: 'Netherlands', emoji: '🇳🇱', countryCode: 'NL' },
      { value: 'US',          label: 'USA',         emoji: '🇺🇸', countryCode: 'US' },
      // Special: empty-array marker. saveTasteSeed() treats ANYWHERE as `[]`.
      { value: 'ANYWHERE',    label: 'Anywhere',    emoji: '🌍' },
    ],
  },

  // Q7 — Adventurousness (choice)
  {
    id: 'adventurousness',
    type: 'choice',
    question: 'How adventurous is your palate?',
    subtitle: 'Be honest — nobody sees this.',
    options: [
      { value: 0, label: 'Keep it mellow',    sublabel: 'Crowd-pleasers only', emoji: '🤗' },
      { value: 1, label: "I'll try anything", sublabel: 'Surprise me',          emoji: '🫡' },
      { value: 2, label: 'Stinky, please.',   sublabel: 'Give me the funk',     emoji: '🤌' },
    ],
  },

  // Q8 — Gouda vs Manchego tiebreaker
  {
    id: 'gouda_vs_manchego',
    type: 'pair',
    question: 'Last one — Gouda or Manchego?',
    subtitle: 'Tiebreaker.',
    options: [
      {
        value: { family: 'Hard', type: 'Gouda', milk: 'Cow', country: 'Netherlands' },
        label: 'Gouda',
        sublabel: 'Dutch, cow, caramel',
        imageUrl: IMG.q8Gouda,
        emoji: '🟡',
      },
      {
        value: { family: 'Hard', type: 'Manchego', milk: 'Sheep', country: 'Spain' },
        label: 'Manchego',
        sublabel: 'Spanish, sheep, grassy',
        imageUrl: IMG.q8Manchego,
        emoji: '🟤',
      },
    ],
  },
] as const;

export const QUIZ_QUESTION_COUNT = QUIZ_QUESTIONS.length;
