import { describe, expect, it } from 'vitest'
import type { AppState } from '@/lib/shared'
import { upsertSession, writeRoundValue } from './sessions'

/**
 * Session-log invariants (US-041/042), extracted from the application layer:
 * one session per (workout, program day); entries appear lazily with the
 * catalog's round count and vanish when every value clears, so the
 * "any entry ⇒ partial" status rule stays honest.
 */

const T = '2026-01-05T10:00:00.000Z'

function logs(): AppState['workoutLogs'] {
  return {}
}

describe('upsertSession', () => {
  it('creates the log and session on first touch', () => {
    const l = logs()
    const session = upsertSession(l, 'chest-back', 'd001')
    expect(session.programDayId).toBe('d001')
    expect(l['chest-back']?.sessions).toHaveLength(1)
  })

  it('returns the same session for the same (workout, program day)', () => {
    const l = logs()
    upsertSession(l, 'chest-back', 'd001')
    upsertSession(l, 'chest-back', 'd001')
    expect(l['chest-back']?.sessions).toHaveLength(1)
  })

  it('keeps sessions apart across program days', () => {
    const l = logs()
    upsertSession(l, 'chest-back', 'd001')
    upsertSession(l, 'chest-back', 'd015')
    expect(l['chest-back']?.sessions).toHaveLength(2)
  })
})

describe('writeRoundValue', () => {
  it('creates the entry lazily with the catalog round count', () => {
    const l = logs()
    writeRoundValue(l, 'chest-back', 'd001', 'standard-push-ups', 0, 'reps', 10, T)
    const entry = l['chest-back']?.sessions[0]?.entries?.['standard-push-ups']
    expect(entry?.rounds).toHaveLength(2)
    expect(entry?.rounds[0]).toEqual({ reps: 10, assist: null })
    expect(l['chest-back']?.sessions[0]?.loggedAt).toBe(T)
  })

  it('removes the entry once every value is cleared', () => {
    const l = logs()
    writeRoundValue(l, 'chest-back', 'd001', 'standard-push-ups', 0, 'reps', 10, T)
    writeRoundValue(l, 'chest-back', 'd001', 'standard-push-ups', 0, 'reps', null, T)
    expect(l['chest-back']).toBeUndefined()
  })

  it('ignores an unknown exercise or out-of-range round', () => {
    const l = logs()
    writeRoundValue(l, 'chest-back', 'd001', 'no-such-exercise', 0, 'reps', 10, T)
    writeRoundValue(l, 'chest-back', 'd001', 'standard-push-ups', 9, 'reps', 10, T)
    expect(l['chest-back']).toBeUndefined()
  })
})
