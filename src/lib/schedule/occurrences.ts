import type { Session } from '@/lib/schema'
import type { ProgramDay, Schedule } from './materialize'

/**
 * Where a workout shows up on the materialized calendar. The log screens are
 * organized around these occurrences: sessions are keyed by programDayId, so
 * they travel with reschedules and the week-column dates always come from the
 * live schedule (US-041).
 */
export function workoutOccurrences(schedule: Schedule, workoutKey: string): ProgramDay[] {
  const out: ProgramDay[] = []
  for (const day of schedule.days) {
    if (day.kind === 'program' && day.workouts.includes(workoutKey)) out.push(day)
  }
  return out
}

/**
 * Ghost-prefill source (US-042): the value this field held in the latest
 * earlier occurrence that has one, so a skipped week doesn't blank the ghosts.
 */
export function previousValue(
  occurrences: ProgramDay[],
  sessions: ReadonlyMap<string, Session>,
  beforeIndex: number,
  exerciseId: string,
  round: number,
  field: 'main' | 'secondary',
): number | null {
  for (let i = beforeIndex - 1; i >= 0; i--) {
    const value = sessions.get(occurrences[i].programDayId)?.entries?.[exerciseId]?.rounds[round]?.[
      field
    ]
    if (value !== null && value !== undefined) return value
  }
  return null
}
