import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  addDays,
  compareISO,
  diffDays,
  formatLong,
  fromISO,
  isISODate,
  toISO,
  todayISO,
} from './dates'

describe('dates', () => {
  it('round-trips ISO strings through Date at local midnight', () => {
    expect(toISO(fromISO('2026-05-25'))).toBe('2026-05-25')
    expect(fromISO('2026-05-25').getHours()).toBe(0)
  })

  it('validates ISO strings including impossible calendar dates', () => {
    expect(isISODate('2026-05-25')).toBe(true)
    expect(isISODate('2026-02-30')).toBe(false)
    expect(isISODate('2026-13-01')).toBe(false)
    expect(isISODate('26-05-25')).toBe(false)
    expect(isISODate('2024-02-29')).toBe(true) // leap day
  })

  it('addDays crosses month, year and leap boundaries', () => {
    expect(addDays('2026-05-31', 1)).toBe('2026-06-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
    expect(addDays('2026-05-25', 90)).toBe('2026-08-23') // planned P90X completion
    expect(addDays('2026-05-25', -1)).toBe('2026-05-24')
  })

  it('property: diffDays inverts addDays across DST transitions', () => {
    fc.assert(
      fc.property(
        // invalid Dates excluded: the API only ever receives validated ISO strings
        fc.date({ min: new Date(2020, 0, 1), max: new Date(2030, 11, 31), noInvalidDate: true }),
        fc.integer({ min: -500, max: 500 }),
        (base, n) => {
          const iso = toISO(base)
          expect(diffDays(iso, addDays(iso, n))).toBe(n)
        },
      ),
    )
  })

  it('compareISO orders chronologically', () => {
    expect(compareISO('2026-05-25', '2026-06-01')).toBe(-1)
    expect(compareISO('2026-06-01', '2026-05-25')).toBe(1)
    expect(compareISO('2026-06-01', '2026-06-01')).toBe(0)
  })

  it('formats without throwing and todayISO is valid', () => {
    expect(formatLong('2026-07-06')).toBeTruthy()
    expect(isISODate(todayISO())).toBe(true)
  })
})
