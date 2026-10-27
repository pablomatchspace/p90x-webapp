import type { Sex } from '@/lib/body'

/**
 * Factorial energy expenditure (E40) — replaces the flat BMR × 1.55 of E22.
 *
 *   BMR   = mean(Katch–McArdle, Cunningham) when lean mass is known, else
 *           Mifflin–St Jeor
 *   TDEE  = BMR × daily-life factor (1.4)          non-exercise living + digestion
 *         + average exercise energy                the program's own schedule
 *
 * Exercise energy is net MET energy, (MET − 1) × kg × hours: the resting 1 MET
 * is already inside BMR × factor, so counting it again would double-book it.
 * It is averaged over every day of the program template (rest days count as
 * zero), giving the stable weekly-average intake the E22 target is built on.
 * Sources, evidence tiers and the known limits are in
 * docs/requirements/ffmi-tdee-science.md.
 */

/** Non-exercise living, incl. digestion: sedentary band starts at PAL 1.40 (FAO/WHO/UNU 2004). */
export const DAILY_LIFE_FACTOR = { low: 1.3, mid: 1.4, high: 1.5 } as const
/** ≈1 SD of BMR prediction error in trained adults (limits of agreement ±200–300 kcal on ~1700). */
export const BMR_UNCERTAINTY = 0.08
/** Compendium MET values are group means; individual cost differs by about a quarter. */
export const EXERCISE_UNCERTAINTY = 0.25

/** Cunningham (1980): 500 + 22 × lean mass (kg) — the athlete-validated equation. */
export function cunningham(leanKg: number | null): number | null {
  if (leanKg == null) return null
  return 500 + 22 * leanKg
}

export type BmrMethod = 'average' | 'mifflin'

export interface BmrEstimate {
  /** kcal/day used in the TDEE */
  value: number
  method: BmrMethod
  /** the individual equations, kept for the cross-check display */
  katch: number | null
  cunningham: number | null
  mifflin: number | null
}

/** Mifflin–St Jeor BMR (kcal/day); null if any input is missing. */
export function mifflinStJeor(
  weightKg: number | null,
  heightM: number | null,
  age: number | null,
  gender: Sex,
): number | null {
  if (weightKg == null || heightM == null || age == null) return null
  return 10 * weightKg + 6.25 * (heightM * 100) - 5 * age + (gender === 'male' ? 5 : -161)
}

/** Katch–McArdle BMR (kcal/day) from lean mass; null if lean mass is missing. */
export function katchMcArdle(leanKg: number | null): number | null {
  if (leanKg == null) return null
  return 370 + 21.6 * leanKg
}

export function estimateBmr(opts: {
  leanKg: number | null
  weightKg: number
  heightM: number | null
  age: number | null
  gender: Sex
}): BmrEstimate | null {
  const katch = katchMcArdle(opts.leanKg)
  const cun = cunningham(opts.leanKg)
  const mifflin = mifflinStJeor(opts.weightKg, opts.heightM, opts.age, opts.gender)
  if (katch !== null && cun !== null) {
    return { value: (katch + cun) / 2, method: 'average', katch, cunningham: cun, mifflin }
  }
  if (mifflin !== null) {
    return { value: mifflin, method: 'mifflin', katch: null, cunningham: null, mifflin }
  }
  return null
}

export interface WorkoutEnergySpec {
  /** nominal session length in minutes */
  minutes: number
  /** 2024 Adult Compendium MET (gross; 1 MET ≈ 1 kcal/kg/h) */
  met: number
  /** why this MET and this length */
  source: string
}

const STRENGTH = '02050 resistance training, vigorous effort (6.0)'
const CALISTHENICS = '02020 calisthenics, vigorous effort (7.5)'
const CIRCUIT = 'resistance circuit with reciprocal supersets (5.8)'
const VIDEO_CARDIO = 'video cardio-resistance workout, vigorous effort (6.0)'
const MARTIAL = '15425 martial arts, slower pace / practice drills (5.3) — lower bound'
const MOBILITY = 'nearest stretching/yoga entry: Hatha yoga (2.3)'
const NOMINAL = 'nominal disc length, rounded'

/**
 * Per-workout session length and MET, keyed by catalog workout key. Rest and the
 * Generation Next bonus add-ons carry no entry (zero exercise energy). MET
 * assignment is a Tier-C mapping of each workout to the closest Compendium
 * entry — the ± band on the TDEE carries the uncertainty.
 */
