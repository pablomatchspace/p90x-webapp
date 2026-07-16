import { current } from 'immer'
import { compareISO, isISODate, type ISODate } from '@/lib/dates'
import { isHttpUrl, type MediaKind } from '@/lib/links'
import { getWorkout, hasWorkout, type ProgramKey } from '@/lib/programData'
import type {
  AppState,
  BodyEntry,
  ScheduleOp,
  ScoringSettings,
  Session,
  Settings,
} from '@/lib/schema'
import { useStore } from '@/state/store'

/**
 * Quick-log mutations shared by Today/day detail (E2) and the full entry
 * screens (E4). One session per (workout, program day) — repeat calls update
 * the existing session in place.
 */

function upsertSession(draft: AppState, workoutKey: string, programDayId: string): Session {
  const log = (draft.workoutLogs[workoutKey] ??= { sessions: [] })
  let session = log.sessions.find((s) => s.programDayId === programDayId)
  if (session === undefined) {
    session = { programDayId }
    log.sessions.push(session)
  }
  return session
}

/** Cardio-style workouts: the Excel COMPLETED? dropdown. */
export function setCompletionStatus(
  workoutKey: string,
  programDayId: string,
  status: 'yes' | 'no' | 'not-yet',
): void {
  useStore.getState().mutate((draft) => {
    const session = upsertSession(draft, workoutKey, programDayId)
    session.status = status
    session.loggedAt = new Date().toISOString()
  })
}

/** Append a reschedule op (validate upstream with `previewOp` first). */
export function addScheduleOp(op: ScheduleOp): void {
  useStore.getState().mutate((draft) => {
    draft.scheduleOps.push(op)
  })
}

/** Soft-delete: the op stays in the audit trail but stops applying. */
export function revertScheduleOp(opId: string): void {
  useStore.getState().mutate((draft) => {
    const op = draft.scheduleOps.find((o) => o.id === opId)
    if (op !== undefined && op.revertedAt === undefined) op.revertedAt = new Date().toISOString()
  })
}

/**
 * Set one raw round value (US-041/042). The entry is created lazily with the
 * catalog's round count and removed again when every value is cleared, so the
 * "any entry ⇒ partial" status rule stays honest.
 */
export function setRoundValue(
  workoutKey: string,
  programDayId: string,
  exerciseId: string,
  round: number,
  field: 'main' | 'secondary',
  value: number | null,
): void {
  const def = getWorkout(workoutKey).exercises?.find((e) => e.id === exerciseId)
  if (def === undefined || round < 0 || round >= def.rounds) return
  useStore.getState().mutate((draft) => {
    const session = upsertSession(draft, workoutKey, programDayId)
    const entries = (session.entries ??= {})
    const entry = (entries[exerciseId] ??= {
      rounds: Array.from({ length: def.rounds }, () => ({ main: null, secondary: null })),
    })
    if (entry.rounds[round] === undefined) return // imported entry shorter than catalog
    entry.rounds[round][field] = value
    session.loggedAt = new Date().toISOString()
    const empty = entry.rounds.every(
      (r) => (r.main ?? null) === null && (r.secondary ?? null) === null,
    )
    if (empty) delete entries[exerciseId]
  })
}

/** Week-header annotation, e.g. "2 with chestweight". */
export function setSessionAnnotation(
  workoutKey: string,
  programDayId: string,
  annotation: string,
): void {
  useStore.getState().mutate((draft) => {
    const session = upsertSession(draft, workoutKey, programDayId)
    session.annotation = annotation
  })
}

/** Free-text notes on a session (all log styles). */
export function setSessionNotes(workoutKey: string, programDayId: string, notes: string): void {
  useStore.getState().mutate((draft) => {
    const session = upsertSession(draft, workoutKey, programDayId)
    session.notes = notes
  })
}

/**
 * One scale entry per date (US-050). Created lazily, kept sorted, and removed
 * again when every field is cleared so missing-day gaps stay honest.
 */
export function upsertBodyEntry(date: ISODate, patch: Partial<Omit<BodyEntry, 'date'>>): void {
  if (!isISODate(date)) return
  useStore.getState().mutate((draft) => {
    let entry = draft.bodyLog.find((e) => e.date === date)
    if (entry === undefined) {
      entry = { date, weight: null, bodyFat: null, water: null, bone: null, zoneMinutes: null }
      draft.bodyLog.push(entry)
      draft.bodyLog.sort((a, b) => compareISO(a.date, b.date))
    }
    Object.assign(entry, patch)
    const cleared = [entry.weight, entry.bodyFat, entry.water, entry.bone, entry.zoneMinutes]
    if (cleared.every((v) => (v ?? null) === null)) {
      draft.bodyLog.splice(
        draft.bodyLog.findIndex((e) => e.date === date),
        1,
      )
    }
  })
}

