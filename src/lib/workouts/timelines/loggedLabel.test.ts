import { describe, expect, it } from 'vitest'
import { getTimeline, loggedLabels, timelinesFor } from './index'
import { workoutsFor } from '@/lib/shared'

const KEYS = [
  'plyometrics',
  'kenpo-x',
  'x-stretch',
  'cardio-x',
  'yoga-x',
  ...workoutsFor('gennext').map((w) => w.key),
]

describe('loggedLabels', () => {
  it('keeps left and right sides distinguishable in the play summary checklist', () => {
    const t = getTimeline('gn-bonus-glutes')!
    expect(loggedLabels(t).get('single-leg-hip-thrust-left')).toBe('Single-Leg Hip Thrust — Left')
  })

  it('gives every logged id of every registered timeline a unique label', () => {
    for (const key of KEYS) {
      for (const t of timelinesFor(key)) {
        const labels = [...loggedLabels(t).values()]
        expect(labels.length, key).toBe(t.loggedExerciseIds.length)
        expect(new Set(labels).size, `${key} ${t.variant ?? ''}`).toBe(labels.length)
      }
    }
  })

  it('names an id spanning both directions by its shared base, not one half', () => {
    const t = getTimeline('plyometrics')!
    expect(loggedLabels(t).get('circle-run')).toBe('Circle Run')
  })
})
