import { describe, expect, it } from 'vitest'
import { getTimeline, hasTimeline, timelinesFor } from './index'
import { kenpoX } from './kenpoX'

const segments = kenpoX.segments

describe('Kenpo X timeline — golden pins (E17)', () => {
  it('attaches to the kenpo-x workout key and resolves via the registry', () => {
    expect(kenpoX.workoutKey).toBe('kenpo-x')
    expect(hasTimeline('kenpo-x')).toBe(true)
    expect(getTimeline('kenpo-x')).toBe(kenpoX)
    // Plyo still resolves (registry holds both).
    expect(hasTimeline('plyometrics')).toBe(true)
    expect(getTimeline('chest-back')).toBeNull()
    expect(timelinesFor('kenpo-x')).toHaveLength(1)
  })

  it('has exactly 93 segments across 11 sections', () => {
    expect(segments).toHaveLength(93)
    const counts = [
      'Warm-Up & Stretch Phase',
      'Punch Section 1',
      'Cardio Break 1',
      'Punch Section 2',
      'Kick Section',
      'Cardio Break 2',
      'Kick & Combo Section',
      'Cardio Break 3',
      'Blocks & Elbows Section',
      'Finishing Combos & Burnout',
      'Cool Down & Stretch Phase',
    ].map((name) => segments.filter((s) => s.section === name).length)
    expect(counts).toEqual([26, 12, 3, 5, 6, 4, 8, 4, 8, 10, 7])
  })

  it('segment ids are unique', () => {
    const ids = segments.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has exactly one break — Punch Section 2’s water break — 30s, no leadIn, not logged', () => {
    const breaks = segments.filter((s) => s.kind === 'break')
    expect(breaks).toHaveLength(1)
    expect(breaks[0]?.id).toBe('p2-water')
    expect(breaks[0]?.seconds).toBe(30)
    expect(breaks[0]?.leadIn ?? 0).toBe(0)
    expect(kenpoX.loggedExerciseIds).not.toContain(breaks[0]!.exerciseId)
  })

  it('has 44 timed segments summing to 1535s and 49 untimed rep segments', () => {
    const timed = segments.filter((s) => s.seconds !== null)
    const untimed = segments.filter((s) => s.seconds === null)
    expect(timed).toHaveLength(44)
    expect(untimed).toHaveLength(49)
    const total = timed.reduce((sum, s) => sum + (s.seconds ?? 0), 0)
    expect(total).toBe(1535)
  })

  it('every timed segment has seconds > 0; every untimed segment has reps > 0', () => {
    for (const s of segments) {
      if (s.seconds !== null) {
        expect(s.seconds).toBeGreaterThan(0)
      } else {
        expect(s.reps).toBeGreaterThan(0)
      }
    }
  })

  it('lead-ins: 91 segments with leadIn 5 = 455s (93 − first − water break)', () => {
    const withLeadIn = segments.filter((s) => s.leadIn === 5)
    expect(withLeadIn).toHaveLength(91)
    const total = segments.reduce((sum, s) => sum + (s.leadIn ?? 0), 0)
    expect(total).toBe(455)
  })

  it('every non-first exercise-instance head has leadIn 5; continuations and breaks have none', () => {
    // Kenpo has no split continuations (every item is its own instance), so every
    // exercise segment is an instance head except the timeline-first.
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i]
      const isHead = i === 0 || segments[i - 1].exerciseId !== s.exerciseId
      if (s.kind === 'break') {
        expect(s.leadIn ?? 0).toBe(0)
        continue
      }
      if (isHead && i === 0) {
        expect(s.leadIn ?? 0).toBe(0)
      } else if (isHead) {
        expect(s.leadIn).toBe(5)
      } else {
        expect(s.leadIn ?? 0).toBe(0)
      }
    }
  })

  it('logs exactly 46 rep drills; every untimed segment’s exerciseId is logged; no timed id is logged', () => {
    expect(kenpoX.loggedExerciseIds).toHaveLength(46)
    const logged = new Set(kenpoX.loggedExerciseIds)
    // Unique logged ids.
    expect(logged.size).toBe(46)
    for (const s of segments) {
      if (s.kind === 'break') continue
      if (s.seconds === null) {
        // Untimed rep drill → its exerciseId must be logged.
        expect(logged.has(s.exerciseId)).toBe(true)
      } else {
        // Timed move → its exerciseId must NOT be logged.
        expect(logged.has(s.exerciseId)).toBe(false)
      }
    }
  })

  it('spot pins: first segment is the timed 60s warm-up stretch with no leadIn', () => {
    const first = segments[0]
    expect(first?.id).toBe('warm-wide-wrist-pull-stretch')
    expect(first?.seconds).toBe(60)
    expect(first?.leadIn ?? 0).toBe(0)
    expect(first?.section).toBe('Warm-Up & Stretch Phase')
  })

  it('spot pin: Vertical Punching Burnout carries reps 100', () => {
    const burnout = segments.find((s) => s.id === 'fc-vertical-punching-burnout')
    expect(burnout?.seconds).toBeNull()
    expect(burnout?.reps).toBe(100)
  })

  it('spot pin: Star Blocks reps 4, cue “2 passes forward, 2 passes back”', () => {
    const star = segments.find((s) => s.id === 'be-star-blocks')
    expect(star?.reps).toBe(4)
    expect(star?.cue).toBe('2 passes forward, 2 passes back')
  })

  it('X Jacks share exerciseId x-jacks across all four appearances, ids suffixed -1..-4', () => {
    const xjacks = segments.filter((s) => s.exerciseId === 'x-jacks')
    expect(xjacks).toHaveLength(4)
    expect(xjacks.map((s) => s.id).sort()).toEqual([
      'be-x-jacks-4',
      'cb1-x-jacks-1',
      'cb2-x-jacks-2',
      'cb3-x-jacks-3',
    ])
    for (const s of xjacks) {
      expect(s.seconds).toBeNull()
      expect(s.reps).toBe(10)
    }
    expect(kenpoX.loggedExerciseIds).toContain('x-jacks')
  })
})
