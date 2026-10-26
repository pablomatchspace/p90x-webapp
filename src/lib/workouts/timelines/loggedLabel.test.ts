import { describe, expect, it } from 'vitest'
import { getTimeline, loggedLabel } from './index'

describe('loggedLabel', () => {
  it('keeps left and right sides distinguishable in the play summary checklist', () => {
    const glutes = getTimeline('gn-bonus-glutes')!
    const labels = glutes.loggedExerciseIds.map((id) => loggedLabel(glutes, id))
    expect(new Set(labels).size).toBe(labels.length)
    expect(labels).toContain('Single-Leg Hip Thrust — Left')
  })

  it('has a unique label for every logged id of every timeline', () => {
    for (const key of ['kenpo-x', 'cardio-x', 'gn-speed-and-agility', 'gn-bonus-glutes']) {
      const t = getTimeline(key)!
      const labels = t.loggedExerciseIds.map((id) => loggedLabel(t, id))
      expect(new Set(labels).size, key).toBe(labels.length)
    }
  })

  it('falls back to the id when no segment carries it', () => {
    const t = getTimeline('gn-bonus-abs')!
    expect(loggedLabel(t, 'not-a-move')).toBe('not a move')
  })
})
