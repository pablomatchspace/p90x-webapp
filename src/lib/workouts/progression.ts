import type { WorkoutDef } from '@/lib/shared'
import type { ScoringSettings, Session } from '@/lib/shared'
import type { ProgramDay, Schedule } from '@/lib/schedule'
import { workoutOccurrences } from '@/lib/schedule'
import { scoreExercise, sessionTotals } from './scoring'

/**
 * Strength progression (US-063): each exercise's net score (score − penalty,
 * the DATA-sheet chart metric) plotted across every scheduled occurrence of a
 * workout, plus a first-vs-latest "top movers" ranking. Pure — it reads the
 * US-040 scoring engine, so the charts can never diverge from the log grids;
 * unlogged occurrences surface as null (a gap in the line, not a zero).
 */

export interface ProgressionSeries {
  exerciseId: string
  label: string
  /** net at each occurrence, aligned to `occurrences`; null where unlogged */
  points: (number | null)[]
}

export interface TopMover {
  exerciseId: string
  label: string
  first: number | null
  latest: number | null
  /** latest − first over the logged occurrences; null with nothing logged */
  delta: number | null
}

export interface Progression {
  /** chronological x-axis: every scheduled occurrence of the workout */
  occurrences: ProgramDay[]
  series: ProgressionSeries[]
  /** exercises ranked by net gain from first to latest logged occurrence */
  topMovers: TopMover[]
}

/**
 * Whole-session net total at each occurrence (E21): the sum the focus-mode
 * summary shows, charted across the weeks. Occurrences with nothing entered
 * are null (a gap), matching the per-exercise convention above.
 */
export function workoutTotalTrend(
  schedule: Schedule,
  workout: WorkoutDef,
  sessions: ReadonlyMap<string, Session>,
  scoring: ScoringSettings,
): { occurrences: ProgramDay[]; totals: (number | null)[] } {
  const occurrences = workoutOccurrences(schedule, workout.key)
  const totals = occurrences.map((occ) => {
    const t = sessionTotals(sessions.get(occ.programDayId), workout, scoring)
    return t.entered > 0 ? t.net : null
  })
  return { occurrences, totals }
}

export function workoutProgression(
  schedule: Schedule,
  workout: WorkoutDef,
  sessions: ReadonlyMap<string, Session>,
  scoring: ScoringSettings,
): Progression {
  const occurrences = workoutOccurrences(schedule, workout.key)

  const series: ProgressionSeries[] = (workout.exercises ?? []).map((exercise) => ({
    exerciseId: exercise.id,
    label: exercise.name,
    points: occurrences.map(
      (occ) =>
        scoreExercise(sessions.get(occ.programDayId)?.entries?.[exercise.id], exercise, scoring)
          .net,
    ),
  }))

  const topMovers: TopMover[] = series
    .map((s) => {
      const logged = s.points.filter((p): p is number => p !== null)
      const first = logged.length > 0 ? logged[0] : null
      const latest = logged.length > 0 ? logged[logged.length - 1] : null
      return {
        exerciseId: s.exerciseId,
        label: s.label,
        first,
        latest,
        delta: first !== null && latest !== null ? latest - first : null,
      }
    })
    .sort((a, b) => (b.delta ?? Number.NEGATIVE_INFINITY) - (a.delta ?? Number.NEGATIVE_INFINITY))

  return { occurrences, series, topMovers }
}
