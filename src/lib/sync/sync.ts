import { z } from 'zod'
import { emptyState, type AppState } from '@/lib/shared'

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

/**
 * Strict base64 (charset, padding, length % 4). The envelope comes from an
 * untrusted server and these fields feed `atob` — a malformed salt adopted at
 * enable time would otherwise throw deep inside key derivation.
 */
const base64 = z
  .string()
  .min(1)
  .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/, 'expected base64')

export const cipherSchema = z.object({
  /** base64 — PBKDF2 salt; travels in the clear by design so a second device can derive the key */
  salt: base64,
  /** base64 — AES-GCM nonce, fresh per push */
  iv: base64,
  /** recorded so the cost can be raised later without orphaning old envelopes */
  iterations: z.number().int().positive(),
  /** base64 — AES-GCM ciphertext of `JSON.stringify(AppState)` */
  data: base64,
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
 *
 * "Anything" means *any* deviation from a fresh document. An earlier field list
 * (startDate, logs, notes…) missed settings-only changes, so a user who had only
 * filled in their height and targets would have had them silently replaced by the
 * first pull. `emptyState()` is deterministic and both documents descend from the
 * same literal, so the serialisation comparison is stable.
 */
export function hasUserData(state: AppState): boolean {
  return JSON.stringify(state) !== JSON.stringify(emptyState())
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