export function deleteBodyEntry(date: ISODate): void {
  useStore.getState().mutate((draft) => {
    const i = draft.bodyLog.findIndex((e) => e.date === date)
    if (i !== -1) draft.bodyLog.splice(i, 1)
  })
}

/** Strength/ARX explicit done override; `undefined` clears it. */
export function setWorkoutCompleted(
  workoutKey: string,
  programDayId: string,
  completed: boolean | undefined,
): void {
  useStore.getState().mutate((draft) => {
    const session = upsertSession(draft, workoutKey, programDayId)
    session.completed = completed
    session.loggedAt = new Date().toISOString()
  })
}

/**
 * Custom motivational quotes (US-064). Stored in user data (so they export/import
 * with everything else); disabling works by id for built-in and custom alike.
 */
export function addCustomQuote(text: string, author?: string): void {
  const trimmed = text.trim()
  if (trimmed === '') return
  const trimmedAuthor = author?.trim()
  useStore.getState().mutate((draft) => {
    draft.quotes.custom.push({
      id: `c-${crypto.randomUUID()}`,
      text: trimmed,
      ...(trimmedAuthor ? { author: trimmedAuthor } : {}),
    })
  })
}

export function updateCustomQuote(id: string, text: string, author?: string): void {
  const trimmed = text.trim()
  const trimmedAuthor = author?.trim()
  useStore.getState().mutate((draft) => {
    const quote = draft.quotes.custom.find((q) => q.id === id)
    if (quote === undefined) return
    if (trimmed === '') return
    quote.text = trimmed
    if (trimmedAuthor) quote.author = trimmedAuthor
    else delete quote.author
  })
}

export function deleteCustomQuote(id: string): void {
  useStore.getState().mutate((draft) => {
    draft.quotes.custom = draft.quotes.custom.filter((q) => q.id !== id)
    draft.quotes.disabledIds = draft.quotes.disabledIds.filter((d) => d !== id)
  })
}

/** Enable/disable any quote (built-in or custom) by id. */
export function setQuoteDisabled(id: string, disabled: boolean): void {
  useStore.getState().mutate((draft) => {
    const has = draft.quotes.disabledIds.includes(id)
    if (disabled && !has) draft.quotes.disabledIds.push(id)
    else if (!disabled && has) {
      draft.quotes.disabledIds = draft.quotes.disabledIds.filter((d) => d !== id)
    }
  })
}

/**
 * SETUP-screen mutations (US-070). Only raw inputs are written — every derived
 * number (LBM, BMI, target weight, scores…) is recomputed by pure functions, so
 * there is nothing to keep in sync. Nested groups get their own patchers to keep
 * the immer updates shallow and type-safe.
 */
type CoreSettings = Pick<
  Settings,
  'program' | 'units' | 'gender' | 'age' | 'height' | 'startWeight' | 'startBodyFat'
>

export function updateSettings(patch: Partial<CoreSettings>): void {
  useStore.getState().mutate((draft) => {
    Object.assign(draft.settings, patch)
  })
}

export function updateLimits(patch: Partial<Settings['limits']>): void {
  useStore.getState().mutate((draft) => {
    Object.assign(draft.settings.limits, patch)
  })
}

export function updateTargets(patch: Partial<Settings['targets']>): void {
  useStore.getState().mutate((draft) => {
    Object.assign(draft.settings.targets, patch)
  })
}

/**
 * Scoring params. The three divisors/factors must stay positive (the schema
 * enforces it on import, but live mutation bypasses Zod) — a zero would divide the
 * engine by zero — so non-positive values are ignored rather than stored.
 */
export function updateScoring(patch: Partial<ScoringSettings>): void {
  useStore.getState().mutate((draft) => {
    if (patch.penaltyOn !== undefined) draft.settings.scoring.penaltyOn = patch.penaltyOn
    for (const key of ['penaltyDivisor', 'chairFactor', 'rwDivisor'] as const) {
      const value = patch[key]
      if (value !== undefined && Number.isFinite(value) && value > 0) {
        draft.settings.scoring[key] = value
      }
    }
  })
}

/**
 * Focus-playback + rest-timer durations (E12). Whole seconds, clamped to
 * 5–3600 — mirrors updateScoring's guard style: live mutation bypasses Zod,
 * so invalid values are corrected rather than stored.
 */
export function updateTimerSettings(patch: Partial<Settings['timer']>): void {
  useStore.getState().mutate((draft) => {
    for (const key of ['workSeconds', 'restSeconds'] as const) {
      const value = patch[key]
      if (value !== undefined && Number.isFinite(value)) {
        draft.settings.timer[key] = Math.min(3600, Math.max(5, Math.round(value)))
      }
    }
  })
}

