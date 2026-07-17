import { getWorkout, type CatalogExercise } from '@/lib/shared'
import { materialize, type ProgramDay } from '@/lib/schedule'
import { workoutOccurrences } from '@/lib/schedule'
import type { ArchivedRound, ScoringSettings, Session } from '@/lib/shared'
import { scoreExercise } from './scoring'

/**
 * Progressive-overload targets (E29 US-147). Focus mode's forward-looking
 * coach number: the net score (score − penalty, the DATA-sheet chart metric)
 * to beat for one exercise — the latest earlier logged net in this round,
 * falling back per exercise to the newest archived round that logged it (E28)
 * so day 1 of round 2 still has a number to chase. Pure derivations only (rule 2): nothing here is
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
 * exerciseId → latest logged net for `workoutKey`, each exercise taken from
 * the NEWEST archived round that logged that exercise (an exercise missing
 * from the latest round still falls back to an older one), scored with the
 * owning round's frozen `snapshot.scoring`. Null when no archive has data
 * for this workout. Compute once per screen (the map covers every exercise
 * of the workout).
 */
export function archiveLatestNets(
  rounds: ArchivedRound[],
  workoutKey: string,
): Map<string, number> | null {
  const exercises = getWorkout(workoutKey).exercises ?? []
  const nets = new Map<string, number>()
  for (let r = rounds.length - 1; r >= 0 && nets.size < exercises.length; r--) {
    const round = rounds[r]
    const roundSessions = round.workoutLogs[workoutKey]?.sessions
    if (roundSessions === undefined || roundSessions.length === 0) continue
    const schedule = materialize(round.program, round.startDate, round.scheduleOps)
    const occurrences = workoutOccurrences(schedule, workoutKey)
    const sessions = new Map(roundSessions.map((s) => [s.programDayId, s]))
    for (const exercise of exercises) {
      if (nets.has(exercise.id)) continue
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
  }
  return nets.size > 0 ? nets : null
}

export type TargetStatus = 'pending' | 'beaten' | 'matched' | 'behind'

/** Live verdict for the chip: how the current entry stands against the target. */
export function targetStatus(currentNet: number | null, target: OverloadTarget): TargetStatus {
  if (currentNet === null) return 'pending'
  if (currentNet > target.net) return 'beaten'
  if (currentNet === target.net) return 'matched'
  return 'behind'
}
