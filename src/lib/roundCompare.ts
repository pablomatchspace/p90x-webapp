import type { Pt } from '@/lib/chart'
import { diffDays } from '@/lib/dates'
import { getWorkout } from '@/lib/programData'
import { workoutTotalTrend } from '@/lib/progression'
import { materialize } from '@/lib/schedule/materialize'
import type { Session } from '@/lib/schema'
import { bodyValue, type BodyOutcomeKey, type RoundData } from '@/lib/roundReport'

/**
 * Round-over-round comparison (E28 US-146). Two rounds never share calendar
 * dates, so each series is re-based onto a round-relative x-axis:
 *
 *  - body metrics by **day of round** (1 = start date), which survives
 *    different start dates and lets weigh-ins line up day-for-day;
 *  - workout net totals by **occurrence index** (1st…nth time the workout
 *    came up), which survives reschedules — a skipped week shifts dates but
 *    not the occurrence count.
 *
 * Values are canonical units (kg / fraction), same convention as the report;
 * unlogged occurrences stay null so the chart shows a gap, not a zero.
 */

/** One body metric across a round, x = day of round (1-based). */
export function bodySeriesByDay(data: RoundData, key: BodyOutcomeKey): Pt[] {
  const points: Pt[] = []
  for (const entry of data.bodyLog) {
    const day = diffDays(data.startDate, entry.date) + 1
    if (day < 1) continue // weigh-ins predating day 1 have no round-relative slot
    const value = bodyValue(key, entry, data.snapshot)
    if (value === null) continue
    points.push({ x: day, y: value })
  }
  return points
}

/** A workout's session net totals across a round, x = occurrence index (1-based). */
export function netSeriesByOccurrence(data: RoundData, workoutKey: string): Pt[] {
  const schedule = materialize(data.program, data.startDate, data.scheduleOps)
  const sessions: ReadonlyMap<string, Session> = new Map(
    (data.workoutLogs[workoutKey]?.sessions ?? []).map((s) => [s.programDayId, s]),
  )
  const { totals } = workoutTotalTrend(
    schedule,
    getWorkout(workoutKey),
    sessions,
    data.snapshot.scoring,
  )
  return totals.map((total, i) => ({ x: i + 1, y: total }))
}

/** Workout keys with at least one logged net total in either round. */
export function comparableWorkouts(a: RoundData, b: RoundData): string[] {
  const keys = new Set([...Object.keys(a.workoutLogs), ...Object.keys(b.workoutLogs)])
  return [...keys]
    .filter((key) => {
      const style = getWorkout(key).style
      if (style !== 'strength' && style !== 'arx') return false
      return [a, b].some((data) =>
        netSeriesByOccurrence(data, key).some((point) => point.y !== null),
      )
    })
    .sort((x, y) => getWorkout(x).name.localeCompare(getWorkout(y).name))
}
