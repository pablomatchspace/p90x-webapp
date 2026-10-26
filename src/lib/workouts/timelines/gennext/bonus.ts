import type { PlayTimeline } from '../types'
import { block, ids, type Move } from './build'

/**
 * Generation Next 5-minute bonus fivers (E34 U169), transcribed from
 * docs/requirements/gennext-workouts.md §15.
 */

const SOURCE = 'docs/requirements/gennext-workouts.md'

const ABS: Move[] = [
  ['low-plank', 'Low Plank'],
  ['russian-twist', 'Russian Twist', 'Dumbbell optional'],
  ['side-plank-right', 'Side Plank — Right Elbow'],
  ['butterfly-sit-up', 'Butterfly Sit-Up'],
  ['side-plank-left', 'Side Plank — Left Elbow'],
  ['jackknife', 'Jackknife'],
  ['hollow-hold', 'Hollow Hold'],
  ['plank-pull-through', 'Plank Pull-Through'],
]
const ARMS: Move[] = [
  ['skull-crusher', 'Skull Crusher', 'Flat bench'],
  ['iso-hold-curl', 'Iso-Hold Alternating Biceps Curl', 'Hold one arm at 90°'],
  ['bench-dip', 'Bench Dip'],
  ['cross-body-hammer-curl', 'Cross-Body Hammer Curl'],
]
const PUSH_PULL: Move[] = [
  ['ladder-up', 'Ladder Up', '1 pull-up + 1 push-up, then 2 + 2… climb as high as you can'],
  ['ladder-down', 'Ladder Down', 'Back down from your top rung · plank if you finish early'],
]
const GLUTES: Move[] = [
  ['rdl', 'Romanian Deadlift'],
  ['single-leg-hip-thrust-left', 'Single-Leg Hip Thrust — Left', 'Dumbbell on the working leg'],
  ['single-leg-hip-thrust-right', 'Single-Leg Hip Thrust — Right', 'Dumbbell on the working leg'],
  ['skier-swing', 'Skier Swing'],
]
const SHOULDERS: Move[] = [
  ['arnie-press', 'Arnie Press', 'Seated, heavy'],
  ['lateral-frontal-raise', 'Lateral to Frontal Raise', 'Medium'],
  ['upright-row', 'Upright Row', 'Heavy'],
  ['prone-fly', 'Prone Fly', 'Incline bench, medium'],
]

const fiver = (
  workoutKey: string,
  title: string,
  moves: Move[],
  work: number,
  rest: number,
): PlayTimeline => ({
  workoutKey,
  title,
  source: SOURCE,
  segments: block('Bonus', moves, 1, work, rest),
  loggedExerciseIds: ids(moves),
})

export const gnBonusAbs = fiver('gn-bonus-abs', '5-Min Abs', ABS, 30, 0)
export const gnBonusArms = fiver('gn-bonus-arms', '5-Min Arms', ARMS, 40, 20)
export const gnBonusClassicPushPull = fiver(
  'gn-bonus-classic-push-pull',
  '5-Min Classic Push-Pull',
  PUSH_PULL,
  120,
  0,
)
export const gnBonusGlutes = fiver('gn-bonus-glutes', '5-Min Glutes', GLUTES, 40, 20)
export const gnBonusShoulders = fiver('gn-bonus-shoulders', '5-Min Shoulders', SHOULDERS, 40, 20)
