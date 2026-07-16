import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { addDays, formatLong } from '@/lib/shared'
import { scheduleOpSchema, type ScheduleOp } from '@/lib/shared'
import { materialize } from './materialize'
import {
  describeOp,
  newRemapOp,
  newSkipOp,
  newSwapOp,
  nextProgramDateAfter,
  opEffect,
  previewOp,
  remapBaseWeek,
} from './ops'

const START = '2026-01-05' // Monday, like the sample persona

let seq = 0
const mkBase = () => ({ id: `op${seq++}`, createdAt: '2026-01-01T00:00:00.000Z' })
const skip = (date: string): ScheduleOp => ({ ...mkBase(), kind: 'skip', date })
const swap = (dateA: string, dateB: string): ScheduleOp => ({
  ...mkBase(),
  kind: 'swap',
  dateA,
  dateB,
})

describe('op builders', () => {
  it('produce schema-valid ops with unique ids', () => {
    const ops = [
      newSkipOp('2026-01-14'),
      newSwapOp('2026-01-20', '2026-01-21'),
      newRemapOp(3, [1, 0, 2, 3, 4, 5, 6]),
    ]
    for (const op of ops) expect(scheduleOpSchema.safeParse(op).success).toBe(true)
    expect(new Set(ops.map((o) => o.id)).size).toBe(3)
  })
})

describe('previewOp', () => {
  it('accepts a valid skip and pushes the projected finish out a day', () => {
    const ops: ScheduleOp[] = []
    const before = materialize('classic', START, ops)
    const preview = previewOp('classic', START, ops, newSkipOp('2026-01-14'))
    expect(preview.ok).toBe(true)
    expect(preview.reason).toBeNull()
    expect(preview.after?.projectedCompletion).toBe(addDays(before.projectedCompletion, 1))
    expect(ops).toHaveLength(0) // input untouched
  })

  it('refuses an out-of-range skip with the engine reason, state unchanged', () => {
    const preview = previewOp('classic', START, [], newSkipOp('2025-12-25'))
    expect(preview.ok).toBe(false)
    expect(preview.reason).toBeTruthy()
    expect(preview.after).toBeNull()
  })

  it('refuses a swap outside the calendar with a reason', () => {
    const preview = previewOp('classic', START, [], newSwapOp('2026-01-20', '2027-01-01'))
    expect(preview.ok).toBe(false)
    expect(preview.reason).toBeTruthy()
  })

  it('supports pull-forward: swapping a gap with the next program day', () => {
    const ops = [skip('2026-01-14')]
    const schedule = materialize('classic', START, ops)
    expect(schedule.byDate.get('2026-01-14')?.kind).toBe('gap')

    const next = nextProgramDateAfter(schedule, '2026-01-14')
    expect(next).toBe('2026-01-15')

    const preview = previewOp('classic', START, ops, newSwapOp('2026-01-14', next as string))
    expect(preview.ok).toBe(true)
    const pulled = preview.after?.byDate.get('2026-01-14')
    expect(pulled?.kind === 'program' && pulled.programDayId).toBe('d010')
    expect(preview.after?.byDate.get('2026-01-15')?.kind).toBe('gap')
  })
})

describe('nextProgramDateAfter', () => {
  it('returns null past the end of the calendar', () => {
    const schedule = materialize('classic', START, [])
    expect(nextProgramDateAfter(schedule, schedule.lastProgramDate)).toBeNull()
  })
})

describe('apply → revert identity (US-031 AC)', () => {
  it('holds for a deterministic swap over a skip history', () => {
    const ops = [skip('2026-01-14')]
    const base = materialize('classic', START, ops)
    const candidate = swap('2026-01-20', '2026-01-21')
    const reverted = { ...candidate, revertedAt: '2026-01-02T00:00:00.000Z' }
    expect(materialize('classic', START, [...ops, reverted]).days).toEqual(base.days)
  })

  it('holds for arbitrary candidates over arbitrary op histories', () => {
    const dateArb = fc.integer({ min: -3, max: 96 }).map((n) => addDays(START, n))
    const skipArb = dateArb.map((d) => skip(d))
    const swapArb = fc.tuple(dateArb, dateArb).map(([a, b]) => swap(a, b))
    const remapArb = fc
      .tuple(
        fc.integer({ min: 1, max: 13 }),
        fc.shuffledSubarray([0, 1, 2, 3, 4, 5, 6], { minLength: 7, maxLength: 7 }),
      )
      .map(([fromWeek, order]): ScheduleOp => ({ ...mkBase(), kind: 'remap', fromWeek, order }))
    const anyOp = fc.oneof(skipArb, swapArb, remapArb)

    fc.assert(
      fc.property(fc.array(anyOp, { maxLength: 6 }), anyOp, (ops, candidate) => {
        const base = materialize('classic', START, ops)
        const withReverted = materialize('classic', START, [
          ...ops,
          { ...candidate, revertedAt: 'x' },
        ])
        expect(withReverted.days).toEqual(base.days)
        // reschedules never lose or duplicate a workout slot (US-034)
        expect(withReverted.byProgramDayId.size).toBe(90)
      }),
      { numRuns: 60 },
    )
  })
})

describe('remapBaseWeek', () => {
  it('returns the 7 template slots of a normal week and 6 for week 13', () => {
    expect(remapBaseWeek('classic', START, [], 1).map((d) => d.programDayId)).toEqual([
      'd001',
      'd002',
      'd003',
      'd004',
      'd005',
      'd006',
      'd007',
    ])
    expect(remapBaseWeek('classic', START, [], 13)).toHaveLength(6)
  })

  it('reflects earlier remaps so a new one composes on top', () => {
    const remap: ScheduleOp = {
      ...mkBase(),
      kind: 'remap',
      fromWeek: 1,
      order: [1, 0, 2, 3, 4, 5, 6],
    }
    const base = remapBaseWeek('classic', START, [remap], 1)
    expect(base.map((d) => d.programDayId).slice(0, 2)).toEqual(['d002', 'd001'])
  })

  it('ignores skips and swaps — they act downstream of slot order', () => {
    const ops = [skip('2026-01-05'), swap('2026-01-07', '2026-01-08')]
    expect(remapBaseWeek('classic', START, ops, 1).map((d) => d.programDayId)).toEqual([
      'd001',
      'd002',
      'd003',
      'd004',
      'd005',
      'd006',
      'd007',
    ])
  })
})

describe('audit descriptions', () => {
  it('summarize each op kind for humans', () => {
    // formatLong is locale-dependent (node uses the OS locale), so compose the expectation
    expect(describeOp(skip('2026-01-14'))).toBe(`Rest day inserted on ${formatLong('2026-01-14')}`)
    expect(describeOp(swap('2026-01-21', '2026-01-22'))).toBe(
      `Swapped ${formatLong('2026-01-21')} and ${formatLong('2026-01-22')}`,
    )
    const remap: ScheduleOp = {
      ...mkBase(),
      kind: 'remap',
      fromWeek: 3,
      order: [1, 0, 2, 3, 4, 5, 6],
    }
    expect(describeOp(remap)).toBe('Weekly order changed from week 3')
    expect(opEffect(remap)).toContain('weeks 3–13')
    expect(opEffect(skip('2026-01-14'))).toContain('one day later')
  })
})
