import type { PlayTimeline } from '../types'
import { flow, ids, reps, type Move } from './build'

/**
 * Generation Next Active Recovery (ART) timelines (E34 U168), transcribed from
 * docs/requirements/gennext-workouts.md §11–§13. Holds and rolls are timed as
 * the video narrates them (about 30 s per mobility move, 40 s per flexibility
 * hold, 60 s per rolled area).
 */

const SOURCE = 'docs/requirements/gennext-workouts.md'

const MOBILITY_TEST: Move[] = [
  ['overhead-squat', 'Overhead Squat'],
  ['three-way-lunge', '3-Way Lunge', 'Forward, side, reverse — both legs'],
  ['good-morning', 'Good Morning'],
  ['push-up', 'Push-Up', 'Mod: knees'],
  ['superman-angels', 'Superman Angels', 'W to I'],
  ['russian-twist-reach', 'Russian Twist Reach'],
]

const MOBILITY_FLOW: Move[] = [
  ['bridge', 'Bridge'],
  ['single-leg-bridge-right', 'Single-Leg Bridge — Right'],
  ['single-leg-bridge-left', 'Single-Leg Bridge — Left'],
  ['windshield-wipers', 'Windshield Wipers'],
  ['tabletop-twist', 'Tabletop Spinal Twist'],
  ['rainbow-left', 'Rainbow (Open Book) — Left'],
  ['rainbow-right', 'Rainbow (Open Book) — Right'],
  ['dead-bug', 'Dead Bug'],
  ['hip-circles-sweep-right', 'Side-Lying Hip Circles & Leg Sweep — Right'],
  ['hip-circles-sweep-left', 'Side-Lying Hip Circles & Leg Sweep — Left'],
  ['superman', 'Superman'],
  ['swimmers', 'Swimmers'],
  ['scorpion', 'Scorpion'],
  ['thread-the-needle', "Child's Pose Thread the Needle"],
  ['cat-cow', 'Cat-Cow'],
  ['bird-dog-sweep-right', 'Bird-Dog Sweep — Right'],
  ['bird-dog-sweep-left', 'Bird-Dog Sweep — Left'],
  ['adductor-rock-right', 'Adductor Rock — Right'],
  ['adductor-rock-left', 'Adductor Rock — Left'],
  ['wrist-stretches', 'Wrist Stretches'],
  ['ninety-ninety-right', '90/90 Reach — Right'],
  ['ninety-ninety-left', '90/90 Reach — Left'],
  ['kneeling-camel', 'Kneeling Camel'],
  ['toe-stretch', 'Kneeling Toe Stretch'],
  ['hip-flexor-hamstring-right', 'Hip Flexor to Hamstring — Right'],
  ['runners-lunge-right', "Runner's Lunge — Right"],
  ['lizard-quad-right', 'Lizard + Quad Reach — Right'],
  ['hip-flexor-hamstring-left', 'Hip Flexor to Hamstring — Left'],
  ['runners-lunge-left', "Runner's Lunge — Left"],
  ['lizard-quad-left', 'Lizard + Quad Reach — Left'],
  ['deep-squat-rock', 'Deep Squat Rock'],
  ['forward-fold-reach', 'Forward Fold with T-Spine Reach'],
  ['free-flow', 'Free Flow'],
  ['shoulder-arm-stretch', 'Shoulder Rolls & Arm Stretches'],
]

export const gnActiveMobility: PlayTimeline = {
  workoutKey: 'gn-active-mobility',
  title: 'Active Mobility',
  source: SOURCE,
  segments: [
    ...reps('Test', MOBILITY_TEST, 6),
    ...flow('Flow', MOBILITY_FLOW, 30),
    ...reps('Retest', MOBILITY_TEST, 6),
  ],
  loggedExerciseIds: ids(MOBILITY_FLOW),
}

