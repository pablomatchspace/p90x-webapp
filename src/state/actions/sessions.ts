import { upsertSession, writeRoundValue } from '@/lib/workouts'
import { useStore } from '@/state/store'

/**
 * Workout-session use-cases (E2/E4/E16). Thin wrappers: the invariants live
 * in `@/lib/workouts` (sessions.ts); these only bind them to the store.
 */

/** Cardio-style workouts: the Excel COMPLETED? dropdown. */
export function setCompletionStatus(
  workoutKey: string,
  programDayId: string,
  completion: 'yes' | 'no' | 'not-yet',
): void {
  useStore.getState().mutate((draft) => {
    const session = upsertSession(draft.workoutLogs, workoutKey, programDayId)
    session.completion = completion
    session.loggedAt = new Date().toISOString()
  })
}

/** Set one raw round value (US-041/042) — see writeRoundValue for the rules. */
export function setRoundValue(
  workoutKey: string,
  programDayId: string,
  exerciseId: string,
  round: number,
  field: 'reps' | 'assist',
  value: number | null,
): void {
  useStore.getState().mutate((draft) => {
    writeRoundValue(
      draft.workoutLogs,
      workoutKey,
      programDayId,
      exerciseId,
      round,
      field,
      value,
      new Date().toISOString(),
    )
  })
}

/** Week-header annotation, e.g. "2 with chestweight". */
export function setSessionAnnotation(
  workoutKey: string,
  programDayId: string,
  annotation: string,
): void {
  useStore.getState().mutate((draft) => {
    const session = upsertSession(draft.workoutLogs, workoutKey, programDayId)
    session.annotation = annotation
  })
}

/** Free-text notes on a session (all log styles). */
export function setSessionNotes(workoutKey: string, programDayId: string, notes: string): void {
  useStore.getState().mutate((draft) => {
    const session = upsertSession(draft.workoutLogs, workoutKey, programDayId)
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
    const session = upsertSession(draft.workoutLogs, workoutKey, programDayId)
    session.completed = completed
    session.loggedAt = new Date().toISOString()
  })
}

/**
 * E16 (Q21c): merge per-exercise done/skipped flags into a session's play log.
 * Raw user input (done/skipped taps), not derived. The Q21c log keeps explicit
 * true/false — dropping keys flipped back to default would lose information.
 */
export function setExerciseDone(
  workoutKey: string,
  programDayId: string,
  patch: Record<string, boolean>,
): void {
  useStore.getState().mutate((draft) => {
    const session = upsertSession(draft.workoutLogs, workoutKey, programDayId)
    session.exerciseDone = { ...(session.exerciseDone ?? {}), ...patch }
    session.loggedAt = new Date().toISOString()
  })
}
