import { describe, expect, it } from 'vitest'
import { focusSteps, resumeIndex } from './focusSteps'
import { getWorkout, loggableWorkoutsFor } from '@/lib/shared'
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

describe('focusSteps — Generation Next follows the video (E36)', () => {
  const order = (key: string) =>
    focusSteps(getWorkout(key)).map((s) => `${s.exercise.id}#${s.rounds.join()}`)

  it('plays each block round by round: every move once, then round 2, then round 3', () => {
    expect(order('gn-push-strength').slice(0, 12)).toEqual([
      'goblet-squat#0',
      'narrow-to-wide-push-up#0',
      'alternating-step-ups#0',
      'wide-stance-rotational-push#0',
      'goblet-squat#1',
      'narrow-to-wide-push-up#1',
      'alternating-step-ups#1',
      'wide-stance-rotational-push#1',
      'goblet-squat#2',
      'narrow-to-wide-push-up#2',
      'alternating-step-ups#2',
      'wide-stance-rotational-push#2',
    ])
    expect(order('gn-push-strength')[12]).toBe('sumo-squats#0')
  })

  it('finishes each Full Body Power cluster (right, left, core) before the next', () => {
    const cluster1 = ['glute-swings-r', 'glute-swings-l', 'hollow-hold-sec']
    expect(order('gn-full-body-power').slice(0, 9)).toEqual(
      [0, 1, 2].flatMap((r) => cluster1.map((id) => `${id}#${r}`)),
    )
    expect(order('gn-full-body-power')[9]).toBe('clean-to-press-r#0')
  })

  it('opens the Full Body Strength finisher with the buy-in and closes it with the cash-out', () => {
    const steps = order('gn-full-body-strength')
    const amrap = 'buy-in-cash-out-amrap-rounds'
    expect(steps.at(-1)).toBe(`${amrap}#1`)
    expect(steps.at(-11)).toBe(`${amrap}#0`)
    expect(steps.slice(-10, -1)).toEqual(
      [0, 1, 2].flatMap((r) =>
        ['renegade-row', 'ground-to-overhead', 'x-sit-up'].map((id) => `${id}#${r}`),
      ),
    )
  })

  it('covers every (exercise, round) of every Generation Next strength workout exactly once', () => {
    for (const def of loggableWorkoutsFor('gennext')) {
      const steps = focusSteps(def)
      expect(steps.every((s) => s.rounds.length === 1)).toBe(true)
      const seen = steps.map((s) => `${s.exercise.id}#${s.rounds[0]}`)
      const expected = (def.exercises ?? []).flatMap((e) =>
        Array.from({ length: e.rounds }, (_, r) => `${e.id}#${r}`),
      )
      expect(new Set(seen).size).toBe(seen.length)
      expect([...seen].sort()).toEqual([...expected].sort())
    }
  })
})

describe('resumeIndex', () => {
  const steps = focusSteps(cb)
  const entry = (r1reps: number | null, r2reps: number | null = null) => ({
    rounds: [
      { reps: r1reps, assist: null },
      { reps: r2reps, assist: null },
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
