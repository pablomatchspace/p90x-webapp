/**
 * Gear / equipment per workout (E37). Display-only authored data — no state,
 * no schema: the workbook has no equipment column, so this is hand-written
 * (UX data like focusSteps' round order), grounded in the workout requirement
 * docs (docs/requirements/*) and the exercise catalog. A workout with no gear
 * lists `[]`. Optional/alternate props (assist band, "no bar = row") are listed
 * when the video uses them.
 */

/** Vocabulary order = display order (staples first). */
export const GEAR_LABELS = {
  dumbbells: 'Dumbbells',
  'pull-up-bar': 'Pull-up bar',
  bench: 'Bench',
  bands: 'Resistance bands',
  'push-up-stands': 'Push-up stands',
  chair: 'Chair or stool',
  mat: 'Mat',
  'yoga-blocks': 'Yoga blocks',
  towel: 'Towel',
  'foam-roller': 'Foam roller',
  'massage-ball': 'Massage ball',
} as const

export type GearId = keyof typeof GEAR_LABELS

const WORKOUT_GEAR: Record<string, GearId[]> = {
  // P90X Classic / Lean
  'chest-back': ['dumbbells', 'pull-up-bar', 'push-up-stands'],
  plyometrics: ['chair'],
  'shoulders-arms': ['dumbbells', 'bands', 'chair'],
  'yoga-x': ['mat', 'yoga-blocks'],
  'legs-back': ['dumbbells', 'pull-up-bar', 'chair'],
  'kenpo-x': [],
  'core-synergistics': ['dumbbells', 'chair', 'mat', 'towel'],
  'chest-shoulders-triceps': ['dumbbells', 'chair', 'push-up-stands'],
  'back-biceps': ['dumbbells', 'pull-up-bar', 'towel'],
  'ab-ripper-x': ['mat'],
  'cardio-x': ['chair', 'mat'],
  'x-stretch': ['mat'],
  rest: [],
  // Generation Next (docs/requirements/gennext-workouts.md)
  'gn-push-strength': ['dumbbells', 'bench'],
  'gn-pull-strength': ['dumbbells', 'pull-up-bar', 'bench'],
  'gn-upper-body': ['dumbbells', 'pull-up-bar', 'bench'],
  'gn-lower-body': ['dumbbells', 'bench'],
  'gn-full-body-strength': ['dumbbells', 'pull-up-bar', 'bench'],
  'gn-full-body-power': ['dumbbells', 'pull-up-bar', 'bench'],
  'gn-core-circuit': ['dumbbells', 'mat'],
  'gn-plyometrix': ['bench'],
  'gn-speed-and-agility': ['bench'],
  'gn-accel-decel': ['bench'],
  'gn-cardio-boxing': [],
  'gn-active-mobility': ['mat'],
  'gn-active-flexibility': ['foam-roller', 'mat'],
  'gn-myofascial-release': ['foam-roller', 'massage-ball'],
  'gn-bonus-abs': ['dumbbells'],
  'gn-bonus-arms': ['dumbbells', 'bench'],
  'gn-bonus-classic-push-pull': ['pull-up-bar'],
  'gn-bonus-glutes': ['dumbbells', 'bench'],
  'gn-bonus-shoulders': ['dumbbells', 'bench'],
}

const ORDER = Object.keys(GEAR_LABELS) as GearId[]

/** Gear for one workout, in display order. Throws for a key with no entry. */
export function gearFor(workoutKey: string): GearId[] {
  const gear = Object.hasOwn(WORKOUT_GEAR, workoutKey) ? WORKOUT_GEAR[workoutKey] : undefined
  if (gear === undefined) throw new Error(`No gear entry for workout "${workoutKey}"`)
  return [...gear].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))
}

/** Union of gear across workouts (e.g. a week's prep list), in display order. */
export function gearForWorkouts(workoutKeys: readonly string[]): GearId[] {
  const needed = new Set(workoutKeys.flatMap((key) => gearFor(key)))
  return ORDER.filter((id) => needed.has(id))
}

export function gearLabel(id: GearId): string {
  return GEAR_LABELS[id]
}
