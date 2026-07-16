/**
 * Normalized FFMI (E14) — the SCHEDULE col-J adjustment shared by deriveBody,
 * the dashboard metrics and the Settings target estimator, plus its inverse for
 * planning: pick a target normalized FFMI, get the lean mass / weight it
 * implies. Workbook constant 6.1 at the 1.8 m reference height — kept over
 * MyPlate's 6.3 by decision (E14 Q10) so targets and tracked values always
 * live on the same scale.
 */
export function normalizedFfmi(leanMass: number, height: number): number | null {
  if (height <= 0) return null
  return leanMass / (height * height) + 6.1 * (1.8 - height)
}

/** Inverse of normalizedFfmi: the lean mass that lands on `ffmi` at `height`. */
export function leanMassForFfmi(ffmi: number, height: number): number | null {
  if (height <= 0) return null
  return (ffmi - 6.1 * (1.8 - height)) * height * height
}

/** Total weight carrying `leanMass` at body-fat fraction `bf` (0–1). */
export function weightForLeanMass(leanMass: number, bf: number): number | null {
  if (bf < 0 || bf >= 1) return null
  return leanMass / (1 - bf)
}

export interface FfmiPlan {
  /** lean mass the target FFMI implies at this height (kg) */
  lean: number
  /** FFMI-implied total weight at the plan body-fat (kg) */
  weight: number
  /** honest lean-mass increase vs start lean, 3-dp (kg) — E14 option A */
  increase: number
  /** the workbook's quirky target-weight formula with the applied increase (kg) */
  sheetTargetWeight: number
}

/**
 * Compose an E14 target plan from a normalized-FFMI goal, a plan body-fat
 * fraction, the height and the current start lean. Pure; null when any input
 * makes the plan undefined (bad height/bf/lean). Extracted verbatim from the
 * E14 SettingsPage IIFE so the estimator and the E20 feasibility engine share
 * one source of truth.
 */
export function planFromFfmi(
  ffmi: number,
  bf: number,
  height: number,
  startLean: number,
): FfmiPlan | null {
  const lean = leanMassForFfmi(ffmi, height)
  if (lean === null) return null
  const weight = weightForLeanMass(lean, bf)
  if (weight === null) return null
  const increase = Math.round((lean - startLean) * 1000) / 1000
  return { lean, weight, increase, sheetTargetWeight: increase + startLean + startLean * bf }
}
