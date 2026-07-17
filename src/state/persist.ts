import { migrateToCurrent } from '@/lib/shared'
import { emptyState, type AppState } from '@/lib/shared'

const STATE_KEY = 'p90x.state'
const BACKUP_KEY = 'p90x.backup'
const CORRUPT_KEY = 'p90x.corrupt'
const LAST_EXPORT_KEY = 'p90x.lastExportAt'

export type LoadIssue = 'none' | 'empty' | 'corrupt'

export interface LoadResult {
  state: AppState
  issue: LoadIssue
}

/**
 * Load the persisted state. A corrupt/unreadable document is never destroyed:
 * the raw payload is stashed under CORRUPT_KEY and the app boots with a clean
 * empty state plus a recovery banner (PRD US-004 / US-082).
 */
export function loadState(): LoadResult {
  const raw = localStorage.getItem(STATE_KEY)
  if (raw === null) return { state: emptyState(), issue: 'empty' }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    stashCorrupt(raw)
    return { state: emptyState(), issue: 'corrupt' }
  }
  const migrated = migrateToCurrent(parsed)
  if (!migrated.ok) {
    stashCorrupt(raw)
    return { state: emptyState(), issue: 'corrupt' }
  }
  if (migrated.migrated) {
    const originalVersion = (parsed as { schemaVersion?: unknown }).schemaVersion
    if (typeof originalVersion === 'number') {
      try {
        localStorage.setItem(`p90x.backup.pre-migration.v${originalVersion}`, raw)
      } catch {
        // Quota exhausted or private mode
      }
    }
  }
  return { state: migrated.state, issue: 'none' }
}

function stashCorrupt(raw: string) {
  try {
    localStorage.setItem(CORRUPT_KEY, raw)
    localStorage.removeItem(STATE_KEY)
  } catch {
    // Quota exhausted while stashing — the original stays under STATE_KEY.
  }
}

/** @returns false when the write failed (quota, privacy mode) — callers surface a banner. */
export function saveState(state: AppState): boolean {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

export interface BackupEnvelope {
  state: AppState
  savedAt: string
  reason: string
}

/** One-slot safety net written before destructive operations (import/reset/restore). */
export function writeBackup(state: AppState, reason: string): boolean {
  try {
    const envelope: BackupEnvelope = { state, savedAt: new Date().toISOString(), reason }
    localStorage.setItem(BACKUP_KEY, JSON.stringify(envelope))
    return true
  } catch {
    return false
  }
}

export function readBackup(): BackupEnvelope | null {
  const raw = localStorage.getItem(BACKUP_KEY)
  if (raw === null) return null
  try {
    const parsed = JSON.parse(raw) as BackupEnvelope
    const migrated = migrateToCurrent(parsed.state)
    if (!migrated.ok) return null
    return { state: migrated.state, savedAt: parsed.savedAt, reason: parsed.reason }
  } catch {
    return null
  }
}

export function markExported(now: Date = new Date()): void {
  try {
    localStorage.setItem(LAST_EXPORT_KEY, now.toISOString())
  } catch {
    // non-essential
  }
}

/** null = never exported. Drives the "back up your data" reminder (US-013). */
export function daysSinceExport(now: Date = new Date()): number | null {
  const raw = localStorage.getItem(LAST_EXPORT_KEY)
  if (raw === null) return null
  const then = Date.parse(raw)
  if (Number.isNaN(then)) return null
  return Math.floor((now.getTime() - then) / 86_400_000)
}

export interface DebouncedSaver {
  schedule(state: AppState): void
  flush(): void
}

/**
 * Collapses bursts of updates (stepper taps) into one write. `onResult`
 * reports write success so the store can flag failing storage.
 */
export function createDebouncedSaver(
  onResult: (ok: boolean) => void,
  delayMs = 300,
): DebouncedSaver {
  let pending: AppState | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  const write = () => {
    if (pending === null) return
    const ok = saveState(pending)
    pending = null
    onResult(ok)
  }

  return {
    schedule(state: AppState) {
      pending = state
      if (timer !== null) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        write()
      }, delayMs)
    },
    flush() {
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
      write()
    },
  }
}
