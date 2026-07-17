import { describe, expect, it } from 'vitest'
import { bodyFraction, kg, type BodyEntry } from '@/lib/shared'
import { removeEntry, upsertEntry } from './bodyLog'

/**
 * Body-log invariants (US-050), extracted from the application layer: one
 * scale entry per date, created lazily, kept sorted ascending, and removed
 * again when every field clears so missing-day gaps stay honest.
 */

describe('upsertEntry', () => {
  it('creates entries lazily and keeps the log sorted by date', () => {
    const log: BodyEntry[] = []
    upsertEntry(log, '2026-01-07', { weight: kg(81.9) })
    upsertEntry(log, '2026-01-06', { weight: kg(82) })
    expect(log.map((e) => e.date)).toEqual(['2026-01-06', '2026-01-07'])
  })

  it('updates the existing entry for the same date in place', () => {
    const log: BodyEntry[] = []
    upsertEntry(log, '2026-01-06', { weight: kg(82) })
    upsertEntry(log, '2026-01-06', { bodyFat: bodyFraction(0.22) })
    expect(log).toHaveLength(1)
    expect(log[0]).toMatchObject({ weight: 82, bodyFat: 0.22 })
  })

  it('removes the entry once every field is cleared', () => {
    const log: BodyEntry[] = []
    upsertEntry(log, '2026-01-06', { weight: kg(82) })
    upsertEntry(log, '2026-01-06', { weight: null })
    expect(log).toHaveLength(0)
  })
})

describe('removeEntry', () => {
  it('deletes by date and tolerates unknown dates', () => {
    const log: BodyEntry[] = []
    upsertEntry(log, '2026-01-06', { weight: kg(82) })
    removeEntry(log, '2026-01-05')
    expect(log).toHaveLength(1)
    removeEntry(log, '2026-01-06')
    expect(log).toHaveLength(0)
  })
})
