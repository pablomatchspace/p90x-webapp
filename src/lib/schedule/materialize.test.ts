import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { addDays } from '@/lib/dates'
import type { ScheduleOp } from '@/lib/schema'
import { groupByWeek, materialize, slotId, type ProgramDay } from './materialize'

const START = '2026-05-25' // the real workbook's start date (structure only, no personal data)

let opCounter = 0
function op<K extends ScheduleOp['kind']>(
  kind: K,
  fields: Omit<Extract<ScheduleOp, { kind: K }>, 'id' | 'createdAt' | 'kind'>,
  reverted = false,
): ScheduleOp {
  opCounter += 1
  return {
    id: `op-${opCounter}`,
    createdAt: '2026-01-01T00:00:00',
    kind,
    ...(reverted ? { revertedAt: '2026-01-02T00:00:00' } : {}),
    ...fields,
  } as unknown as ScheduleOp
}

function programDays(schedule: ReturnType<typeof materialize>): ProgramDay[] {
  return schedule.days.filter((d): d is ProgramDay => d.kind === 'program')
}

describe('materialize — Lean variant (US-073)', () => {
  it('puts Core Synergistics on day 1 (the workbook Lean selector)', () => {
    const s = materialize('lean', START, [])
    expect(programDays(s)).toHaveLength(90)
    const [d1] = programDays(s)
    expect(d1.programDayId).toBe('d001')
    expect(d1.workouts).toEqual(['core-synergistics'])
  })

  it('shares its calendar skeleton with Classic, so reschedule ops replay unchanged', () => {
    const classic = materialize('classic', START, [])
    const lean = materialize('lean', START, [])
    // Identical dates and day/week/phase/recovery per position — only the
    // workouts differ, which is exactly why every date/week-indexed op stays
    // valid across a variant switch (no invalidation needed).
    expect(lean.days.map((d) => d.date)).toEqual(classic.days.map((d) => d.date))
    const skeleton = (s: ReturnType<typeof materialize>) =>
      s.days.map((d) =>
        d.kind === 'program' ? `${d.day}/${d.week}/${d.phase}/${d.recovery}` : 'gap',
      )
    expect(skeleton(lean)).toEqual(skeleton(classic))
    expect(lean.plannedCompletion).toBe(classic.plannedCompletion)
  })
})

describe('materialize — no ops', () => {
  const s = materialize('classic', START, [])

  it('lays 90 contiguous days from the start date', () => {
    expect(s.days).toHaveLength(90)
    s.days.forEach((d, i) => expect(d.date).toBe(addDays(START, i)))
    expect(programDays(s)).toHaveLength(90)
  })

  it('day 1 is Chest & Back + ARX, day 7 is rest (classic)', () => {
    const [d1] = programDays(s)
    expect(d1.programDayId).toBe('d001')
    expect(d1.workouts).toEqual(['chest-back', 'ab-ripper-x'])
    expect(programDays(s)[6].workouts).toEqual(['rest'])
  })

  it('week/phase/recovery boundaries match the program structure', () => {
    const byDay = new Map(programDays(s).map((d) => [d.day, d]))
    expect(byDay.get(22)).toMatchObject({ week: 4, phase: 1, recovery: true })
    expect(byDay.get(29)).toMatchObject({ week: 5, phase: 2, recovery: false })
    expect(byDay.get(56)).toMatchObject({ week: 8, phase: 2, recovery: true })
    expect(byDay.get(57)).toMatchObject({ week: 9, phase: 3, recovery: false })
    expect(byDay.get(90)).toMatchObject({ week: 13, phase: 3, recovery: true })
  })

  it('unshifted program: projected completion equals planned (start + 90)', () => {
    expect(s.lastProgramDate).toBe(addDays(START, 89))
    expect(s.plannedCompletion).toBe('2026-08-23')
    expect(s.projectedCompletion).toBe('2026-08-23')
  })
})

