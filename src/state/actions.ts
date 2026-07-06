import type { AppState, Session } from '@/lib/schema'
import { useStore } from '@/state/store'

/**
 * Quick-log mutations shared by Today/day detail (E2) and the full entry
 * screens (E4). One session per (workout, program day) — repeat calls update
 * the existing session in place.
 */

function upsertSession(draft: AppState, workoutKey: string, programDayId: string): Session {
  const log = (draft.workoutLogs[workoutKey] ??= { sessions: [] })
  let session = log.sessions.find((s) => s.programDayId === programDayId)
  if (session === undefined) {
    session = { programDayId }
    log.sessions.push(session)
  }
  return session
}

/** Cardio-style workouts: the Excel COMPLETED? dropdown. */
export function setCompletionStatus(
  workoutKey: string,
  programDayId: string,
  status: 'yes' | 'no' | 'not-yet',
): void {
  useStore.getState().mutate((draft) => {
    const session = upsertSession(draft, workoutKey, programDayId)
    session.status = status
    session.loggedAt = new Date().toISOString()
  })
}

/** Strength/ARX explicit done override; `undefined` clears it. */
export function setWorkoutCompleted(
  workoutKey: string,
  programDayId: string,
  completed: boolean | undefined,
): void {
  useStore.getState().mutate((draft) => {
    const session = upsertSession(draft, workoutKey, programDayId)
    session.completed = completed
    session.loggedAt = new Date().toISOString()
  })
}
