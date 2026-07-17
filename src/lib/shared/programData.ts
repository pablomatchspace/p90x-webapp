import catalogJson from '@/data/catalog.json'
import templatesJson from '@/data/templates.json'

/**
 * Static program assets generated from the P90Xcel workbook by
 * tools/gen_catalog.py (structure only — no personal data). See PRD §8.
 */

export type SecondaryKind = 'weight' | 'knee' | 'chair' | 'extra'

export interface RoundLabels {
  main: string
  secondary?: string
}

export interface CatalogExercise {
  id: string
  name: string
  /** entry rows per session: 1, 2 or 4 (Strip-Set Curls) */
  rounds: number
  /** meaning of the second value per round; absent = single count */
  secondary?: SecondaryKind
  /** how the workbook aggregates rounds into the score */
  agg: 'avg' | 'sum'
  labels: RoundLabels[]
}

export type WorkoutStyle = 'strength' | 'completion' | 'arx' | 'rest'

export interface WorkoutDef {
  key: string
  name: string
  style: WorkoutStyle
  exercises?: CatalogExercise[]
}

export interface TemplateDay {
  day: number
  week: number
  phase: 1 | 2 | 3
  recovery: boolean
  workouts: string[]
}

export type ProgramKey = 'classic' | 'lean'

const catalog = catalogJson as { workouts: WorkoutDef[] }
const templates = templatesJson as Record<ProgramKey, TemplateDay[]>

export const workouts: WorkoutDef[] = catalog.workouts

const byKey = new Map(workouts.map((w) => [w.key, w]))

export function getWorkout(key: string): WorkoutDef {
  const w = byKey.get(key)
  if (!w) throw new Error(`Unknown workout key: ${key}`)
  return w
}

export function hasWorkout(key: string): boolean {
  return byKey.has(key)
}

export function getTemplate(program: ProgramKey): TemplateDay[] {
  return templates[program]
}

/** Strength + ARX workouts — the ones with per-exercise logging. */
export function loggableWorkouts(): WorkoutDef[] {
  return workouts.filter((w) => w.style === 'strength' || w.style === 'arx')
}
