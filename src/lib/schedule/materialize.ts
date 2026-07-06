import { addDays, compareISO, type ISODate } from '@/lib/dates'
import { getTemplate, type ProgramKey } from '@/lib/programData'
import type { ScheduleOp } from '@/lib/schema'

/**
 * Schedule materialization (US-020). Pure replay of the op log onto the
 * program template: `(program, startDate, ops) → Schedule`. Nothing here is
 * persisted — the ops are the source of truth and every view recomputes.
 *
 * Positions vs content, mirroring the workbook: a calendar position owns its
 * date and day/week/phase numbering; the CONTENT (programDayId + workouts)
 * is what reschedule ops move around. Logs attach to programDayId, so they
 * travel with the workout wherever it lands.
 *
 * Op application order is deterministic: remaps (structural, reshape the
 * template), then skips (lay content onto dates, inserting gap days), then
 * swaps (exchange content between two dates) — each group in array order.
 * Ops with `revertedAt` are ignored entirely; ops that cannot apply are
 * reported in `ignoredOps` with a reason and never abort materialization.
 */

export interface ProgramDay {
  date: ISODate
  kind: 'program'
  /** stable slot id ('d001'…'d090') — sessions reference this */
  programDayId: string
  /** chronological position among program days: 1…90 */
  day: number
  week: number
  phase: 1 | 2 | 3
  recovery: boolean
  workouts: string[]
}

export interface GapDay {
  date: ISODate
  kind: 'gap'
  /** the skip op that inserted this day */
  skipOpId: string
}

export type ScheduleDay = ProgramDay | GapDay

export interface IgnoredOp {
  opId: string
  reason: string
}

export interface Schedule {
  program: ProgramKey
  startDate: ISODate
  /** contiguous calendar days: days[i].date === addDays(startDate, i) */
  days: ScheduleDay[]
  byDate: Map<ISODate, ScheduleDay>
  byProgramDayId: Map<string, ProgramDay>
  lastProgramDate: ISODate
  /** workbook convention: completion is the day AFTER the last program day */
  plannedCompletion: ISODate
  projectedCompletion: ISODate
  /** active ops that could not be applied — surfaced in the audit UI (E3) */
  ignoredOps: IgnoredOp[]
}

export function slotId(day: number): string {
  return `d${String(day).padStart(3, '0')}`
}

interface Content {
  programDayId: string
  workouts: string[]
}

