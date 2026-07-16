import { describe, expect, it } from 'vitest'
import {
  deriveBody,
  ffmiCategory,
  formatFixed,
  fractionToPercent,
  heightUnit,
  kgToUnit,
  lossThreshold,
  mToUnit,
  percentToFraction,
  targetWeight,
  threshold,
  unitToKg,
  unitToM,
  weightUnit,
} from './body'
import type { BodyEntry } from '@/lib/shared'

function entry(weight: number | null, bodyFat: number | null): BodyEntry {
  return { date: '2026-05-29', weight, bodyFat, water: null, bone: null, zoneMinutes: null }
}

describe('deriveBody', () => {
  it('reproduces the workbook golden row (2026-05-29: 69 kg / 17% @ 1.65 m)', () => {
    const d = deriveBody(entry(69, 0.17), { height: 1.65, startWeight: 67.9 })
    expect(formatFixed(d.leanMass, 1)).toBe('57.3')
    expect(formatFixed(d.ffmi, 2)).toBe('21.95')
    expect(d.ffmiCategory).toBe('Above Average')
    expect(formatFixed(d.bmi, 2)).toBe('25.34')
    expect(d.weightLoss).toBeCloseTo(-1.1, 10)
    expect(d.bodyFatKg).toBeCloseTo(11.73, 10)
  })

  it('derives the sample persona row (80.8 kg / 21.2% @ 1.8 m, start 82)', () => {
    const d = deriveBody(entry(80.8, 0.212), { height: 1.8, startWeight: 82 })
    expect(d.weightLoss).toBeCloseTo(1.2, 10)
    expect(formatFixed(d.bodyFatKg, 1)).toBe('17.1')
    expect(formatFixed(d.bmi, 2)).toBe('24.94')
    expect(formatFixed(d.leanMass, 1)).toBe('63.7')
    expect(formatFixed(d.ffmi, 2)).toBe('19.65')
    expect(d.ffmiCategory).toBe('Average')
  })

  it('derives nothing without a weight (B2: empty days stay empty)', () => {
    const d = deriveBody(entry(null, 0.2), { height: 1.8, startWeight: 82 })
    expect(d).toEqual({
      weightLoss: null,
      bodyFatKg: null,
      bmi: null,
      leanMass: null,
      ffmi: null,
      ffmiCategory: null,
    })
  })

  it('derives weight-only metrics when body fat is missing', () => {
    const d = deriveBody(entry(80, null), { height: 1.8, startWeight: 82 })
    expect(d.weightLoss).toBeCloseTo(2, 10)
    expect(formatFixed(d.bmi, 2)).toBe('24.69')
    expect(d.bodyFatKg).toBeNull()
    expect(d.leanMass).toBeNull()
    expect(d.ffmi).toBeNull()
  })

  it('skips height- and start-dependent metrics when settings are incomplete', () => {
    const d = deriveBody(entry(80, 0.2), { height: null, startWeight: null })
    expect(d.weightLoss).toBeNull()
    expect(d.bmi).toBeNull()
    expect(d.ffmi).toBeNull()
    expect(d.bodyFatKg).toBeCloseTo(16, 10)
    expect(d.leanMass).toBeCloseTo(64, 10)
    expect(deriveBody(entry(80, 0.2), { height: 0, startWeight: 82 }).bmi).toBeNull()
  })
})

describe('ffmiCategory', () => {
  it('matches the workbook bands at their boundaries', () => {
    expect(ffmiCategory(17.99)).toBe('Below Average')
    expect(ffmiCategory(18)).toBe('Average')
    expect(ffmiCategory(20)).toBe('Above Average')
    expect(ffmiCategory(21.95)).toBe('Above Average')
    expect(ffmiCategory(22)).toBe('Excellent')
    expect(ffmiCategory(23)).toBe('Advanced/Near Limit')
    expect(ffmiCategory(25)).toBe('Possibly Enhanced')
  })
})

