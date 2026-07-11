import { describe, expect, it } from 'vitest'
import { normalizedFfmi } from './ffmi'
import {
  assessFatLoss,
  assessLeanGain,
  ceilingStatus,
  monthlyGain,
  recompFlag,
  suggestedTarget,
} from './feasibility'

describe('monthlyGain', () => {
  it('matches the intermediate Aragon and Lyle goldens', () => {
    const aragon = monthlyGain('aragon', 'intermediate', 'male', 80.8)
    expect(aragon.low).toBeCloseTo(0.404, 12)
    expect(aragon.high).toBeCloseTo(0.808, 12)
    const lyle = monthlyGain('lyle', 'intermediate', 'male', 80.8)
    expect(lyle.low).toBeCloseTo(0.375, 12)
    expect(lyle.high).toBeCloseTo(5.5 / 12, 12)
  })

  it('halves only the Lyle model for female users', () => {
    const femaleLyle = monthlyGain('lyle', 'intermediate', 'female', 80.8)
    expect(femaleLyle.low).toBeCloseTo(0.1875, 12)
    expect(femaleLyle.high).toBeCloseTo(5.5 / 24, 12)
    expect(monthlyGain('aragon', 'intermediate', 'female', 80.8)).toEqual(
      monthlyGain('aragon', 'intermediate', 'male', 80.8),
    )
  })
})

describe('assessLeanGain', () => {
  it('flags the sample target as unrealistic', () => {
    const result = assessLeanGain(4.3696, 2.5, 'intermediate', 'male', 80.8)
    expect(result.requiredPaceKgPerMonth).toBeCloseTo(1.74784, 5)
    expect(result.bestMaxGainKg).toBeCloseTo(2.02, 12)
    expect(result.verdict).toBe('unrealistic')
  })

  it('flags a novice 1.5 kg target as realistic', () => {
    const result = assessLeanGain(1.5, 2.5, 'novice', 'male', 80.8)
    expect(result.bestMaxGainKg).toBeCloseTo(1.212 * 2.5, 12)
    expect(result.verdict).toBe('realistic')
  })

  it('treats a positive-gain zero horizon as unrealistic', () => {
    const result = assessLeanGain(1, 0, 'intermediate', 'male', 80.8)
    expect(result.requiredPaceKgPerMonth).toBe(Infinity)
    expect(result.verdict).toBe('unrealistic')
  })
})

describe('assessFatLoss', () => {
  it('matches the sample fat-loss golden', () => {
    const result = assessFatLoss(80.8, 0.212, 80.0471, 0.15, 10.9285)
    expect(result).not.toBeNull()
    expect(result!.fatLossKg).toBeCloseTo(5.1225, 4)
    expect(result!.weeklyPctBw).toBeCloseTo(0.0058, 4)
    expect(result!.verdict).toBe('realistic')
  })

  it('returns null for a zero horizon', () => {
    expect(assessFatLoss(80.8, 0.212, 80, 0.15, 0)).toBeNull()
  })
})

describe('recompFlag', () => {
  it('classifies simultaneous gain and loss by experience', () => {
    expect(recompFlag(true, true, 'intermediate', 0.212)).toBe('harder')
    expect(recompFlag(true, true, 'novice', 0.212)).toBe('ok')
    expect(recompFlag(true, true, 'advanced', 0.212)).toBe('unlikely')
    expect(recompFlag(true, false, 'intermediate', 0.212)).toBe('not-applicable')
  })
})

describe('ceilingStatus', () => {
  it('uses the sex-specific approximate ceiling', () => {
    expect(ceilingStatus(21, 'male')).toEqual({ ceiling: 25, withinLimit: true })
    expect(ceilingStatus(24.5, 'female')).toEqual({ ceiling: 23.9, withinLimit: false })
  })
})

describe('suggestedTarget', () => {
  it('returns the conservative intermediate target for the sample user', () => {
    const result = suggestedTarget(
      63.6704,
      1.8,
      'intermediate',
      'male',
      80.8,
      2.5,
      19.6514,
      normalizedFfmi,
    )
    expect(result).not.toBeNull()
    expect(result!.gainKg).toBeCloseTo(0.9375, 12)
    expect(result!.ffmi).toBe(19.9)
  })
})
