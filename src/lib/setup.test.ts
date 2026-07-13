import { describe, expect, it } from 'vitest'
import { setupDerived, settingsWarnings } from './setup'
import { emptyState, type Settings } from '@/lib/schema'

/** The fabricated sample's SETUP block (public/sample-data.json). */
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
  targets: { leanMassIncrease: 4, bodyFat: 0.15 },
  scoring: { penaltyDivisor: 2, penaltyOn: true, chairFactor: 2, rwDivisor: 10 },
  timer: { workSeconds: 60, restSeconds: 60 },
  player: { autoMarkDone: false },
  yoga: 'classic',
  training: 'intermediate',
  nutrition: { phaseOverride: null, calorieOverride: null, dietStyle: 'balanced' },
  workoutLinks: {},
}

describe('setupDerived (golden vs sample SETUP)', () => {
  const d = setupDerived(sample)

  it('derives LBM / FBM / BMI at start', () => {
    expect(d.startLean).toBeCloseTo(63.96, 5) // 82 × 0.78
    expect(d.startFat).toBeCloseTo(18.04, 5) // 82 × 0.22
    expect(d.startBmi).toBeCloseTo(25.308642, 5) // 82 / 1.8²
  })

  it('derives target weight and target BMI', () => {
    expect(d.targetWeight).toBeCloseTo(77.554, 5) // 4 + 63.96 + 63.96 × 0.15
    expect(d.targetBmi).toBeCloseTo(23.93642, 5) // 77.554 / 1.8²
  })

  it('returns null read-outs when inputs are missing', () => {
    const d0 = setupDerived(emptyState().settings)
    expect(d0.startLean).toBeNull()
    expect(d0.startBmi).toBeNull()
    expect(d0.targetWeight).toBeNull()
    expect(d0.targetBmi).toBeNull()
  })
})

describe('settingsWarnings', () => {
  it('is empty for a coherent SETUP', () => {
    expect(settingsWarnings(sample)).toEqual([])
  })

  it('flags a target body-fat that is not below the start', () => {
    const w = settingsWarnings({ ...sample, targets: { ...sample.targets, bodyFat: 0.25 } })
    expect(w).toContain('Target body-fat is not below your starting body-fat.')
  })

  it('flags a body-fat entered as a whole percent instead of a fraction', () => {
    const w = settingsWarnings({ ...sample, startBodyFat: 22 })
    expect(w.some((m) => m.includes('out of range'))).toBe(true)
  })

  it('flags an upper weight limit at or below the target weight', () => {
    const w = settingsWarnings({ ...sample, limits: { ...sample.limits, weight: 77 } })
    expect(w).toContain('Upper weight limit is at or below your target weight.')
  })

  it('flags an upper BMI limit at or below the target BMI', () => {
    const w = settingsWarnings({ ...sample, limits: { ...sample.limits, bmi: 23 } })
    expect(w).toContain('Upper BMI limit is at or below your target BMI.')
  })
})
