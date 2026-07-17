import { fractionToPercent, kgToUnit, targetWeight, weightUnit, type BodyDerived } from '@/lib/body'
import { normalizedFfmi } from '@/lib/body'
import { diffDays, type ISODate } from '@/lib/shared'
import type { BodyEntry, Settings } from '@/lib/shared'
import type { ChipTone } from '@/features/schedule/Chip'

/**
 * The body-metric descriptors shared by the trend charts (US-061) and the
 * dashboard KPI cards (US-060): each metric knows how to read its value off a
 * weigh-in and where its SETUP start / target / limit sit, so both surfaces read
 * one source of truth and can never disagree.
 */

export type MetricKey = 'weight' | 'bodyFat' | 'bmi' | 'leanMass' | 'ffmi'

export interface BodyMetric {
  key: MetricKey
  label: string
  unit: string
  /** stroke color for the trend line */
  color: string
  dp: number
  higherIsBetter: boolean
  value: (entry: BodyEntry, derived: BodyDerived) => number | null
  start: number | null
  target: number | null
  limit: number | null
}

export const TONE_CHIP: Record<'good' | 'watch' | 'over', ChipTone> = {
  good: 'green',
  watch: 'amber',
  over: 'rose',
}

/** Percent of the way from start to target for a metric's latest value. */
export function progressToTarget(metric: BodyMetric, latest: number | null): number | null {
  if (latest === null || metric.start === null || metric.target === null) return null
  const denom = metric.higherIsBetter ? metric.target - metric.start : metric.start - metric.target
  const num = metric.higherIsBetter ? latest - metric.start : metric.start - latest
  if (denom === 0) return null
  return Math.round((num / denom) * 100)
}

/** Expected whole-percent progress through a target over the program horizon. */
export function expectedProgressPct(
  startDate: ISODate | null,
  today: ISODate,
  horizonDays = 90,
): number | null {
  if (startDate === null || horizonDays <= 0) return null
  return Math.round(Math.max(0, Math.min(1, diffDays(startDate, today) / horizonDays)) * 100)
}

export function buildBodyMetrics(settings: Settings): BodyMetric[] {
  const units = settings.units
  const unit = weightUnit(units)
  const w = (kg: number | null) => (kg === null ? null : kgToUnit(kg, units))
  const height = settings.height
  const h2 = height !== null && height !== undefined && height > 0 ? height * height : null
  const startW = settings.startWeight ?? null
  const startBf = settings.startBodyFat ?? null
  const tW = targetWeight(settings)
  const startLean = startW !== null && startBf !== null ? startW * (1 - startBf) : null
  const inc = settings.targets.leanMassIncrease ?? null
  const targetLean = startLean !== null && inc !== null ? startLean + inc : null
  const startBmi = startW !== null && h2 !== null ? startW / h2 : null
  const targetBmi = tW !== null && h2 !== null ? tW / h2 : null
  const startFfmi =
    startLean !== null && height !== null && height !== undefined
      ? normalizedFfmi(startLean, height)
      : null

  return [
    {
      key: 'weight',
      label: 'Weight',
      unit,
      color: '#ef4444',
      dp: 1,
      higherIsBetter: false,
      value: (e) => (e.weight != null ? kgToUnit(e.weight, units) : null),
      start: w(startW),
      target: w(tW),
      limit: w(settings.limits.weight ?? null),
    },
    {
      key: 'bodyFat',
      label: 'Body fat',
      unit: '%',
      color: '#f59e0b',
      dp: 1,
      higherIsBetter: false,
      value: (e) => fractionToPercent(e.bodyFat ?? null),
      start: fractionToPercent(startBf),
      target: fractionToPercent(settings.targets.bodyFat ?? null),
      limit: fractionToPercent(settings.limits.bodyFat ?? null),
    },
    {
      key: 'bmi',
      label: 'BMI',
      unit: '',
      color: '#8b5cf6',
      dp: 2,
      higherIsBetter: false,
      value: (_e, d) => d.bmi,
      start: startBmi,
      target: targetBmi,
      limit: settings.limits.bmi ?? null,
    },
    {
      key: 'leanMass',
      label: 'Lean',
      unit,
      color: '#10b981',
      dp: 1,
      higherIsBetter: true,
      value: (_e, d) => w(d.leanMass),
      start: w(startLean),
      target: w(targetLean),
      limit: null,
    },
    {
      key: 'ffmi',
      label: 'FFMI',
      unit: '',
      color: '#0ea5e9',
      dp: 2,
      higherIsBetter: true,
      value: (_e, d) => d.ffmi,
      start: startFfmi,
      target: settings.targets.ffmi ?? null,
      limit: null,
    },
  ]
}
