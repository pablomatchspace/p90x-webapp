import { describe, expect, it } from 'vitest'
import { getTimeline, hasTimeline, timelinesFor } from './index'
import { yogaClassic } from './yogaClassic'
import { yogaX3 } from './yogaX3'

describe('Yoga play timelines — classic (truncated) and P90X3 (E19)', () => {
  it('attaches to the yoga-x workout key and resolves via the registry', () => {
    expect(hasTimeline('yoga-x')).toBe(true)
    expect(timelinesFor('yoga-x')).toHaveLength(2)
    expect(getTimeline('yoga-x')).toBe(yogaClassic) // defaults to first registered
    expect(getTimeline('yoga-x', 'classic')).toBe(yogaClassic)
    expect(getTimeline('yoga-x', 'x3')).toBe(yogaX3)
  })

  describe('Classic timeline constraints', () => {
    const segments = yogaClassic.segments

    it('has exactly 43 segments across 6 sections', () => {
      expect(segments).toHaveLength(43)
      const counts = [
        'Warm-Up & Prep Stretches',
        'Ashtanga Sun Salutations (Vinyasa Cycles)',
        "Vinyasa Flow - Runner's Series",
        'Standing Pose Flow (Warrior Series)',
        'Chair Pose Series',
        'Vinyasa Flow - Knee-to-Forehead & Bound Angles',
      ].map((name) => segments.filter((s) => s.section === name).length)
      expect(counts).toEqual([8, 3, 2, 12, 7, 11])
    })

    it('has exactly 21 untimed flows and 22 timed segments', () => {
      const untimed = segments.filter((s) => s.seconds === null)
      expect(untimed).toHaveLength(21)
      const timed = segments.filter((s) => s.seconds !== null)
      expect(timed).toHaveLength(22)
    })

    it('timed sum matches 735s', () => {
      const sum = segments.reduce((acc, s) => acc + (s.seconds ?? 0), 0)
      expect(sum).toBe(735)
    })

    it('ends with the GD-E transcript cutoff cue', () => {
      const last = segments[segments.length - 1]
      expect(last.id).toBe('prayer-twist-in-lunge-right-classic')
      expect(last.cue).toContain('(transcript ends here — continue with the video)')
    })

    it('segment ids are unique', () => {
      const ids = segments.map((s) => s.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })

  describe('X3 timeline constraints', () => {
    const segments = yogaX3.segments

    it('has exactly 62 segments across 8 sections', () => {
      expect(segments).toHaveLength(62)
      const counts = [
        'Warm-Up Phase',
        'Sun Salutation A',
        'Crescent Series',
        'Sun Salutation B & Bound Side Angle Series',
        'Balance & Split Series',
        'Wide Stance & Triangle Series',
        'Standing Balances & Crow Pose',
        'Spine & Floor Series',
      ].map((name) => segments.filter((s) => s.section === name).length)
      expect(counts).toEqual([4, 3, 6, 10, 10, 5, 7, 17])
    })

    it('has exactly 5 untimed flows and 57 timed segments', () => {
      const untimed = segments.filter((s) => s.seconds === null)
      expect(untimed).toHaveLength(5)
      const timed = segments.filter((s) => s.seconds !== null)
      expect(timed).toHaveLength(57)
    })

    it('timed sum matches 1695s', () => {
      const sum = segments.reduce((acc, s) => acc + (s.seconds ?? 0), 0)
      expect(sum).toBe(1695)
    })

    it('segment ids are unique', () => {
      const ids = segments.map((s) => s.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })
})
