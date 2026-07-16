import { KG_PER_LB } from '@/lib/body'
import { diffDays, type ISODate } from '@/lib/shared'
import { leanMassForFfmi } from '@/lib/body'
import type { BodyEntry, Settings } from '@/lib/shared'

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
 * prescribes, not what it takes to reach *this* athlete's stored targets. This
 * second engine is composition-aware: the stored targets are body-composition
 * targets (lean-mass increase, body-fat %, FFMI), so it budgets the fat and
 * lean deltas separately instead of netting them into one scale-weight number
 * (all sourced in docs/requirements/nutrition-targets.md):
 *
 *   TDEE     = BMR × activity factor. BMR from Katch–McArdle (uses lean mass,
 *              the better choice when body-fat is known) when lean mass is
 *              available, else Mifflin–St Jeor (the best-validated equation
 *              from weight/height/age/sex).
 *   calories = TDEE + (fatΔ × 7700 + leanΔ × 1800) over the remaining days —
 *              fat and lean tissue have very different energy densities, so a
 *              recomp (lose fat, gain lean, scale barely moves) still gets a
 *              real deficit. Each weekly rate is clamped to its muscle-sparing
 *              band (Helms fat-loss ≤1%/wk; usable lean-gain ≤~0.5%/wk) and
 *              the result is floored at BMR.
 *   protein  = 1.6–2.2 g/kg (Morton/ISSN), the higher end whenever fat loss is
 *              intended (deficit or recomp).
 *   fat      = 0.8 g/kg (floored at 0.5 for hormonal health).
 *   carbs    = the remainder; the low-carb diet style caps them at the <130 g
 *              consensus threshold and shifts the spare calories into fat.
 *
 * Nothing here is stored except the diet-style preference (rule 2); every
 * number is recomputed from raw inputs.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Moderately active — P90X is ~1 h of demanding work ~6 days/week. */
export const ACTIVITY_FACTOR = 1.55
/** Energy density of adipose tissue (~3500 kcal/lb). */
export const KCAL_PER_KG = 7700
/** Energy density of lean (fat-free) tissue — mostly water, ~1800 kcal/kg (Hall). */
export const LEAN_KCAL_PER_KG = 1800
/** Muscle-sparing rate ceilings, fraction of body weight per week. */
export const SAFE_DEFICIT_RATE = 0.01
export const SAFE_SURPLUS_RATE = 0.005
/** Protein g/kg body weight — higher whenever fat loss is intended (Helms/Barakat). */
export const PROTEIN_G_PER_KG = {
  deficit: 2.2,
  recomp: 2.2,
  maintenance: 1.8,
  surplus: 1.8,
} as const
/** Fat g/kg body weight and the hormonal-health floor. */
export const FAT_G_PER_KG = 0.8
export const FAT_FLOOR_G_PER_KG = 0.5
/** Low-carb consensus threshold: under 130 g/day (ADA / Feinman 2015). */
export const LOW_CARB_CAP_G = 130

export type NutritionGoal = 'deficit' | 'surplus' | 'recomp' | 'maintenance'
export type DietStyle = 'balanced' | 'lowCarb'

/** Composition deltas below this are treated as "no change intended". */
const DELTA_EPSILON_KG = 0.05

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

export interface TargetComposition {
  targetLeanKg: number
  targetFatKg: number
}

/**
 * Resolve the stored body-composition targets into a target lean/fat pair,
 * anchored to the *latest* weigh-in (not day-1 stats — that's the workbook's
 * chart-parity quirk in body.ts targetWeight, deliberately not reused here):
 *
 *   target lean = start lean + leanMassIncrease when that target is set (the
 *                 increase is defined against day 1, falling back to current
 *                 lean when start stats are missing); else the lean mass the
 *                 FFMI target implies; else current lean (no change intended).
 *   target fat  = the fat mass carrying target lean at the target body-fat %
 *                 (lean × bf/(1−bf)); else current fat (no change intended).
 *
 * Null when no target is set at all, or when body-fat was never logged (no
 * composition to aim from).
 */
