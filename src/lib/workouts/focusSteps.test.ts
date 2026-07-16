import { describe, expect, it } from 'vitest'
import { focusSteps, resumeIndex } from './focusSteps'
import { getWorkout } from '@/lib/shared'
import type { Session } from '@/lib/shared'

const cb = getWorkout('chest-back')

describe('focusSteps', () => {
  it('plays chest & back as 24 single-round steps', () => {
    const steps = focusSteps(cb)
    expect(steps).toHaveLength(24)
    expect(steps.every((s) => s.rounds.length === 1)).toBe(true)
    expect(steps.slice(0, 12).every((s) => s.rounds[0] === 0)).toBe(true)
    expect(steps.slice(12).every((s) => s.rounds[0] === 1)).toBe(true)
  })

  it('keeps round 1 in sheet order and swaps each pair in round 2', () => {
    const steps = focusSteps(cb)
    const sheet = (cb.exercises ?? []).map((e) => e.id)
    expect(steps.slice(0, 12).map((s) => s.exercise.id)).toEqual(sheet)
    for (let pair = 0; pair < 6; pair++) {
      expect(steps[12 + 2 * pair].exercise.id).toBe(sheet[2 * pair + 1])
      expect(steps[13 + 2 * pair].exercise.id).toBe(sheet[2 * pair])
    }
    expect(steps.slice(12, 16).map((s) => s.exercise.id)).toEqual([
      'wide-front-pull-ups',
      'standard-push-ups',
      'reverse-grip-chin-ups',
      'military-push-ups',
    ])
  })

  it('covers every (exercise, round) pair exactly once', () => {
    const seen = new Set(
      focusSteps(cb).flatMap((s) => s.rounds.map((r) => `${s.exercise.id}#${r}`)),
    )
    expect(seen.size).toBe(24)
  })

  it('leaves non-sequenced workouts as one all-rounds card per exercise', () => {
    const sa = focusSteps(getWorkout('shoulders-arms'))
    expect(sa).toHaveLength(15)
    expect(sa.every((s) => s.rounds.length === s.exercise.rounds)).toBe(true)
    const arx = focusSteps(getWorkout('ab-ripper-x'))
    expect(arx).toHaveLength(11)
    expect(arx.every((s) => s.rounds.join() === '0')).toBe(true)
  })
})

describe('resumeIndex', () => {
  const steps = focusSteps(cb)
  const entry = (main: number | null, r2main: number | null = null) => ({
    rounds: [
      { main, secondary: null },
      { main: r2main, secondary: null },
    ],
  })

  it('starts at 0 with no session', () => {
    expect(resumeIndex(steps, undefined)).toBe(0)
  })

  it('skips steps whose round already has data', () => {
    const session: Session = {
      programDayId: 'd001',
      entries: { 'standard-push-ups': entry(9) },
    }
    expect(resumeIndex(steps, session)).toBe(1)
  })

  it('lands on step 13 (first round-2 card) once every round 1 is logged', () => {
    const entries = Object.fromEntries((cb.exercises ?? []).map((e) => [e.id, entry(10)]))
    expect(resumeIndex(steps, { programDayId: 'd001', entries })).toBe(12)
  })

  it('clamps to the last step when everything is logged', () => {
    const entries = Object.fromEntries((cb.exercises ?? []).map((e) => [e.id, entry(10, 8)]))
    expect(resumeIndex(steps, { programDayId: 'd001', entries })).toBe(23)
  })
})
