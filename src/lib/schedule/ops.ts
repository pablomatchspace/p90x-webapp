import { compareISO, formatLong, type ISODate } from '@/lib/shared'
import type { ProgramKey } from '@/lib/shared'
import type { RemapOp, ScheduleOp, SkipOp, SwapOp } from '@/lib/shared'
import { materialize, type ProgramDay, type Schedule } from './materialize'

/**
 * Op construction + validation for the reschedule UI (US-030..034). Ops are
 * append-only: reverting keeps the record for the audit trail. Validation is
 * delegated to the engine — a candidate is applied to a scratch materialization
 * and rejected iff the engine reports it in `ignoredOps`, so UI rules can never
 * drift from replay rules.
 */

function opBase() {
  return { id: crypto.randomUUID(), createdAt: new Date().toISOString() }
}

export function newSkipOp(date: ISODate): SkipOp {
  return { ...opBase(), kind: 'skip', date }
}

export function newSwapOp(dateA: ISODate, dateB: ISODate): SwapOp {
  return { ...opBase(), kind: 'swap', dateA, dateB }
}

export function newRemapOp(fromWeek: number, order: number[]): RemapOp {
  return { ...opBase(), kind: 'remap', fromWeek, order }
}

export interface OpPreview {
  ok: boolean
  /** the engine's refusal reason when not ok */
  reason: string | null
  /** the schedule as it would look with the op applied; null when rejected */
  after: Schedule | null
}

export function previewOp(
  program: ProgramKey,
  startDate: ISODate,
  ops: ScheduleOp[],
  candidate: ScheduleOp,
): OpPreview {
  const after = materialize(program, startDate, [...ops, candidate])
  const ignored = after.ignoredOps.find((i) => i.opId === candidate.id)
  return ignored === undefined
    ? { ok: true, reason: null, after }
    : { ok: false, reason: ignored.reason, after: null }
}

/** First program day strictly after `date` — the swap partner for pull-forward. */
export function nextProgramDateAfter(schedule: Schedule, date: ISODate): ISODate | null {
  for (const d of schedule.days) {
    if (d.kind === 'program' && compareISO(d.date, date) > 0) return d.date
  }
  return null
}

/**
 * The week's slots with only remaps applied — the base the template editor
 * reorders. Skips/swaps act on calendar dates downstream and never change slot
 * order, so a new remap expressed against this view composes exactly with the
 * remaps already in the log. Week 13 returns 6 slots.
 */
export function remapBaseWeek(
  program: ProgramKey,
  startDate: ISODate,
  ops: ScheduleOp[],
  week: number,
): ProgramDay[] {
  const remapsOnly = ops.filter((op) => op.kind === 'remap')
  const schedule = materialize(program, startDate, remapsOnly)
  return schedule.days.filter((d): d is ProgramDay => d.kind === 'program' && d.week === week)
}

/** Audit-trail headline, e.g. "Rest day inserted on Wed, Jan 14". */
export function describeOp(op: ScheduleOp): string {
  switch (op.kind) {
    case 'skip':
      return `Rest day inserted on ${formatLong(op.date)}`
    case 'swap':
      return `Swapped ${formatLong(op.dateA)} and ${formatLong(op.dateB)}`
    case 'remap':
      return `Weekly order changed from week ${op.fromWeek}`
  }
}

/** Audit-trail effect line (US-034: op, when, effect). */
export function opEffect(op: ScheduleOp): string {
  switch (op.kind) {
    case 'skip':
      return 'Everything after it moved one day later.'
    case 'swap':
      return 'The two days exchanged workouts; logs travel with their workout.'
    case 'remap':
      return `Weekday order updated for weeks ${op.fromWeek}–13.`
  }
}
