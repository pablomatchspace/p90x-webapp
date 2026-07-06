import { appStateSchema, SCHEMA_VERSION, type AppState } from '@/lib/schema'

export type MigrationResult =
  { ok: true; state: AppState; migrated: boolean } | { ok: false; error: string }

/**
 * Bring a raw parsed document up to the current schema. There is only v1 today;
 * future versions add stepwise `vN → vN+1` transforms here so old exports and
 * old localStorage snapshots keep importing (PRD US-004/US-012).
 */
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
  if (version < SCHEMA_VERSION) {
    // No published versions below 1 exist; anything lower is not ours.
    return { ok: false, error: `Unsupported schema version v${version}.` }
  }
  const parsed = appStateSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    const where = first?.path.join('.') || '(root)'
    return { ok: false, error: `Invalid data at ${where}: ${first?.message ?? 'unknown error'}` }
  }
  return { ok: true, state: parsed.data, migrated: false }
}
