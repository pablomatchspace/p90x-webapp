import { KG_PER_LB, targetWeight } from '@/lib/body'
import { diffDays, type ISODate } from '@/lib/dates'
import type { BodyEntry, Settings } from '@/lib/schema'

/**
 * P90X Nutrition Plan targets (E22). The workbook's nutrition tabs were excluded
 * from the port (PRD §out-of-scope), so the oracle here is the published P90X
 * Nutrition Plan guide ("Eating for Power Performance"), encoded verbatim — see
 * docs/requirements/nutrition-targets.md for the sourced formulas:
 *
 *   RMR            = body weight (lb) × 10
 *   activity burn  = RMR × 20%
 *   energy amount  = RMR + activity burn + 600 (the ~P90X workout burn)
 *   level          I: 1800–2399 · II: 2400–2999 · III: 3000+  (below 1800 rounds
 *                  up to Level I — the guide's minimum plan)
 *   plan calories  I: 1800 · II: 2400 · III: 3000
 *
 * Macro split follows the nutrition phase, by default aligned with the training
 * blocks (weeks 1–4 / 5–8 / 9–13) exactly like ProgramDay.phase; the guide lets
 * you linger in a phase, hence settings.nutrition.phaseOverride.
 *
 * Everything here is derived — only the two overrides are stored (rule 2).
 */

export type NutritionPhase = 1 | 2 | 3

export interface MacroSplit {
  /** calorie shares, fractions summing to 1 */
  protein: number
  carbs: number
  fat: number
}

export const PHASE_NAMES: Record<NutritionPhase, string> = {
  1: 'Fat Shredder',
  2: 'Energy Booster',
  3: 'Endurance Maximizer',
}

/** Guide's per-phase calorie shares (protein/carbs/fat). */
export const PHASE_SPLITS: Record<NutritionPhase, MacroSplit> = {
  1: { protein: 0.5, carbs: 0.3, fat: 0.2 },
  2: { protein: 0.4, carbs: 0.4, fat: 0.2 },
  3: { protein: 0.2, carbs: 0.6, fat: 0.2 },
}

export type NutritionLevel = 'I' | 'II' | 'III'

export const LEVEL_CALORIES: Record<NutritionLevel, number> = {
  I: 1800,
  II: 2400,
  III: 3000,
}

/** Atwater factors — kcal per gram of each macro. */
const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const

/** Guide steps 1–3: RMR + 20% daily activity burn + 600 kcal exercise expenditure. */
export function energyAmount(weightKg: number): number {
  const rmr = (weightKg / KG_PER_LB) * 10
  return rmr + rmr * 0.2 + 600
}

/** Guide's level chart; anything under 1800 rounds up to the Level I plan. */
export function nutritionLevel(energy: number): NutritionLevel {
  if (energy < 2400) return 'I'
  if (energy < 3000) return 'II'
  return 'III'
}

export interface MacroGrams {
  protein: number
  carbs: number
  fat: number
}

/** Grams of each macro for a daily calorie target under a phase's split. */
export function macroGrams(calories: number, phase: NutritionPhase): MacroGrams {
  const split = PHASE_SPLITS[phase]
  return {
    protein: (calories * split.protein) / KCAL_PER_GRAM.protein,
    carbs: (calories * split.carbs) / KCAL_PER_GRAM.carbs,
    fat: (calories * split.fat) / KCAL_PER_GRAM.fat,
  }
}

/** Latest logged weight wins; the day-1 start weight is the honest fallback. */
export function currentWeightKg(settings: Settings, bodyLog: BodyEntry[]): number | null {
  for (let i = bodyLog.length - 1; i >= 0; i--) {
    const weight = bodyLog[i].weight
    if (weight != null) return weight
  }
  return settings.startWeight ?? null
}

export interface NutritionTargets {
  /** weight the energy amount was computed from (null when only the override made this possible) */
  weightKg: number | null
  /** guide steps 1–3 result, before the level chart */
  energy: number | null
  level: NutritionLevel | null
  /** effective daily target: calorieOverride, else the level plan */
  calories: number
  calorieOverridden: boolean
  phase: NutritionPhase
  phaseOverridden: boolean
  phaseName: string
  split: MacroSplit
  grams: MacroGrams
}

/**
 * Compose the day's targets. `schedulePhase` is the materialized day's training
 * phase (ProgramDay.phase); the stored phase override wins when set. Returns
 * null when no calorie target is derivable at all (no weight anywhere and no
 * calorie override).
 */
