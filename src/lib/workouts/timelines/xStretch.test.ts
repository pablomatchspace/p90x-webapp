import { describe, expect, it } from 'vitest'
import { getTimeline, hasTimeline, timelinesFor } from './index'
import { xStretch } from './xStretch'

const segments = xStretch.segments

describe('X Stretch timeline — golden pins (E18)', () => {
  it('attaches to the x-stretch workout key and resolves via the registry', () => {
    expect(xStretch.workoutKey).toBe('x-stretch')
    expect(hasTimeline('x-stretch')).toBe(true)
    expect(getTimeline('x-stretch')).toBe(xStretch)
    // Plyo + Kenpo still resolve (registry holds all three).
    expect(hasTimeline('plyometrics')).toBe(true)
    expect(hasTimeline('kenpo-x')).toBe(true)
    expect(getTimeline('chest-back')).toBeNull()
    expect(timelinesFor('x-stretch')).toHaveLength(1)
  })

  it('has exactly 62 segments across 9 sections', () => {
    expect(segments).toHaveLength(62)
    const counts = [
      'Warm-Up (Sun Salutations)',
      'Neck & Spine Mobilization',
      'Wrist & Forearm Stretches',
      'Upper Body Stretches',
      'Seated & Lying Core/Spine Stretches',
      'Seated Lower Body Stretches',
      'Hamstring & Calf Focus',
      'Ankle, Calf & Feet Mobilization',
      'Cool Down',
    ].map((name) => segments.filter((s) => s.section === name).length)
    // Per-section counts: 3 flows, 7 (Spinal Twist split), 3, 13 (Shoulder
    // Circles split), 8, 13, 6, 6, 3.
    expect(counts).toEqual([3, 7, 3, 13, 8, 13, 6, 6, 3])
  })

  it('segment ids are unique', () => {
    const ids = segments.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has no breaks (X Stretch has no water breaks)', () => {
    const breaks = segments.filter((s) => s.kind === 'break')
    expect(breaks).toHaveLength(0)
  })

  it('has exactly 3 untimed segments — the sun-salutation flows — all rep-less', () => {
    const untimed = segments.filter((s) => s.seconds === null)
    expect(untimed).toHaveLength(3)
    for (const s of untimed) {
      // Flows carry no rep target — the wait UI shows the chain cue + Ready.
      expect(s.reps).toBeUndefined()
      expect(s.exerciseId).toBe('sun-salutation')
    }
  })

  it('sum of timed seconds is 2120 (invariant under Q14 flattening)', () => {
    const timed = segments.filter((s) => s.seconds !== null)
    const total = timed.reduce((sum, s) => sum + (s.seconds ?? 0), 0)
    expect(total).toBe(2120)
  })

  it('every timed segment has seconds > 0', () => {
    for (const s of segments) {
      if (s.seconds !== null) expect(s.seconds).toBeGreaterThan(0)
    }
  })

  it('logs nothing — loggedExerciseIds is empty (GD-B: stretch session)', () => {
    expect(xStretch.loggedExerciseIds).toHaveLength(0)
  })

  it('lead-ins: 55 instance heads × 5s = 275s (62 − first − 6 continuations)', () => {
    const withLeadIn = segments.filter((s) => s.leadIn === 5)
    expect(withLeadIn).toHaveLength(55)
    const total = segments.reduce((sum, s) => sum + (s.leadIn ?? 0), 0)
    expect(total).toBe(275)
  })

  it('every non-first exercise-instance head has leadIn 5; continuations and the timeline-first have none', () => {
    // An "exercise instance" = a maximal contiguous run of segments sharing an
    // exerciseId. Rule (Q13b): the head of every exercise instance has leadIn 5,
    // except the very first segment of the timeline; split-continuation segments
    // (Spinal Twist R, Shoulder Circles phases 2–4, Sun Salutation rounds 2–3)
    // have no lead-in.
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

  it('spot pin: first segment is an untimed Sun Salutation flow with no leadIn', () => {
    const first = segments[0]
    expect(first?.id).toBe('sun-salutation-1')
    expect(first?.seconds).toBeNull()
    expect(first?.reps).toBeUndefined()
    expect(first?.leadIn ?? 0).toBe(0)
    expect(first?.section).toBe('Warm-Up (Sun Salutations)')
    expect(first?.cue).toContain('Arms up -> Swan dive')
  })

  it('spot pin: Spinal Twist is a seamless 15s L + 15s R split sharing exerciseId', () => {
    const twist = segments.filter((s) => s.exerciseId === 'spinal-twist')
    expect(twist).toHaveLength(2)
    expect(twist.map((s) => s.seconds)).toEqual([15, 15])
    expect(twist[0]?.leadIn).toBe(5)
    expect(twist[1]?.leadIn ?? 0).toBe(0)
  })

  it('spot pin: Shoulder Circles is a seamless 4 × 20s split sharing exerciseId', () => {
    const circles = segments.filter((s) => s.exerciseId === 'shoulder-circles')
    expect(circles).toHaveLength(4)
    expect(circles.map((s) => s.seconds)).toEqual([20, 20, 20, 20])
    expect(circles[0]?.leadIn).toBe(5)
    for (let i = 1; i < circles.length; i++) {
      expect(circles[i]?.leadIn ?? 0).toBe(0)
    }
  })

  it('spot pin: cycle items stay one timed segment (Head Rolls, Dreya Forearm, Tapas, Cat/Cow)', () => {
    const headRolls = segments.find((s) => s.id === 'head-rolls')
    expect(headRolls?.seconds).toBe(60)
    expect(headRolls?.cue).toContain('6 cycles')
    const dreya = segments.find((s) => s.id === 'dreya-forearm-stretch')
    expect(dreya?.seconds).toBe(60)
    expect(dreya?.cue).toContain('2 cycles')
    const tapas = segments.find((s) => s.id === 'tapas-stretch')
    expect(tapas?.seconds).toBe(45)
    expect(tapas?.cue).toContain('3 cycles')
    const catCow = segments.find((s) => s.id === 'cat-cow-stretch')
    expect(catCow?.seconds).toBe(60)
    expect(catCow?.cue).toContain('5 breathing cycles')
  })

  it('GD-C: the final segment cue ends with the transcript cutoff note', () => {
    const last = segments[segments.length - 1]
    expect(last?.id).toBe('childs-pose-left')
    expect(last?.cue).toContain('(transcript ends here)')
    expect(last?.cue?.endsWith('(transcript ends here)')).toBe(true)
  })
})
