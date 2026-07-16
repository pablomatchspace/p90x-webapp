import { describe, expect, it } from 'vitest'
import { navyBodyFat, sevenSiteBodyFat, threeSiteBodyFat } from './bodyFat'

/**
 * Golden parity with CALCULATORS. The skinfold anchors are the sheet's own cached
 * outputs at its current inputs (all skinfolds 0, SETUP age 36) — Excel-computed,
 * so matching them proves the constants and the Brozek 4.57/d − 4.142 form are
 * transcribed exactly. The Navy anchors are hand-derived from the sheet's C20
 * formula (no usable cached value — its live inputs are 0 → #NUM!).
 */

describe('skinfold methods (golden vs workbook cached values, age 36)', () => {
  it('3-site matches CALCULATORS!M29/F29 with zero skinfolds', () => {
    expect(threeSiteBodyFat({ sex: 'male', sites: [0, 0, 0], age: 36 })).toBeCloseTo(
      0.012062072776985566,
      10,
    )
    expect(threeSiteBodyFat({ sex: 'female', sites: [0, 0, 0], age: 36 })).toBeCloseTo(
      0.03349543349728634,
      10,
    )
  })

  it('7-site matches CALCULATORS!M44/F44 with zero skinfolds', () => {
    expect(sevenSiteBodyFat({ sex: 'male', sites: [0, 0, 0, 0, 0, 0, 0], age: 36 })).toBeCloseTo(
      0.006425998216593953,
      10,
    )
    expect(sevenSiteBodyFat({ sex: 'female', sites: [0, 0, 0, 0, 0, 0, 0], age: 36 })).toBeCloseTo(
      0.04151852619457497,
      10,
    )
  })

  it('rises with skinfold thickness and stays in a sane range', () => {
    // male 3-site, chest/abdomen/thigh = 10/20/15 (Σ45), age 30
    const bf = threeSiteBodyFat({ sex: 'male', sites: [10, 20, 15], age: 30 })
    expect(bf).toBeGreaterThan(0.1)
    expect(bf).toBeLessThan(0.2)
  })

  it('returns null when a site or the age is missing', () => {
    expect(threeSiteBodyFat({ sex: 'male', sites: [10, null, 15], age: 30 })).toBeNull()
    expect(threeSiteBodyFat({ sex: 'male', sites: [10, 20, 15], age: null })).toBeNull()
    expect(sevenSiteBodyFat({ sex: 'male', sites: [1, 2, 3], age: 30 })).toBeNull()
  })
})

describe('navy circumference method (vs CALCULATORS!C20 formula)', () => {
  it('male, cm: abdomen 90, neck 38, height 180 → ~19.8%', () => {
    const bf = navyBodyFat({
      sex: 'male',
      abdomen: 90,
      neck: 38,
      hip: null,
      height: 180,
      unit: 'cm',
    })
    expect(bf).toBeCloseTo(0.1977, 3)
  })

  it('female, cm: abdomen 80, hip 95, neck 34, height 165 → ~28.9%', () => {
    const bf = navyBodyFat({
      sex: 'female',
      abdomen: 80,
      neck: 34,
      hip: 95,
      height: 165,
      unit: 'cm',
    })
    expect(bf).toBeCloseTo(0.2895, 3)
  })

  it('the inch path (×2.54) matches the cm result for the same body', () => {
    const cm = navyBodyFat({
      sex: 'male',
      abdomen: 90,
      neck: 38,
      hip: null,
      height: 180,
      unit: 'cm',
    })
    const inch = navyBodyFat({
      sex: 'male',
      abdomen: 90 / 2.54,
      neck: 38 / 2.54,
      hip: null,
      height: 180 / 2.54,
      unit: 'in',
    })
    expect(inch).toBeCloseTo(cm as number, 10)
  })

  it('returns null on missing inputs or a non-positive girth', () => {
    expect(
      navyBodyFat({ sex: 'male', abdomen: null, neck: 38, hip: null, height: 180, unit: 'cm' }),
    ).toBeNull()
    expect(
      navyBodyFat({ sex: 'female', abdomen: 80, neck: 34, hip: null, height: 165, unit: 'cm' }),
    ).toBeNull()
    // abdomen ≤ neck → log of ≤ 0 → null, not NaN
    expect(
      navyBodyFat({ sex: 'male', abdomen: 38, neck: 38, hip: null, height: 180, unit: 'cm' }),
    ).toBeNull()
  })
})
