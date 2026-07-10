import { z } from 'zod'

/**
 * Sync configuration lives under its **own** localStorage key, deliberately
 * outside the versioned app document (E10, US-089):
 *
 * - no `SCHEMA_VERSION` bump and no migration for a feature that adds no user data;
 * - exports stay byte-identical to v1.0.0 and portable between devices, which they
 *   would not be if they carried one device's endpoint and passphrase.
 *
 * The passphrase is stored so background pushes need no prompt. It is the price of
 * unattended sync; it never leaves the device, and the blob it protects is useless
 * to anyone holding only the server's copy.
 */
const SYNC_KEY = 'p90x.sync'

export const pausedReasonSchema = z.enum(['after-reset', 'manual'])

export const syncConfigSchema = z.object({
  endpoint: z.string().min(1),
  passphrase: z.string().min(1),
  /** base64 PBKDF2 salt, fixed at enable so the derived key can be cached */
  salt: z.string().min(1),
  deviceId: z.string().min(1),
  deviceName: z.string(),
  /** revision this device last agreed with; 0 = never synced */
  lastRevision: z.number().int().nonnegative(),
  /** survives a closed tab, so the next open pushes what this one could not */
  dirty: z.boolean(),
  pausedReason: pausedReasonSchema.nullable(),
})

export type PausedReason = z.infer<typeof pausedReasonSchema>
export type SyncConfig = z.infer<typeof syncConfigSchema>

/** @returns null when sync was never enabled, or the stored config is unusable. */
export function loadSyncConfig(): SyncConfig | null {
  let raw: string | null
  try {
    raw = localStorage.getItem(SYNC_KEY)
  } catch {
    return null
  }
  if (raw === null) return null
  try {
    const parsed = syncConfigSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

/** @returns false when the write failed (quota, private mode) — sync degrades, data does not. */
export function saveSyncConfig(config: SyncConfig): boolean {
  try {
    localStorage.setItem(SYNC_KEY, JSON.stringify(config))
    return true
  } catch {
    return false
  }
}

export function clearSyncConfig(): void {
  try {
    localStorage.removeItem(SYNC_KEY)
  } catch {
    // nothing to do — the caller has already forgotten it in memory
  }
}
