import type { PlaySegment, PlayTimeline } from '../types'
import { block, flow, ids, type Move } from './build'

/**
 * Generation Next Neuro-Performance (NPT) timelines (E34 U167), transcribed from
 * docs/requirements/gennext-workouts.md §7–§10. Rests between intervals are
 * break segments; warm-up / cool-down moves are approximated at 30 s each.
 */

const SOURCE = 'docs/requirements/gennext-workouts.md'

const PLYO_B1: Move[] = [
  ['squat-jump', 'Squat Jump', 'Mod: calf raise'],
  ['box-jump', 'Box Jump onto Bench', 'Mod: step-up'],
  ['broad-jump-180', 'Broad Jump 180', 'Mod: duck waddle + turn'],
  ['criss-cross-tuck', '4 Criss-Cross + 2 Tuck Jumps', 'Mod: rocket jump'],
]
const PLYO_B2: Move[] = [
  ['jump-lunge', 'Jump Lunge', 'Mod: reverse lunge'],
  ['bulgarian-plyo-right', 'Bulgarian Plyo — Right', 'Rear foot on bench'],
  ['bulgarian-plyo-left', 'Bulgarian Plyo — Left', 'Rear foot on bench'],
  ['single-leg-bound-box', 'Single-Leg Bound in a Box', 'Forward, side, back — switch legs'],
]
const PLYO_FIN: Move[] = [
  ['burpee-ski-jumps', 'Burpee Ski Jumps'],
  ['climbers-heel-kicks', '4 Mountain Climbers + 2 Heel Kicks'],
  ['broad-jump-bear-crawl', 'Broad Jump to Bear Crawl Back'],
  ['jump-lunges-power-jacks', '4 Jump Lunges + 4 Power Jacks'],
]

export const gnPlyometrix: PlayTimeline = {
  workoutKey: 'gn-plyometrix',
  title: 'Plyometrix',
  source: SOURCE,
  segments: [
    ...flow(
      'Warm-Up',
      [
        ['squat-tiptoe-reach', 'Squat to Tiptoe Reach'],
        ['lateral-lunges', 'Lateral Lunges'],
        ['air-jump-rope', 'Air Jump Rope'],
        ['single-leg-bridge-right', 'Single-Leg Hip Bridge — Right'],
        ['single-leg-bridge-left', 'Single-Leg Hip Bridge — Left'],
      ],
      30,
    ),
    ...block('Block 1', PLYO_B1, 3, 30, 30),
    ...block('Block 2', PLYO_B2, 3, 30, 30),
    ...block('Finisher', PLYO_FIN, 1, 60, 30),
    ...flow(
      'Cool Down',
      [
        ['side-lean', 'Standing Side Lean'],
        ['quad-stretch', 'Quad Stretch'],
        ['butterfly', 'Butterfly'],
        ['figure-four', 'Figure-Four Glute'],
        ['seated-twist-left', 'Seated Twist — Left'],
        ['seated-twist-right', 'Seated Twist — Right'],
      ],
      30,
    ),
  ],
  loggedExerciseIds: [...ids(PLYO_B1), ...ids(PLYO_B2), ...ids(PLYO_FIN)],
}

const SA_B1: Move[] = [
  ['fast-feet-reaction', 'Fast Feet Reaction Drill', 'Left, right, up, down on the call'],
  ['lateral-shuffle-touch', 'Lateral Shuffle & Touch'],
  ['sprinters-lunge', "Sprinter's Lunge", '20 s right leg, then 20 s left'],
  ['ice-skaters', 'Ice Skaters'],
]
const SA_B2: Move[] = [
  ['bench-toe-touches', 'Bench Toe Touches', 'Mod: tap under the bench'],
  ['bench-reaction-drill', 'Bench Reaction Drill', 'Around the bench on the call'],
  ['bench-hop-overs', 'Bench Hop-Overs', 'Mod: hops at the bench end'],
  ['bench-plyo-push-ups', 'Plyo Push-Ups on Bench', 'Mod: regular push-ups'],
]
const SA_TABATA: Move[] = [
  ['squat-jump-lateral-lunge', 'Squat Jump to Lateral Lunge'],
  ['squat-hand-release-in-out', 'Squat Hand-Release In & Out'],
]

