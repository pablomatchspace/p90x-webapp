import { create } from 'zustand'
import { migrateToCurrent } from '@/lib/migrations'
import {
  decideSync,
  hasUserData,
  MIN_PASSPHRASE_LENGTH,
  normalizeEndpoint,
  SYNC_WIRE_VERSION,
  type RemoteMeta,
  type SyncEnvelope,
} from '@/lib/sync'
import {
  decryptJson,
  deriveAuthToken,
  encryptJson,
  fromBase64,
  randomBytes,
  toBase64,
} from '@/lib/syncCrypto'
import {
  clearSyncConfig,
  loadSyncConfig,
  saveSyncConfig,
  type SyncConfig,
} from '@/state/syncConfig'
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

function succeed(message: string) {
  useSyncStore.setState({
    status: 'synced',
    message,
    lastSyncedAt: new Date().toISOString(),
    conflictRemote: null,
  })
}

async function encryptCurrentState(config: SyncConfig): Promise<SyncEnvelope> {
  const cipher = await encryptJson(useStore.getState().data, config.passphrase, {
    salt: fromBase64(config.salt),
  })
  return {
    v: SYNC_WIRE_VERSION,
    updatedAt: new Date().toISOString(),
    deviceId: config.deviceId,
    deviceName: config.deviceName,
    cipher,
  }
}

async function push(config: SyncConfig, token: string, baseRevision: number): Promise<void> {
  const envelope = await encryptCurrentState(config)
  const result = await putState(config.endpoint, token, baseRevision, envelope)
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

async function pull(config: SyncConfig, token: string): Promise<void> {
  const result = await getState(config.endpoint, token)
  if (!result.ok) return fail(result)

  let plain: unknown
  try {
    plain = await decryptJson(result.value.envelope.cipher, config.passphrase)
  } catch {
    useSyncStore.setState({
      status: 'error',
      message:
        'Could not decrypt the cloud copy. Is the passphrase exactly the same as on the other device?',
    })
    return
  }

  // The cloud copy is untrusted input, exactly like an imported file: a document
  // from a newer schema is refused (never downgraded), and a malformed one never lands.
  const migrated = migrateToCurrent(plain)
  if (!migrated.ok) {
    useSyncStore.setState({ status: 'error', message: migrated.error })
    return
  }

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
async function forcePush(config: SyncConfig, token: string): Promise<void> {
  const meta = await getMeta(config.endpoint, token)
  if (!meta.ok && meta.kind !== 'notfound') return fail(meta)
  await push(config, token, meta.ok ? meta.value.revision : 0)
}

/** Run one full sync cycle. Safe to call at any time; overlapping calls collapse. */
export async function syncNow(): Promise<void> {
  const config = useSyncStore.getState().config
  if (config === null || config.pausedReason !== null || running) return
  running = true
  useSyncStore.setState({ status: 'syncing', message: null })
  try {
    const token = await deriveAuthToken(config.passphrase)
    const meta = await getMeta(config.endpoint, token)
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
        return await push(config, token, 0)
      case 'push':
        return await push(config, token, config.lastRevision)
      case 'pull':
        return await pull(config, token)
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
    const token = await deriveAuthToken(config.passphrase)
    if (choice === 'keep-local') await forcePush(config, token)
    else await pull(config, token)
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
 * Turn sync on for this device. Whether the first cycle seeds the cloud or adopts
 * it comes down to `hasUserData`: a fresh second device must pull, not be told it
 * conflicts with the data it is trying to fetch.
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
  const config: SyncConfig = {
    endpoint,
    passphrase: input.passphrase,
    salt: toBase64(randomBytes(16)),
    deviceId: crypto.randomUUID(),
    deviceName: input.deviceName.trim() === '' ? 'This device' : input.deviceName.trim(),
    lastRevision: 0,
    dirty: hasUserData(useStore.getState().data),
    pausedReason: null,
  }
  saveSyncConfig(config)
  useSyncStore.setState({ config, status: 'idle', message: null, conflictRemote: null })
  return { ok: true, token: await deriveAuthToken(config.passphrase) }
}

/** Forget the config on this device, optionally removing the cloud copy first. */
export async function disableSync(deleteRemote = false): Promise<void> {
  const config = useSyncStore.getState().config
  cancelPush()
  if (config !== null && deleteRemote) {
    const token = await deriveAuthToken(config.passphrase)
    await deleteState(config.endpoint, token)
  }
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
  if (choice === 'restore-cloud') {
    const resumed = patchConfig({ pausedReason: null, dirty: false })
    if (resumed !== null) await syncNow()
    return
  }
  const resumed = patchConfig({ pausedReason: null, dirty: true })
  if (resumed === null) return
  running = true
  useSyncStore.setState({ status: 'syncing', message: null })
  try {
    await forcePush(resumed, await deriveAuthToken(resumed.passphrase))
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
