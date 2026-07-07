import { getWorkout } from '@/lib/programData'
import type { AppState, ScheduleOp, Session } from '@/lib/schema'
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

/** Append a reschedule op (validate upstream with `previewOp` first). */
export function addScheduleOp(op: ScheduleOp): void {
  useStore.getState().mutate((draft) => {
    draft.scheduleOps.push(op)
  })
}

/** Soft-delete: the op stays in the audit trail but stops applying. */
export function revertScheduleOp(opId: string): void {
  useStore.getState().mutate((draft) => {
    const op = draft.scheduleOps.find((o) => o.id === opId)
    if (op !== undefined && op.revertedAt === undefined) op.revertedAt = new Date().toISOString()
  })
}

/**
 * Set one raw round value (US-041/042). The entry is created lazily with the
 * catalog's round count and removed again when every value is cleared, so the
 * "any entry ⇒ partial" status rule stays honest.
 */
export function setRoundValue(
  workoutKey: string,
  programDayId: string,
  exerciseId: string,
  round: number,
  field: 'main' | 'secondary',
  value: number | null,
): void {
  const def = getWorkout(workoutKey).exercises?.find((e) => e.id === exerciseId)
  if (def === undefined || round < 0 || round >= def.rounds) return
  useStore.getState().mutate((draft) => {
    const session = upsertSession(draft, workoutKey, programDayId)
    const entries = (session.entries ??= {})
    const entry = (entries[exerciseId] ??= {
      rounds: Array.from({ length: def.rounds }, () => ({ main: null, secondary: null })),
    })
    if (entry.rounds[round] === undefined) return // imported entry shorter than catalog
    entry.rounds[round][field] = value
    session.loggedAt = new Date().toISOString()
    const empty = entry.rounds.every(
      (r) => (r.main ?? null) === null && (r.secondary ?? null) === null,
    )
    if (empty) delete entries[exerciseId]
  })
}

/** Week-header annotation, e.g. "2 with chestweight". */
export function setSessionAnnotation(
  workoutKey: string,
  programDayId: string,
  annotation: string,
): void {
  useStore.getState().mutate((draft) => {
    const session = upsertSession(draft, workoutKey, programDayId)
    session.annotation = annotation
  })
}

/** Free-text notes on a session (all log styles). */
export function setSessionNotes(workoutKey: string, programDayId: string, notes: string): void {
  useStore.getState().mutate((draft) => {
    const session = upsertSession(draft, workoutKey, programDayId)
    session.notes = notes
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
