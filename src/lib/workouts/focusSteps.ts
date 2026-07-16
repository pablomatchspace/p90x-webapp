import type { CatalogExercise, WorkoutDef } from '@/lib/shared'
import type { Session } from '@/lib/shared'

/**
 * Focus-mode play order (E11). One step = one card: an exercise plus the subset
 * of its rounds entered on that card. Default is today's behaviour — one card
 * per exercise with every round on it. Workouts listed in ROUND_2_ORDER instead
 * play like the video: all round 1s in sheet order, then all round 2s in the
 * listed order. This is UX data, not workbook data — the sheets only store
 * R1/R2 columns — so it lives here by hand; catalog.json stays generated.
 */
export interface FocusStep {
  exercise: CatalogExercise
  /** 0-based round indices shown on this card */
  rounds: number[]
}

/** Round-2 pass order per workout key. Chest & Back swaps each push/pull pair. */
const ROUND_2_ORDER: Record<string, string[]> = {
  'chest-back': [
    'wide-front-pull-ups',
    'standard-push-ups',
    'reverse-grip-chin-ups',
    'military-push-ups',
    'closed-grip-overhand-pull-ups',
    'wide-fly-push-ups',
    'heavy-pants',
    'decline-push-ups',
    'lawnmowers',
    'diamond-push-ups',
    'back-flys',
    'dive-bomber-push-ups',
  ],
}

const allRounds = (exercise: CatalogExercise): FocusStep => ({
  exercise,
  rounds: Array.from({ length: exercise.rounds }, (_, round) => round),
})

export function focusSteps(def: WorkoutDef): FocusStep[] {
  const exercises = def.exercises ?? []
  const round2Ids = ROUND_2_ORDER[def.key]
  if (round2Ids !== undefined) {
    const byId = new Map(exercises.map((e) => [e.id, e]))
    const round2 = round2Ids
      .map((id) => byId.get(id))
      .filter((e): e is CatalogExercise => e !== undefined)
    // Only play the two-pass sequence while the hand-written order still matches
    // the generated catalog exactly; on any drift, fall back to plain cards.
    if (round2.length === exercises.length && exercises.every((e) => e.rounds === 2)) {
      return [
        ...exercises.map((e): FocusStep => ({ exercise: e, rounds: [0] })),
        ...round2.map((e): FocusStep => ({ exercise: e, rounds: [1] })),
      ]
    }
  }
  return exercises.map(allRounds)
}

/** Resume where the athlete left off: the first step with no data in its rounds. */
export function resumeIndex(steps: FocusStep[], session: Session | undefined): number {
  const first = steps.findIndex((step) => {
    const entry = session?.entries?.[step.exercise.id]
    if (entry === undefined) return true
    return step.rounds.every((round) => {
      const r = entry.rounds[round]
      return (r?.reps ?? null) === null && (r?.assist ?? null) === null
    })
  })
  return first === -1 ? Math.max(0, steps.length - 1) : first
}
