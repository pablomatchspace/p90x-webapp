import { create } from 'zustand'
import { migrateToCurrent } from '@/lib/migrations'
import {
  decideSync,
  hasUserData,
  MIN_PASSPHRASE_LENGTH,
  normalizeEndpoint,
  SYNC_WIRE_VERSION,
  type Cipher,
  type RemoteMeta,
  type SyncEnvelope,
} from '@/lib/sync'
import {
  decryptJson,
  deriveAuthToken,
  deriveKey,
  encryptJson,
  fromBase64,
  PBKDF2_ITERATIONS,
  randomBytes,
  SALT_BYTES,
  toBase64,
} from '@/lib/syncCrypto'
import {
  clearSyncConfig,
  loadSyncConfig,
  saveSyncConfig,
  type SyncConfig,
} from '@/state/syncConfig'
import { clearSecrets, loadSecrets, saveSecrets, type SyncSecrets } from '@/state/syncSecrets'
import {
  deleteState,
  describeFailure,
  getMeta,
  getState,
  putState,
  type ApiFailure,
} from '@/state/syncApi'
import { setResetListener, useStore } from '@/state/store'

/**
 * Cloud-sync engine (E10, US-092). Mirrors `attachPersistence`: subscribe to the
 * document, debounce, write. The difference is that the far end can have moved, so
 * every run consults `decideSync` before touching anything.
 *
 * Sync is off unless a config exists, and this module makes **zero** network calls
 * in that state — the v1.0.0 offline behaviour is untouched by default.
 */

/** Long enough to collapse a burst of stepper taps; short enough to survive a tab close. */
const PUSH_DEBOUNCE_MS = 3000

const NEEDS_PASSPHRASE =
  'This browser no longer holds the sync key. Turn sync off and on again to re-enter your passphrase.'
const SALT_MISMATCH =
  'The cloud copy was encrypted with a different passphrase or a different setup. Turn sync off and on again to re-enter it.'
const WRONG_PASSPHRASE =
  'Could not decrypt the cloud copy. Is the passphrase exactly the same as on the other device?'

export type SyncStatus =
  'disabled' | 'idle' | 'syncing' | 'synced' | 'offline' | 'error' | 'conflict' | 'paused'

interface SyncStoreState {
  config: SyncConfig | null
  status: SyncStatus
  message: string | null
  lastSyncedAt: string | null
  /** set when both sides changed — only the user can break the tie */
  conflictRemote: RemoteMeta | null
}

export const useSyncStore = create<SyncStoreState>()(() => ({
  config: null,
  status: 'disabled',
  message: null,
  lastSyncedAt: null,
  conflictRemote: null,
}))

/** Guards the store subscription while a pull writes the remote document in. */
let applyingRemote = false
let pushTimer: ReturnType<typeof setTimeout> | null = null
let running = false

function cancelPush() {
  if (pushTimer !== null) {
    clearTimeout(pushTimer)
    pushTimer = null
  }
}

function schedulePush() {
  cancelPush()
  pushTimer = setTimeout(() => {
    pushTimer = null
    void syncNow()
  }, PUSH_DEBOUNCE_MS)
}

function patchConfig(patch: Partial<SyncConfig>): SyncConfig | null {
  const current = useSyncStore.getState().config
  if (current === null) return null
  const next = { ...current, ...patch }
  saveSyncConfig(next)
  useSyncStore.setState({ config: next })
  return next
}

function fail(failure: ApiFailure) {
  useSyncStore.setState({
    status: failure.kind === 'network' ? 'offline' : 'error',
    message: describeFailure(failure),
  })
}

function setError(message: string) {
  useSyncStore.setState({ status: 'error', message })
}

function succeed(message: string) {
  useSyncStore.setState({
    status: 'synced',
    message,
    lastSyncedAt: new Date().toISOString(),
    conflictRemote: null,
  })
}

/** The key lives in IndexedDB; without it there is nothing this engine can do. */
async function requireSecrets(): Promise<SyncSecrets | null> {
  const secrets = await loadSecrets()
  if (secrets === null) setError(NEEDS_PASSPHRASE)
  return secrets
}

async function push(config: SyncConfig, secrets: SyncSecrets, baseRevision: number): Promise<void> {
  const cipher = await encryptJson(secrets.key, useStore.getState().data, {
    salt: config.salt,
    iterations: config.iterations,
  })
  const envelope: SyncEnvelope = {
    v: SYNC_WIRE_VERSION,
    updatedAt: new Date().toISOString(),
    deviceId: config.deviceId,
    deviceName: config.deviceName,
    cipher,
  }
  const result = await putState(config.endpoint, secrets.authToken, baseRevision, envelope)
  if (result.ok) {
    patchConfig({ dirty: false, lastRevision: result.value.revision })
    succeed(`Uploaded — revision ${result.value.revision}.`)
    return
  }
  if (result.kind === 'conflict') {
    useSyncStore.setState({
      status: 'conflict',
      conflictRemote: result.remote,
      message: 'Another device changed the cloud copy while this one had unsaved changes.',
    })
    return
  }
  fail(result)
}

