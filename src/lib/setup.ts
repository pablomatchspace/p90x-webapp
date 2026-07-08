import { targetWeight } from '@/lib/body'
import type { Settings } from '@/lib/schema'

/**
 * SETUP-screen derived read-outs (US-070, PRD §8) — the orange cells the sheet
 * computes from your start stats and targets. Everything here is canonical metric
 * (kg, m); the Settings screen converts for display. A value is null whenever one
 * of its inputs is missing, mirroring the workbook's blank / "CHECK VALUES!" cell.
 */
export interface SetupDerived {
  /** lean body mass = weight × (1 − bf) */
  startLean: number | null
  /** fat body mass = weight × bf */
  startFat: number | null
  /** BMI = weight / height² (canonical metric; the sheet's ×703 branch is only
   *  for inch/lb inputs, which we never store) */
  startBmi: number | null
  /** (LBM increase + start LBM) + start LBM × target bf — the workbook's formula */
  targetWeight: number | null
  /** target weight / height² */
  targetBmi: number | null
}

export function setupDerived(settings: Settings): SetupDerived {
  const w = settings.startWeight ?? null
  const bf = settings.startBodyFat ?? null
  const h = settings.height ?? null
  const h2 = h !== null && h > 0 ? h * h : null
  const tw = targetWeight(settings)
  return {
    startLean: w !== null && bf !== null ? w * (1 - bf) : null,
    startFat: w !== null && bf !== null ? w * bf : null,
    startBmi: w !== null && h2 !== null ? w / h2 : null,
    targetWeight: tw,
    targetBmi: tw !== null && h2 !== null ? tw / h2 : null,
  }
}

/**
 * Guardrails in the spirit of SETUP's "CHECK VALUES!" cell: surface missing or
 * incoherent inputs so the derived targets stay trustworthy. This is an additive
 * sanity check, not a verbatim port of the sheet's exact (undocumented) predicate.
 * An empty array means everything is consistent. The target-weight read-out itself
 * shows "CHECK VALUES!" separately whenever it cannot be computed at all.
 */
export function settingsWarnings(settings: Settings): string[] {
  const warnings: string[] = []
  // body-fat is stored as a 0–1 fraction; anything outside hints at a bad entry
  const fractions: [string, number | null][] = [
    ['Starting body-fat', settings.startBodyFat ?? null],
    ['Target body-fat', settings.targets.bodyFat ?? null],
    ['Upper body-fat limit', settings.limits.bodyFat ?? null],
  ]
  for (const [label, v] of fractions) {
    if (v !== null && (v <= 0 || v >= 1)) {
      warnings.push(`${label} looks out of range (expected 1–99%).`)
    }
  }

  const startBf = settings.startBodyFat ?? null
  const targetBf = settings.targets.bodyFat ?? null
  if (startBf !== null && targetBf !== null && targetBf >= startBf) {
    warnings.push('Target body-fat is not below your starting body-fat.')
  }

  const derived = setupDerived(settings)
  const limitWeight = settings.limits.weight ?? null
  if (
    derived.targetWeight !== null &&
    limitWeight !== null &&
    limitWeight <= derived.targetWeight
  ) {
    warnings.push('Upper weight limit is at or below your target weight.')
  }
  const limitBmi = settings.limits.bmi ?? null
  if (derived.targetBmi !== null && limitBmi !== null && limitBmi <= derived.targetBmi) {
    warnings.push('Upper BMI limit is at or below your target BMI.')
  }
  return warnings
}
