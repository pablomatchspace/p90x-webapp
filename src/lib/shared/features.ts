/**
 * E41: feature switches. A user can turn optional parts of the app off to keep
 * the interface lean. Only the keys the user has switched **off** are stored
 * (`settings.disabledFeatures`), so everything is on by default and a feature
 * added later needs no migration.
 *
 * A switch only hides the feature's entry points and surfaces — stored data
 * (notes, links, logs…) is never touched and returns when the feature is turned
 * back on. Core screens (Today, Schedule, Workouts and logging, the Body log,
 * Settings, Data, Help) and Cloud sync / Rounds are deliberately not switchable.
 */

export const FEATURE_KEYS = [
  'restTimer',
  'quotes',
  'notes',
  'calculators',
  'trends',
  'ffmi',
  'nutrition',
  'gear',
  'workoutLinks',
  'adherence',
  'overload',
  'voiceEntry',
  'audio',
] as const

export type FeatureKey = (typeof FEATURE_KEYS)[number]

export type FeatureGroup = 'sections' | 'cards' | 'player'

export interface FeatureDef {
  key: FeatureKey
  title: string
  /** what turning it off hides */
  description: string
  group: FeatureGroup
}

export const FEATURE_GROUP_TITLES: Record<FeatureGroup, string> = {
  sections: 'Sections',
  cards: 'Cards and aids',
  player: 'Workout player',
}

/** Catalog order is the display order and the canonical order of the stored list. */
export const FEATURES: readonly FeatureDef[] = [
  {
    key: 'restTimer',
    title: 'Rest timer',
    description: 'The More → Rest timer page and the timer card inside Focus mode.',
    group: 'sections',
  },
  {
    key: 'quotes',
    title: 'Motivation quotes',
    description:
      'The More → Motivation page and the quote cards on the dashboard and after a workout.',
    group: 'sections',
  },
  {
    key: 'notes',
    title: 'Notes',
    description: 'The More → Notes page. Your notes are kept.',
    group: 'sections',
  },
  {
    key: 'calculators',
    title: 'Body-fat calculators',
    description: 'The More → Body-fat calculators page (Navy, 3-site, 7-site).',
    group: 'sections',
  },
  {
    key: 'trends',
    title: 'Trends and strength progress',
    description:
      'Links to the Body trends and Strength progress charts from the dashboard and reports.',
    group: 'sections',
  },
  {
    key: 'ffmi',
    title: 'FFMI',
    description:
      'The FFMI card and scale, the dashboard FFMI tile, FFMI in the body log, and the Settings “Estimate from FFMI” panel. Your FFMI target is kept.',
    group: 'cards',
  },
  {
    key: 'nutrition',
    title: 'Nutrition',
    description: 'The Today nutrition card and the Nutrition section in Settings.',
    group: 'cards',
  },
  {
    key: 'gear',
    title: 'Gear and equipment lists',
    description: 'The “have ready” equipment lists on Today, Workouts and in the player.',
    group: 'cards',
  },
  {
    key: 'workoutLinks',
    title: 'Workout video and audio links',
    description:
      'The launch buttons on workout cards and the Workout links card in Settings. Your links are kept.',
    group: 'cards',
  },
  {
    key: 'adherence',
    title: 'Adherence card',
    description: 'The adherence and pace card on the dashboard.',
    group: 'cards',
  },
  {
    key: 'overload',
    title: 'Progressive-overload targets',
    description: 'The “beat last time” target shown per exercise in Focus mode.',
    group: 'cards',
  },
  {
    key: 'voiceEntry',
    title: 'Voice entry',
    description: 'The microphone button for speaking reps in Focus mode.',
    group: 'player',
  },
  {
    key: 'audio',
    title: 'Beeps and spoken cues',
    description: 'All workout beeps and spoken announcements, including the rest-timer beep.',
    group: 'player',
  },
]

export function isFeatureEnabled(
  settings: { disabledFeatures: readonly FeatureKey[] },
  key: FeatureKey,
): boolean {
  return !settings.disabledFeatures.includes(key)
}

/** The next disabled list after switching `key` on or off — canonical order, no duplicates. */
export function applyFeatureToggle(
  disabled: readonly FeatureKey[],
  key: FeatureKey,
  enabled: boolean,
): FeatureKey[] {
  const next = new Set(disabled)
  if (enabled) next.delete(key)
  else next.add(key)
  return FEATURE_KEYS.filter((k) => next.has(k))
}
