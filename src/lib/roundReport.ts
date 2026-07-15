import { computeAdherence, type Adherence } from '@/lib/adherence'
import { deriveBody } from '@/lib/body'
import type { ISODate } from '@/lib/dates'
import { loggableWorkouts, type ProgramKey, type WorkoutStyle } from '@/lib/programData'
import { workoutProgression, workoutTotalTrend, type TopMover } from '@/lib/progression'
import { materialize, type Schedule } from '@/lib/schedule/materialize'
import { indexSessions } from '@/lib/schedule/status'
import type {
  AppState,
  ArchivedRound,
  BodyEntry,
  RoundSnapshot,
  ScheduleOp,
  Session,
} from '@/lib/schema'

/**
 * End-of-round report (E28 US-144). One pure roll-up per round — live or
 * archived — reusing the exact engines the rest of the app trusts:
 * `computeAdherence` (US-062) for the discipline numbers, `deriveBody`
 * (US-050) for the body outcome, and the US-040 scoring engine via
 * `workoutProgression`/`workoutTotalTrend` for the strength outcome. The
 * report can therefore never disagree with the dashboard, the body log or
 * the charts.
 */

/** The round-scoped slice both a live round and an archive normalize to. */
export interface RoundData {
  program: ProgramKey
  startDate: ISODate
  scheduleOps: ScheduleOp[]
  workoutLogs: AppState['workoutLogs']
  bodyLog: BodyEntry[]
  snapshot: RoundSnapshot
}

/** Live state → RoundData, or null while no program is running. */
export function liveRoundData(state: AppState): RoundData | null {
  const s = state.settings
  if (s.startDate === null) return null
  return {
    program: s.program,
    startDate: s.startDate,
    scheduleOps: state.scheduleOps,
    workoutLogs: state.workoutLogs,
    bodyLog: state.bodyLog,
    snapshot: {
      age: s.age ?? null,
      height: s.height ?? null,
      startWeight: s.startWeight ?? null,
      startBodyFat: s.startBodyFat ?? null,
      limits: s.limits,
      targets: s.targets,
      scoring: s.scoring,
    },
  }
}

export function archivedRoundData(round: ArchivedRound): RoundData {
  return {
    program: round.program,
    startDate: round.startDate,
    scheduleOps: round.scheduleOps,
    workoutLogs: round.workoutLogs,
    bodyLog: round.bodyLog,
    snapshot: round.snapshot,
  }
}

export type BodyOutcomeKey = 'weight' | 'bodyFat' | 'bmi' | 'leanMass' | 'ffmi'

/** Canonical-unit sample (kg / fraction / index) — display conversion is the UI's job. */
export interface BodySample {
  date: ISODate
  value: number
}

export interface BodyOutcome {
  key: BodyOutcomeKey
  first: BodySample | null
  latest: BodySample | null
  /** latest − first; null until both ends exist */
  delta: number | null
}

export interface WorkoutOutcome {
  key: string
  name: string
  style: WorkoutStyle
  /** scheduled occurrences of the workout in this round */
  occurrences: number
  /** occurrences with anything entered */
  logged: number
  firstNet: number | null
  latestNet: number | null
  /** latestNet − firstNet over logged occurrences; null under two logs */
  delta: number | null
}

/** A progression top mover, annotated with the workout it belongs to. */
export interface RoundTopMover extends TopMover {
  workoutKey: string
  workoutName: string
}

export interface RoundReport {
  schedule: Schedule
  /** the date the report is judged at (see `buildRoundReport`) */
  asOf: ISODate
  /** every program day has been reached */
  completed: boolean
  adherence: Adherence
  body: BodyOutcome[]
  workouts: WorkoutOutcome[]
  /** across every loggable workout, ranked by net gain (desc); unlogged excluded */
  topMovers: RoundTopMover[]
}

/** Per-entry canonical value readers, all snapshot-driven. */
function bodyValue(key: BodyOutcomeKey, entry: BodyEntry, snapshot: RoundSnapshot): number | null {
  if (key === 'weight') return entry.weight ?? null
  if (key === 'bodyFat') return entry.bodyFat ?? null
  const derived = deriveBody(entry, {
    height: snapshot.height ?? null,
    startWeight: snapshot.startWeight ?? null,
  })
  return derived[key]
}

function bodyOutcome(key: BodyOutcomeKey, data: RoundData): BodyOutcome {
  let first: BodySample | null = null
  let latest: BodySample | null = null
  for (const entry of data.bodyLog) {
    const value = bodyValue(key, entry, data.snapshot)
    if (value === null) continue
    if (first === null) first = { date: entry.date, value }
    latest = { date: entry.date, value }
  }
  return {
    key,
    first,
    latest,
    delta:
      first !== null && latest !== null && latest.date !== first.date
        ? latest.value - first.value
        : null,
  }
}

const BODY_KEYS: BodyOutcomeKey[] = ['weight', 'bodyFat', 'bmi', 'leanMass', 'ffmi']

/**
 * Build the report. `today` is the judgement date: pass the real today for a
 * live round ("report so far"); omit it for an archived round, which is judged
 * at its projected completion so every day has been decided — an undone past
 * day reads as missed, never as pending.
 */
export function buildRoundReport(data: RoundData, today?: ISODate): RoundReport {
  const schedule = materialize(data.program, data.startDate, data.scheduleOps)
  const asOf = today ?? schedule.projectedCompletion
  const index = indexSessions(data.workoutLogs)
  const adherence = computeAdherence(schedule, index, data.scheduleOps, asOf)

  const workouts: WorkoutOutcome[] = []
  const topMovers: RoundTopMover[] = []
  for (const workout of loggableWorkouts()) {
    const sessions: ReadonlyMap<string, Session> = new Map(
      (data.workoutLogs[workout.key]?.sessions ?? []).map((s) => [s.programDayId, s]),
    )
    const { occurrences, totals } = workoutTotalTrend(
      schedule,
      workout,
      sessions,
      data.snapshot.scoring,
    )
    if (occurrences.length === 0) continue // not part of this round's rotation
    const logged = totals.filter((t): t is number => t !== null)
    workouts.push({
      key: workout.key,
      name: workout.name,
      style: workout.style,
      occurrences: occurrences.length,
      logged: logged.length,
      firstNet: logged.length > 0 ? logged[0] : null,
      latestNet: logged.length > 0 ? logged[logged.length - 1] : null,
      delta: logged.length > 1 ? logged[logged.length - 1] - logged[0] : null,
    })
    for (const mover of workoutProgression(schedule, workout, sessions, data.snapshot.scoring)
      .topMovers) {
      if (mover.delta === null) continue
      topMovers.push({ ...mover, workoutKey: workout.key, workoutName: workout.name })
    }
  }
  topMovers.sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))

  return {
    schedule,
    asOf,
    completed: adherence.programDays > 0 && adherence.dayReached >= adherence.programDays,
    adherence,
    body: BODY_KEYS.map((key) => bodyOutcome(key, data)),
    workouts,
    topMovers,
  }
}
