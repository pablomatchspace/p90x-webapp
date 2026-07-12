import { describe, expect, it } from 'vitest'
import { KG_PER_LB } from './body'
import {
  currentWeightKg,
  energyAmount,
  LEVEL_CALORIES,
  macroGrams,
  nutritionLevel,
  nutritionTargets,
  PHASE_SPLITS,
} from './nutrition'
import { emptyState, type BodyEntry, type Settings } from './schema'

/** Guide arithmetic goldens use round-number pound weights; storage is kg. */
const lb = (pounds: number) => pounds * KG_PER_LB

function settingsWith(patch: Partial<Settings> = {}): Settings {
  return { ...emptyState().settings, ...patch }
}

function entry(date: string, weight: number | null): BodyEntry {
  return { date, weight, bodyFat: null, water: null, bone: null, zoneMinutes: null }
}

describe('energyAmount', () => {
  it('reproduces the guide worked example: 180 lb → 1800 RMR + 360 burn + 600 = 2760', () => {
    expect(energyAmount(lb(180))).toBeCloseTo(2760, 6)
  })

  it('scales linearly with weight in pounds', () => {
    expect(energyAmount(lb(150))).toBeCloseTo(150 * 10 * 1.2 + 600, 6)
    expect(energyAmount(lb(250))).toBeCloseTo(250 * 10 * 1.2 + 600, 6)
  })
})

describe('nutritionLevel', () => {
  it('applies the guide bands with exact boundaries', () => {
    expect(nutritionLevel(1800)).toBe('I')
    expect(nutritionLevel(2399)).toBe('I')
    expect(nutritionLevel(2400)).toBe('II')
    expect(nutritionLevel(2999)).toBe('II')
    expect(nutritionLevel(3000)).toBe('III')
    expect(nutritionLevel(4200)).toBe('III')
  })

  it('rounds an energy amount below 1800 up to the Level I plan', () => {
    expect(nutritionLevel(1500)).toBe('I')
    expect(LEVEL_CALORIES[nutritionLevel(1500)]).toBe(1800)
  })
})

describe('macroGrams', () => {
  it('Fat Shredder at 2400 kcal: 300 g protein, 180 g carbs, ~53 g fat', () => {
    const grams = macroGrams(2400, 1)
    expect(grams.protein).toBeCloseTo(300, 6)
    expect(grams.carbs).toBeCloseTo(180, 6)
    expect(grams.fat).toBeCloseTo((2400 * 0.2) / 9, 6)
  })

  it('Energy Booster at 1800 kcal splits protein and carbs evenly', () => {
    const grams = macroGrams(1800, 2)
    expect(grams.protein).toBeCloseTo(180, 6)
    expect(grams.carbs).toBeCloseTo(180, 6)
    expect(grams.fat).toBeCloseTo(40, 6)
  })

  it('Endurance Maximizer at 3000 kcal is carb-dominant', () => {
    const grams = macroGrams(3000, 3)
    expect(grams.protein).toBeCloseTo(150, 6)
    expect(grams.carbs).toBeCloseTo(450, 6)
    expect(grams.fat).toBeCloseTo((3000 * 0.2) / 9, 6)
  })

  it('each phase split sums to 100% of calories', () => {
    for (const split of Object.values(PHASE_SPLITS)) {
      expect(split.protein + split.carbs + split.fat).toBeCloseTo(1, 9)
    }
  })
})

describe('currentWeightKg', () => {
  it('prefers the latest logged weight, skipping weight-less entries', () => {
    const settings = settingsWith({ startWeight: 80 })
    const log = [entry('2026-01-01', 82), entry('2026-01-08', 81), entry('2026-01-15', null)]
    expect(currentWeightKg(settings, log)).toBe(81)
  })

  it('falls back to the start weight, then to null', () => {
    expect(currentWeightKg(settingsWith({ startWeight: 80 }), [])).toBe(80)
    expect(currentWeightKg(settingsWith(), [])).toBeNull()
  })
})

describe('nutritionTargets', () => {
  it('derives level-plan calories and phase grams from the latest weight', () => {
    const settings = settingsWith({ startWeight: lb(180) })
    const targets = nutritionTargets(settings, [], 1)
    expect(targets).not.toBeNull()
    expect(targets?.energy).toBeCloseTo(2760, 6)
    expect(targets?.level).toBe('II')
    expect(targets?.calories).toBe(2400)
    expect(targets?.calorieOverridden).toBe(false)
    expect(targets?.phase).toBe(1)
    expect(targets?.phaseName).toBe('Fat Shredder')
    expect(targets?.grams.protein).toBeCloseTo(300, 6)
  })

  it('follows the schedule phase unless the stored override wins', () => {
    const base = settingsWith({ startWeight: lb(180) })
    expect(nutritionTargets(base, [], 3)?.phase).toBe(3)
    const overridden = settingsWith({
      startWeight: lb(180),
      nutrition: { phaseOverride: 1, calorieOverride: null },
    })
    const targets = nutritionTargets(overridden, [], 3)
    expect(targets?.phase).toBe(1)
    expect(targets?.phaseOverridden).toBe(true)
  })

  it('a calorie override replaces the level plan and works without any weight', () => {
    const settings = settingsWith({ nutrition: { phaseOverride: null, calorieOverride: 2200 } })
    const targets = nutritionTargets(settings, [], 2)
    expect(targets?.calories).toBe(2200)
    expect(targets?.calorieOverridden).toBe(true)
    expect(targets?.weightKg).toBeNull()
    expect(targets?.energy).toBeNull()
    expect(targets?.level).toBeNull()
    expect(targets?.grams.carbs).toBeCloseTo(220, 6)
  })

  it('returns null when neither a weight nor an override exists', () => {
    expect(nutritionTargets(settingsWith(), [], 1)).toBeNull()
  })
})
