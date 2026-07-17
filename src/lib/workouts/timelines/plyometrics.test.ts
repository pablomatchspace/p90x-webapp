import { describe, expect, it } from 'vitest'
import { getTimeline, hasTimeline, timelinesFor } from './index'
import { plyometrics } from './plyometrics'

const segments = plyometrics.segments

describe('Plyometrics timeline — golden pins (E16)', () => {
  it('attaches to the plyometrics workout key and resolves via the registry', () => {
    expect(plyometrics.workoutKey).toBe('plyometrics')
    expect(hasTimeline('plyometrics')).toBe(true)
    expect(hasTimeline('chest-back')).toBe(false)
    expect(getTimeline('plyometrics')).toBe(plyometrics)
    expect(getTimeline('chest-back')).toBeNull()
    expect(timelinesFor('plyometrics')).toHaveLength(1)
  })

  it('has exactly 76 segments', () => {
    expect(segments).toHaveLength(76)
  })

  it('segment ids are unique', () => {
    const ids = segments.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every segment is timed (seconds > 0) — no untimed/null segments in Plyo', () => {
    for (const s of segments) {
      expect(s.seconds).not.toBeNull()
      expect(s.seconds).toBeGreaterThan(0)
    }
  })

  it('sum of seconds is 2550 (42:30) — the canonical runtime', () => {
    const total = segments.reduce((sum, s) => sum + (s.seconds ?? 0), 0)
    expect(total).toBe(2550)
  })

  it('sum of leadIn is 280 (56 gaps × 5s)', () => {
    const total = segments.reduce((sum, s) => sum + (s.leadIn ?? 0), 0)
    expect(total).toBe(280)
  })

  it('has exactly 5 water breaks, all 30s, no leadIn, and none are logged', () => {
    const breaks = segments.filter((s) => s.kind === 'break')
    expect(breaks).toHaveLength(5)
    for (const b of breaks) {
      expect(b.seconds).toBe(30)
      expect(b.leadIn ?? 0).toBe(0)
      expect(plyometrics.loggedExerciseIds).not.toContain(b.exerciseId)
    }
  })

  it('logs exactly 23 jump moves, all present among segment exerciseIds', () => {
    expect(plyometrics.loggedExerciseIds).toHaveLength(23)
    const exerciseIds = new Set(segments.map((s) => s.exerciseId))
    for (const id of plyometrics.loggedExerciseIds) {
      expect(exerciseIds.has(id)).toBe(true)
    }
  })

  it('no logged id belongs to Warm-Up or Cool Down', () => {
    const nonLoggedSections = new Set(
      segments
        .filter((s) => s.section === 'Warm-Up' || s.section === 'Cool Down & Stretch')
        .map((s) => s.exerciseId),
    )
    for (const id of plyometrics.loggedExerciseIds) {
      expect(nonLoggedSections.has(id)).toBe(false)
    }
  })

  it('Circle Run R1 ends CW then CCW; R2 is reversed — CCW then CW (Q21d)', () => {
    const ids = segments.map((s) => s.id)
    const r1CwIdx = ids.indexOf('b2-r1-circle-run-cw')
    const r1CcwIdx = ids.indexOf('b2-r1-circle-run-ccw')
    expect(r1CwIdx).toBeGreaterThan(-1)
    expect(r1CcwIdx).toBe(r1CwIdx + 1) // R1: CW immediately followed by CCW

    const r2CcwIdx = ids.indexOf('b2-r2-circle-run-ccw')
    const r2CwIdx = ids.indexOf('b2-r2-circle-run-cw')
    expect(r2CcwIdx).toBeGreaterThan(-1)
    expect(r2CwIdx).toBe(r2CcwIdx + 1) // R2: CCW immediately followed by CW (reversed)
  })

  it('every non-first exercise-instance head has leadIn 5; continuations and breaks have none', () => {
    // An "exercise instance" = a maximal contiguous run of segments sharing an
    // exerciseId. Its head is the first segment. Rule (Q13b): the head of every
    // exercise instance has leadIn 5, except the very first segment of the
    // timeline; split-continuation segments and breaks have no leadIn.
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i]
      const isHead = i === 0 || segments[i - 1].exerciseId !== s.exerciseId
      if (s.kind === 'break') {
        expect(s.leadIn ?? 0).toBe(0) // breaks never get a get-ready
        continue
      }
      if (isHead && i === 0) {
        expect(s.leadIn ?? 0).toBe(0) // very first segment — no lead-in
      } else if (isHead) {
        expect(s.leadIn).toBe(5) // new exercise instance → 5s get-ready
      } else {
        expect(s.leadIn ?? 0).toBe(0) // split continuation → seamless beep-switch
      }
    }
  })

  it('warm-up, blocks, bonus, and cool-down segment counts match the structure', () => {
    const bySection = (name: string) => segments.filter((s) => s.section === name).length
    expect(bySection('Warm-Up')).toBe(11)
    expect(bySection('Block 1 — Round 1') + bySection('Block 1 — Round 2')).toBe(9) // 4+4+water
    expect(bySection('Block 2 — Round 1') + bySection('Block 2 — Round 2')).toBe(11) // 5+5+water
    expect(bySection('Block 3 — Round 1') + bySection('Block 3 — Round 2')).toBe(11)
    expect(bySection('Block 4 — Round 1') + bySection('Block 4 — Round 2')).toBe(11)
    expect(bySection('Block 5 — Round 1') + bySection('Block 5 — Round 2')).toBe(11)
    expect(bySection('Sports Bonus Round')).toBe(5)
    expect(bySection('Cool Down & Stretch')).toBe(7)
  })
})
