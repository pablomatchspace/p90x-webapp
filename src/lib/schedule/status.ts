import { compareISO, type ISODate } from '@/lib/shared'
import { getWorkout } from '@/lib/shared'
import type { AppState, Session } from '@/lib/shared'
import type { ScheduleDay } from './materialize'

/**
 * Day/workout completion rules (US-047), derived once and reused by the
 * calendar, day detail, and later the adherence dashboard (US-062).
 *
 * Strength/ARX: an explicit `completed` flag always wins; otherwise entries
 * on at least half the exercises count as done, any entry as partial.
 * Completion-style (cardio/yoga…): the Excel COMPLETED? dropdown — yes / no /
 * not yet. Rest days are never "missed"; any activity logged on one (e.g.
 * X Stretch) marks it done.
 */

/** programDayId → workoutKey → session */
export type SessionIndex = Map<string, Map<string, Session>>

export function indexSessions(workoutLogs: AppState['workoutLogs']): SessionIndex {
  const index: SessionIndex = new Map()
  for (const [key, log] of Object.entries(workoutLogs)) {
    for (const session of log.sessions) {
      let byWorkout = index.get(session.programDayId)
      if (byWorkout === undefined) {
        byWorkout = new Map()
        index.set(session.programDayId, byWorkout)
      }
      byWorkout.set(key, session)
    }
  }
  return index
}

export type WorkoutState = 'done' | 'partial' | 'no' | 'pending'

export function workoutState(workoutKey: string, session: Session | undefined): WorkoutState {
  const def = getWorkout(workoutKey)
  if (def.style === 'completion' || def.style === 'rest') {
    if (session?.completion === 'yes') return 'done'
    if (session?.completion === 'no') return 'no'
    return 'pending'
  }
  // strength / arx
  if (session?.completed !== undefined) return session.completed ? 'done' : 'pending'
  const total = def.exercises?.length ?? 0
  const entered = Object.keys(session?.entries ?? {}).length
  if (total > 0 && entered * 2 >= total) return 'done'
  if (entered > 0) return 'partial'
  return 'pending'
}

export type DayStatus = 'gap' | 'rest' | 'done' | 'partial' | 'missed' | 'pending'

export function dayStatus(day: ScheduleDay, index: SessionIndex, today: ISODate): DayStatus {
  if (day.kind === 'gap') return 'gap'
  const sessions = index.get(day.programDayId)

  const isRestDay = day.workouts.every((k) => getWorkout(k).style === 'rest')
  if (isRestDay) {
    for (const [key, session] of sessions ?? []) {
      const state = workoutState(key, session)
      if (state === 'done' || state === 'partial') return 'done'
    }
    return 'rest'
  }

  const states = day.workouts
    .filter((k) => getWorkout(k).style !== 'rest')
    .map((k) => workoutState(k, sessions?.get(k)))
  if (states.every((s) => s === 'done')) return 'done'
  if (states.some((s) => s === 'done' || s === 'partial')) return 'partial'
  if (states.every((s) => s === 'no')) return 'missed'
  return compareISO(day.date, today) < 0 ? 'missed' : 'pending'
}
