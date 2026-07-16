import { getWorkout, type CatalogExercise } from '@/lib/programData'
import { materialize, type ProgramDay } from '@/lib/schedule/materialize'
import { workoutOccurrences } from '@/lib/schedule/occurrences'
import type { ArchivedRound, ScoringSettings, Session } from '@/lib/schema'
import { scoreExercise } from '@/lib/scoring'

/**
 * Progressive-overload targets (E29 US-147). Focus mode's forward-looking
 * coach number: the net score (score − penalty, the DATA-sheet chart metric)
 * to beat for one exercise — the latest earlier logged net in this round,
 * falling back to the newest archived round (E28) so day 1 of round 2 still
 * has a number to chase. Pure derivations only (rule 2): nothing here is
 * stored, and archive nets are computed with the archive's frozen scoring
 * snapshot so history never shifts under later Settings changes.
 */

export interface OverloadTarget {
  /** the net score being chased */
  net: number
  /** where the reference came from */
  source: 'round' | 'archive'
  /** program week of the reference occurrence; null for archive targets */
  week: number | null
}

/**
 * The latest earlier logged net for `exercise` in this round — the same
 * walk-back the ghost prefill uses (US-042), so a skipped week doesn't blank
 * the target — else the archive fallback, else null.
 */
export function overloadTarget(
  occurrences: ProgramDay[],
  sessions: ReadonlyMap<string, Session>,
  occIndex: number,
  exercise: CatalogExercise,
  scoring: ScoringSettings,
  archiveNets?: ReadonlyMap<string, number> | null,
): OverloadTarget | null {
  for (let i = occIndex - 1; i >= 0; i--) {
    const net = scoreExercise(
      sessions.get(occurrences[i].programDayId)?.entries?.[exercise.id],
      exercise,
      scoring,
    ).net
    if (net !== null) return { net, source: 'round', week: occurrences[i].week }
  }
  const archived = archiveNets?.get(exercise.id)
  return archived !== undefined ? { net: archived, source: 'archive', week: null } : null
}

/**
 * exerciseId → latest logged net for `workoutKey` from the NEWEST archived
 * round that logged it at all, scored with that round's own frozen
 * `snapshot.scoring`. Null when no archive has data for this workout.
 * Compute once per screen (the map covers every exercise of the workout).
 */
export function archiveLatestNets(
  rounds: ArchivedRound[],
  workoutKey: string,
): Map<string, number> | null {
  const exercises = getWorkout(workoutKey).exercises ?? []
  for (let r = rounds.length - 1; r >= 0; r--) {
    const round = rounds[r]
    const roundSessions = round.workoutLogs[workoutKey]?.sessions
    if (roundSessions === undefined || roundSessions.length === 0) continue
    const schedule = materialize(round.program, round.startDate, round.scheduleOps)
    const occurrences = workoutOccurrences(schedule, workoutKey)
    const sessions = new Map(roundSessions.map((s) => [s.programDayId, s]))
    const nets = new Map<string, number>()
    for (const exercise of exercises) {
      for (let i = occurrences.length - 1; i >= 0; i--) {
        const net = scoreExercise(
          sessions.get(occurrences[i].programDayId)?.entries?.[exercise.id],
          exercise,
          round.snapshot.scoring,
        ).net
        if (net !== null) {
          nets.set(exercise.id, net)
          break
        }
      }
    }
    if (nets.size > 0) return nets
  }
  return null
}

export type TargetStatus = 'pending' | 'beaten' | 'matched' | 'behind'

/** Live verdict for the chip: how the current entry stands against the target. */
export function targetStatus(currentNet: number | null, target: OverloadTarget): TargetStatus {
  if (currentNet === null) return 'pending'
  if (currentNet > target.net) return 'beaten'
  if (currentNet === target.net) return 'matched'
  return 'behind'
}