const FLEX_STANDING: Move[] = [
  ['overhead-side-reach-right', 'Overhead Side Reach with Roller — Right'],
  ['overhead-side-reach-left', 'Overhead Side Reach with Roller — Left'],
  ['roller-shoulder-stretch-1', 'Shoulder Stretch, Roller Behind Back — Grip 1'],
  ['roller-shoulder-stretch-2', 'Shoulder Stretch, Roller Behind Back — Grip 2'],
  ['wide-twist-left', 'Wide-Stance Twist Reach — Left'],
  ['wide-twist-right', 'Wide-Stance Twist Reach — Right'],
  ['plank-on-roller', 'Plank on Roller'],
  ['plank-down-dog', 'Plank to Down Dog'],
]
const side = (s: 'Right' | 'Left'): Move[] => {
  const k = s.toLowerCase()
  return [
    [`lunge-rock-${k}`, `Runner's Lunge Rock — ${s}`],
    [`worlds-greatest-${k}`, `World's Greatest Stretch — ${s}`],
    [`kneeling-quad-${k}`, `Kneeling Quad — ${s}`],
    [`half-split-${k}`, `Half-Split Hamstring — ${s}`],
    [`triangle-${k}`, `Triangle — ${s}`],
    [`plank-reset-${k}`, 'Plank Reset'],
  ]
}
const FLEX_FLOOR: Move[] = [
  ['childs-pose-roller', "Child's Pose on Roller"],
  ['puppy-pose', 'Puppy Pose'],
  ['thread-needle-right', 'Thread the Needle with Roller — Right'],
  ['thread-needle-left', 'Thread the Needle with Roller — Left'],
  ['cat-cow', 'Cat-Cow'],
  ['prone-cobra-roller', 'Prone Cobra with Roller'],
  ['chest-opener-right', 'Chest Opener — Right'],
  ['chest-opener-left', 'Chest Opener — Left'],
  ['neck-stretch-right', 'Neck Stretch on Roller — Right'],
  ['neck-stretch-left', 'Neck Stretch on Roller — Left'],
  ['upper-back-extension-1', 'Upper-Back Extension over Roller'],
  ['upper-back-extension-2', 'Upper-Back Extension, Lower'],
  ['supported-hip-flexor-right', 'Supported Hip Flexor — Right'],
  ['supported-hip-flexor-left', 'Supported Hip Flexor — Left'],
  ['butterfly', 'Butterfly'],
  ['ninety-ninety-lifts-right', '90/90 with Knee Lifts — Right'],
  ['ninety-ninety-lifts-left', '90/90 with Knee Lifts — Left'],
  ['seated-hamstring-right', 'Seated Hamstring — Right'],
  ['seated-hamstring-left', 'Seated Hamstring — Left'],
  ['straddle-lean-back', 'Straddle Roller Lean-Back'],
  ['foot-dorsiflexion', 'Foot Dorsiflexion on Roller'],
  ['toe-tuck-sit', 'Toe-Tuck Sit'],
]

export const gnActiveFlexibility: PlayTimeline = {
  workoutKey: 'gn-active-flexibility',
  title: 'Active Flexibility',
  source: SOURCE,
  segments: [
    ...flow('Standing', FLEX_STANDING, 40),
    ...flow('Right Side', side('Right'), 40),
    ...flow('Left Side', side('Left'), 40),
    ...flow('Floor', FLEX_FLOOR, 40),
  ],
  loggedExerciseIds: [
    ...ids(FLEX_STANDING),
    ...ids(side('Right')),
    ...ids(side('Left')),
    ...ids(FLEX_FLOOR),
  ],
}

const ROLL: Move[] = [
  ['foot-right', 'Foot (Ball) — Right'],
  ['foot-left', 'Foot (Ball) — Left'],
  ['calf-right', 'Calf — Right'],
  ['hamstring-right', 'Hamstring — Right'],
  ['glute-right', 'Glute — Right'],
  ['it-band-right', 'IT Band — Right'],
  ['calf-left', 'Calf — Left'],
  ['hamstring-left', 'Hamstring — Left'],
  ['glute-left', 'Glute — Left'],
  ['it-band-left', 'IT Band — Left'],
  ['quad-right', 'Quad — Right'],
  ['adductor-right', 'Adductor — Right'],
  ['quad-left', 'Quad — Left'],
  ['adductor-left', 'Adductor — Left'],
  ['lower-back', 'Lower Back'],
  ['upper-back', 'Upper Back'],
  ['spinal-extension', 'Spinal Extension over Roller'],
  ['lat-left', 'Lat — Left'],
  ['lat-right', 'Lat — Right'],
  ['childs-pose-roll', "Child's Pose Roll"],
  ['puppy-pose-roll', 'Puppy Pose Forearm Roll'],
  ['arm-right', 'Arm, Wrist to Shoulder — Right'],
  ['arm-left', 'Arm, Wrist to Shoulder — Left'],
]

export const gnMyofascialRelease: PlayTimeline = {
  workoutKey: 'gn-myofascial-release',
  title: 'Myofascial Release',
  source: SOURCE,
  segments: flow('Roll', ROLL, 60),
  loggedExerciseIds: ids(ROLL),
}