/** The stored key only opens envelopes made with the same salt and cost. */
function keyFits(cipher: Cipher, config: SyncConfig): boolean {
  return cipher.salt === config.salt && cipher.iterations === config.iterations
}

async function pull(config: SyncConfig, secrets: SyncSecrets): Promise<void> {
  const result = await getState(config.endpoint, secrets.authToken)
  if (!result.ok) return fail(result)

  const { cipher } = result.value.envelope
  // Distinguish "a different setup wrote this" from "wrong passphrase": both would
  // otherwise surface as an opaque decrypt failure.
  if (!keyFits(cipher, config)) return setError(SALT_MISMATCH)

  let plain: unknown
  try {
    plain = await decryptJson(secrets.key, cipher)
  } catch {
    return setError(WRONG_PASSPHRASE)
  }

  // The cloud copy is untrusted input, exactly like an imported file: a document
  // from a newer schema is refused (never downgraded), and a malformed one never lands.
  const migrated = migrateToCurrent(plain)
  if (!migrated.ok) return setError(migrated.error)

  applyingRemote = true
  try {
    // `replaceData` writes the one-slot backup first, so a surprising pull is undoable.
    useStore.getState().replaceData(migrated.state, 'cloud-pull')
  } finally {
    applyingRemote = false
  }
  patchConfig({ dirty: false, lastRevision: result.value.revision })
  succeed(`Downloaded — revision ${result.value.revision}.`)
}

/**
 * Fetch the current revision, then write over it. This is the deliberate
 * "my copy wins" path: conflict resolution and resuming after a reset.
 */
async function forcePush(config: SyncConfig, secrets: SyncSecrets): Promise<void> {
  const meta = await getMeta(config.endpoint, secrets.authToken)
  if (!meta.ok && meta.kind !== 'notfound') return fail(meta)
  await push(config, secrets, meta.ok ? meta.value.revision : 0)
}

/** Run one full sync cycle. Safe to call at any time; overlapping calls collapse. */
export async function syncNow(): Promise<void> {
  const config = useSyncStore.getState().config
  if (config === null || config.pausedReason !== null || running) return
  running = true
  useSyncStore.setState({ status: 'syncing', message: null })
  try {
    const secrets = await requireSecrets()
    if (secrets === null) return

    const meta = await getMeta(config.endpoint, secrets.authToken)
    if (!meta.ok && meta.kind !== 'notfound') return fail(meta)
    const remote = meta.ok ? meta.value : null

    switch (decideSync({ dirty: config.dirty, lastRevision: config.lastRevision, remote })) {
      case 'idle':
        useSyncStore.setState({
          status: 'synced',
          message: null,
          conflictRemote: null,
          lastSyncedAt: new Date().toISOString(),
        })
        return
      case 'first-push':
        return await push(config, secrets, 0)
      case 'push':
        return await push(config, secrets, config.lastRevision)
      case 'pull':
        return await pull(config, secrets)
      case 'conflict':
        useSyncStore.setState({
          status: 'conflict',
          conflictRemote: remote,
          message: 'Both this device and the cloud changed since the last sync.',
        })
        return
    }
  } finally {
    running = false
  }
}

export type ConflictChoice = 'keep-local' | 'take-remote'

export async function resolveConflict(choice: ConflictChoice): Promise<void> {
  const config = useSyncStore.getState().config
  if (config === null || running) return
  running = true
  useSyncStore.setState({ status: 'syncing', message: null })
  try {
    const secrets = await requireSecrets()
    if (secrets === null) return
    if (choice === 'keep-local') await forcePush(config, secrets)
    else await pull(config, secrets)
  } finally {
    running = false
  }
}

export interface EnableInput {
  endpoint: string
  passphrase: string
  deviceName: string
}

export type EnableResult = { ok: true; token: string } | { ok: false; error: string }

/**
 * Turn sync on for this device.
 *
 * If the cloud already holds a copy we **adopt its salt** rather than minting a new
 * one, so the key derived here opens that envelope: without this a second device
 * would encrypt correctly but never be able to read what the first one wrote. When
 * the endpoint is unreachable (or the token is not set on the Worker yet, which is
 * the normal first-run state) a fresh salt is used instead — a later pull of a
 * foreign envelope reports `SALT_MISMATCH` rather than failing obscurely.
 *
 * Whether the first cycle seeds the cloud or adopts it comes down to `hasUserData`:
 * a fresh second device must pull, not be told it conflicts with the data it is
 * trying to fetch.
 *
 * @returns the derived `SYNC_TOKEN` for the user to set on their Worker.
 */