export function targetComposition(
  settings: Settings,
  bodyLog: BodyEntry[],
): TargetComposition | null {
  const { leanMassIncrease, bodyFat, ffmi } = settings.targets
  if (leanMassIncrease == null && bodyFat == null && ffmi == null) return null
  const weight = currentWeightKg(settings, bodyLog)
  const lean = currentLeanKg(settings, bodyLog)
  if (weight == null || lean == null) return null

  const startLean =
    settings.startWeight != null && settings.startBodyFat != null
      ? settings.startWeight * (1 - settings.startBodyFat)
      : null
  const targetLeanKg =
    leanMassIncrease != null
      ? (startLean ?? lean) + leanMassIncrease
      : ffmi != null && settings.height != null
        ? (leanMassForFfmi(ffmi, settings.height) ?? lean)
        : lean
  const targetFatKg =
    bodyFat != null && bodyFat < 1 ? (targetLeanKg * bodyFat) / (1 - bodyFat) : weight - lean
  return { targetLeanKg, targetFatKg }
}

export interface TargetNutrition {
  bmr: number
  bmrMethod: 'katch' | 'mifflin'
  tdee: number
  currentWeightKg: number
  targetWeightKg: number
  horizonWeeks: number
  goal: NutritionGoal
  dietStyle: DietStyle
  /** signed planned composition change over the horizon */
  fatDeltaKg: number
  leanDeltaKg: number
  /** signed weekly paces after the safe-band clamps; weeklyRateKg is their (net scale) sum */
  weeklyFatKg: number
  weeklyLeanKg: number
  weeklyRateKg: number
  weeklyRatePctBw: number
  /** a delta implied a faster pace than its safe band, so that rate was capped */
  rateClamped: boolean
  calories: number
  /** the deficit would have dropped calories below BMR, so it was raised to BMR */
  caloriesFloored: boolean
  protein: number
  fat: number
  carbs: number
  proteinPerKg: number
  /** effective — rises above 0.8 when the low-carb cap shifts calories into fat */
  fatPerKg: number
  /** the low-carb style capped carbs at LOW_CARB_CAP_G */
  carbsCapped: boolean
}

/**
 * Evidence-based calories + macros to change composition by `fatDeltaKg` /
 * `leanDeltaKg` over `horizonWeeks`. Returns null when there isn't enough to
 * compute a BMR and a current weight, or when no composition target exists —
 * the caller then prompts for the missing inputs.
 */