describe('materialize — skips (golden: workbook post-skip schedule)', () => {
  const ops = [
    op('skip', { date: '2026-05-27' }),
    op('skip', { date: '2026-05-28' }),
    op('skip', { date: '2026-06-04' }),
  ]
  const s = materialize('classic', START, ops)

  it('reproduces the workbook schedule: 3 gaps shift the program to Aug 25', () => {
    expect(s.days).toHaveLength(93)
    expect(s.ignoredOps).toEqual([])
    expect(s.byDate.get('2026-05-26')).toMatchObject({ kind: 'program', programDayId: 'd002' })
    expect(s.byDate.get('2026-05-27')).toMatchObject({ kind: 'gap' })
    expect(s.byDate.get('2026-05-28')).toMatchObject({ kind: 'gap' })
    expect(s.byDate.get('2026-05-29')).toMatchObject({ kind: 'program', programDayId: 'd003' })
    expect(s.byDate.get('2026-06-03')).toMatchObject({ programDayId: 'd008', week: 2 })
    expect(s.byDate.get('2026-06-04')).toMatchObject({ kind: 'gap' })
    expect(s.byDate.get('2026-06-05')).toMatchObject({ programDayId: 'd009' })
    expect(s.lastProgramDate).toBe('2026-08-25')
  })

  it('completion convention matches the workbook: planned Aug 23, projected Aug 26', () => {
    expect(s.plannedCompletion).toBe('2026-08-23')
    expect(s.projectedCompletion).toBe('2026-08-26')
  })

  it('gap days record which op inserted them', () => {
    const gap = s.byDate.get('2026-06-04')
    expect(gap?.kind === 'gap' && gap.skipOpId).toBe(ops[2].id)
  })

  it('sample persona: start Jan 5 + one skip ends Apr 5, projected Apr 6', () => {
    const sample = materialize('classic', '2026-01-05', [op('skip', { date: '2026-01-14' })])
    expect(sample.byDate.get('2026-01-13')).toMatchObject({ programDayId: 'd009' })
    expect(sample.byDate.get('2026-01-14')).toMatchObject({ kind: 'gap' })
    expect(sample.byDate.get('2026-01-15')).toMatchObject({ programDayId: 'd010' })
    expect(sample.lastProgramDate).toBe('2026-04-05')
    expect(sample.projectedCompletion).toBe('2026-04-06')
  })

  it('two skips on the same date insert consecutive gaps', () => {
    const twice = materialize('classic', START, [
      op('skip', { date: '2026-06-01' }),
      op('skip', { date: '2026-06-01' }),
    ])
    expect(twice.ignoredOps).toEqual([])
    expect(twice.byDate.get('2026-06-01')?.kind).toBe('gap')
    expect(twice.byDate.get('2026-06-02')?.kind).toBe('gap')
    expect(twice.byDate.get('2026-06-03')).toMatchObject({ programDayId: 'd008' })
    expect(twice.days).toHaveLength(92)
  })

  it('ignores skips outside the program with a reason; schedule unchanged', () => {
    const early = op('skip', { date: '2026-05-01' })
    const late = op('skip', { date: '2026-12-31' })
    const out = materialize('classic', START, [early, late])
    expect(out.days).toHaveLength(90)
    expect(out.ignoredOps).toEqual([
      { opId: early.id, reason: expect.stringContaining('before the program start') },
      { opId: late.id, reason: expect.stringContaining('after the program end') },
    ])
  })

  it('reverted ops are ignored entirely (and are not reported as ignored)', () => {
    const out = materialize('classic', START, [op('skip', { date: '2026-05-27' }, true)])
    expect(out.days).toHaveLength(90)
    expect(out.ignoredOps).toEqual([])
  })
})

