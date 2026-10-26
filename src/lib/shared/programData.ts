import catalogJson from '@/data/catalog.json'
import gennextJson from '@/data/gennext.json'
import templatesJson from '@/data/templates.json'

/**
 * Static program assets generated from the P90Xcel workbook by
 * tools/gen_catalog.py, plus Generation Next by tools/gen_gennext.py (E33)
 * (structure only — no personal data). See PRD §8.
 */

/** `mod`: Generation Next bodyweight move done with the video's modification (E36) */
export type SecondaryKind = 'weight' | 'knee' | 'chair' | 'extra' | 'mod'

export interface RoundLabels {
  main: string
  secondary?: string
}

export interface CatalogExercise {
  id: string
  name: string
  /** entry rows per session: 1, 2 or 4 (Strip-Set Curls); Generation Next 3 or 5 */
  rounds: number
  /** meaning of the second value per round; absent = single count */
  secondary?: SecondaryKind
  /** how the workbook aggregates rounds into the score */
  agg: 'avg' | 'sum'
  labels: RoundLabels[]
  /** E33: Generation Next Dumbbell Tracker grouping */
  block?: 'Block 1' | 'Block 2' | 'Finisher'
}

/** `bonus`: an optional Generation Next add-on — done/not done, never scheduled (E33) */
export type WorkoutStyle = 'strength' | 'completion' | 'arx' | 'rest' | 'bonus'

/** E33: Generation Next's pillars — Metabolic Overload, Neuro-Performance, Active Recovery */
export type Pillar = 'MOT' | 'NPT' | 'ART'

export interface WorkoutDef {
  key: string
  name: string
  style: WorkoutStyle
  pillar?: Pillar
  exercises?: CatalogExercise[]
  /** E36: focus-mode play order as [exercise id, 0-based round], one card each (Generation Next videos) */
  focusOrder?: [string, number][]
}

export interface TemplateDay {
  day: number
  week: number
  phase: 1 | 2 | 3
  recovery: boolean
  workouts: string[]
}

/**
 * E33: a program is a suite (the catalog family) plus a variant (its schedule).
 * Persisted as `settings.program` / `archivedRounds[].program`.
 */
export type ProgramRef =
  { suite: 'p90x'; variant: 'classic' | 'lean' } | { suite: 'gennext'; variant: 'standard' }
export type ProgramSuite = ProgramRef['suite']
export type ProgramVariant = ProgramRef['variant']

const catalog = catalogJson as { workouts: WorkoutDef[] }
const templates = templatesJson as Record<'classic' | 'lean', TemplateDay[]>
const gennext = gennextJson as { workouts: WorkoutDef[]; template: TemplateDay[] }

const VARIANT_LABELS: Record<ProgramVariant, string> = {
  classic: 'Classic',
  lean: 'Lean',
  standard: 'Generation Next',
}

/** Every catalog workout of every suite — keys are unique (Generation Next keys are `gn-*`). */
export const workouts: WorkoutDef[] = [...catalog.workouts, ...gennext.workouts]

const byKey = new Map(workouts.map((w) => [w.key, w]))

export function getWorkout(key: string): WorkoutDef {
  const w = byKey.get(key)
  if (!w) throw new Error(`Unknown workout key: ${key}`)
  return w
}

export function hasWorkout(key: string): boolean {
  return byKey.has(key)
}

export function getTemplate(program: ProgramRef): TemplateDay[] {
  return program.suite === 'p90x' ? templates[program.variant] : gennext.template
}

export function programLabel(program: ProgramRef): string {
  return VARIANT_LABELS[program.variant]
}

/** The catalog workouts belonging to one suite. */
export function workoutsFor(suite: ProgramSuite): WorkoutDef[] {
  return suite === 'p90x' ? catalog.workouts : gennext.workouts
}

/** A workout key of this suite — guards routes against other-suite deep links. */
export function hasWorkoutIn(suite: ProgramSuite, key: string): boolean {
  return workoutsFor(suite).some((w) => w.key === key)
}

/** Strength + ARX workouts of a suite — the ones with per-exercise logging. */
export function loggableWorkoutsFor(suite: ProgramSuite): WorkoutDef[] {
  return workoutsFor(suite).filter((w) => w.style === 'strength' || w.style === 'arx')
}
