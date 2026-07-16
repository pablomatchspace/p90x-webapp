import { describe, expect, it } from 'vitest'
import { KG_PER_LB } from '@/lib/body'
import {
  ACTIVITY_FACTOR,
  currentLeanKg,
  currentWeightKg,
  energyAmount,
  katchMcArdle,
  KCAL_PER_KG,
  LEAN_KCAL_PER_KG,
  LEVEL_CALORIES,
  LOW_CARB_CAP_G,
  macroGrams,
  mifflinStJeor,
  nutritionLevel,
  nutritionTargets,
  PHASE_SPLITS,
  remainingProgramDays,
  targetComposition,
  targetNutrition,
} from './nutrition'
import { emptyState, type BodyEntry, type Settings } from '@/lib/shared'
import { bodyFraction, kg, meters } from '@/lib/shared'

/** Guide arithmetic goldens use round-number pound weights; storage is kg. */
const lb = (pounds: number) => kg(pounds * KG_PER_LB)

function settingsWith(patch: Partial<Settings> = {}): Settings {
  return { ...emptyState().settings, ...patch }
}

function entry(date: string, weight: number | null): BodyEntry {
  return {
    date,
    weight: weight === null ? null : kg(weight),
    bodyFat: null,
    water: null,
    bone: null,
    zoneMinutes: null,
  }
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
    const settings = settingsWith({ startWeight: kg(80) })
    const log = [entry('2026-01-01', 82), entry('2026-01-08', 81), entry('2026-01-15', null)]
    expect(currentWeightKg(settings, log)).toBe(81)
  })

  it('falls back to the start weight, then to null', () => {
    expect(currentWeightKg(settingsWith({ startWeight: kg(80) }), [])).toBe(80)
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
      nutrition: { phaseOverride: 1, calorieOverride: null, dietStyle: 'balanced' },
    })
    const targets = nutritionTargets(overridden, [], 3)
    expect(targets?.phase).toBe(1)
    expect(targets?.phaseOverridden).toBe(true)
  })

  it('a calorie override replaces the level plan and works without any weight', () => {
    const settings = settingsWith({
      nutrition: { phaseOverride: null, calorieOverride: 2200, dietStyle: 'balanced' },
    })
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

describe('BMR equations', () => {
  it('Mifflin–St Jeor for a 80 kg / 1.8 m / 40 yo male', () => {
    // 10*80 + 6.25*180 - 5*40 + 5 = 800 + 1125 - 200 + 5
    expect(mifflinStJeor(80, 1.8, 40, 'male')).toBeCloseTo(1730, 6)
  })

  it('Mifflin–St Jeor applies the female offset and needs every input', () => {
    expect(mifflinStJeor(80, 1.8, 40, 'female')).toBeCloseTo(1730 - 166, 6)
    expect(mifflinStJeor(80, null, 40, 'male')).toBeNull()
    expect(mifflinStJeor(80, 1.8, null, 'male')).toBeNull()
  })

  it('Katch–McArdle from lean mass', () => {
    // 370 + 21.6*62.4
    expect(katchMcArdle(62.4)).toBeCloseTo(370 + 21.6 * 62.4, 6)
    expect(katchMcArdle(null)).toBeNull()
  })
})

describe('currentLeanKg', () => {
  it('uses the latest complete weigh-in, then start stats, then null', () => {
    const settings = settingsWith({ startWeight: kg(82), startBodyFat: bodyFraction(0.25) })
    const log = [
      {
        date: '2026-01-01',
        weight: kg(80),
        bodyFat: bodyFraction(0.2),
        water: null,
        bone: null,
        zoneMinutes: null,
      },
    ]
    expect(currentLeanKg(settings, log)).toBeCloseTo(64, 6) // 80 * 0.8
    expect(currentLeanKg(settings, [])).toBeCloseTo(61.5, 6) // 82 * 0.75
    expect(currentLeanKg(settingsWith(), [])).toBeNull()
  })
})

describe('remainingProgramDays', () => {
  it('plans a full 90 for no/future start and a fresh 90 for a finished program', () => {
    expect(remainingProgramDays(null, '2026-01-20')).toBe(90)
    expect(remainingProgramDays('2026-02-01', '2026-01-20')).toBe(90) // future start
    expect(remainingProgramDays('2026-01-01', '2026-05-01')).toBe(90) // long finished → fresh
  })

  it('returns the days left mid-program', () => {
    // day 15 of the program → 90 - 14 = 76 left
    expect(remainingProgramDays('2026-01-01', '2026-01-15')).toBe(76)
  })
})

describe('targetComposition', () => {
  const withTargets = (targets: Partial<Settings['targets']>, patch: Partial<Settings> = {}) =>
    settingsWith({
      startWeight: kg(82),
      startBodyFat: bodyFraction(0.22),
      height: meters(1.8),
      targets: { leanMassIncrease: null, bodyFat: null, ffmi: null, ...targets },
      ...patch,
    })
  const log: BodyEntry[] = [
    {
      date: '2026-01-19',
      weight: kg(80),
      bodyFat: bodyFraction(0.2),
      water: null,
      bone: null,
      zoneMinutes: null,
    },
  ]

  it('composes lean-mass increase (from start lean) with the target body-fat %', () => {
    const comp = targetComposition(
      withTargets({ leanMassIncrease: kg(4), bodyFat: bodyFraction(0.15) }),
      log,
    )
    expect(comp?.targetLeanKg).toBeCloseTo(82 * 0.78 + 4, 9) // 67.96
    expect(comp?.targetFatKg).toBeCloseTo(((82 * 0.78 + 4) * 0.15) / 0.85, 9)
  })

  it('a body-fat-only target keeps current lean; a lean-only target keeps current fat', () => {
    const bfOnly = targetComposition(withTargets({ bodyFat: bodyFraction(0.15) }), log)
    expect(bfOnly?.targetLeanKg).toBeCloseTo(64, 9) // latest weigh-in lean
    expect(bfOnly?.targetFatKg).toBeCloseTo((64 * 0.15) / 0.85, 9)
    const leanOnly = targetComposition(withTargets({ leanMassIncrease: kg(4) }), log)
    expect(leanOnly?.targetLeanKg).toBeCloseTo(67.96, 9)
    expect(leanOnly?.targetFatKg).toBeCloseTo(16, 9) // 80 − 64
  })

  it('falls back to the FFMI target for lean when no lean-mass increase is set', () => {
    const comp = targetComposition(withTargets({ ffmi: 21 }), log)
    expect(comp?.targetLeanKg).toBeCloseTo(21 * 1.8 * 1.8, 9) // 68.04 at the 1.8 m reference
    expect(comp?.targetFatKg).toBeCloseTo(16, 9)
  })

  it('is null without any target set, or without body-fat data to aim from', () => {
    expect(targetComposition(withTargets({}), log)).toBeNull()
    expect(
      targetComposition(withTargets({ bodyFat: bodyFraction(0.15) }, { startBodyFat: null }), []),
    ).toBeNull()
  })
})

describe('targetNutrition', () => {
  const base = {
    currentWeightKg: 80,
    leanKg: 62.4,
    heightM: 1.8,
    age: 40,
    gender: 'male' as const,
    fatDeltaKg: -4,
    leanDeltaKg: 0,
    horizonWeeks: 12,
    dietStyle: 'balanced' as const,
  }
  const katchTdee = (370 + 21.6 * 62.4) * ACTIVITY_FACTOR

  it('derives a deficit plan from Katch–McArdle TDEE and the fat-loss pace', () => {
    const t = targetNutrition(base)
    expect(t).not.toBeNull()
    if (t === null) return
    expect(t.bmrMethod).toBe('katch')
    expect(t.bmr).toBeCloseTo(370 + 21.6 * 62.4, 4) // 1717.84
    expect(t.tdee).toBeCloseTo(katchTdee, 4)
    expect(t.goal).toBe('deficit')
    expect(t.rateClamped).toBe(false)
    expect(t.targetWeightKg).toBeCloseTo(76, 9)
    // 4 kg of fat over 12 wk → daily offset (−4/12) × 7700 / 7
    const dailyOffset = ((-4 / 12) * KCAL_PER_KG) / 7
    expect(t.calories).toBe(Math.round(katchTdee + dailyOffset))
    expect(t.proteinPerKg).toBe(2.2)
    expect(t.protein).toBeCloseTo(176, 6) // 2.2 * 80
    expect(t.fat).toBeCloseTo(64, 6) // 0.8 * 80
    // carbs are the remainder of calories after protein & fat
    expect(t.carbs).toBeCloseTo((t.calories - 176 * 4 - 64 * 9) / 4, 6)
    expect(t.carbsCapped).toBe(false)
  })

  it('prices fat and lean deltas at their own energy densities (recomp)', () => {
    const t = targetNutrition({ ...base, fatDeltaKg: -4, leanDeltaKg: 2 })
    expect(t).not.toBeNull()
    if (t === null) return
    expect(t.goal).toBe('recomp')
    expect(t.proteinPerKg).toBe(2.2) // fat loss is intended → protein stays high
    const dailyOffset = ((-4 / 12) * KCAL_PER_KG + (2 / 12) * LEAN_KCAL_PER_KG) / 7
    expect(t.calories).toBe(Math.round(katchTdee + dailyOffset))
    // net scale pace is small even though a real deficit is running
    expect(t.weeklyRateKg).toBeCloseTo(-2 / 12, 9)
    expect(t.weeklyFatKg).toBeCloseTo(-4 / 12, 9)
    expect(t.weeklyLeanKg).toBeCloseTo(2 / 12, 9)
  })

  it('caps each pace at its own safe band', () => {
    const fat = targetNutrition({ ...base, fatDeltaKg: -20 }) // ≫ 1%/wk
    expect(fat?.rateClamped).toBe(true)
    expect(fat?.weeklyFatKg).toBeCloseTo(-0.8, 9) // −1% of 80 kg
    const lean = targetNutrition({ ...base, fatDeltaKg: 0, leanDeltaKg: 10 }) // ≫ 0.5%/wk
    expect(lean?.rateClamped).toBe(true)
    expect(lean?.weeklyLeanKg).toBeCloseTo(0.4, 9) // +0.5% of 80 kg
  })

  it('falls back to Mifflin–St Jeor when lean mass is unknown', () => {
    const t = targetNutrition({ ...base, leanKg: null })
    expect(t?.bmrMethod).toBe('mifflin')
    expect(t?.bmr).toBeCloseTo(1730, 6)
  })

  it('treats a lean-gain-only target as a surplus and holds protein at 1.8 g/kg', () => {
    const t = targetNutrition({ ...base, fatDeltaKg: 0, leanDeltaKg: 2 })
    expect(t?.goal).toBe('surplus')
    expect(t?.proteinPerKg).toBe(1.8)
    expect((t?.weeklyRateKg ?? 0) > 0).toBe(true)
    // lean tissue is priced at ~1800 kcal/kg, not the fat density
    const dailyOffset = ((2 / 12) * LEAN_KCAL_PER_KG) / 7
    expect(t?.calories).toBe(Math.round(katchTdee + dailyOffset))
  })

  it('the low-carb style caps carbs at 130 g and shifts the spare calories into fat', () => {
    const t = targetNutrition({ ...base, dietStyle: 'lowCarb' })
    expect(t).not.toBeNull()
    if (t === null) return
    expect(t.carbsCapped).toBe(true)
    expect(t.carbs).toBe(LOW_CARB_CAP_G)
    // energy is conserved: protein + carbs + fat exactly fill the calories
    expect(t.protein * 4 + t.carbs * 4 + t.fat * 9).toBeCloseTo(t.calories, 6)
    expect(t.fat).toBeGreaterThan(0.8 * 80)
    // balanced and low-carb agree on calories — only the split moves
    expect(t.calories).toBe(targetNutrition(base)?.calories)
  })

  it('low-carb leaves an already-low fill uncapped', () => {
    // max-pace deficit → calories low enough that the fill lands under 130 g
    const t = targetNutrition({ ...base, fatDeltaKg: -20, dietStyle: 'lowCarb' })
    expect(t).not.toBeNull()
    if (t === null) return
    expect(t.carbs).toBeLessThan(LOW_CARB_CAP_G)
    expect(t.carbsCapped).toBe(false)
    expect(t.fat).toBeCloseTo(64, 6) // fat stays at the 0.8 g/kg baseline
  })

  it('returns null without a current weight, a BMR basis, or composition deltas', () => {
    expect(targetNutrition({ ...base, currentWeightKg: null })).toBeNull()
    expect(targetNutrition({ ...base, fatDeltaKg: null })).toBeNull()
    expect(targetNutrition({ ...base, leanDeltaKg: null })).toBeNull()
    expect(targetNutrition({ ...base, leanKg: null, heightM: null, age: null })).toBeNull()
  })
})
