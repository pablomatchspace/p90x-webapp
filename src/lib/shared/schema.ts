import { z } from 'zod'
import { isHttpUrl } from './links'
import { bodyFractionSchema, kgSchema, metersSchema } from './units'

/**
 * The single persisted document. Raw user inputs only — every derived number
 * (scores, penalties, BMI, adherence…) is recomputed by pure functions, mirroring
 * the Excel design where formulas derive everything from entered cells (PRD §8).
 */
export const SCHEMA_VERSION = 13

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD')

const nullableNumber = z.number().finite().nullable().optional()

/** Canonical metric units, branded (units.ts) — same runtime validation as `nullableNumber`. */
const nullableKg = kgSchema.nullable().optional()
const nullableMeters = metersSchema.nullable().optional()
const nullableFraction = bodyFractionSchema.nullable().optional()

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

/** Absolute http(s) URL — javascript:/data:/relative inputs never enter state. */
const httpUrl = z.string().refine(isHttpUrl, 'expected an absolute http(s) URL')

/** E23: per-workout media deeplinks, keyed by catalog workout key. */
export const workoutLinkSchema = z.object({
  video: httpUrl.optional(),
  audio: httpUrl.optional(),
})

export const settingsSchema = z.object({
  program: z.enum(['classic', 'lean']),
  /** null until the user configures or imports a program */
  startDate: isoDate.nullable(),
  units: z.enum(['metric', 'imperial']),
  gender: z.enum(['male', 'female']),
  age: nullableNumber,
  /** canonical metric storage: meters / kg / body-fat fraction 0–1 */
  height: nullableMeters,
  startWeight: nullableKg,
  startBodyFat: nullableFraction,
  limits: z.object({ weight: nullableKg, bodyFat: nullableFraction, bmi: nullableNumber }),
  targets: z.object({
    leanMassIncrease: nullableKg,
    bodyFat: nullableFraction,
    ffmi: nullableNumber,
  }),
  scoring: scoringSettingsSchema,
  /** E12: focus-playback + rest-timer durations, whole seconds */
  timer: z.object({
    workSeconds: z.number().int().min(5).max(3600),
    restSeconds: z.number().int().min(5).max(3600),
  }),
  /** E16: play-mode preferences; E26 adds spoken announcements, E30 hands-free voice entry */
  player: z.object({
    autoMarkDone: z.boolean(),
    voiceCues: z.boolean(),
    voiceHandsFree: z.boolean(),
  }),
  /** E19: which Yoga timeline plays on Yoga X days */
  yoga: z.enum(['classic', 'x3']),
  /** E20: self-reported resistance-training experience — drives feasibility rate tiers */
  training: z.enum(['novice', 'intermediate', 'advanced']),
  /** E22: P90X nutrition-plan overrides — targets themselves stay derived (rule 2) */
  nutrition: z.object({
    /** stay in a nutrition phase longer than the training blocks; null follows the schedule */
    phaseOverride: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable(),
    /** custom daily kcal replacing the guide's level plan; null uses the level */
    calorieOverride: z.number().positive().nullable(),
    /** target-based layer's macro style — low-carb caps carbs and shifts calories into fat */
    dietStyle: z.enum(['balanced', 'lowCarb']),
  }),
  /** E23: video/audio deeplinks per workout, opened in a new tab from the day card */
  workoutLinks: z.record(z.string(), workoutLinkSchema),
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

const exerciseRoundSchema = z.object({
  /** reps (all row types) */
  reps: nullableNumber,
  /** assisted (knee/chair) reps; the weight for R×W rows; the extra/other-side count */
  assist: nullableNumber,
})

export const exerciseEntrySchema = z.object({
  /** one entry per catalog round: 1, 2, or 4 (Strip-Set Curls) */
  rounds: z.array(exerciseRoundSchema).min(1).max(4),
})

export const sessionSchema = z.object({
  /** template slot id ('d001'…'d090') — logs travel with the slot when rescheduled */
  programDayId: z.string().min(1),
  /** week-header annotation, e.g. "2 with chestweight" */
  annotation: z.string().optional(),
  /** explicit completion for strength/ARX sessions */
  completed: z.boolean().optional(),
  /** cardio-style sheets: the Excel COMPLETED? dropdown */
  completion: z.enum(['yes', 'no', 'not-yet']).optional(),
  /** E16 play mode (Q21c): per-exercise done/skipped log for interval workouts */
  exerciseDone: z.record(z.string(), z.boolean()).optional(),
  entries: z.record(z.string(), exerciseEntrySchema).optional(),
  notes: z.string().optional(),
  loggedAt: z.string().optional(),
})

export const bodyEntrySchema = z.object({
  date: isoDate,
  weight: nullableKg,
  bodyFat: nullableFraction,
  water: nullableFraction,
  bone: nullableFraction,
  zoneMinutes: nullableNumber,
})

export const customQuoteSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  author: z.string().optional(),
})