/**
 * E16: play-mode preferences (Q17). Only raw inputs are written; auto-mark-done
 * is a persisted boolean defaulting to false. Mirrors the nested-patcher style of
 * updateTimerSettings: live mutation bypasses Zod, so booleans are coerced.
 */
export function updatePlayerSettings(patch: Partial<Settings['player']>): void {
  useStore.getState().mutate((draft) => {
    if (patch.autoMarkDone !== undefined) {
      draft.settings.player.autoMarkDone = Boolean(patch.autoMarkDone)
    }
    if (patch.voiceCues !== undefined) {
      draft.settings.player.voiceCues = Boolean(patch.voiceCues)
    }
    if (patch.voiceHandsFree !== undefined) {
      draft.settings.player.voiceHandsFree = Boolean(patch.voiceHandsFree)
    }
  })
}

/**
 * E19: update the default yoga play variant.
 */
export function updateYogaVariant(variant: Settings['yoga']): void {
  useStore.getState().mutate((draft) => {
    draft.settings.yoga = variant
  })
}

/** E20: self-reported training experience (feasibility rate tier). */
export function updateTraining(level: Settings['training']): void {
  useStore.getState().mutate((draft) => {
    draft.settings.training = level
  })
}

/**
 * E22: nutrition-plan overrides. Only the two raw override inputs are stored —
 * calories, level and grams stay derived (rule 2). Mirrors updateScoring's guard
 * style: live mutation bypasses Zod, so a non-positive calorie override is
 * treated as clearing it.
 */
export function updateNutrition(patch: Partial<Settings['nutrition']>): void {
  useStore.getState().mutate((draft) => {
    if (patch.phaseOverride !== undefined) {
      draft.settings.nutrition.phaseOverride = patch.phaseOverride
    }
    if (patch.calorieOverride !== undefined) {
      const value = patch.calorieOverride
      draft.settings.nutrition.calorieOverride =
        value !== null && Number.isFinite(value) && value > 0 ? value : null
    }
    if (patch.dietStyle !== undefined) {
      draft.settings.nutrition.dietStyle = patch.dietStyle
    }
  })
}

/**
 * E23: set or clear one workout's video/audio deeplink. Live mutation bypasses
 * Zod (same reasoning as updateScoring), so the http(s)-only rule is enforced
 * here too: anything else is ignored rather than stored. `null` clears the
 * link; a workout whose links are all cleared drops out of the record.
 */
export function updateWorkoutLink(workoutKey: string, kind: MediaKind, url: string | null): void {
  if (!hasWorkout(workoutKey)) return
  const trimmed = url?.trim() ?? null
  if (trimmed !== null && !isHttpUrl(trimmed)) return
  useStore.getState().mutate((draft) => {
    const links = draft.settings.workoutLinks
    if (trimmed === null) {
      const entry = links[workoutKey]
      if (entry === undefined) return
      delete entry[kind]
      if (entry.video === undefined && entry.audio === undefined) delete links[workoutKey]
    } else {
      ;(links[workoutKey] ??= {})[kind] = trimmed
    }
  })
}

/**
 * E16 (Q21c): merge per-exercise done/skipped flags into a session's play log.
 * Raw user input (done/skipped taps), not derived — allowed under the
 * "never store derived" rule. Lazily creates the session like the other quick-log
 * actions, so an untouched play session never leaves a residue entry.
 */
export function setExerciseDone(
  workoutKey: string,
  programDayId: string,
  patch: Record<string, boolean>,
): void {
  useStore.getState().mutate((draft) => {
    const session = upsertSession(draft, workoutKey, programDayId)
    const next = { ...(session.exerciseDone ?? {}), ...patch }
    // Drop keys flipped back to the default-untouched shape would lose information;
    // the Q21c log keeps explicit true/false, so we keep all keys as written.
    session.exerciseDone = next
    session.loggedAt = new Date().toISOString()
  })
}

/**
 * Begin a program on a fresh document (US-084) — the no-import entry path. The
 * schedule materializes from `(program, startDate)` alone, so a start date is the
 * only input a brand-new user has to supply; stats and targets stay optional.
 *
 * Refuses to overwrite an existing program: re-anchoring day 1 goes through
 * `setStartDate` on the Settings screen, which confirms first when data exists.
 */
export function startProgram(startDate: ISODate, program: ProgramKey): void {
  if (!isISODate(startDate)) return
  useStore.getState().mutate((draft) => {
    if (draft.settings.startDate !== null) return
    draft.settings.program = program
    draft.settings.startDate = startDate
  })
}

