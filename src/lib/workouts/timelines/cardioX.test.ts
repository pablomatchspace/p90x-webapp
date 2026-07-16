import { describe, expect, it } from 'vitest'
import { getTimeline, hasTimeline, timelinesFor } from './index'
import { cardioX } from './cardioX'

const segments = cardioX.segments

describe('Cardio X timeline — golden pins (E18)', () => {
  it('attaches to the cardio-x workout key and resolves via the registry', () => {
    expect(cardioX.workoutKey).toBe('cardio-x')
    expect(hasTimeline('cardio-x')).toBe(true)
    expect(getTimeline('cardio-x')).toBe(cardioX)
    // Plyo + Kenpo + X Stretch still resolve (registry holds all four).
    expect(hasTimeline('plyometrics')).toBe(true)
    expect(hasTimeline('kenpo-x')).toBe(true)
    expect(hasTimeline('x-stretch')).toBe(true)
    expect(getTimeline('chest-back')).toBeNull()
    expect(timelinesFor('cardio-x')).toHaveLength(1)
  })

  it('has exactly 53 segments across 6 sections', () => {
    expect(segments).toHaveLength(53)
    const counts = [
      'Warm-Up Phase',
      'Yoga Warm-Up Series',
      'Kenpo Karate Series',
      'Plyometrics Series (Rounds 1 & 2)',
      'Core Section',
      'Cool Down & Stretch',
    ].map((name) => segments.filter((s) => s.section === name).length)
    // Per-section counts: 9 (Standing Quad split), 10 (2 flows + 8 poses),
    // 10 drills, 10 (5 moves x 2 rounds), 6, 8 (Standing Quad split).
    expect(counts).toEqual([9, 10, 10, 10, 6, 8])
  })

  it('segment ids are unique', () => {
    const ids = segments.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has no breaks (Cardio X has no water breaks)', () => {
    const breaks = segments.filter((s) => s.kind === 'break')
    expect(breaks).toHaveLength(0)
  })

  it('has 14 untimed segments: 2 rep-less flows + 12 rep drills', () => {
    const untimed = segments.filter((s) => s.seconds === null)
    expect(untimed).toHaveLength(14)
    const flows = untimed.filter((s) => s.reps === undefined)
    expect(flows).toHaveLength(2)
    for (const s of flows) expect(s.exerciseId).toBe('sun-salutation-vinyasa')
    const drills = untimed.filter((s) => s.reps !== undefined)
    expect(drills).toHaveLength(12)
    for (const s of drills) expect(s.reps).toBeGreaterThan(0)
  })

  it('sum of timed seconds is 1305 (invariant under Q14 flattening)', () => {
    const timed = segments.filter((s) => s.seconds !== null)
    const total = timed.reduce((sum, s) => sum + (s.seconds ?? 0), 0)
    expect(total).toBe(1305)
  })

  it('every timed segment has seconds > 0', () => {
    for (const s of segments) {
      if (s.seconds !== null) expect(s.seconds).toBeGreaterThan(0)
    }
  })

  it('logs exactly 12 rep drills; every untimed-with-reps id is logged; flows and timed ids are not', () => {
    expect(cardioX.loggedExerciseIds).toHaveLength(12)
    expect(new Set(cardioX.loggedExerciseIds).size).toBe(12)
    const logged = new Set(cardioX.loggedExerciseIds)
    for (const s of segments) {
      if (s.seconds === null && s.reps !== undefined) {
        // Untimed rep drill → its exerciseId must be logged.
        expect(logged.has(s.exerciseId)).toBe(true)
      } else {
        // Flow (no reps) or timed move → NOT logged.
        expect(logged.has(s.exerciseId)).toBe(false)
      }
    }
  })

  it('lead-ins: 48 instance heads × 5s = 240s (53 − first − 4 continuations)', () => {
    const withLeadIn = segments.filter((s) => s.leadIn === 5)
    expect(withLeadIn).toHaveLength(48)
    const total = segments.reduce((sum, s) => sum + (s.leadIn ?? 0), 0)
    expect(total).toBe(240)
  })

  it('every non-first exercise-instance head has leadIn 5; continuations and the timeline-first have none', () => {
    // An "exercise instance" = a maximal contiguous run of segments sharing an
    // exerciseId. Rule (Q13b): the head of every exercise instance has leadIn 5,
    // except the very first segment of the timeline; split-continuation segments
    // (Vinyasa 2, Standing Quad L, Squat Run R) have no lead-in.
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

  it('spot pin: first segment is the timed 60s Run in Place with no leadIn', () => {
    const first = segments[0]
    expect(first?.id).toBe('warm-run-in-place')
    expect(first?.seconds).toBe(60)
    expect(first?.leadIn ?? 0).toBe(0)
    expect(first?.section).toBe('Warm-Up Phase')
  })

  it('spot pin: Sun Salutation Vinyasas share exerciseId; Vinyasa 2 is a seamless continuation', () => {
    const vinyasa = segments.filter((s) => s.exerciseId === 'sun-salutation-vinyasa')
    expect(vinyasa).toHaveLength(2)
    expect(vinyasa.map((s) => s.seconds)).toEqual([null, null])
    // Vinyasa 1 is a head (after the warm-up Standing Quad); Vinyasa 2 continues.
    expect(vinyasa[0]?.leadIn).toBe(5)
    expect(vinyasa[1]?.leadIn ?? 0).toBe(0)
    for (const s of vinyasa) expect(s.reps).toBeUndefined()
  })

  it('spot pin: Jump Shot carries the round difference in its cue across both rounds', () => {
    const jumpShot = segments.filter((s) => s.exerciseId === 'jump-shot')
    expect(jumpShot).toHaveLength(2)
    expect(jumpShot[0]?.cue).toBe('Round 1: catch right/shoot left')
    expect(jumpShot[1]?.cue).toBe('Round 2: catch left/shoot right')
  })

  it('spot pin: Superman / Banana is one 60s timed segment (Q21e alternating-on-cue)', () => {
    const sb = segments.filter((s) => s.exerciseId === 'superman-banana')
    expect(sb).toHaveLength(1)
    expect(sb[0]?.seconds).toBe(60)
    expect(sb[0]?.cue).toContain('alternating holds')
  })

  it('spot pin: Squat Run is a seamless 30s L + 30s R split sharing exerciseId', () => {
    const squatRun = segments.filter((s) => s.exerciseId === 'squat-run')
    expect(squatRun).toHaveLength(2)
    expect(squatRun.map((s) => s.seconds)).toEqual([30, 30])
    expect(squatRun[0]?.leadIn).toBe(5)
    expect(squatRun[1]?.leadIn ?? 0).toBe(0)
  })

  it('spot pin: Standing Quad Stretch appears as two seamless 30R+30L splits (warm-up + cool-down)', () => {
    const quad = segments.filter((s) => s.exerciseId === 'standing-quad-stretch')
    expect(quad).toHaveLength(4)
    expect(quad.map((s) => s.seconds)).toEqual([30, 30, 30, 30])
    // Each split's first half is a head (leadIn 5); the second half a continuation.
    expect(quad[0]?.leadIn).toBe(5)
    expect(quad[1]?.leadIn ?? 0).toBe(0)
    expect(quad[2]?.leadIn).toBe(5)
    expect(quad[3]?.leadIn ?? 0).toBe(0)
  })

  it('spot pin: first Kenpo drill (Ball Kicks Right) is an untimed 20-rep wait', () => {
    const drill = segments.find((s) => s.id === 'ball-kicks-right')
    expect(drill?.seconds).toBeNull()
    expect(drill?.reps).toBe(20)
    expect(cardioX.loggedExerciseIds).toContain('ball-kicks-right')
  })
})