export function materialize(program: ProgramKey, startDate: ISODate, ops: ScheduleOp[]): Schedule {
  const active = ops.filter((op) => op.revertedAt === undefined)
  const ignoredOps: IgnoredOp[] = []

  // 1) Remaps reshape the template: permute content within each week from
  //    fromWeek onward. Week 13 has only 6 slots — order indices ≥ length drop.
  const slots: Content[] = getTemplate(program).map((t) => ({
    programDayId: slotId(t.day),
    workouts: t.workouts,
  }))
  for (const op of active) {
    if (op.kind !== 'remap') continue
    if (new Set(op.order).size !== 7) {
      ignoredOps.push({ opId: op.id, reason: 'order is not a permutation of the 7 weekday slots' })
      continue
    }
    for (let week = op.fromWeek; week <= 13; week++) {
      const from = (week - 1) * 7
      const weekSlots = slots.slice(from, from + 7)
      const picked = op.order.filter((i) => i < weekSlots.length).map((i) => weekSlots[i])
      slots.splice(from, weekSlots.length, ...picked)
    }
  }

  // 2) Skips lay content onto the calendar, inserting a gap day per skip.
  //    `date <= cursor` (on a date-sorted queue) makes several skips on the
  //    same date insert consecutive gaps instead of silently dropping.
  const queue = active
    .filter((op) => op.kind === 'skip')
    .filter((op) => {
      if (compareISO(op.date, startDate) >= 0) return true
      ignoredOps.push({ opId: op.id, reason: `skip on ${op.date} is before the program start` })
      return false
    })
    .sort((a, b) => compareISO(a.date, b.date))
  const items: { date: ISODate; content: Content | null; skipOpId?: string }[] = []
  let cursor = startDate
  let slotIndex = 0
  let queueIndex = 0
  while (slotIndex < slots.length) {
    const next = queue[queueIndex]
    if (next !== undefined && compareISO(next.date, cursor) <= 0) {
      items.push({ date: cursor, content: null, skipOpId: next.id })
      queueIndex += 1
    } else {
      items.push({ date: cursor, content: slots[slotIndex] })
      slotIndex += 1
    }
    cursor = addDays(cursor, 1)
  }
  for (; queueIndex < queue.length; queueIndex++) {
    const op = queue[queueIndex]
    ignoredOps.push({ opId: op.id, reason: `skip on ${op.date} is after the program end` })
  }

  // 3) Swaps exchange the content of two dates. Swapping a program day with
  //    a gap day is exactly "pull forward": the workout moves into the gap.
  const itemByDate = new Map(items.map((item) => [item.date, item]))
  for (const op of active) {
    if (op.kind !== 'swap') continue
    if (op.dateA === op.dateB) {
      ignoredOps.push({ opId: op.id, reason: 'both dates are the same day' })
      continue
    }
    const a = itemByDate.get(op.dateA)
    const b = itemByDate.get(op.dateB)
    if (a === undefined || b === undefined) {
      const missing = a === undefined ? op.dateA : op.dateB
      ignoredOps.push({ opId: op.id, reason: `${missing} is not on the schedule` })
      continue
    }
    ;[a.content, b.content] = [b.content, a.content]
    ;[a.skipOpId, b.skipOpId] = [b.skipOpId, a.skipOpId]
  }

  // 4) Assign positional attributes by chronological program-day rank.
  let rank = 0
  const days: ScheduleDay[] = items.map((item) => {
    if (item.content === null) return { date: item.date, kind: 'gap', skipOpId: item.skipOpId! }
    rank += 1
    const week = Math.floor((rank - 1) / 7) + 1
    return {
      date: item.date,
      kind: 'program',
      programDayId: item.content.programDayId,
      day: rank,
      week,
      phase: week <= 4 ? 1 : week <= 8 ? 2 : 3,
      recovery: week === 4 || week === 8 || week === 13,
      workouts: item.content.workouts,
    }
  })

  const byDate = new Map(days.map((d) => [d.date, d]))
  const byProgramDayId = new Map(
    days.filter((d): d is ProgramDay => d.kind === 'program').map((d) => [d.programDayId, d]),
  )
  let lastProgramDate = startDate
  for (const d of days) if (d.kind === 'program') lastProgramDate = d.date

  return {
    program,
    startDate,
    days,
    byDate,
    byProgramDayId,
    lastProgramDate,
    plannedCompletion: addDays(startDate, 90),
    projectedCompletion: addDays(lastProgramDate, 1),
    ignoredOps,
  }
}

export interface WeekSection {
  week: number
  phase: 1 | 2 | 3
  recovery: boolean
  days: ScheduleDay[]
}

/**
 * Chronological 13-section view for the calendar. Gap days attach to the
 * week of the preceding program day (where the schedule visibly paused);
 * gaps before the first program day join week 1.
 */
export function groupByWeek(days: ScheduleDay[]): WeekSection[] {
  const sections: WeekSection[] = []
  let current: WeekSection | null = null
  let leadingGaps: ScheduleDay[] = []
  for (const d of days) {
    if (d.kind === 'gap') {
      if (current === null) leadingGaps.push(d)
      else current.days.push(d)
      continue
    }
    if (current === null || current.week !== d.week) {
      current = { week: d.week, phase: d.phase, recovery: d.recovery, days: [] }
      sections.push(current)
      if (leadingGaps.length > 0) {
        current.days.push(...leadingGaps)
        leadingGaps = []
      }
    }
    current.days.push(d)
  }
  return sections
}