export const gnSpeedAndAgility: PlayTimeline = {
  workoutKey: 'gn-speed-and-agility',
  title: 'Speed and Agility',
  source: SOURCE,
  segments: [
    ...flow(
      'Warm-Up',
      [
        ['squat-trio', 'Overhead, Zombie & Suitcase Squats'],
        ['cossack-left', 'Shin Grab / Cossack — Left'],
        ['cossack-right', 'Shin Grab / Cossack — Right'],
        ['lateral-high-knees', 'Lateral High Knees'],
        ['pop-squat', 'Pop Squat'],
        ['fast-feet', 'Fast Feet'],
      ],
      30,
    ),
    ...block('Block 1', SA_B1, 3, 40, 20),
    ...block('Block 2', SA_B2, 3, 40, 20),
    ...block('Finisher (Tabata)', SA_TABATA, 4, 20, 10),
    ...flow(
      'Cool Down',
      [
        ['figure-four-left', 'Standing Figure-Four — Left'],
        ['figure-four-right', 'Standing Figure-Four — Right'],
        ['quad-stretch', 'Quad Stretch'],
        ['chest-opener', 'Rounded Back & Chest Opener'],
        ['forward-fold', 'Forward Fold'],
      ],
      30,
    ),
  ],
  loggedExerciseIds: [...ids(SA_B1), ...ids(SA_B2), ...ids(SA_TABATA)],
}

const AD_B1: Move[] = [
  ['ladder-feet', 'Ladder Feet', 'In-in-out-out, then travel'],
  ['heisman', 'Heisman', 'Three quick steps, knee drive, stick'],
  ['single-leg-pogos', '4 Single-Leg Pogos + Stick', 'Switch legs · option: both legs'],
  ['squat-jacks-surrender', '4 Squat Jacks to Surrender'],
]
const AD_B2: Move[] = [
  ['dead-stop-bench', 'Dead Stop off Bench', 'Stick a quiet landing · mod: from the floor'],
  ['lunge-knee-drive-right', 'Forward Lunge to Knee Drive — Right'],
  ['lunge-knee-drive-left', 'Forward Lunge to Knee Drive — Left'],
  ['traveling-beast', 'Traveling Beast', 'Fast forward, slow back'],
]
const AD_LADDER: Move[] = [
  [
    'descending-ladder',
    '10-8-6-4-2 Ladder',
    'Each rung: double hop to lunge split, crab walk, squat switchblade, box jump · plank if done early',
  ],
]

export const gnAccelDecel: PlayTimeline = {
  workoutKey: 'gn-accel-decel',
  title: 'Accel/Decel',
  source: SOURCE,
  segments: [
    ...flow(
      'Warm-Up',
      [
        ['wgs-left', "World's Greatest Stretch — Left"],
        ['wgs-right', "World's Greatest Stretch — Right"],
        ['plank-toe-touch', 'High Plank to Wide-Leg Toe Touch'],
        ['beast-kick-through', 'Beast Kick-Through'],
      ],
      30,
    ),
    ...block('Block 1', AD_B1, 3, 40, 20),
    ...block('Block 2', AD_B2, 3, 40, 20),
    ...block('Finisher', AD_LADDER, 1, 300, 0),
    ...flow(
      'Cool Down',
      [
        ['bench-pigeon-right', 'Bench Pigeon — Right'],
        ['bench-pigeon-left', 'Bench Pigeon — Left'],
        ['hip-flexor-reach-right', 'Half-Kneeling Hip Flexor Reach — Right'],
        ['hip-flexor-reach-left', 'Half-Kneeling Hip Flexor Reach — Left'],
        ['quad-stretch', 'Reclined Quad Stretch'],
        ['wide-straddle', 'Wide Straddle'],
        ['shoulder-rolls', 'Shoulder Rolls'],
      ],
      30,
    ),
  ],
  loggedExerciseIds: [...ids(AD_B1), ...ids(AD_B2), ...ids(AD_LADDER)],
}

