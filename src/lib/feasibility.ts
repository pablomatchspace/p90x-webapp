export type Experience = 'novice' | 'intermediate' | 'advanced'
export type Sex = 'male' | 'female'
export type RateModel = 'aragon' | 'lyle'
export type Verdict = 'realistic' | 'aggressive' | 'unrealistic'

export interface Band {
  low: number
  high: number
}

// Tier B — Aragon 2012 (% bodyweight / month). No female multiplier (Refalo 2025).
const ARAGON_PCT: Record<Experience, Band> = {
  novice: { low: 0.01, high: 0.015 },
  intermediate: { low: 0.005, high: 0.01 },
  advanced: { low: 0.0025, high: 0.005 },
}

// Tier B — McDonald (kg lean / year, male). Female ≈ ½; tiers map to years 1–3.
const LYLE_KG_PER_YEAR: Record<Experience, Band> = {
  novice: { low: 9, high: 11 },
  intermediate: { low: 4.5, high: 5.5 },
  advanced: { low: 2, high: 3 },
}

// Tier A/A− — approximate FFMI ceilings on the app's 6.1-normalized scale.
export const FFMI_CEILING: Record<Sex, number> = { male: 25.0, female: 23.9 }

// Tier A — Helms 2014 muscle-sparing fat-loss pace, % bodyweight per week.
export const FAT_LOSS_BAND = { low: 0.005, high: 0.01 }

// Product policy — verdict thresholds on required pace / best-model ceiling pace.
const REALISTIC_MAX = 0.85
const AGGRESSIVE_MAX = 1.15

export function monthlyGain(
  model: RateModel,
  exp: Experience,
  sex: Sex,
  bodyweightKg: number,
): Band {
  if (model === 'aragon') {
    const p = ARAGON_PCT[exp]
    return { low: p.low * bodyweightKg, high: p.high * bodyweightKg }
  }
  const y = LYLE_KG_PER_YEAR[exp]
  const f = sex === 'female' ? 0.5 : 1
  return { low: (y.low / 12) * f, high: (y.high / 12) * f }
}

export function bandVerdict(ratio: number): Verdict {
  if (ratio <= REALISTIC_MAX) return 'realistic'
  if (ratio <= AGGRESSIVE_MAX) return 'aggressive'
  return 'unrealistic'
}

export interface LeanGainAssessment {
  requiredGainKg: number
  requiredPaceKgPerMonth: number
  models: Record<RateModel, { monthly: Band; maxGain: Band }>
  /** Most optimistic high across both models over the supplied horizon. */
  bestMaxGainKg: number
  verdict: Verdict
}

export function assessLeanGain(
  requiredGainKg: number,
  months: number,
  exp: Experience,
  sex: Sex,
  bodyweightKg: number,
): LeanGainAssessment {
  const aragon = monthlyGain('aragon', exp, sex, bodyweightKg)
  const lyle = monthlyGain('lyle', exp, sex, bodyweightKg)
  const maxGain = (band: Band): Band => ({ low: band.low * months, high: band.high * months })
  const bestHighPace = Math.max(aragon.high, lyle.high)
  const requiredPace = months > 0 ? requiredGainKg / months : Infinity
  return {
    requiredGainKg,
    requiredPaceKgPerMonth: requiredPace,
    models: {
      aragon: { monthly: aragon, maxGain: maxGain(aragon) },
      lyle: { monthly: lyle, maxGain: maxGain(lyle) },
    },
    bestMaxGainKg: bestHighPace * months,
    verdict: requiredGainKg <= 0 ? 'realistic' : bandVerdict(requiredPace / bestHighPace),
  }
}

/**
 * Fat-mass loss required (informational), paced against Helms' band, which
 * targets *scale-weight* loss (docs/requirements/ffmi-feasibility.md §4), not
 * fat-mass loss. During a recomp the scale can hold or even rise while fat
 * still drops — lean gain offsets it — so the weekly-%BW guardrail only
 * applies once the plan actually calls for the scale to move down.
 */
export function assessFatLoss(
  currentWeightKg: number,
  currentBf: number,
  targetWeightKg: number,
  targetBf: number,
  weeks: number,
): { fatLossKg: number; weeklyPctBw: number; verdict: Verdict } | null {
  if (weeks <= 0 || currentWeightKg <= 0) return null
  const fatLossKg = currentWeightKg * currentBf - targetWeightKg * targetBf
  if (fatLossKg <= 0) return { fatLossKg, weeklyPctBw: 0, verdict: 'realistic' }
  const weightLossKg = currentWeightKg - targetWeightKg
  if (weightLossKg <= 0) return { fatLossKg, weeklyPctBw: 0, verdict: 'realistic' }
  const weeklyPctBw = weightLossKg / weeks / currentWeightKg
  // The upper safe bound drives the fat-loss verdict, using the shared policy thresholds.
  const ratio = weeklyPctBw / FAT_LOSS_BAND.high
  return { fatLossKg, weeklyPctBw, verdict: bandVerdict(ratio) }
}

export type RecompFlag = 'not-applicable' | 'ok' | 'harder' | 'unlikely'

export function recompFlag(
  requiresGain: boolean,
  requiresLoss: boolean,
  exp: Experience,
  currentBf: number,
): RecompFlag {
  if (!(requiresGain && requiresLoss)) return 'not-applicable'
  if (exp === 'novice' || currentBf >= 0.25) return 'ok'
  if (exp === 'advanced') return 'unlikely'
  return 'harder'
}

export function ceilingStatus(
  targetFfmi: number,
  sex: Sex,
): { ceiling: number; withinLimit: boolean } {
  const ceiling = FFMI_CEILING[sex]
  return { ceiling, withinLimit: targetFfmi <= ceiling }
}

/** Conservative low-end achievable FFMI; omitted when not meaningfully above current. */
export function suggestedTarget(
  baselineLean: number,
  height: number,
  exp: Experience,
  sex: Sex,
  bodyweightKg: number,
  months: number,
  currentFfmi: number,
  normalizedFfmi: (lean: number, h: number) => number | null,
): { ffmi: number; gainKg: number } | null {
  const lowGain =
    Math.min(
      monthlyGain('aragon', exp, sex, bodyweightKg).low,
      monthlyGain('lyle', exp, sex, bodyweightKg).low,
    ) * months
  const lean = baselineLean + lowGain
  const raw = normalizedFfmi(lean, height)
  if (raw === null) return null
  const ffmi = Math.round(raw * 10) / 10
  const capped = Math.min(ffmi, FFMI_CEILING[sex])
  return capped > currentFfmi + 0.1 ? { ffmi: capped, gainKg: lowGain } : null
}
