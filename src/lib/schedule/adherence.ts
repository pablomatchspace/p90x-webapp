import type { Pt } from '@/lib/shared'
import { compareISO, diffDays, type ISODate } from '@/lib/shared'
import { getWorkout } from '@/lib/shared'
import type { ScheduleOp } from '@/lib/shared'
import type { ProgramDay, Schedule } from '@/lib/schedule/materialize'
import { dayStatus, type DayStatus, type SessionIndex } from '@/lib/schedule/status'

/**
 * Adherence & pace (US-062). A pure roll-up of the materialized schedule and
 * the session index through the US-047 day-status rules — the SAME `dayStatus`
 * the calendar and day detail use, so the dashboard can never disagree with the
 * calendar about whether a day is done.
 *
 * Scope conventions:
 *  - "to date" counts program days whose date is on/before `today`; future days
 *    are not yet scheduled and never count as missed.
 *  - Rest days are excluded from adherence denominators (there is nothing to
 *    complete). Activity logged on a rest day still shows as done on the
 *    calendar, but does not inflate the "scheduled" count here.
 *  - Weekly bars use the FULL week's non-rest days as the denominator so every
 *    bar is comparable; the current week simply fills in as days complete.
 */

const PROGRAM_WEEKS = 13

/** A program day is "rest" when every workout on it is a rest-style slot. */
function isRestDay(day: ProgramDay): boolean {
  return day.workouts.every((k) => getWorkout(k).style === 'rest')
}

export interface WeekBar {
  week: number
  phase: 1 | 2 | 3
  recovery: boolean
  /** non-rest program days in the week (the bar denominator) */
  scheduled: number
  done: number
  /** done / scheduled (0–1), or null for a week with no non-rest days */
  ratio: number | null
  /** the week has begun: its first day is on/before today */
  started: boolean
}

export interface Adherence {
  /** total program days on the schedule (90 for Classic/Lean) */
  programDays: number
  /** latest program-day number on/before today (0 before the start) */
  dayReached: number
  /** progress through the plan: dayReached / programDays (0–1) */
  progress: number
  /** non-rest program days on/before today */
  scheduled: number
  done: number
  missed: number
  partial: number
  /** non-rest, on/before today, still open (e.g. today, not yet logged) */
  pending: number
  /** rest days on/before today */
  rest: number
  /** done / scheduled over non-rest days to date (0–1), null before any */
  adherenceRate: number | null
  /**
   * Consecutive completed days ending at the latest past program day: a done
   * day extends it, a rest day passes through, a missed or partial day breaks
   * it, and a still-pending today is ignored (it hasn't had its chance yet).
   */
  currentStreak: number
  /** active (non-reverted) skip ops */
  skips: number
  /** projected − planned completion in days (≥ 0) */
  slipDays: number
  weeks: WeekBar[]
}

/**
 * Cumulative adherence rate (%) after each elapsed program day (E21) — the
 * dashboard trend line. Uses the SAME done/scheduled convention as the
 * headline rate above (rest days excluded, a still-pending today counted in
 * the denominator), so the line's last point always equals the headline.
 * y is null until the first non-rest day has elapsed.
 */
export function adherenceTrend(schedule: Schedule, index: SessionIndex, today: ISODate): Pt[] {
  const points: Pt[] = []
  let done = 0
  let scheduled = 0
  for (const day of schedule.days) {
    if (day.kind !== 'program' || compareISO(day.date, today) > 0) continue
    if (!isRestDay(day)) {
      scheduled += 1
      if (dayStatus(day, index, today) === 'done') done += 1
    }
    points.push({ x: day.day, y: scheduled > 0 ? (done / scheduled) * 100 : null })
  }
  return points
}

export function computeAdherence(
  schedule: Schedule,
  index: SessionIndex,
  ops: ScheduleOp[],
  today: ISODate,
): Adherence {
  const programDaysList = schedule.days.filter((d): d is ProgramDay => d.kind === 'program')

  let dayReached = 0
  let done = 0
  let missed = 0
  let partial = 0
  let pending = 0
  let rest = 0
  // chronological status of every program day on/before today (rest normalized)
  const history: DayStatus[] = []

  for (const day of programDaysList) {
    if (compareISO(day.date, today) > 0) continue
    dayReached = day.day
    if (isRestDay(day)) {
      rest += 1
      history.push('rest')
      continue
    }
    const status = dayStatus(day, index, today)
    history.push(status)
    if (status === 'done') done += 1
    else if (status === 'missed') missed += 1
    else if (status === 'partial') partial += 1
    else pending += 1
  }

  // Streak: ignore a trailing not-yet-done today, then walk back until a
  // missed/partial day breaks the run (rest days pass through).
  let cursor = history.length - 1
  while (cursor >= 0 && history[cursor] === 'pending') cursor -= 1
  let currentStreak = 0
  for (; cursor >= 0; cursor -= 1) {
    const status = history[cursor]
    if (status === 'done') currentStreak += 1
    else if (status === 'rest') continue
    else break
  }

  const scheduled = done + missed + partial + pending

  const weeks: WeekBar[] = []
  for (let week = 1; week <= PROGRAM_WEEKS; week += 1) {
    const days = programDaysList.filter((d) => d.week === week)
    if (days.length === 0) continue
    const nonRest = days.filter((d) => !isRestDay(d))
    const doneCount = nonRest.filter((d) => dayStatus(d, index, today) === 'done').length
    weeks.push({
      week,
      phase: days[0].phase,
      recovery: days[0].recovery,
      scheduled: nonRest.length,
      done: doneCount,
      ratio: nonRest.length > 0 ? doneCount / nonRest.length : null,
      started: days.some((d) => compareISO(d.date, today) <= 0),
    })
  }

  const programDays = programDaysList.length
  return {
    programDays,
    dayReached,
    progress: programDays > 0 ? dayReached / programDays : 0,
    scheduled,
    done,
    missed,
    partial,
    pending,
    rest,
    adherenceRate: scheduled > 0 ? done / scheduled : null,
    currentStreak,
    skips: ops.filter((op) => op.kind === 'skip' && op.revertedAt === undefined).length,
    slipDays: Math.max(0, diffDays(schedule.plannedCompletion, schedule.projectedCompletion)),
    weeks,
  }
}