describe('materialize — swaps', () => {
  it('exchanges content between two dates; position numbering stays put', () => {
    const s = materialize('classic', START, [
      op('swap', { dateA: '2026-05-25', dateB: '2026-05-26' }),
    ])
    const a = s.byDate.get('2026-05-25')
    const b = s.byDate.get('2026-05-26')
    expect(a).toMatchObject({ programDayId: 'd002', workouts: ['plyometrics'], day: 1 })
    expect(b).toMatchObject({ programDayId: 'd001', day: 2 })
    expect(s.byProgramDayId.get('d001')?.date).toBe('2026-05-26')
  })

  it('swapping a program day into a gap pulls the workout forward', () => {
    const skip = op('skip', { date: '2026-05-27' })
    const s = materialize('classic', START, [
      skip,
      op('swap', { dateA: '2026-05-27', dateB: '2026-05-28' }),
    ])
    expect(s.byDate.get('2026-05-27')).toMatchObject({ kind: 'program', programDayId: 'd003' })
    expect(s.byDate.get('2026-05-28')).toMatchObject({ kind: 'gap', skipOpId: skip.id })
    expect(programDays(s)).toHaveLength(90)
  })

  it('rejects swaps referencing dates off the schedule or identical dates', () => {
    const offDate = op('swap', { dateA: '2026-05-25', dateB: '2027-01-01' })
    const same = op('swap', { dateA: '2026-05-25', dateB: '2026-05-25' })
    const s = materialize('classic', START, [offDate, same])
    expect(s.ignoredOps).toEqual([
      { opId: offDate.id, reason: expect.stringContaining('2027-01-01') },
      { opId: same.id, reason: expect.stringContaining('same day') },
    ])
    expect(s.byDate.get('2026-05-25')).toMatchObject({ programDayId: 'd001' })
  })
})

describe('materialize — remaps', () => {
  it('reorders each week from fromWeek on; earlier weeks untouched', () => {
    // move the rest day (slot 6) to the front of every week from week 2
    const s = materialize('classic', START, [
      op('remap', { fromWeek: 2, order: [6, 0, 1, 2, 3, 4, 5] }),
    ])
    const days = programDays(s)
    expect(days[0].workouts).toEqual(['chest-back', 'ab-ripper-x']) // week 1 intact
    expect(days[7].programDayId).toBe('d014') // week 2 now starts with its rest day
    expect(days[7].workouts).toEqual(['rest'])
    expect(days[8].programDayId).toBe('d008')
    expect(days[7]).toMatchObject({ day: 8, week: 2 }) // numbering is positional
  })

  it('week 13 has 6 slots — out-of-range order indices drop', () => {
    const s = materialize('classic', START, [
      op('remap', { fromWeek: 13, order: [6, 5, 4, 3, 2, 1, 0] }),
    ])
    const days = programDays(s)
    expect(days).toHaveLength(90)
    expect(days[84].programDayId).toBe('d090')
    expect(days[89].programDayId).toBe('d085')
  })

  it('rejects a non-permutation order', () => {
    const bad = op('remap', { fromWeek: 1, order: [0, 0, 1, 2, 3, 4, 5] })
    const s = materialize('classic', START, [bad])
    expect(s.ignoredOps).toEqual([{ opId: bad.id, reason: expect.stringContaining('permutation') }])
    expect(programDays(s)[0].programDayId).toBe('d001')
  })
})

