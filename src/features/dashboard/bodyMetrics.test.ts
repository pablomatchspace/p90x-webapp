import { describe, expect, it } from 'vitest'
import type { Settings } from '@/lib/schema'
import {
  buildBodyMetrics,
  expectedProgressPct,
  progressToTarget,
  type BodyMetric,
} from './bodyMetrics'

/** Fabricated sample settings used by the public import fixture. */
const sample: Settings = {
  program: 'classic',
  startDate: '2026-01-05',
  units: 'metric',
  gender: 'male',
  age: 40,
  height: 1.8,
  startWeight: 82,
  startBodyFat: 0.22,
  limits: { weight: 90, bodyFat: 0.25, bmi: 28 },
  targets: { leanMassIncrease: 4, bodyFat: 0.15, ffmi: 21 },
  scoring: { penaltyDivisor: 2, penaltyOn: true, chairFactor: 2, rwDivisor: 10 },
  timer: { workSeconds: 60, restSeconds: 60 },
  player: { autoMarkDone: false },
  yoga: 'classic',
  training: 'intermediate',
  nutrition: { phaseOverride: null, calorieOverride: null, dietStyle: 'balanced' },
  workoutLinks: {},
}

function metric(overrides: Partial<BodyMetric>): BodyMetric {
  return {
    key: 'ffmi',
    label: 'FFMI',
    unit: '',
    color: '#0ea5e9',
    dp: 2,
    higherIsBetter: true,
    value: () => null,
    start: 19.7407407,
    target: 21,
    limit: null,
    ...overrides,
  }
}

describe('progressToTarget', () => {
  it('tracks higher-is-better FFMI progress, including movement away from target', () => {
    expect(progressToTarget(metric({}), 19.651358)).toBe(-7)
    expect(progressToTarget(metric({ start: 19.74 }), 20.37)).toBe(50)
  })

  it('tracks lower-is-better weight progress', () => {
    expect(
      progressToTarget(
        metric({ key: 'weight', higherIsBetter: false, start: 82, target: 77.554 }),
        80.8,
      ),
    ).toBe(27)
  })

  it('returns null without a target or with a zero denominator', () => {
    expect(progressToTarget(metric({ target: null }), 20)).toBeNull()
    expect(progressToTarget(metric({ start: 21, target: 21 }), 21)).toBeNull()
  })
})

describe('expectedProgressPct', () => {
  it('rounds elapsed day 15 of 90 to 17%', () => {
    expect(expectedProgressPct('2026-01-05', '2026-01-20')).toBe(17)
  })

  it('requires a start date and clamps outside the horizon', () => {
    expect(expectedProgressPct(null, '2026-01-20')).toBeNull()
    expect(expectedProgressPct('2026-02-01', '2026-01-20')).toBe(0)
    expect(expectedProgressPct('2026-01-05', '2026-05-01')).toBe(100)
  })
})

describe('buildBodyMetrics', () => {
  it('wires the FFMI start, target and direction from settings', () => {
    const ffmi = buildBodyMetrics(sample).find((m) => m.key === 'ffmi')
    expect(ffmi).toMatchObject({ higherIsBetter: true, target: 21 })
    expect(ffmi?.start).toBeCloseTo(19.74074074074074, 12)
  })
})