export function nutritionTargets(
  settings: Settings,
  bodyLog: BodyEntry[],
  schedulePhase: NutritionPhase,
): NutritionTargets | null {
  const weightKg = currentWeightKg(settings, bodyLog)
  const energy = weightKg !== null ? energyAmount(weightKg) : null
  const level = energy !== null ? nutritionLevel(energy) : null
  const override = settings.nutrition.calorieOverride ?? null
  const calories = override ?? (level !== null ? LEVEL_CALORIES[level] : null)
  if (calories === null) return null
  const phase = settings.nutrition.phaseOverride ?? schedulePhase
  return {
    weightKg,
    energy,
    level,
    calories,
    calorieOverridden: override !== null,
    phase,
    phaseOverridden: settings.nutrition.phaseOverride !== null,
    phaseName: PHASE_NAMES[phase],
    split: PHASE_SPLITS[phase],
    grams: macroGrams(calories, phase),
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * E22 — target-based recommendation (evidence-based layer)
 *
 * The P90X guide numbers above are goal-blind — they say what the boxed program
 * prescribes, not what it takes to reach *this* athlete's stored target. This
 * second engine derives calories and macros from current stats + the target
 * weight + the remaining program window, using current sports-nutrition
 * consensus (all sourced in docs/requirements/nutrition-targets.md):
 *
 *   TDEE     = BMR × activity factor. BMR from Katch–McArdle (uses lean mass,
 *              the better choice when body-fat is known) when lean mass is
 *              available, else Mifflin–St Jeor (the best-validated equation
 *              from weight/height/age/sex).
 *   calories = TDEE + the surplus/deficit implied by reaching the target weight
 *              over the remaining weeks (~7700 kcal per kg of body-weight
 *              change), clamped to the muscle-sparing safe-rate bands (Helms
 *              fat-loss ≤1%/wk; usable lean-gain ≤~0.5%/wk) and floored at BMR.
 *   protein  = 1.6–2.2 g/kg (Morton/ISSN), the higher end in a deficit.
 *   fat      = 0.8 g/kg (floored at 0.5 for hormonal health).
 *   carbs    = the remainder — which recreates the guide's "more carbs later"
 *              direction without hard-coding a percentage.
 *
 * Nothing here is stored (rule 2); it is all recomputed from raw inputs.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Moderately active — P90X is ~1 h of demanding work ~6 days/week. */
export const ACTIVITY_FACTOR = 1.55
/** Energy equivalent of a kg of body-weight change (~3500 kcal/lb). */
export const KCAL_PER_KG = 7700
/** Muscle-sparing rate ceilings, fraction of body weight per week. */
export const SAFE_DEFICIT_RATE = 0.01
export const SAFE_SURPLUS_RATE = 0.005
/** Protein g/kg body weight — higher in a deficit (Helms), within the 1.6–2.2 band. */
export const PROTEIN_G_PER_KG = { deficit: 2.2, maintenance: 1.8, surplus: 1.8 } as const
/** Fat g/kg body weight and the hormonal-health floor. */
export const FAT_G_PER_KG = 0.8
export const FAT_FLOOR_G_PER_KG = 0.5

export type NutritionGoal = 'deficit' | 'surplus' | 'maintenance'

/** Mifflin–St Jeor BMR (kcal/day); null if any input is missing. */
export function mifflinStJeor(
  weightKg: number | null,
  heightM: number | null,
  age: number | null,
  gender: 'male' | 'female',
): number | null {
  if (weightKg == null || heightM == null || age == null) return null
  return 10 * weightKg + 6.25 * (heightM * 100) - 5 * age + (gender === 'male' ? 5 : -161)
}

/** Katch–McArdle BMR (kcal/day) from lean mass; null if lean mass is missing. */
export function katchMcArdle(leanKg: number | null): number | null {
  if (leanKg == null) return null
  return 370 + 21.6 * leanKg
}

/** Latest weigh-in lean mass wins; the day-1 start stats are the honest fallback. */
export function currentLeanKg(settings: Settings, bodyLog: BodyEntry[]): number | null {
  for (let i = bodyLog.length - 1; i >= 0; i--) {
    const { weight, bodyFat } = bodyLog[i]
    if (weight != null && bodyFat != null) return weight * (1 - bodyFat)
  }
  if (settings.startWeight != null && settings.startBodyFat != null) {
    return settings.startWeight * (1 - settings.startBodyFat)
  }
  return null
}

/**
 * Remaining program window in whole days, matching E20's Reality-check horizon:
 * a not-yet-started or absent program plans a full 90 days; a finished program
 * gets a fresh 90-day block; otherwise it's the days left, clamped to 0–90.
 */
export function remainingProgramDays(startDate: ISODate | null, today: ISODate): number {
  if (startDate === null) return 90
  const raw = 90 - diffDays(startDate, today)
  if (raw <= 0) return 90 // finished → fresh block
  return Math.min(90, raw)
}

export interface TargetNutrition {
  bmr: number
  bmrMethod: 'katch' | 'mifflin'
  tdee: number
  currentWeightKg: number
  targetWeightKg: number
  horizonWeeks: number
  goal: NutritionGoal
  /** signed, clamped to the safe-rate band */
  weeklyRateKg: number
  weeklyRatePctBw: number
  /** the target implied a faster pace than the safe band, so the rate was capped */
  rateClamped: boolean
  calories: number
  /** the deficit would have dropped calories below BMR, so it was raised to BMR */
  caloriesFloored: boolean
  protein: number
  fat: number
  carbs: number
  proteinPerKg: number
  fatPerKg: number
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * Evidence-based calories + macros to reach `targetWeightKg` over `horizonWeeks`.
 * Returns null when there isn't enough to compute a BMR and a current weight, or
 * when no target weight exists — the caller then prompts for the missing inputs.
 */
export function targetNutrition(opts: {
  currentWeightKg: number | null
  leanKg: number | null
  heightM: number | null
  age: number | null
  gender: 'male' | 'female'
  targetWeightKg: number | null
  horizonWeeks: number
}): TargetNutrition | null {
  const { currentWeightKg: weight, leanKg, heightM, age, gender, targetWeightKg } = opts
  if (weight == null || weight <= 0 || targetWeightKg == null) return null

  const katch = katchMcArdle(leanKg)
  const mifflin = mifflinStJeor(weight, heightM, age, gender)
  const bmr = katch ?? mifflin
  if (bmr == null) return null
  const bmrMethod: 'katch' | 'mifflin' = katch != null ? 'katch' : 'mifflin'
  const tdee = bmr * ACTIVITY_FACTOR

  const weeks = opts.horizonWeeks > 0 ? opts.horizonWeeks : 1
  const rawRate = (targetWeightKg - weight) / weeks / weight
  const rate = clamp(rawRate, -SAFE_DEFICIT_RATE, SAFE_SURPLUS_RATE)
  const rateClamped = Math.abs(rawRate - rate) > 1e-9
  const weeklyRateKg = rate * weight
  const dailyOffset = (weeklyRateKg * KCAL_PER_KG) / 7

  let calories = tdee + dailyOffset
  const caloriesFloored = calories < bmr
  if (caloriesFloored) calories = bmr
  calories = Math.round(calories)

  const goal: NutritionGoal = rate < -1e-6 ? 'deficit' : rate > 1e-6 ? 'surplus' : 'maintenance'
  const proteinPerKg = PROTEIN_G_PER_KG[goal]
  const protein = proteinPerKg * weight
  const fatPerKg = FAT_G_PER_KG
  const fat = fatPerKg * weight
  const carbs = Math.max(0, (calories - protein * 4 - fat * 9) / 4)

  return {
    bmr,
    bmrMethod,
    tdee,
    currentWeightKg: weight,
    targetWeightKg,
    horizonWeeks: weeks,
    goal,
    weeklyRateKg,
    weeklyRatePctBw: rate,
    rateClamped,
    calories,
    caloriesFloored,
    protein,
    fat,
    carbs,
    proteinPerKg,
    fatPerKg,
  }
}

/** Convenience composer from app state — resolves current stats, target weight and horizon. */
export function targetNutritionFromState(
  settings: Settings,
  bodyLog: BodyEntry[],
  today: ISODate,
): TargetNutrition | null {
  return targetNutrition({
    currentWeightKg: currentWeightKg(settings, bodyLog),
    leanKg: currentLeanKg(settings, bodyLog),
    heightM: settings.height ?? null,
    age: settings.age ?? null,
    gender: settings.gender,
    targetWeightKg: targetWeight(settings),
    horizonWeeks: remainingProgramDays(settings.startDate, today) / 7,
  })
}
