import type { DayStatus, WorkoutState } from '@/lib/schedule'
import type { ChipTone } from './Chip'

/** Compact workout codes for calendar cells. */
export const SHORT_CODES: Record<string, string> = {
  'chest-back': 'C&B',
  plyometrics: 'PLYO',
  'shoulders-arms': 'S&A',
  'yoga-x': 'YOGA',
  'legs-back': 'L&B',
  'kenpo-x': 'KENPO',
  'core-synergistics': 'CORE',
  'chest-shoulders-triceps': 'CST',
  'back-biceps': 'B&B',
  'ab-ripper-x': '+ARX',
  'cardio-x': 'CARD',
  'x-stretch': 'STR',
  rest: 'REST',
}

export function shortCode(workoutKey: string): string {
  return SHORT_CODES[workoutKey] ?? workoutKey.slice(0, 4).toUpperCase()
}

export const DAY_STATUS_LABELS: Record<DayStatus, string> = {
  done: 'Done',
  partial: 'In progress',
  missed: 'Missed',
  pending: 'Planned',
  rest: 'Rest day',
  gap: 'Skipped',
}

export const WORKOUT_STATE_LABELS: Record<WorkoutState, string> = {
  done: 'Done',
  partial: 'In progress',
  no: 'Marked no',
  pending: 'Planned',
}

export const DAY_STATUS_TONES: Record<DayStatus, ChipTone> = {
  done: 'green',
  partial: 'amber',
  missed: 'rose',
  pending: 'zinc',
  rest: 'zinc',
  gap: 'zinc',
}

export const WORKOUT_STATE_TONES: Record<WorkoutState, ChipTone> = {
  done: 'green',
  partial: 'amber',
  no: 'rose',
  pending: 'zinc',
}

/** Calendar cell surfaces per day status. */
export const CELL_CLASSES: Record<DayStatus, string> = {
  done: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
  partial:
    'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
  missed:
    'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300',
  pending:
    'border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300',
  rest: 'border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400',
  gap: 'border-dashed border-zinc-300 bg-transparent text-zinc-500 dark:border-zinc-700 dark:text-zinc-400',
}