export function targetNutrition(opts: {
  currentWeightKg: number | null
  leanKg: number | null
  heightM: number | null
  age: number | null
  gender: 'male' | 'female'
  fatDeltaKg: number | null
  leanDeltaKg: number | null
  horizonWeeks: number
  dietStyle: DietStyle
}): TargetNutrition | null {
  const { currentWeightKg: weight, leanKg, heightM, age, gender, fatDeltaKg, leanDeltaKg } = opts
  if (weight == null || weight <= 0 || fatDeltaKg == null || leanDeltaKg == null) return null

  const katch = katchMcArdle(leanKg)
  const mifflin = mifflinStJeor(weight, heightM, age, gender)
  const bmr = katch ?? mifflin
  if (bmr == null) return null
  const bmrMethod: 'katch' | 'mifflin' = katch != null ? 'katch' : 'mifflin'
  const tdee = bmr * ACTIVITY_FACTOR

  const weeks = opts.horizonWeeks > 0 ? opts.horizonWeeks : 1
  // Each tissue gets its own muscle-sparing pace ceiling (only the directions
  // the bands are about: fat loss and lean gain).
  const rawFatWk = fatDeltaKg / weeks
  const rawLeanWk = leanDeltaKg / weeks
  const weeklyFatKg = Math.max(rawFatWk, -SAFE_DEFICIT_RATE * weight)
  const weeklyLeanKg = Math.min(rawLeanWk, SAFE_SURPLUS_RATE * weight)
  const rateClamped =
    Math.abs(rawFatWk - weeklyFatKg) > 1e-9 || Math.abs(rawLeanWk - weeklyLeanKg) > 1e-9
  const weeklyRateKg = weeklyFatKg + weeklyLeanKg
  const dailyOffset = (weeklyFatKg * KCAL_PER_KG + weeklyLeanKg * LEAN_KCAL_PER_KG) / 7

  let calories = tdee + dailyOffset
  const caloriesFloored = calories < bmr
  if (caloriesFloored) calories = bmr
  calories = Math.round(calories)

  const losingFat = fatDeltaKg < -DELTA_EPSILON_KG
  const gainingLean = leanDeltaKg > DELTA_EPSILON_KG
  const goal: NutritionGoal =
    losingFat && gainingLean
      ? 'recomp'
      : losingFat
        ? 'deficit'
        : gainingLean
          ? 'surplus'
          : 'maintenance'
  const proteinPerKg = PROTEIN_G_PER_KG[goal]
  const protein = proteinPerKg * weight
  let fat = FAT_G_PER_KG * weight
  const carbsFill = (calories - protein * 4 - fat * 9) / 4
  const carbsCapped = opts.dietStyle === 'lowCarb' && carbsFill > LOW_CARB_CAP_G
  const carbs = carbsCapped ? LOW_CARB_CAP_G : Math.max(0, carbsFill)
  if (carbsCapped) fat = (calories - protein * 4 - carbs * 4) / 9
  const fatPerKg = Math.round((fat / weight) * 10) / 10

  return {
    bmr,
    bmrMethod,
    tdee,
    currentWeightKg: weight,
    targetWeightKg: weight + fatDeltaKg + leanDeltaKg,
    horizonWeeks: weeks,
    goal,
    dietStyle: opts.dietStyle,
    fatDeltaKg,
    leanDeltaKg,
    weeklyFatKg,
    weeklyLeanKg,
    weeklyRateKg,
    weeklyRatePctBw: weeklyRateKg / weight,
    rateClamped,
    calories,
    caloriesFloored,
    protein,
    fat,
    carbs,
    proteinPerKg,
    fatPerKg,
    carbsCapped,
  }
}

/** Convenience composer from app state — resolves current stats, composition targets and horizon. */
export function targetNutritionFromState(
  settings: Settings,
  bodyLog: BodyEntry[],
  today: ISODate,
): TargetNutrition | null {
  const weight = currentWeightKg(settings, bodyLog)
  const lean = currentLeanKg(settings, bodyLog)
  const comp = targetComposition(settings, bodyLog)
  return targetNutrition({
    currentWeightKg: weight,
    leanKg: lean,
    heightM: settings.height ?? null,
    age: settings.age ?? null,
    gender: settings.gender,
    fatDeltaKg:
      comp !== null && weight !== null && lean !== null ? comp.targetFatKg - (weight - lean) : null,
    leanDeltaKg: comp !== null && lean !== null ? comp.targetLeanKg - lean : null,
    horizonWeeks: remainingProgramDays(settings.startDate, today) / 7,
    dietStyle: settings.nutrition.dietStyle,
  })
}

/**
 * Nutrition-override guard (E22). Only the raw override inputs are stored —
 * calories, level and grams stay derived (rule 2). Live mutation bypasses
 * Zod, so a non-positive calorie override is treated as clearing it.
 */
export function applyNutritionPatch(
  nutrition: Settings['nutrition'],
  patch: Partial<Settings['nutrition']>,
): void {
  if (patch.phaseOverride !== undefined) nutrition.phaseOverride = patch.phaseOverride
  if (patch.calorieOverride !== undefined) {
    const value = patch.calorieOverride
    nutrition.calorieOverride = value !== null && Number.isFinite(value) && value > 0 ? value : null
  }
  if (patch.dietStyle !== undefined) nutrition.dietStyle = patch.dietStyle
}