/** Cardio Boxing rounds: 45 s combo, 15 s, 45 s cardio, 15 s, 60 s blend; 60 s corner. */
const CB_ROUNDS: [combo: Move, cardio: Move][] = [
  [
    ['combo-1', 'Jab – Cross – Lead Hook'],
    ['squat-jump-180', 'Squat Jump 180', 'Mod: pop squat'],
  ],
  [
    ['combo-2', 'Cross – Lead Uppercut – Cross'],
    ['narrow-wide-push-up', 'Narrow-to-Wide Push-Up'],
  ],
  [
    ['combo-3', 'Jab – Jab – Cross – Roll – Back Hook'],
    ['double-taps', 'Double Taps', 'Mod: single tap'],
  ],
  [
    ['combo-4', 'Jab – Cross – Slip – Cross – Hook'],
    ['plank-in-out', 'Plank Jump In & Out', 'Mod: step'],
  ],
  [
    ['combo-5', 'Hook – Hook – Uppercut – Uppercut'],
    ['burpee-tuck-jump', 'Burpee Tuck Jump', 'Mod: no jump'],
  ],
]

const pause = (section: string, id: string, name: string, seconds: number): PlaySegment => ({
  id,
  exerciseId: 'rest',
  name,
  seconds,
  kind: 'break',
  section,
})

function boxingRound(n: number, [combo, cardio]: [Move, Move]): PlaySegment[] {
  const section = `Round ${n}`
  const blend: Move = [
    `${combo[0]}-blend`,
    `${combo[1]} + ${cardio[1]}`,
    'Combo, then the cardio move',
  ]
  return [
    ...block(section, [combo], 1, 45, 0),
    pause(section, `round-${n}-rest-a`, 'Rest', 15),
    ...block(section, [cardio], 1, 45, 0),
    pause(section, `round-${n}-rest-b`, 'Rest', 15),
    ...block(section, [blend], 1, 60, 0),
    ...(n < CB_ROUNDS.length ? [pause(section, `round-${n}-corner`, 'Corner', 60)] : []),
  ]
}

export const gnCardioBoxing: PlayTimeline = {
  workoutKey: 'gn-cardio-boxing',
  title: 'Cardio Boxing',
  source: SOURCE,
  segments: [
    ...flow(
      'Technique Warm-Up',
      [
        ['footwork-forward-back', 'Footwork — Forward & Back'],
        ['footwork-left-right', 'Footwork — Left & Right'],
        ['slips', 'Slips'],
        ['rolls', 'Rolls'],
        ['jab', 'Jab'],
        ['cross', 'Cross'],
        ['lead-hook', 'Lead Hook'],
        ['back-hook', 'Back Hook'],
        ['lead-uppercut', 'Lead Uppercut'],
        ['back-uppercut', 'Back Uppercut'],
        ['all-six', 'All Six Punches'],
      ],
      30,
    ),
    ...flow(
      'Cardio Warm-Up',
      [
        ['high-knees', 'High Knees'],
        ['jumping-jacks', 'Jumping Jacks'],
        ['lateral-shuffle', 'Lateral Shuffle'],
        ['heel-kicks', 'Heel Kicks'],
        ['warm-pop-squat', 'Pop Squat'],
        ['push-ups', 'Push-Ups'],
        ['mountain-climbers', 'Mountain Climbers'],
        ['low-plank', 'Low Plank'],
        ['military-plank', 'Military Plank'],
        ['plank-jacks', 'Plank Jacks'],
      ],
      30,
    ),
    ...CB_ROUNDS.flatMap((pair, i) => boxingRound(i + 1, pair)),
    ...CB_ROUNDS.flatMap(([, cardio], i) => [
      ...flow('Finisher', [[`finisher-punch-${i + 1}`, 'Punches — active recovery']], 20),
      ...flow('Finisher', [[`finisher-${cardio[0]}`, cardio[1]]], 40),
    ]),
    ...flow(
      'Cool Down',
      [
        ['chest-opener', 'Chest Opener'],
        ['quad-right', 'Standing Quad — Right'],
        ['quad-left', 'Standing Quad — Left'],
        ['hamstring-right', 'Supine Hamstring — Right'],
        ['hamstring-left', 'Supine Hamstring — Left'],
        ['figure-four-right', 'Figure-Four Glute — Right'],
        ['figure-four-left', 'Figure-Four Glute — Left'],
        ['thread-the-needle', 'Thread the Needle'],
        ['cat-cow', 'Cat-Cow'],
      ],
      30,
    ),
  ],
  loggedExerciseIds: CB_ROUNDS.flatMap(([combo, cardio]) => [combo[0], cardio[0]]),
}
