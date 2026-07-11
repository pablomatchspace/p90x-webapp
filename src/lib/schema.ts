import { z } from 'zod'

/**
 * The single persisted document. Raw user inputs only — every derived number
 * (scores, penalties, BMI, adherence…) is recomputed by pure functions, mirroring
 * the Excel design where formulas derive everything from entered cells (PRD §8).
 */
export const SCHEMA_VERSION = 4

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD')

const nullableNumber = z.number().finite().nullable().optional()

export const scoringSettingsSchema = z.object({
  /** SETUP!C44 — divide the round-1→2 drop by this for the penalty */
  penaltyDivisor: z.number().positive(),
  /** SETUP!C45 — penalty on/off switch */
  penaltyOn: z.boolean(),
  /** SETUP!C47 — chair-assisted / knee reps count as 1/factor */
  chairFactor: z.number().positive(),
  /** SETUP!C49 — cosmetic divisor for reps×weight chart values */
  rwDivisor: z.number().positive(),
})

export const settingsSchema = z.object({
  program: z.enum(['classic', 'lean']),
  /** null until the user configures or imports a program */
  startDate: isoDate.nullable(),
  units: z.enum(['metric', 'imperial']),
  gender: z.enum(['male', 'female']),
  age: nullableNumber,
  /** canonical metric storage: meters / kg / body-fat fraction 0–1 */
  height: nullableNumber,
  startWeight: nullableNumber,
  startBodyFat: nullableNumber,
  limits: z.object({ weight: nullableNumber, bodyFat: nullableNumber, bmi: nullableNumber }),
  targets: z.object({
    leanMassIncrease: nullableNumber,
    bodyFat: nullableNumber,
    ffmi: nullableNumber,
  }),
  scoring: scoringSettingsSchema,
  /** E12: focus-playback + rest-timer durations, whole seconds */
  timer: z.object({
    workSeconds: z.number().int().min(5).max(3600),
    restSeconds: z.number().int().min(5).max(3600),
  }),
  /** E16: play-mode preferences */
  player: z.object({ autoMarkDone: z.boolean() }),
})

const opBase = {
  id: z.string().min(1),
  createdAt: z.string(),
  /** reverted ops stay in the list for the audit trail but are ignored when materializing */
  revertedAt: z.string().optional(),
}

export const scheduleOpSchema = z.discriminatedUnion('kind', [
  z.object({ ...opBase, kind: z.literal('skip'), date: isoDate }),
  z.object({ ...opBase, kind: z.literal('swap'), dateA: isoDate, dateB: isoDate }),
  z.object({
    ...opBase,
    kind: z.literal('remap'),
    fromWeek: z.number().int().min(1).max(13),
    /** permutation of slot indices 0..6 within each remaining program week */
    order: z.array(z.number().int().min(0).max(6)).length(7),
  }),
])

const roundSchema = z.object({
  /** reps; for R×W rows this is reps */
  main: nullableNumber,
  /** assisted reps (knee/chair), the weight for R×W rows, or the extra/other-side count */
  secondary: nullableNumber,
})

export const exerciseEntrySchema = z.object({
  /** one entry per catalog round: 1, 2, or 4 (Strip-Set Curls) */
  rounds: z.array(roundSchema).min(1).max(4),
})

export const sessionSchema = z.object({
  /** template slot id ('d001'…'d090') — logs travel with the slot when rescheduled */
  programDayId: z.string().min(1),
  /** week-header annotation, e.g. "2 with chestweight" */
  annotation: z.string().optional(),
  /** explicit completion for strength/ARX sessions */
  completed: z.boolean().optional(),
  /** cardio-style sheets: the Excel COMPLETED? dropdown */
  status: z.enum(['yes', 'no', 'not-yet']).optional(),
  /** E16 play mode (Q21c): per-exercise done/skipped log for interval workouts */
  exerciseDone: z.record(z.string(), z.boolean()).optional(),
  entries: z.record(z.string(), exerciseEntrySchema).optional(),
  notes: z.string().optional(),
  loggedAt: z.string().optional(),
})

export const bodyEntrySchema = z.object({
  date: isoDate,
  weight: nullableNumber,
  bodyFat: nullableNumber,
  water: nullableNumber,
  bone: nullableNumber,
  zoneMinutes: nullableNumber,
})

export const customQuoteSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  author: z.string().optional(),
})

export const appStateSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  settings: settingsSchema,
  scheduleOps: z.array(scheduleOpSchema),
  workoutLogs: z.record(z.string(), z.object({ sessions: z.array(sessionSchema) })),
  bodyLog: z.array(bodyEntrySchema),
  quotes: z.object({ disabledIds: z.array(z.string()), custom: z.array(customQuoteSchema) }),
  notes: z.string(),
})

export type ScoringSettings = z.infer<typeof scoringSettingsSchema>
export type Settings = z.infer<typeof settingsSchema>
export type ScheduleOp = z.infer<typeof scheduleOpSchema>
export type SkipOp = Extract<ScheduleOp, { kind: 'skip' }>
export type SwapOp = Extract<ScheduleOp, { kind: 'swap' }>
export type RemapOp = Extract<ScheduleOp, { kind: 'remap' }>
export type Round = z.infer<typeof roundSchema>
export type ExerciseEntry = z.infer<typeof exerciseEntrySchema>
export type Session = z.infer<typeof sessionSchema>
export type BodyEntry = z.infer<typeof bodyEntrySchema>
export type AppState = z.infer<typeof appStateSchema>

/** Workbook defaults (SETUP sheet, PRD §6.3). */
export function emptyState(): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: {
      program: 'classic',
      startDate: null,
      units: 'metric',
      gender: 'male',
      age: null,
      height: null,
      startWeight: null,
      startBodyFat: null,
      limits: { weight: null, bodyFat: null, bmi: null },
      targets: { leanMassIncrease: null, bodyFat: null, ffmi: null },
      scoring: { penaltyDivisor: 2, penaltyOn: true, chairFactor: 2, rwDivisor: 10 },
      timer: { workSeconds: 60, restSeconds: 60 },
      player: { autoMarkDone: false },
    },
    scheduleOps: [],
    workoutLogs: {},
    bodyLog: [],
    quotes: { disabledIds: [], custom: [] },
    notes: '',
  }
}
