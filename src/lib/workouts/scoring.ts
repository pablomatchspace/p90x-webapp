import type { CatalogExercise, WorkoutDef } from '@/lib/shared'
import type { ExerciseEntry, ExerciseRound, ScoringSettings, Session } from '@/lib/shared'

/**
 * The Excel scoring engine (PRD §6.3), recomputed live from raw rounds.
 *
 * Adjusted value per round, by the catalog's `secondary` kind:
 *   knee / chair   main + secondary/chairFactor        (SETUP!C47)
 *   weight (R×W)   main × secondary / rwDivisor        (SETUP!C49)
 *   extra          main + secondary (other side/extra counts fully)
 *   none           main
 *
 * Score = AVERAGE (agg 'avg') or SUM (agg 'sum') over the rounds with data.
 * Penalty exists only for the classic two-round 'avg' rows: 0 when round 2
 * holds up, else (adj₁ − adj₂)/penaltyDivisor while penaltyOn (SETUP!C44/C45).
 *
 * B3 canonical rule (PRD §6.4): the workbook is inconsistent — week-1 penalty
 * columns compare raw main+assisted, later weeks main only. Here the penalty
 * always compares the SAME adjusted totals the score averages. Known visible
 * deviation: C&B week 1 Decline Push-Ups (10 vs 6 + 6 knee) shows penalty 0.5
 * where the sheet shows 0.
 *
 * A round with no values at all is "not done yet" and excluded from the
 * average (the sheet coerces blanks to 0, halving scores mid-entry — not
 * replicated); within a touched round, a blank field counts as 0.
 */

export interface ExerciseScore {
  score: number | null
  /** null = no data; 0 = data, no drop (or penalties off) */
  penalty: number | null
  /** score − penalty: the DATA-sheet chart metric */
  net: number | null
  /** round 2 fell below round 1 — drives the Excel red/green cell tint */
  drop: boolean | null
}

const EMPTY: ExerciseScore = { score: null, penalty: null, net: null, drop: null }

export function adjustedRound(
  round: ExerciseRound | undefined,
  exercise: CatalogExercise,
  scoring: ScoringSettings,
): number | null {
  if (round === undefined) return null
  const main = round.main ?? null
  const secondary = round.secondary ?? null
  if (main === null && secondary === null) return null
  const m = main ?? 0
  const s = secondary ?? 0
  switch (exercise.secondary) {
    case 'knee':
    case 'chair':
      return m + s / scoring.chairFactor
    case 'weight':
      return (m * s) / scoring.rwDivisor
    case 'extra':
      return m + s
    default:
      return m
  }
}

export function scoreExercise(
  entry: ExerciseEntry | undefined,
  exercise: CatalogExercise,
  scoring: ScoringSettings,
): ExerciseScore {
  const adjusted = (entry?.rounds ?? []).map((r) => adjustedRound(r, exercise, scoring))
  const present = adjusted.filter((a): a is number => a !== null)
  if (present.length === 0) return EMPTY

  const sum = present.reduce((a, b) => a + b, 0)
  const score = exercise.agg === 'sum' ? sum : sum / present.length

  let penalty = 0
  let drop: boolean | null = null
  if (exercise.agg === 'avg' && exercise.rounds === 2) {
    const [a1, a2] = adjusted
    if (a1 !== null && a1 !== undefined && a2 !== null && a2 !== undefined) {
      drop = a2 < a1
      penalty = drop && scoring.penaltyOn ? (a1 - a2) / scoring.penaltyDivisor : 0
    }
  }
  return { score, penalty, net: score - penalty, drop }
}

export interface SessionTotals {
  /** exercises with at least one round of data */
  entered: number
  score: number
  penalty: number
  net: number
}

/** Session roll-up: focus-mode summary, ARX total reps (all-sum ⇒ score = reps). */
export function sessionTotals(
  session: Session | undefined,
  def: WorkoutDef,
  scoring: ScoringSettings,
): SessionTotals {
  const totals: SessionTotals = { entered: 0, score: 0, penalty: 0, net: 0 }
  for (const exercise of def.exercises ?? []) {
    const result = scoreExercise(session?.entries?.[exercise.id], exercise, scoring)
    if (result.score === null) continue
    totals.entered += 1
    totals.score += result.score
    totals.penalty += result.penalty ?? 0
    totals.net += result.net ?? 0
  }
  return totals
}

/** Excel-style display: up to 2 decimals, trailing zeros trimmed, '—' for no data. */
export function formatScore(value: number | null): string {
  if (value === null) return '—'
  return String(Math.round(value * 100) / 100)
}
