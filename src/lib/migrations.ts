import { appStateSchema, SCHEMA_VERSION, type AppState } from '@/lib/schema'

export type MigrationResult =
  { ok: true; state: AppState; migrated: boolean } | { ok: false; error: string }

/**
 * Stepwise vN → vN+1 transforms (PRD US-004/US-012). Each mutates a private
 * clone in place and only adds what its version introduced; full Zod validation
 * runs once at the end, so old exports and old localStorage snapshots keep
 * importing through every entry path (boot, file import, backup, cloud pull).
 */
const MIGRATIONS: Record<number, (doc: Record<string, unknown>) => void> = {
  // v1 → v2 (E12): per-user focus-playback / rest-timer durations.
  1: (doc) => {
    const settings = doc.settings as { timer?: unknown } | undefined
    if (settings !== undefined && settings.timer === undefined) {
      settings.timer = { workSeconds: 60, restSeconds: 60 }
    }
  },
  // v2 → v3 (E14): normalized-FFMI target.
  2: (doc) => {
    const settings = doc.settings as { targets?: Record<string, unknown> } | undefined
    if (settings?.targets !== undefined && settings.targets.ffmi === undefined) {
      settings.targets.ffmi = null
    }
  },
  // v3 → v4 (E16): play-mode preferences (session.exerciseDone is optional — no backfill).
  3: (doc) => {
    const settings = doc.settings as { player?: unknown } | undefined
    if (settings !== undefined && settings.player === undefined) {
      settings.player = { autoMarkDone: false }
    }
  },
  // v4 → v5 (E19): yoga variant preference.
  4: (doc) => {
    const settings = doc.settings as { yoga?: unknown } | undefined
    if (settings !== undefined && settings.yoga === undefined) {
      settings.yoga = 'classic'
    }
  },
}

export function migrateToCurrent(raw: unknown): MigrationResult {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: 'Not a data document (expected a JSON object).' }
  }
  const version = (raw as { schemaVersion?: unknown }).schemaVersion
  if (typeof version !== 'number') {
    return { ok: false, error: 'Missing schemaVersion — not a p90x-webapp export.' }
  }
  if (version > SCHEMA_VERSION) {
    return {
      ok: false,
      error: `This file is from a newer app version (schema v${version}, app supports v${SCHEMA_VERSION}). Update the app first.`,
    }
  }
  let doc = raw as Record<string, unknown>
  let migrated = false
  if (version < SCHEMA_VERSION) {
    doc = structuredClone(doc)
    for (let v = version; v < SCHEMA_VERSION; v++) {
      const step = MIGRATIONS[v]
      if (step === undefined) {
        return { ok: false, error: `Unsupported schema version v${version}.` }
      }
      step(doc)
      doc.schemaVersion = v + 1
      migrated = true
    }
  }
  const parsed = appStateSchema.safeParse(doc)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    const where = first?.path.join('.') || '(root)'
    return { ok: false, error: `Invalid data at ${where}: ${first?.message ?? 'unknown error'}` }
  }
  return { ok: true, state: parsed.data, migrated }
}
