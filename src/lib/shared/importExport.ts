import { migrateToCurrent } from './migrations'
import type { AppState } from './schema'

export interface ImportSummary {
  program: string
  startDate: string | null
  workoutCount: number
  sessionCount: number
  entryCount: number
  bodyCount: number
  skipCount: number
  customQuotes: number
  hasNotes: boolean
}

export function summarize(state: AppState): ImportSummary {
  let sessionCount = 0
  let entryCount = 0
  for (const log of Object.values(state.workoutLogs)) {
    sessionCount += log.sessions.length
    for (const s of log.sessions) entryCount += Object.keys(s.entries ?? {}).length
  }
  return {
    program: state.settings.program,
    startDate: state.settings.startDate,
    workoutCount: Object.keys(state.workoutLogs).length,
    sessionCount,
    entryCount,
    bodyCount: state.bodyLog.length,
    skipCount: state.scheduleOps.filter((op) => op.kind === 'skip' && !op.revertedAt).length,
    customQuotes: state.quotes.custom.length,
    hasNotes: state.notes.trim().length > 0,
  }
}

export type ParseImportResult =
  { ok: true; state: AppState; summary: ImportSummary } | { ok: false; error: string }

/** Validate untrusted file text. Never throws; never mutates anything (US-012 atomicity). */
export function parseImport(text: string): ParseImportResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return {
      ok: false,
      error: 'Not valid JSON — is this the file exported by the app or converter?',
    }
  }
  const migrated = migrateToCurrent(raw)
  if (!migrated.ok) return { ok: false, error: migrated.error }
  return { ok: true, state: migrated.state, summary: summarize(migrated.state) }
}

export function serializeExport(state: AppState): string {
  return JSON.stringify(state, null, 2)
}

export function exportFilename(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `p90x-data-${y}${m}${d}.json`
}
