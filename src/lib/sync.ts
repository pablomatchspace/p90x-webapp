import { z } from 'zod'
import type { AppState } from '@/lib/schema'

/**
 * Cloud-sync wire format and decision core (E10, US-089). Pure — no IO, no
 * crypto, no store access — so every branch is unit-testable.
 *
 * The wire version is independent of `SCHEMA_VERSION`: the envelope shape (how
 * a document is wrapped and encrypted) can evolve without touching the document
 * shape, and vice versa.
 */
export const SYNC_WIRE_VERSION = 1

/** Minimum passphrase length. It is a key, not a password — length is the defence. */
export const MIN_PASSPHRASE_LENGTH = 8

export const cipherSchema = z.object({
  /** base64 — PBKDF2 salt; travels in the clear by design so a second device can derive the key */
  salt: z.string().min(1),
  /** base64 — AES-GCM nonce, fresh per push */
  iv: z.string().min(1),
  /** recorded so the cost can be raised later without orphaning old envelopes */
  iterations: z.number().int().positive(),
  /** base64 — AES-GCM ciphertext of `JSON.stringify(AppState)` */
  data: z.string().min(1),
})

export const syncEnvelopeSchema = z.object({
  v: z.literal(SYNC_WIRE_VERSION),
  /** client clock, display only — never used for ordering (skew); `revision` orders */
  updatedAt: z.string(),
  deviceId: z.string().min(1),
  deviceName: z.string(),
  cipher: cipherSchema,
})

/** What `GET /v1/meta` returns — enough to decide, without moving the blob. */
export const remoteMetaSchema = z.object({
  revision: z.number().int().nonnegative(),
  updatedAt: z.string(),
  deviceName: z.string().nullish(),
})

/** What `GET /v1/state` returns: the server-assigned revision plus the opaque envelope. */
export const remoteStateSchema = z.object({
  revision: z.number().int().positive(),
  envelope: syncEnvelopeSchema,
})

export type Cipher = z.infer<typeof cipherSchema>
export type SyncEnvelope = z.infer<typeof syncEnvelopeSchema>
export type RemoteMeta = z.infer<typeof remoteMetaSchema>
export type RemoteState = z.infer<typeof remoteStateSchema>

export type SyncAction = 'idle' | 'push' | 'pull' | 'conflict' | 'first-push'

export interface SyncDecisionInput {
  /** local edits not yet pushed */
  dirty: boolean
  /** revision this device last agreed with (0 = never synced) */
  lastRevision: number
  /** null when the cloud holds no envelope (never pushed, or deleted) */
  remote: RemoteMeta | null
}

/**
 * The whole sync policy in five lines (US-089).
 *
 * `revision` is the single ordering authority — server-assigned and monotonic —
 * because client clocks disagree. A device is "in step" when it last agreed with
 * the revision the cloud still holds; anything else means the other device wrote.
 *
 * An empty cloud always takes this device's copy: either it is the first push, or
 * the copy was deleted elsewhere while this device stayed enabled — re-seeding is
 * the only non-destructive answer.
 */
export function decideSync({ dirty, lastRevision, remote }: SyncDecisionInput): SyncAction {
  if (remote === null) return 'first-push'
  if (remote.revision === lastRevision) return dirty ? 'push' : 'idle'
  // Remote moved (or this device rolled back). Clean ⇒ take it; dirty ⇒ both sides
  // changed and only the user can say which wins.
  return dirty ? 'conflict' : 'pull'
}

/**
 * Does this document hold anything the user would miss? Decides whether enabling
 * sync on a device seeds the cloud (`dirty`) or adopts it (clean pull) — a fresh
 * second device must never be told it has a "conflict" with the data it is trying
 * to fetch.
 */
export function hasUserData(state: AppState): boolean {
  return (
    state.settings.startDate !== null ||
    state.bodyLog.length > 0 ||
    Object.keys(state.workoutLogs).length > 0 ||
    state.quotes.custom.length > 0 ||
    state.notes.trim().length > 0
  )
}

/**
 * Accept only an origin we can actually reach from a browser: https anywhere, or
 * http on loopback for local Worker development (`wrangler dev`). A trailing
 * slash would double up when we append `/v1/...`.
 */
export function normalizeEndpoint(raw: string): string | null {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }
  const loopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) return null
  if (url.search !== '' || url.hash !== '') return null
  return (url.origin + url.pathname).replace(/\/+$/, '')
}
