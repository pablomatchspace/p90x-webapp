import type { AppState, Session } from '@/lib/shared'
import { getWorkout } from '@/lib/shared'

/**
 * Session-log invariants (US-041/042). These operate on the workoutLogs slice
 * of the document (an immer draft or a plain object) so the rules live with
 * the domain, not the store: one session per (workout, program day), and
 * entries appear lazily with the catalog's round count and vanish when every
 * value clears — the "any entry ⇒ partial" status rule stays honest.
 */

export type WorkoutLogs = AppState['workoutLogs']

/** One session per (workout, program day) — repeat calls return the existing one. */
export function upsertSession(
  logs: WorkoutLogs,
  workoutKey: string,
  programDayId: string,
): Session {
  const log = (logs[workoutKey] ??= { sessions: [] })
  let session = log.sessions.find((s) => s.programDayId === programDayId)
  if (session === undefined) {
    session = { programDayId }
    log.sessions.push(session)
  }
  return session
}

/**
 * Set one raw round value. The entry is created lazily with the catalog's
 * round count and removed again when every value is cleared. Unknown
 * exercises and out-of-range rounds are ignored — nothing is created.
 */
export function writeRoundValue(
  logs: WorkoutLogs,
  workoutKey: string,
  programDayId: string,
  exerciseId: string,
  round: number,
  field: 'reps' | 'assist',
  value: number | null,
  loggedAt: string,
): void {
  const def = getWorkout(workoutKey).exercises?.find((e) => e.id === exerciseId)
  if (def === undefined || round < 0 || round >= def.rounds) return
  const session = upsertSession(logs, workoutKey, programDayId)
  const entries = (session.entries ??= {})
  const entry = (entries[exerciseId] ??= {
    rounds: Array.from({ length: def.rounds }, () => ({ reps: null, assist: null })),
  })
  if (entry.rounds[round] === undefined) return // imported entry shorter than catalog
  entry.rounds[round][field] = value
  session.loggedAt = loggedAt
  const empty = entry.rounds.every((r) => (r.reps ?? null) === null && (r.assist ?? null) === null)
  if (empty) {
    delete entries[exerciseId]
    cleanupSession(logs, workoutKey, programDayId)
  }
}

export function cleanupSession(logs: WorkoutLogs, workoutKey: string, programDayId: string): void {
  const log = logs[workoutKey]
  if (log === undefined) return
  const idx = log.sessions.findIndex((s) => s.programDayId === programDayId)
  if (idx === -1) return
  const session = log.sessions[idx]
  const empty =
    Object.keys(session.entries ?? {}).length === 0 &&
    (session.notes === undefined || session.notes.trim() === '') &&
    (session.annotation === undefined || session.annotation.trim() === '') &&
    session.completed === undefined &&
    (session.completion === undefined || session.completion === 'not-yet')
  if (empty) {
    log.sessions.splice(idx, 1)
    if (log.sessions.length === 0) {
      delete logs[workoutKey]
    }
  }
}
