import { describe, expect, it } from 'vitest'
import { getWorkout } from '@/lib/shared'
import type { AppState, Session } from '@/lib/shared'
import { materialize, type ProgramDay } from './materialize'
import { dayStatus, indexSessions, workoutState } from './status'

const TODAY = '2026-06-15'
const schedule = materialize('classic', '2026-05-25', [])

function dayNo(n: number): ProgramDay {
  const day = schedule.days[n - 1]
  if (day.kind !== 'program') throw new Error('expected program day')
  return day
}

function logs(...pairs: [string, Session][]): AppState['workoutLogs'] {
  const out: AppState['workoutLogs'] = {}
  for (const [key, session] of pairs) {
    ;(out[key] ??= { sessions: [] }).sessions.push(session)
  }
  return out
}

function entriesFor(workoutKey: string, count: number): Session['entries'] {
  const ids = (getWorkout(workoutKey).exercises ?? []).map((e) => e.id)
  return Object.fromEntries(
    ids.slice(0, count).map((id) => [id, { rounds: [{ main: 10, secondary: null }] }]),
  )
}

describe('workoutState', () => {
  it('completion style follows the COMPLETED? dropdown', () => {
    expect(workoutState('plyometrics', { programDayId: 'd002', status: 'yes' })).toBe('done')
    expect(workoutState('plyometrics', { programDayId: 'd002', status: 'no' })).toBe('no')
    expect(workoutState('plyometrics', { programDayId: 'd002', status: 'not-yet' })).toBe('pending')
    expect(workoutState('plyometrics', undefined)).toBe('pending')
  })

  it('strength: entries on ≥ half the exercises count as done, any as partial', () => {
    // chest-back has 12 exercises → 6 is the done threshold
    expect(
      workoutState('chest-back', { programDayId: 'd001', entries: entriesFor('chest-back', 6) }),
    ).toBe('done')
    expect(
      workoutState('chest-back', { programDayId: 'd001', entries: entriesFor('chest-back', 5) }),
    ).toBe('partial')
    expect(workoutState('chest-back', { programDayId: 'd001', entries: {} })).toBe('pending')
  })

  it('explicit completed flag overrides entry coverage in both directions', () => {
    expect(workoutState('chest-back', { programDayId: 'd001', completed: true })).toBe('done')
    expect(
      workoutState('chest-back', {
        programDayId: 'd001',
        completed: false,
        entries: entriesFor('chest-back', 12),
      }),
    ).toBe('pending')
  })

  it('ARX behaves like strength (11 moves → 6 is the threshold)', () => {
    expect(
      workoutState('ab-ripper-x', { programDayId: 'd001', entries: entriesFor('ab-ripper-x', 6) }),
    ).toBe('done')
    expect(
      workoutState('ab-ripper-x', { programDayId: 'd001', entries: entriesFor('ab-ripper-x', 1) }),
    ).toBe('partial')
  })
})

describe('dayStatus', () => {
  it('gap days report gap', () => {
    const s = materialize('classic', '2026-05-25', [
      { id: 'k1', createdAt: 'x', kind: 'skip', date: '2026-05-27' },
    ])
    expect(dayStatus(s.days[2], indexSessions({}), TODAY)).toBe('gap')
  })

  it('rest days are never missed, and any logged activity marks them done', () => {
    const rest = dayNo(7) // 2026-05-31, past
    expect(dayStatus(rest, indexSessions({}), TODAY)).toBe('rest')
    const stretched = indexSessions(
      logs(['x-stretch', { programDayId: rest.programDayId, status: 'yes' }]),
    )
    expect(dayStatus(rest, stretched, TODAY)).toBe('done')
  })

  it('a day is done only when every workout on it is done (ARX pairing)', () => {
    const d1 = dayNo(1) // chest-back + ab-ripper-x
    const both = indexSessions(
      logs(
        ['chest-back', { programDayId: 'd001', completed: true }],
        ['ab-ripper-x', { programDayId: 'd001', completed: true }],
      ),
    )
    const onlyMain = indexSessions(logs(['chest-back', { programDayId: 'd001', completed: true }]))
    expect(dayStatus(d1, both, TODAY)).toBe('done')
    expect(dayStatus(d1, onlyMain, TODAY)).toBe('partial')
  })

  it('untouched days: missed when past, pending when today or future', () => {
    expect(dayStatus(dayNo(2), indexSessions({}), TODAY)).toBe('missed') // May 26 < Jun 15
    const todayDay = schedule.byDate.get(TODAY)
    expect(todayDay?.kind).toBe('program')
    expect(dayStatus(todayDay!, indexSessions({}), TODAY)).toBe('pending')
    expect(dayStatus(dayNo(89), indexSessions({}), TODAY)).toBe('pending')
  })

  it('an explicit NO on every workout marks the day missed regardless of date', () => {
    const plyoDay = dayNo(2)
    const declined = indexSessions(
      logs(['plyometrics', { programDayId: plyoDay.programDayId, status: 'no' }]),
    )
    expect(dayStatus(plyoDay, declined, '2026-05-25')).toBe('missed')
  })

  it('mixed done + no is partial', () => {
    const d1 = dayNo(1)
    const mixed = indexSessions(
      logs(
        ['chest-back', { programDayId: 'd001', completed: true }],
        ['ab-ripper-x', { programDayId: 'd001', completed: false }],
      ),
    )
    expect(dayStatus(d1, mixed, TODAY)).toBe('partial')
  })
})

describe('indexSessions', () => {
  it('indexes by programDayId then workout key', () => {
    const index = indexSessions(
      logs(
        ['chest-back', { programDayId: 'd001', completed: true }],
        ['chest-back', { programDayId: 'd008', completed: true }],
        ['ab-ripper-x', { programDayId: 'd001', completed: true }],
      ),
    )
    expect(index.get('d001')?.size).toBe(2)
    expect(index.get('d008')?.size).toBe(1)
    expect(index.get('d999')).toBeUndefined()
  })
})