export async function enableSync(input: EnableInput): Promise<EnableResult> {
  const endpoint = normalizeEndpoint(input.endpoint)
  if (endpoint === null) {
    return { ok: false, error: 'Enter an https:// endpoint (http:// is allowed for localhost).' }
  }
  if (input.passphrase.length < MIN_PASSPHRASE_LENGTH) {
    return {
      ok: false,
      error: `The passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters — it is the encryption key.`,
    }
  }

  const authToken = await deriveAuthToken(input.passphrase)
  let salt = toBase64(randomBytes(SALT_BYTES))
  let iterations = PBKDF2_ITERATIONS

  const meta = await getMeta(endpoint, authToken)
  if (meta.ok) {
    const remote = await getState(endpoint, authToken)
    if (remote.ok) {
      salt = remote.value.envelope.cipher.salt
      iterations = remote.value.envelope.cipher.iterations
    }
  }

  const key = await deriveKey(input.passphrase, fromBase64(salt), iterations)
  if (!(await saveSecrets({ key, authToken }))) {
    return {
      ok: false,
      error: 'This browser refused to store the sync key (private mode?). Sync stays off.',
    }
  }

  const config: SyncConfig = {
    endpoint,
    salt,
    iterations,
    deviceId: crypto.randomUUID(),
    deviceName: input.deviceName.trim() === '' ? 'This device' : input.deviceName.trim(),
    lastRevision: 0,
    dirty: hasUserData(useStore.getState().data),
    pausedReason: null,
  }
  saveSyncConfig(config)
  useSyncStore.setState({ config, status: 'idle', message: null, conflictRemote: null })
  return { ok: true, token: authToken }
}

/** Forget this device's key and config, optionally removing the cloud copy first. */
export async function disableSync(deleteRemote = false): Promise<void> {
  const config = useSyncStore.getState().config
  cancelPush()
  if (config !== null && deleteRemote) {
    const secrets = await loadSecrets()
    if (secrets !== null) await deleteState(config.endpoint, secrets.authToken)
  }
  await clearSecrets()
  clearSyncConfig()
  useSyncStore.setState({
    config: null,
    status: 'disabled',
    message: null,
    lastSyncedAt: null,
    conflictRemote: null,
  })
}

export function pauseSync(): void {
  cancelPush()
  if (patchConfig({ pausedReason: 'manual' }) !== null) {
    useSyncStore.setState({ status: 'paused', message: 'Sync paused on this device.' })
  }
}

export function resumeSync(): void {
  if (patchConfig({ pausedReason: null }) !== null) void syncNow()
}

/**
 * Resuming after a reset is the one moment the app refuses to guess: the local
 * document is empty by design, so pushing and pulling are both plausible and only
 * one is recoverable from the other.
 */
export async function resumeAfterReset(choice: 'upload-empty' | 'restore-cloud'): Promise<void> {
  const config = useSyncStore.getState().config
  if (config === null || running) return
  const resumed = patchConfig({ pausedReason: null, dirty: choice === 'upload-empty' })
  if (resumed === null) return
  running = true
  useSyncStore.setState({ status: 'syncing', message: null })
  try {
    const secrets = await requireSecrets()
    if (secrets === null) return
    // Both branches bypass `decideSync` deliberately. After a reset this device is
    // still *in step* with the cloud (`lastRevision` never moved), so the decision
    // core would answer `idle` and neither restoring nor uploading would happen.
    // The user has already told us which copy wins.
    if (choice === 'restore-cloud') await pull(resumed, secrets)
    else await forcePush(resumed, secrets)
  } finally {
    running = false
  }
}

/**
 * Wire the store to the cloud. Mirrors `attachPersistence()` and is likewise called
 * once at boot; returns a detach for tests.
 */
export function attachSync(): () => void {
  const config = loadSyncConfig()
  if (config !== null) {
    useSyncStore.setState({
      config,
      status: config.pausedReason === null ? 'idle' : 'paused',
      message:
        config.pausedReason === 'after-reset'
          ? 'Sync paused after a reset — choose which copy to keep.'
          : null,
    })
  }

  const unsubscribe = useStore.subscribe((state, prev) => {
    if (state.data === prev.data || applyingRemote) return
    if (useSyncStore.getState().config === null) return
    // `dirty` is persisted, so a tab closed before the debounce still pushes next open.
    patchConfig({ dirty: true })
    schedulePush()
  })

  setResetListener(() => {
    if (useSyncStore.getState().config === null) return
    cancelPush()
    patchConfig({ pausedReason: 'after-reset', dirty: true })
    useSyncStore.setState({
      status: 'paused',
      message: 'Sync paused after a reset — choose which copy to keep.',
    })
  })

  if (config !== null && config.pausedReason === null) void syncNow()

  return () => {
    unsubscribe()
    setResetListener(null)
    cancelPush()
  }
}