/**
 * Re-anchor the whole schedule to a new day 1 (US-070). The materializer derives
 * every calendar date from this, so changing it shifts the entire program; the UI
 * gates the change behind a confirm when logged data already exists.
 */
export function setStartDate(date: ISODate | null): void {
  if (date !== null && !isISODate(date)) return
  useStore.getState().mutate((draft) => {
    draft.settings.startDate = date
  })
}

/**
 * Free-form global notes (US-071) — the workbook's YOUR NOTES sheet. Autosaves
 * through the store's debounced persister and travels with export/import.
 */
export function setNotes(notes: string): void {
  useStore.getState().mutate((draft) => {
    draft.notes = notes
  })
}

/**
 * E28 (US-143): archive the live round inside the document and reset for the
 * next one. The archive is a raw-input snapshot — ops/logs move over as-is and
 * the round-scoped SETUP inputs are frozen so reports recompute the round
 * exactly as it was, whatever later rounds do to Settings. Global preferences
 * (units, timers, quotes, links, notes…) survive untouched.
 *
 * `seedFromLatest` re-seeds the next round's SETUP start stats from the
 * archived round's latest weigh-in — an explicit raw→raw copy the user opts
 * into, mirroring the calculators' "use as starting BF%" precedent.
 */
export function completeRound(options: { label?: string; seedFromLatest?: boolean } = {}): void {
  useStore.getState().mutate((draft) => {
    const s = draft.settings
    if (s.startDate === null) return
    // `current` detaches plain copies, so moving the subtrees into the archive
    // while resetting the live slots can never alias immer drafts.
    const plain = current(draft)
    const label = options.label?.trim() || `Round ${draft.rounds.length + 1}`
    draft.rounds.push({
      id: `r-${crypto.randomUUID()}`,
      archivedAt: new Date().toISOString(),
      label,
      program: s.program,
      startDate: s.startDate,
      scheduleOps: plain.scheduleOps,
      workoutLogs: plain.workoutLogs,
      bodyLog: plain.bodyLog,
      snapshot: {
        age: s.age ?? null,
        height: s.height ?? null,
        startWeight: s.startWeight ?? null,
        startBodyFat: s.startBodyFat ?? null,
        limits: { ...plain.settings.limits },
        targets: { ...plain.settings.targets },
        scoring: { ...plain.settings.scoring },
      },
    })
    if (options.seedFromLatest === true) {
      const lastWeight = plain.bodyLog.findLast((e) => (e.weight ?? null) !== null)
      const lastBf = plain.bodyLog.findLast((e) => (e.bodyFat ?? null) !== null)
      if (lastWeight !== undefined) s.startWeight = lastWeight.weight ?? null
      if (lastBf !== undefined) s.startBodyFat = lastBf.bodyFat ?? null
    }
    s.startDate = null
    draft.scheduleOps = []
    draft.workoutLogs = {}
    draft.bodyLog = []
  })
}

/**
 * E28 (US-143): move an archived round back to live — the "archived too early"
 * escape hatch. Refused while a program is running (same guard philosophy as
 * `startProgram`); the snapshot is written back to Settings so the round
 * returns exactly as archived.
 */
export function restoreRound(id: string): void {
  useStore.getState().mutate((draft) => {
    if (draft.settings.startDate !== null) return
    const index = draft.rounds.findIndex((r) => r.id === id)
    if (index === -1) return
    const round = current(draft.rounds[index])
    draft.rounds.splice(index, 1)
    const s = draft.settings
    s.program = round.program
    s.startDate = round.startDate
    s.age = round.snapshot.age ?? null
    s.height = round.snapshot.height ?? null
    s.startWeight = round.snapshot.startWeight ?? null
    s.startBodyFat = round.snapshot.startBodyFat ?? null
    s.limits = { ...round.snapshot.limits }
    s.targets = { ...round.snapshot.targets }
    s.scoring = { ...round.snapshot.scoring }
    draft.scheduleOps = round.scheduleOps
    draft.workoutLogs = round.workoutLogs
    draft.bodyLog = round.bodyLog
  })
}

/** E28: rename an archived round; an empty label is ignored rather than stored. */
export function renameRound(id: string, label: string): void {
  const trimmed = label.trim()
  if (trimmed === '') return
  useStore.getState().mutate((draft) => {
    const round = draft.rounds.find((r) => r.id === id)
    if (round !== undefined) round.label = trimmed
  })
}

/** E28: permanently delete an archived round (the UI confirms first). */
export function deleteRound(id: string): void {
  useStore.getState().mutate((draft) => {
    const index = draft.rounds.findIndex((r) => r.id === id)
    if (index !== -1) draft.rounds.splice(index, 1)
  })
}
