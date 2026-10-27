import type { BodyEntry, Settings } from '@/lib/shared'
import { normalizedFfmi } from './ffmi'

/**
 * FFMI reference scale and start-vs-current summary (E40).
 *
 * The category names replace the workbook's SCHEDULE!K bands (<18 / 20 / 22 / 23
 * / 25) by decision (E40 Q3): every anchor below is a published value, not a
 * spreadsheet convention — see docs/requirements/ffmi-tdee-science.md for the
 * sources and evidence tiers. The scale is the app's Kouri-normalized FFMI
 * (reference height 1.80 m), where the population anchors are exact at 1.80 m
 * and drift by about 0.06 per cm of height difference elsewhere.
 */

export type FfmiBandKey = 'low' | 'below' | 'above' | 'athletic' | 'beyond'

export interface FfmiBand {
  key: FfmiBandKey
  label: string
  /** inclusive lower edge (−∞ for the first band) */
  from: number
  /** what this lower edge is anchored to */
  source: string
}

export const FFMI_BANDS: readonly FfmiBand[] = [
  { key: 'low', label: 'Low', from: -Infinity, source: 'Below the ESPEN low-FFMI cut-off' },
  {
    key: 'below',
    label: 'Below average',
    from: 17,
    source: 'ESPEN 2015 malnutrition criteria: low FFMI is under 17 in men',
  },
  {
    key: 'above',
    label: 'Above average',
    from: 19,
    source: 'Adult male population median ≈ 19 (Schutz 2002: 18.9; NHANES III BIA ≈ 19.2)',
  },
  {
    key: 'athletic',
    label: 'Athletic',
    from: 21,
    source: 'Top ≈ 10% of adult men (NHANES III 90th percentile ≈ 21.4)',
  },
  {
    key: 'beyond',
    label: 'Above the usual natural range',
    from: 25,
    source:
      'Kouri 1995: drug-free lifters reached 25.0, steroid users exceeded it (later samples such as NCAA football linemen also exceed 25)',
  },
]

/** Display range of the scale bar. */
export const FFMI_SCALE = { min: 14, max: 28 } as const

export function ffmiBand(ffmi: number): FfmiBand {
  let found = FFMI_BANDS[0]
  for (const band of FFMI_BANDS) if (ffmi >= band.from) found = band
  return found
}

/** 0–1 position of a value on the scale bar, clamped to its display range. */
export function ffmiScalePosition(ffmi: number): number {
  const t = (ffmi - FFMI_SCALE.min) / (FFMI_SCALE.max - FFMI_SCALE.min)
  return Math.min(1, Math.max(0, t))
}

export interface FfmiSummary {
  /** normalized FFMI from the day-1 start stats */
  start: number | null
  /** normalized FFMI from the latest complete weigh-in (weight and body-fat) */
  current: number | null
  currentDate: string | null
  /** current − start */
  change: number | null
  /** stored FFMI target, if set */
  target: number | null
  /** whole-percent progress start → target for the current value (uncapped); null without a usable target */
  progressPct: number | null
  band: FfmiBand | null
}

type SummarySettings = Pick<Settings, 'height' | 'startWeight' | 'startBodyFat' | 'targets'>

/** Start vs current FFMI, derived — nothing here is stored (rule 2). */
export function ffmiSummary(settings: SummarySettings, bodyLog: BodyEntry[]): FfmiSummary {
  const height = settings.height ?? null
  const empty: FfmiSummary = {
    start: null,
    current: null,
    currentDate: null,
    change: null,
    target: settings.targets.ffmi ?? null,
    progressPct: null,
    band: null,
  }
  if (height === null || height <= 0) return empty

  const startW = settings.startWeight ?? null
  const startBf = settings.startBodyFat ?? null
  const start =
    startW !== null && startBf !== null ? normalizedFfmi(startW * (1 - startBf), height) : null

  let current: number | null = null
  let currentDate: string | null = null
  for (let i = bodyLog.length - 1; i >= 0; i--) {
    const { weight, bodyFat, date } = bodyLog[i]
    if (weight != null && bodyFat != null) {
      current = normalizedFfmi(weight * (1 - bodyFat), height)
      currentDate = date
      break
    }
  }

  const change = start !== null && current !== null ? current - start : null
  const target = empty.target
  const progressPct =
    start !== null && current !== null && target !== null && target !== start
      ? Math.round(((current - start) / (target - start)) * 100)
      : null

  return {
    start,
    current,
    currentDate,
    change,
    target,
    progressPct,
    band: current !== null ? ffmiBand(current) : null,
  }
}