describe('targetWeight', () => {
  it('reproduces the real SETUP target (67.9 kg / 17.3% → 66.9 kg)', () => {
    const t = targetWeight({
      startWeight: 67.9,
      startBodyFat: 0.173,
      targets: { leanMassIncrease: 4, bodyFat: 0.12 },
    })
    expect(formatFixed(t, 1)).toBe('66.9')
  })

  it('derives the sample persona target', () => {
    const t = targetWeight({
      startWeight: 82,
      startBodyFat: 0.22,
      targets: { leanMassIncrease: 4, bodyFat: 0.15 },
    })
    expect(t).toBeCloseTo(77.554, 3)
  })

  it('is null while any input is missing', () => {
    expect(
      targetWeight({
        startWeight: 82,
        startBodyFat: null,
        targets: { leanMassIncrease: 4, bodyFat: 0.15 },
      }),
    ).toBeNull()
    expect(
      targetWeight({
        startWeight: 82,
        startBodyFat: 0.22,
        targets: { leanMassIncrease: null, bodyFat: 0.15 },
      }),
    ).toBeNull()
  })
})

describe('threshold', () => {
  it('maps value vs target/limit to good, watch, over', () => {
    expect(threshold(77, 77.554, 90)).toBe('good')
    expect(threshold(80.8, 77.554, 90)).toBe('watch')
    expect(threshold(90, 77.554, 90)).toBe('over')
    expect(threshold(95, 77.554, 90)).toBe('over')
  })

  it('defaults the missing side to good when only one bound exists', () => {
    expect(threshold(80, null, 90)).toBe('good')
    expect(threshold(95, null, 90)).toBe('over')
    expect(threshold(0.14, 0.15, null)).toBe('good')
    expect(threshold(0.2, 0.15, null)).toBe('watch')
  })

  it('is null without a value or without any bound', () => {
    expect(threshold(null, 77, 90)).toBeNull()
    expect(threshold(80, null, null)).toBeNull()
  })
})

describe('lossThreshold', () => {
  it('runs inverted: red at zero, green at the full start→target distance', () => {
    expect(lossThreshold(0, 82, 77.554)).toBe('over')
    expect(lossThreshold(-0.5, 82, 77.554)).toBe('over')
    expect(lossThreshold(1.2, 82, 77.554)).toBe('watch')
    expect(lossThreshold(4.5, 82, 77.554)).toBe('good')
  })

  it('is null without loss, start weight, or a target', () => {
    expect(lossThreshold(null, 82, 77.554)).toBeNull()
    expect(lossThreshold(1, null, 77.554)).toBeNull()
    expect(lossThreshold(1, 82, null)).toBeNull()
  })
})

describe('unit conversion', () => {
  it('converts kg to display pounds at 1 dp and back raw', () => {
    expect(kgToUnit(82, 'imperial')).toBe(180.8)
    expect(kgToUnit(82, 'metric')).toBe(82)
    expect(unitToKg(180.8, 'imperial')).toBeCloseTo(82.01, 2)
    expect(unitToKg(80.7, 'metric')).toBe(80.7)
    expect(weightUnit('metric')).toBe('kg')
    expect(weightUnit('imperial')).toBe('lb')
  })

  it('round-trips stored fractions through display percents', () => {
    expect(fractionToPercent(0.212)).toBe(21.2)
    expect(percentToFraction(21.2)).toBeCloseTo(0.212, 10)
    expect(fractionToPercent(null)).toBeNull()
    expect(percentToFraction(null)).toBeNull()
  })

  it('converts metres to display inches at 1 dp and back raw', () => {
    expect(mToUnit(1.8, 'imperial')).toBe(70.9)
    expect(mToUnit(1.8, 'metric')).toBe(1.8)
    expect(unitToM(70.9, 'imperial')).toBeCloseTo(1.8009, 3)
    expect(unitToM(1.8, 'metric')).toBe(1.8)
    expect(heightUnit('metric')).toBe('m')
    expect(heightUnit('imperial')).toBe('in')
  })
})

describe('formatFixed', () => {
  it('formats at fixed precision, trimming trailing zeros', () => {
    expect(formatFixed(null, 1)).toBe('—')
    expect(formatFixed(82, 1)).toBe('82')
    expect(formatFixed(57.27, 1)).toBe('57.3')
    expect(formatFixed(21.951, 2)).toBe('21.95')
    expect(formatFixed(-1.1, 1)).toBe('-1.1')
  })
})