export const WORKOUT_ENERGY: Record<string, WorkoutEnergySpec> = {
  'chest-back': { minutes: 60, met: 6.0, source: `${STRENGTH}; ${NOMINAL}` },
  'shoulders-arms': { minutes: 60, met: 6.0, source: `${STRENGTH}; ${NOMINAL}` },
  'legs-back': { minutes: 60, met: 6.0, source: `${STRENGTH}; ${NOMINAL}` },
  'chest-shoulders-triceps': { minutes: 60, met: 6.0, source: `${STRENGTH}; ${NOMINAL}` },
  'back-biceps': { minutes: 60, met: 6.0, source: `${STRENGTH}; ${NOMINAL}` },
  'ab-ripper-x': { minutes: 16, met: 6.0, source: `${VIDEO_CARDIO}; ${NOMINAL}` },
  'core-synergistics': { minutes: 45, met: 5.8, source: `${CIRCUIT}; ${NOMINAL}` },
  plyometrics: {
    minutes: 47,
    met: 7.5,
    source: `${CALISTHENICS}; length = the authored play timeline (47 min)`,
  },
  'yoga-x': { minutes: 90, met: 4.0, source: `02160 Yoga, Power (4.0); ${NOMINAL}` },
  'kenpo-x': { minutes: 60, met: 5.3, source: `${MARTIAL}; ${NOMINAL}` },
  'cardio-x': { minutes: 45, met: 6.0, source: `${VIDEO_CARDIO}; ${NOMINAL}` },
  'x-stretch': { minutes: 60, met: 2.3, source: `${MOBILITY}; ${NOMINAL}` },

  // Generation Next — lengths from docs/requirements/gennext-workouts.md (video runtimes)
  'gn-push-strength': { minutes: 41, met: 6.0, source: `${STRENGTH}; video 41.3 min` },
  'gn-pull-strength': { minutes: 44, met: 6.0, source: `${STRENGTH}; video 43.9 min` },
  'gn-upper-body': { minutes: 47, met: 6.0, source: `${STRENGTH}; video 46.5 min` },
  'gn-lower-body': { minutes: 46, met: 6.0, source: `${STRENGTH}; video 46.3 min` },
  'gn-full-body-strength': { minutes: 46, met: 6.0, source: `${STRENGTH}; video 46.4 min` },
  'gn-full-body-power': { minutes: 48, met: 6.0, source: `${STRENGTH}; video 48.3 min` },
  'gn-core-circuit': { minutes: 38, met: 5.8, source: `${CIRCUIT}; video 38.0 min` },
  'gn-plyometrix': { minutes: 41, met: 7.5, source: `${CALISTHENICS}; video 40.8 min` },
  'gn-speed-and-agility': { minutes: 39, met: 7.5, source: `${CALISTHENICS}; video 39.1 min` },
  'gn-accel-decel': { minutes: 41, met: 7.5, source: `${CALISTHENICS}; video 40.7 min` },
  'gn-cardio-boxing': { minutes: 43, met: 6.0, source: `${VIDEO_CARDIO}; video 43.0 min` },
  'gn-active-mobility': {
    minutes: 30,
    met: 2.3,
    source: `${MOBILITY}; ≈ authored timeline plus untimed holds`,
  },
  'gn-active-flexibility': { minutes: 40, met: 2.3, source: `${MOBILITY}; video 39.8 min` },
  'gn-myofascial-release': { minutes: 25, met: 2.3, source: `${MOBILITY}; ≈ authored timeline` },
}

/** Net exercise kcal for one session of `key` at `weightKg`; 0 for rest, bonus and unknown keys. */
export function workoutKcal(key: string, weightKg: number): number {
  const spec = WORKOUT_ENERGY[key]
  if (spec === undefined) return 0
  return (spec.met - 1) * weightKg * (spec.minutes / 60)
}

/** Average exercise kcal per day over a program template (rest days count as 0). */
export function averageExerciseKcal(days: { workouts: string[] }[], weightKg: number): number {
  if (days.length === 0) return 0
  let total = 0
  for (const day of days) for (const key of day.workouts) total += workoutKcal(key, weightKg)
  return total / days.length
}

export interface TdeeEstimate {
  bmr: BmrEstimate
  factor: number
  /** BMR × factor — living without the scheduled workouts */
  baseline: number
  /** average scheduled-exercise energy per day */
  exercise: number
  tdee: number
  /** ≈ ±1 SD, root-sum-square of the BMR, daily-life and exercise errors */
  low: number
  high: number
}

export function estimateTdee(bmr: BmrEstimate, exerciseKcalPerDay: number): TdeeEstimate {
  const factor = DAILY_LIFE_FACTOR.mid
  const baseline = bmr.value * factor
  const tdee = baseline + exerciseKcalPerDay
  const spread = Math.hypot(
    BMR_UNCERTAINTY * baseline,
    (DAILY_LIFE_FACTOR.high - factor) * bmr.value,
    EXERCISE_UNCERTAINTY * exerciseKcalPerDay,
  )
  return {
    bmr,
    factor,
    baseline,
    exercise: exerciseKcalPerDay,
    tdee,
    low: tdee - spread,
    high: tdee + spread,
  }
}
