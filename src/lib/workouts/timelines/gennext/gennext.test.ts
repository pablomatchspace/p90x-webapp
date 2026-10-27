import { describe, expect, it } from 'vitest'
import { getWorkout } from '@/lib/shared'
import { getTimeline, hasTimeline } from '../index'
import type { PlayTimeline } from '../types'

/**
 * E34 golden pins — Generation Next Play timelines vs the oracle
 * (docs/requirements/gennext-workouts.md). Video lengths in seconds bound the
 * authored timed total: never longer than the video, at least half of it
 * (talk-throughs, demos and set-up time are not segments).
 */
const VIDEO_SECONDS: Record<string, number> = {
  'gn-plyometrix': 2448,
  'gn-speed-and-agility': 2346,
  'gn-accel-decel': 2442,
  'gn-cardio-boxing': 2580,
  'gn-active-mobility': 2010,
  'gn-active-flexibility': 2388,
  'gn-myofascial-release': 1470,
  'gn-bonus-abs': 312,
  'gn-bonus-arms': 360,
  'gn-bonus-classic-push-pull': 348,
  'gn-bonus-glutes': 324,
  'gn-bonus-shoulders': 354,
}

const timelines = Object.keys(VIDEO_SECONDS).map((key) => getTimeline(key)!)
const timed = (t: PlayTimeline) => t.segments.reduce((sum, s) => sum + (s.seconds ?? 0), 0)
const exercise = (t: PlayTimeline, section: string) =>
  t.segments.filter((s) => s.section === section && s.kind === 'exercise')

describe('Generation Next play timelines (E34)', () => {
  it('registers one timeline per completion and bonus workout — none for strength or Core Circuit', () => {
    for (const t of timelines) {
      expect(t, 'registered').toBeTruthy()
      expect(['completion', 'bonus']).toContain(getWorkout(t.workoutKey).style)
      expect(t.source).toBe('docs/requirements/gennext-workouts.md')
    }
    expect(hasTimeline('gn-push-strength')).toBe(false)
    expect(hasTimeline('gn-core-circuit')).toBe(false)
  })

  it.each(timelines.map((t) => [t.workoutKey, t] as const))(
    '%s: unique ids, logged moves exist, timed total fits the video',
    (key, t) => {
      const ids = t.segments.map((s) => s.id)
      expect(new Set(ids).size).toBe(ids.length)
      const exerciseIds = new Set(t.segments.map((s) => s.exerciseId))
      expect(t.loggedExerciseIds.length).toBeGreaterThan(0)
      for (const id of t.loggedExerciseIds) expect(exerciseIds.has(id), id).toBe(true)
      expect(timed(t)).toBeLessThanOrEqual(VIDEO_SECONDS[key])
      expect(timed(t)).toBeGreaterThanOrEqual(VIDEO_SECONDS[key] / 2)
    },
  )

  it('Plyometrix: 4 moves × 3 rounds per block at 30 s, one-round 60 s finisher', () => {
    const t = getTimeline('gn-plyometrix')!
    expect(exercise(t, 'Block 1')).toHaveLength(12)
    expect(exercise(t, 'Block 2')).toHaveLength(12)
    expect(exercise(t, 'Block 1').every((s) => s.seconds === 30)).toBe(true)
    expect(exercise(t, 'Finisher').map((s) => s.seconds)).toEqual([60, 60, 60, 60])
    expect(t.loggedExerciseIds).toHaveLength(12)
  })

  it('Speed and Agility: 40/20 blocks and an 8-interval Tabata', () => {
    const t = getTimeline('gn-speed-and-agility')!
    expect(exercise(t, 'Block 2').every((s) => s.seconds === 40)).toBe(true)
    expect(exercise(t, 'Finisher (Tabata)').map((s) => s.seconds)).toEqual(Array(8).fill(20))
  })

  it('Cardio Boxing: five 3-minute rounds of combo / cardio / blend', () => {
    const t = getTimeline('gn-cardio-boxing')!
    const main = t.segments.filter((s) => s.section.startsWith('Round '))
    expect(new Set(main.map((s) => s.section)).size).toBe(5)
    expect(exercise(t, 'Round 1').map((s) => s.seconds)).toEqual([45, 45, 60])
  })

  it('Active Mobility tests and retests the same six moves by reps', () => {
    const t = getTimeline('gn-active-mobility')!
    const test = exercise(t, 'Test')
    const retest = exercise(t, 'Retest')
    expect(test.map((s) => s.exerciseId)).toEqual(retest.map((s) => s.exerciseId))
    expect(test.every((s) => s.seconds === null && s.reps === 6)).toBe(true)
  })

  it('Myofascial Release rolls 23 areas for about a minute each', () => {
    const t = getTimeline('gn-myofascial-release')!
    expect(t.segments).toHaveLength(23)
    expect(t.segments.every((s) => s.seconds === 60)).toBe(true)
  })

  it('bonus fivers fit in about five minutes', () => {
    for (const key of Object.keys(VIDEO_SECONDS).filter((k) => k.startsWith('gn-bonus-'))) {
      expect(timed(getTimeline(key)!)).toBeLessThanOrEqual(300)
    }
  })
})
