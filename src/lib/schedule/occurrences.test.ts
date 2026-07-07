import { describe, expect, it } from 'vitest'
import { compareISO } from '@/lib/dates'
import type { Session } from '@/lib/schema'
import { materialize } from './materialize'
import { previousValue, workoutOccurrences } from './occurrences'

const START = '2026-01-05'

describe('workoutOccurrences', () => {
  it('lists the days containing the workout in calendar order', () => {
    const schedule = materialize('classic', START, [])
    const occ = workoutOccurrences(schedule, 'chest-back')
    expect(occ.length).toBeGreaterThan(0)
    expect(occ[0].programDayId).toBe('d001')
    expect(occ[0].date).toBe(START)
    expect(occ.every((d) => d.workouts.includes('chest-back'))).toBe(true)
    for (let i = 1; i < occ.length; i++) {
      expect(compareISO(occ[i - 1].date, occ[i].date)).toBeLessThan(0)
    }
  })

  it('pairs Ab Ripper X with the phase-1 strength days', () => {
    const schedule = materialize('classic', START, [])
    const ids = workoutOccurrences(schedule, 'ab-ripper-x').map((d) => d.programDayId)
    expect(ids.slice(0, 3)).toEqual(['d001', 'd003', 'd005'])
  })

  it('keeps programDayIds stable while dates shift with a reschedule', () => {
    const before = workoutOccurrences(materialize('classic', START, []), 'chest-back')
    const after = workoutOccurrences(
      materialize('classic', START, [
        { id: 'op1', createdAt: 'x', kind: 'skip', date: '2026-01-06' },
      ]),
      'chest-back',
    )
    expect(after.map((d) => d.programDayId)).toEqual(before.map((d) => d.programDayId))
    expect(after[0].date).toBe(before[0].date) // day 1 sits before the skip
    expect(after[1].date).toBe('2026-01-13') // week 2 slid one day later
  })
})

describe('previousValue', () => {
  const schedule = materialize('classic', START, [])
  const occ = workoutOccurrences(schedule, 'chest-back')
  const sessions = new Map<string, Session>([
    [
      'd001',
      {
        programDayId: 'd001',
        entries: { 'standard-push-ups': { rounds: [{ main: 22, secondary: null }] } },
      },
    ],
    ['d008', { programDayId: 'd008', entries: {} }],
  ])

  it('walks back past occurrences without data', () => {
    expect(previousValue(occ, sessions, 2, 'standard-push-ups', 0, 'main')).toBe(22)
  })

  it('returns null with no earlier data', () => {
    expect(previousValue(occ, sessions, 0, 'standard-push-ups', 0, 'main')).toBeNull()
    expect(previousValue(occ, sessions, 2, 'standard-push-ups', 0, 'secondary')).toBeNull()
    expect(previousValue(occ, sessions, 2, 'military-push-ups', 0, 'main')).toBeNull()
  })
})
