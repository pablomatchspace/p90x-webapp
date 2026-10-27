import { describe, expect, it } from 'vitest'
import { getTemplate, workouts } from '@/lib/shared'
import {
  BMR_UNCERTAINTY,
  DAILY_LIFE_FACTOR,
  EXERCISE_UNCERTAINTY,
  WORKOUT_ENERGY,
  averageExerciseKcal,
  cunningham,
  estimateBmr,
  estimateTdee,
  workoutKcal,
} from './energy'

describe('cunningham', () => {
  it('is 500 + 22 × lean mass (Cunningham 1980)', () => {
    expect(cunningham(58)).toBe(1776)
    expect(cunningham(null)).toBeNull()
  })
})

describe('estimateBmr', () => {
  it('uses Katch–McArdle when lean mass is known, keeping Cunningham and Mifflin as cross-checks', () => {
    const e = estimateBmr({ leanKg: 58, weightKg: 70, heightM: 1.65, age: 35, gender: 'male' })
    expect(e?.katch).toBeCloseTo(370 + 21.6 * 58, 9) // 1622.8
    expect(e?.cunningham).toBe(1776)
    expect(e?.value).toBeCloseTo(370 + 21.6 * 58, 9)
    expect(e?.method).toBe('katch')
    expect(e?.mifflin).toBeCloseTo(10 * 70 + 6.25 * 165 - 5 * 35 + 5, 9) // cross-check kept
  })

  it('falls back to Mifflin–St Jeor without lean mass', () => {
    const e = estimateBmr({ leanKg: null, weightKg: 70, heightM: 1.65, age: 35, gender: 'female' })
    expect(e?.method).toBe('mifflin')
    expect(e?.value).toBeCloseTo(10 * 70 + 6.25 * 165 - 5 * 35 - 161, 9)
    expect(e?.katch).toBeNull()
    expect(e?.cunningham).toBeNull()
  })

  it('is null when neither basis exists', () => {
    expect(
      estimateBmr({ leanKg: null, weightKg: 70, heightM: null, age: null, gender: 'male' }),
    ).toBeNull()
  })

  it('keeps a lean-based estimate even when height and age are missing (no cross-check)', () => {
    const e = estimateBmr({ leanKg: 58, weightKg: 70, heightM: null, age: null, gender: 'male' })
    expect(e?.method).toBe('katch')
    expect(e?.mifflin).toBeNull()
  })
})

describe('workout energy table', () => {
  it('covers every scheduled workout of every suite (rest and bonus add-ons carry no entry)', () => {
    for (const w of workouts) {
      if (w.style === 'rest' || w.style === 'bonus') {
        expect(WORKOUT_ENERGY[w.key]).toBeUndefined()
      } else {
        expect(WORKOUT_ENERGY[w.key], w.key).toBeDefined()
      }
    }
  })

  it('uses sane minutes and Compendium-range METs, each with a source note', () => {
    for (const [key, spec] of Object.entries(WORKOUT_ENERGY)) {
      expect(spec.minutes, key).toBeGreaterThanOrEqual(10)
      expect(spec.minutes, key).toBeLessThanOrEqual(100)
      expect(spec.met, key).toBeGreaterThan(1)
      expect(spec.met, key).toBeLessThanOrEqual(8)
      expect(spec.source.length, key).toBeGreaterThan(0)
    }
  })
})

describe('workoutKcal', () => {
  it('is net energy: (MET − 1) × kg × hours — resting metabolism is already in the BMR', () => {
    // chest-back: 60 min of vigorous resistance training (6.0 MET)
    expect(workoutKcal('chest-back', 70)).toBeCloseTo((6 - 1) * 70 * 1, 9)
  })

  it('is zero for rest days, bonus add-ons and unknown keys', () => {
    expect(workoutKcal('rest', 70)).toBe(0)
    expect(workoutKcal('gn-bonus-abs', 70)).toBe(0)
    expect(workoutKcal('not-a-workout', 70)).toBe(0)
  })
})

describe('averageExerciseKcal', () => {
  it('averages the daily exercise energy over every day of the template, rest days included', () => {
    const days = [{ workouts: ['chest-back'] }, { workouts: ['rest'] }]
    expect(averageExerciseKcal(days, 70)).toBeCloseTo(175, 9)
    expect(averageExerciseKcal([], 70)).toBe(0)
  })

  it('stacks double-day sessions (e.g. strength + Ab Ripper X)', () => {
    const one = averageExerciseKcal([{ workouts: ['chest-back'] }], 70)
    const two = averageExerciseKcal([{ workouts: ['chest-back', 'ab-ripper-x'] }], 70)
    expect(two).toBeGreaterThan(one)
    expect(two - one).toBeCloseTo(workoutKcal('ab-ripper-x', 70), 9)
  })

  it('gives a plausible 90-day average for Classic and for Generation Next', () => {
    const classic = averageExerciseKcal(getTemplate({ suite: 'p90x', variant: 'classic' }), 70)
    const gennext = averageExerciseKcal(getTemplate({ suite: 'gennext', variant: 'standard' }), 70)
    expect(classic).toBeGreaterThan(250)
    expect(classic).toBeLessThan(450)
    expect(gennext).toBeGreaterThan(150)
    expect(gennext).toBeLessThan(classic) // ~40-min sessions vs ~60-min discs
  })

  it('scales linearly with body weight', () => {
    const t = getTemplate({ suite: 'p90x', variant: 'classic' })
    expect(averageExerciseKcal(t, 80)).toBeCloseTo((averageExerciseKcal(t, 70) * 80) / 70, 9)
  })
})

describe('estimateTdee', () => {
  const bmr = estimateBmr({ leanKg: 58, weightKg: 70, heightM: 1.65, age: 35, gender: 'male' })

  it('is BMR × daily-life factor + average exercise energy', () => {
    expect(bmr).not.toBeNull()
    if (bmr === null) return
    const t = estimateTdee(bmr, 366)
    expect(DAILY_LIFE_FACTOR.mid).toBe(1.4)
    expect(t.baseline).toBeCloseTo(bmr.value * 1.4, 9)
    expect(t.exercise).toBe(366)
    expect(t.tdee).toBeCloseTo(bmr.value * 1.4 + 366, 9)
  })

  it('brackets the estimate with the root-sum-square of its three independent errors', () => {
    if (bmr === null) throw new Error('bmr')
    const t = estimateTdee(bmr, 366)
    const rss = Math.hypot(
      BMR_UNCERTAINTY * bmr.value * DAILY_LIFE_FACTOR.mid,
      (DAILY_LIFE_FACTOR.high - DAILY_LIFE_FACTOR.mid) * bmr.value,
      EXERCISE_UNCERTAINTY * 366,
    )
    expect(t.low).toBeCloseTo(t.tdee - rss, 9)
    expect(t.high).toBeCloseTo(t.tdee + rss, 9)
    // a sane, not absurd, band: roughly ±10%
    expect(rss / t.tdee).toBeGreaterThan(0.07)
    expect(rss / t.tdee).toBeLessThan(0.14)
  })
})