const workoutLogsSchema = z.record(z.string(), z.object({ sessions: z.array(sessionSchema) }))

/**
 * E28: the round-scoped SETUP inputs frozen at archive time. Raw inputs only
 * (rule 2 still holds) — an archived round's scores, body derivations and
 * KPI reads are recomputed by the same pure functions, fed from this snapshot
 * instead of the live settings, so later rounds can retune SETUP freely
 * without rewriting history.
 */
export const roundSnapshotSchema = z.object({
  age: nullableNumber,
  height: nullableMeters,
  startWeight: nullableKg,
  startBodyFat: nullableFraction,
  limits: z.object({ weight: nullableKg, bodyFat: nullableFraction, bmi: nullableNumber }),
  targets: z.object({
    leanMassIncrease: nullableKg,
    bodyFat: nullableFraction,
    ffmi: nullableNumber,
  }),
  scoring: scoringSettingsSchema,
})

/** E28: a completed round, archived inside the same document. */
export const archivedRoundSchema = z.object({
  id: z.string().min(1),
  archivedAt: z.string(),
  /** user-editable list label, defaulted to "Round N" at archive time */
  label: z.string().min(1),
  program: z.enum(['classic', 'lean']),
  startDate: isoDate,
  scheduleOps: z.array(scheduleOpSchema),
  workoutLogs: workoutLogsSchema,
  bodyLog: z.array(bodyEntrySchema),
  snapshot: roundSnapshotSchema,
})

export const appStateSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  settings: settingsSchema,
  scheduleOps: z.array(scheduleOpSchema),
  workoutLogs: workoutLogsSchema,
  bodyLog: z.array(bodyEntrySchema),
  /** E28: completed rounds, newest last — they travel with export/import/sync */
  archivedRounds: z.array(archivedRoundSchema),
  quotes: z.object({ disabledIds: z.array(z.string()), custom: z.array(customQuoteSchema) }),
  notes: z.string(),
})

export type ScoringSettings = z.infer<typeof scoringSettingsSchema>
export type WorkoutLink = z.infer<typeof workoutLinkSchema>
export type Settings = z.infer<typeof settingsSchema>
export type ScheduleOp = z.infer<typeof scheduleOpSchema>
export type SkipOp = Extract<ScheduleOp, { kind: 'skip' }>
export type SwapOp = Extract<ScheduleOp, { kind: 'swap' }>
export type RemapOp = Extract<ScheduleOp, { kind: 'remap' }>
/** One attempt column of an exercise — "exercise round", distinct from a 90-day round. */
export type ExerciseRound = z.infer<typeof exerciseRoundSchema>
export type ExerciseEntry = z.infer<typeof exerciseEntrySchema>
export type Session = z.infer<typeof sessionSchema>
export type BodyEntry = z.infer<typeof bodyEntrySchema>
export type RoundSnapshot = z.infer<typeof roundSnapshotSchema>
export type ArchivedRound = z.infer<typeof archivedRoundSchema>
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
      player: { autoMarkDone: false, voiceCues: true, voiceHandsFree: false },
      yoga: 'classic',
      training: 'intermediate',
      nutrition: { phaseOverride: null, calorieOverride: null, dietStyle: 'balanced' },
      workoutLinks: {},
    },
    scheduleOps: [],
    workoutLogs: {},
    bodyLog: [],
    archivedRounds: [],
    quotes: { disabledIds: [], custom: [] },
    notes: '',
  }
}
