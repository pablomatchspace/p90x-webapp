import type { BodyEntry, BodyFraction, Kg, Meters, Settings } from '@/lib/shared'
import { bodyFraction, kg, meters } from '@/lib/shared'
import { normalizedFfmi } from './ffmi'

/**
 * Body-log derivations (US-050/051, PRD §6.3) — pure functions mirroring the
 * SCHEDULE sheet's derived columns:
 *
 *   weight loss = startWeight − weight                       (col C)
 *   BF kg       = weight × bf                                (col D)
 *   BMI         = weight / height²                           (col F; the sheet's
 *                 ×703 branch only converts its inch/lb inputs — storage here is
 *                 canonical metric, so the metric formula always applies)
 *   lean mass   = weight × (1 − bf)                          (col I, shown 1 dp)
 *   FFMI (Adj.) = leanMass/height² + 6.1 × (1.8 − height)    (col J, raw lean)
 *
 * Workbook defect B2 is intentionally not replicated: every metric is null
 * unless all of its inputs exist, so empty scale days derive nothing.
 */

export interface BodyDerived {
  weightLoss: number | null
  bodyFatKg: number | null
  bmi: number | null
  leanMass: number | null
  ffmi: number | null
  ffmiCategory: string | null
}

type BodySettings = Pick<Settings, 'height' | 'startWeight'>

export function deriveBody(entry: BodyEntry, settings: BodySettings): BodyDerived {
  const weight = entry.weight ?? null
  const bf = entry.bodyFat ?? null
  const height = settings.height ?? null
  const start = settings.startWeight ?? null
  const h2 = height !== null && height > 0 ? height * height : null

  const leanMass = weight !== null && bf !== null ? weight * (1 - bf) : null
  const ffmi = leanMass !== null && height !== null ? normalizedFfmi(leanMass, height) : null
  return {
    weightLoss: weight !== null && start !== null ? start - weight : null,
    bodyFatKg: weight !== null && bf !== null ? weight * bf : null,
    bmi: weight !== null && h2 !== null ? weight / h2 : null,
    leanMass,
    ffmi,
    ffmiCategory: ffmi === null ? null : ffmiCategory(ffmi),
  }
}

/** SCHEDULE!K category bands, verbatim from the workbook's nested IF. */
export function ffmiCategory(ffmi: number): string {
  if (ffmi < 18) return 'Below Average'
  if (ffmi < 20) return 'Average'
  if (ffmi < 22) return 'Above Average'
  if (ffmi < 23) return 'Excellent'
  if (ffmi < 25) return 'Advanced/Near Limit'
  return 'Possibly Enhanced'
}

type TargetSettings = Pick<Settings, 'startWeight' | 'startBodyFat' | 'targets'>

/**
 * SETUP's derived target weight — the green anchor of the sheet's color scales:
 * (LBM increase + start LBM) + start LBM × target BF%. This is the workbook's
 * own (dimensionally quirky) formula, kept verbatim; with the real SETUP values
 * it yields the 66.9 kg target the charts reference. Null until all inputs exist.
 */
export function targetWeight(settings: TargetSettings): number | null {
  const start = settings.startWeight ?? null
  const startBf = settings.startBodyFat ?? null
  const inc = settings.targets.leanMassIncrease ?? null
  const targetBf = settings.targets.bodyFat ?? null
  if (start === null || startBf === null || inc === null || targetBf === null) return null
  const startLean = start * (1 - startBf)
  return inc + startLean + startLean * targetBf
}

/**
 * Discrete reading of the sheet's green→amber→red color scales (US-051):
 * 'good' at/better than the target, 'over' at/past the upper limit, 'watch'
 * between. With only one bound configured the missing side defaults to good.
 */
export type Threshold = 'good' | 'watch' | 'over'

export function threshold(
  value: number | null,
  target: number | null,
  limit: number | null,
): Threshold | null {
  if (value === null || (target === null && limit === null)) return null
  if (limit !== null && value >= limit) return 'over'
  if (target === null || value <= target) return 'good'
  return 'watch'
}

/**
 * Weight loss runs the opposite way (more is better) — the sheet anchors red at
 * zero loss and green at the full start→target distance.
 */
export function lossThreshold(
  loss: number | null,
  startWeight: number | null,
  target: number | null,
): Threshold | null {
  if (loss === null || startWeight === null || target === null) return null
  if (loss <= 0) return 'over'
  return loss >= startWeight - target ? 'good' : 'watch'
}

export const KG_PER_LB = 0.45359237
export const M_PER_INCH = 0.0254

export function weightUnit(units: Settings['units']): 'kg' | 'lb' {
  return units === 'imperial' ? 'lb' : 'kg'
}

export function heightUnit(units: Settings['units']): 'm' | 'in' {
  return units === 'imperial' ? 'in' : 'm'
}

/** Canonical kg → display units. Imperial rounds to 1 dp for readable fields. */
export function kgToUnit(kg: number, units: Settings['units']): number {
  return units === 'imperial' ? Math.round((kg / KG_PER_LB) * 10) / 10 : kg
}

/** Display units → canonical kg, stored raw (only user edits pass through). */
export function unitToKg(value: number, units: Settings['units']): Kg {
  return kg(units === 'imperial' ? value * KG_PER_LB : value)
}

/** Canonical metres → display units (inches, 1 dp). Height stays metric in storage. */
export function mToUnit(m: number, units: Settings['units']): number {
  return units === 'imperial' ? Math.round((m / M_PER_INCH) * 10) / 10 : m
}

export function unitToM(value: number, units: Settings['units']): Meters {
  return meters(units === 'imperial' ? value * M_PER_INCH : value)
}

/** Stored fraction (0–1) → display percent, trimmed of float noise (0.212 → 21.2). */
export function fractionToPercent(value: number | null): number | null {
  return value === null ? null : Math.round(value * 100 * 1000) / 1000
}

export function percentToFraction(value: number | null): BodyFraction | null {
  return value === null ? null : bodyFraction(value / 100)
}

/** Fixed-dp display that drops trailing zeros; '—' when the metric is null. */
export function formatFixed(value: number | null, dp: number): string {
  return value === null ? '—' : String(Number(value.toFixed(dp)))
}
