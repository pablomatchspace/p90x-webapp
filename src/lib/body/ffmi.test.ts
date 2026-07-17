import { describe, expect, it } from 'vitest'
import { deriveBody } from './body'
import { leanMassForFfmi, normalizedFfmi, planFromFfmi, weightForLeanMass } from './ffmi'
import { bodyFraction, kg, meters } from '@/lib/shared'

describe('normalizedFfmi', () => {
  it('matches the sample-data goldens (height 1.8 → zero adjustment)', () => {
    expect(normalizedFfmi(63.96, 1.8)).toBeCloseTo(19.74074074074074, 12)
    expect(normalizedFfmi(63.6704, 1.8)).toBeCloseTo(19.65135802469136, 12)
  })

  it('applies the 6.1 adjustment away from 1.8 m', () => {
    expect(normalizedFfmi(70, 1.7)).toBeCloseTo(70 / 2.89 + 0.61, 12)
  })

  it('is exactly what deriveBody reports', () => {
    const derived = deriveBody(
      {
        date: '2026-01-19',
        weight: kg(80.8),
        bodyFat: bodyFraction(0.212),
        water: null,
        bone: null,
        zoneMinutes: null,
      },
      { height: meters(1.8), startWeight: kg(82) },
    )
    expect(derived.ffmi).toBeCloseTo(normalizedFfmi(80.8 * (1 - 0.212), 1.8) ?? NaN, 12)
  })

  it('returns null for a non-positive height', () => {
    expect(normalizedFfmi(60, 0)).toBeNull()
  })
})

describe('leanMassForFfmi (inverse)', () => {
  it('round-trips through normalizedFfmi at any height', () => {
    const lean = leanMassForFfmi(21, 1.8)
    expect(lean).toBeCloseTo(68.04, 10)
    expect(normalizedFfmi(lean ?? NaN, 1.8)).toBeCloseTo(21, 12)
    const shorter = leanMassForFfmi(21, 1.7)
    expect(normalizedFfmi(shorter ?? NaN, 1.7)).toBeCloseTo(21, 12)
  })

  it('returns null for a non-positive height', () => {
    expect(leanMassForFfmi(21, 0)).toBeNull()
  })
})

describe('weightForLeanMass', () => {
  it('computes the FFMI-implied weight at the plan body-fat', () => {
    expect(weightForLeanMass(68.04, 0.15)).toBeCloseTo(80.04705882352943, 9)
  })

  it('rejects impossible body-fat fractions', () => {
    expect(weightForLeanMass(68, -0.01)).toBeNull()
    expect(weightForLeanMass(68, 1)).toBeNull()
  })
})

describe('planFromFfmi', () => {
  it('reproduces the E14 sample-plan goldens (FFMI 21 @ 15%, start lean 63.96)', () => {
    const p = planFromFfmi(21, 0.15, 1.8, 63.96)
    expect(p).not.toBeNull()
    expect(p!.lean).toBeCloseTo(68.04, 10)
    expect(p!.increase).toBeCloseTo(4.08, 10)
    expect(p!.weight).toBeCloseTo(80.04705882352943, 9)
    expect(p!.sheetTargetWeight).toBeCloseTo(77.634, 6)
  })
  it('returns null for impossible body-fat', () => {
    expect(planFromFfmi(21, 1, 1.8, 63.96)).toBeNull()
  })
})
