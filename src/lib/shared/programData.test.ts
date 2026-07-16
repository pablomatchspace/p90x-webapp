import { describe, expect, it } from 'vitest'
import { getTemplate, getWorkout, hasWorkout, loggableWorkouts, workouts } from './programData'

describe('generated program assets (US-010)', () => {
  it('contains both 90-day templates with resolvable workout keys', () => {
    for (const program of ['classic', 'lean'] as const) {
      const days = getTemplate(program)
      expect(days).toHaveLength(90)
      days.forEach((d, i) => {
        expect(d.day).toBe(i + 1)
        expect(d.week).toBe(Math.floor(i / 7) + 1)
        expect([1, 2, 3]).toContain(d.phase)
        expect(d.workouts.length).toBeGreaterThan(0)
        for (const key of d.workouts)
          expect(hasWorkout(key), `${program} day ${d.day}: ${key}`).toBe(true)
      })
    }
  })

  it('classic template matches the workbook schedule', () => {
    const classic = getTemplate('classic')
    expect(classic[0].workouts).toEqual(['chest-back', 'ab-ripper-x'])
    expect(classic[1].workouts).toEqual(['plyometrics'])
    expect(classic[6].workouts).toEqual(['rest'])
    // ARX pairs 3×/week in the 10 non-recovery weeks
    const arxDays = classic.filter((d) => d.workouts.includes('ab-ripper-x'))
    expect(arxDays).toHaveLength(30)
    expect(arxDays.every((d) => !d.recovery)).toBe(true)
    // recovery weeks 4, 8, 13
    expect(
      classic
        .filter((d) => d.recovery)
        .map((d) => d.week)
        .every((w) => [4, 8, 13].includes(w)),
    ).toBe(true)
    // phase boundaries
    expect(classic[27].phase).toBe(1) // day 28 (week 4)
    expect(classic[28].phase).toBe(2) // day 29 (week 5)
    expect(classic[56].phase).toBe(3) // day 57 (week 9)
  })

  it('lean template swaps in Core Synergistics and Cardio X', () => {
    const lean = getTemplate('lean')
    expect(lean[0].workouts).toEqual(['core-synergistics'])
    expect(lean[1].workouts).toEqual(['cardio-x'])
    expect(lean.some((d) => d.workouts.includes('plyometrics'))).toBe(false)
  })

  it('catalog exercise structures are well-formed', () => {
    expect(workouts.map((w) => w.key)).toContain('chest-back')
    const cb = getWorkout('chest-back')
    expect(cb.exercises).toHaveLength(12)
    expect(cb.exercises![0]).toMatchObject({
      id: 'standard-push-ups',
      rounds: 2,
      secondary: 'knee',
      agg: 'avg',
    })
    const strip = getWorkout('back-biceps').exercises!.find((e) => e.id === 'strip-set-curls')!
    expect(strip.rounds).toBe(4)
    expect(strip.labels).toHaveLength(4)
    const arx = getWorkout('ab-ripper-x')
    expect(arx.style).toBe('arx')
    expect(arx.exercises).toHaveLength(11)
    for (const w of loggableWorkouts()) {
      for (const e of w.exercises!) {
        expect(e.labels).toHaveLength(e.rounds)
        expect(['avg', 'sum']).toContain(e.agg)
      }
    }
    expect(() => getWorkout('nope')).toThrow()
  })
})
