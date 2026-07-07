import type { CatalogExercise, SecondaryKind } from '@/lib/programData'

/** Workbook column meanings (INSTRUCTIONS abbreviations: N/K, NC/C, R/W, RA/LA…). */
export const SECONDARY_LABELS: Record<SecondaryKind, string> = {
  knee: 'knee reps',
  chair: 'chair reps',
  weight: 'weight',
  extra: 'other side',
}

export function mainLabel(exercise: CatalogExercise): string {
  return exercise.name.includes('(sec)') ? 'seconds' : 'reps'
}

export function fieldAria(
  exercise: CatalogExercise,
  round: number,
  field: 'main' | 'secondary',
): string {
  const kind = exercise.secondary
  const name =
    field === 'main' || kind === undefined ? mainLabel(exercise) : SECONDARY_LABELS[kind]
  return exercise.rounds === 1
    ? `${exercise.name} ${name}`
    : `${exercise.name} round ${round + 1} ${name}`
}
