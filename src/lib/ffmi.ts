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
