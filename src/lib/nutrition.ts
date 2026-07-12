import { KG_PER_LB } from '@/lib/body'
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