describe('materialize — invariants under arbitrary op soups (US-034 groundwork)', () => {
  const dateArb = fc.integer({ min: -10, max: 120 }).map((n) => addDays(START, n))
  const skipArb = fc.record({ date: dateArb }).map((f) => op('skip', f))
  const swapArb = fc.record({ dateA: dateArb, dateB: dateArb }).map((f) => op('swap', f))
  const remapArb = fc
    .record({
      fromWeek: fc.integer({ min: 1, max: 13 }),
      order: fc.oneof(
        fc.shuffledSubarray([0, 1, 2, 3, 4, 5, 6], { minLength: 7, maxLength: 7 }),
        fc.array(fc.integer({ min: 0, max: 6 }), { minLength: 7, maxLength: 7 }),
      ),
    })
    .map((f) => op('remap', f))
  const opsArb = fc.array(
    fc.tuple(fc.oneof(skipArb, swapArb, remapArb), fc.boolean()).map(([o, reverted]) => ({
      ...o,
      ...(reverted ? { revertedAt: 'x' } : {}),
    })),
    { maxLength: 25 },
  )

  // 150 materializations of a 90-day schedule: ~0.7 s alone, but the wall clock is
  // shared with every other suite running in parallel. Vitest's 5 s default left no
  // headroom and timed out under load once the E10 suites joined the run. The
  // property itself is unchanged — only the budget it is allowed to take.
  it(
    'every program day appears exactly once, dates contiguous, ends consistent',
    { timeout: 30_000 },
    () => {
      fc.assert(
        fc.property(opsArb, (ops) => {
          const s = materialize('classic', START, ops as ScheduleOp[])
          const program = programDays(s)
          expect(program).toHaveLength(90)
          const ids = new Set(program.map((d) => d.programDayId))
          expect(ids.size).toBe(90)
          for (let n = 1; n <= 90; n++) expect(ids.has(slotId(n))).toBe(true)
          s.days.forEach((d, i) => expect(d.date).toBe(addDays(START, i)))
          program.forEach((d, i) => expect(d.day).toBe(i + 1))
          expect(s.projectedCompletion).toBe(addDays(s.lastProgramDate, 1))
          // every active op either applied (skips: consumed as a gap) or was ignored with a reason
          const gaps = s.days.filter((d) => d.kind === 'gap')
          const activeSkips = ops.filter((o) => o.kind === 'skip' && o.revertedAt === undefined)
          const ignoredIds = new Set(s.ignoredOps.map((x) => x.opId))
          expect(gaps.length).toBe(activeSkips.filter((o) => !ignoredIds.has(o.id)).length)
        }),
        { numRuns: 150 },
      )
    },
  )

  it('materialization is pure: same inputs → identical output, inputs untouched', () => {
    const ops = [
      op('remap', { fromWeek: 3, order: [1, 0, 3, 2, 5, 4, 6] }),
      op('skip', { date: '2026-06-10' }),
      op('swap', { dateA: '2026-05-25', dateB: '2026-06-01' }),
    ]
    const snapshot = JSON.parse(JSON.stringify(ops))
    const a = materialize('classic', START, ops)
    const b = materialize('classic', START, ops)
    expect(a.days).toEqual(b.days)
    expect(ops).toEqual(snapshot)
    // template module data not mutated by the remap
    expect(materialize('classic', START, []).days[0]).toMatchObject({ programDayId: 'd001' })
  })
})

describe('groupByWeek', () => {
  it('always yields 13 chronological sections; gaps attach to the paused week', () => {
    const s = materialize('classic', START, [
      op('skip', { date: '2026-05-27' }),
      op('skip', { date: '2026-05-28' }),
      op('skip', { date: '2026-06-04' }),
    ])
    const weeks = groupByWeek(s.days)
    expect(weeks).toHaveLength(13)
    expect(weeks[0].days).toHaveLength(9) // 7 program days + 2 gaps
    expect(weeks[1].days).toHaveLength(8) // 7 + the Jun 4 gap
    expect(weeks[0]).toMatchObject({ week: 1, phase: 1, recovery: false })
    expect(weeks[3]).toMatchObject({ week: 4, recovery: true })
    expect(weeks[12].days.filter((d) => d.kind === 'program')).toHaveLength(6)
  })

  it('a gap swapped to the very start joins week 1', () => {
    const s = materialize('classic', START, [
      op('skip', { date: '2026-05-27' }),
      op('swap', { dateA: '2026-05-25', dateB: '2026-05-27' }),
    ])
    expect(s.days[0].kind).toBe('gap')
    const weeks = groupByWeek(s.days)
    expect(weeks).toHaveLength(13)
    expect(weeks[0].days[0].kind).toBe('gap')
    expect(weeks[0].days).toHaveLength(8)
  })
})
