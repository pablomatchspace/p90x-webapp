// @vitest-environment jsdom
import { webcrypto } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyState, SCHEMA_VERSION, type AppState } from '@/lib/schema'
import type { SyncEnvelope } from '@/lib/sync'
import { deriveKey, encryptJson, fromBase64 } from '@/lib/syncCrypto'
import {
  attachSync,
  disableSync,
  enableSync,
  pauseSync,
  resolveConflict,
  resumeAfterReset,
  syncNow,
  useSyncStore,
} from '@/state/sync'
import { loadSyncConfig, saveSyncConfig, type SyncConfig } from '@/state/syncConfig'
import type { SyncSecrets } from '@/state/syncSecrets'
import { readBackup } from '@/state/persist'
import { useStore } from '@/state/store'

// jsdom ships no WebCrypto subtle implementation; the app only ever runs where one exists.
if (globalThis.crypto?.subtle === undefined) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })
}

// Real AES-GCM and real PBKDF2 — just not 600k rounds. This suite is about sync
// decisions, and a full-cost derivation per push would burn seconds of CPU and
// starve the parallel property-based suites. syncCrypto.test.ts pins the shipped cost.
vi.mock('@/lib/syncCrypto', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/syncCrypto')>()),
  PBKDF2_ITERATIONS: 1000,
}))

// jsdom has no IndexedDB. The real store is exercised by the e2e specs in a browser.
const secrets = vi.hoisted(() => ({ current: null as unknown }))
vi.mock('@/state/syncSecrets', () => ({
  loadSecrets: async () => secrets.current,
  saveSecrets: async (value: unknown) => {
    secrets.current = value
    return true
  },
  clearSecrets: async () => {
    secrets.current = null
  },
}))

const ENDPOINT = 'https://sync.test'
const PASSPHRASE = 'a good passphrase'
const ITERATIONS = 1000

type Route = (init: RequestInit) => Response | Promise<Response>
let routes: Record<string, Route>
let putBodies: { baseRevision: number; envelope: SyncEnvelope }[]

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

function route(key: string, handler: Route) {
  routes[key] = handler
}

const config = () => useSyncStore.getState().config!
const storedSecrets = () => secrets.current as SyncSecrets

/** Build an envelope the current device can actually decrypt (same salt and cost). */
async function remoteEnvelope(state: AppState, passphrase = PASSPHRASE): Promise<SyncEnvelope> {
  const { salt, iterations } = config()
  const key = await deriveKey(passphrase, fromBase64(salt), iterations)
  return {
    v: 1,
    updatedAt: '2026-07-10T10:00:00.000Z',
    deviceId: 'other-device',
    deviceName: 'Phone',
    cipher: await encryptJson(key, state, { salt, iterations }),
  }
}

/**
 * Enable sync (offline: no routes ⇒ a fresh salt), then force a known
 * revision/dirty state. `enableSync` probes the endpoint to adopt an existing
 * salt, so the fetch mock is reset afterwards — assertions here are about what the
 * engine does *next*, not about setting it up.
 */
async function enable(overrides: Partial<SyncConfig> = {}): Promise<SyncConfig> {
  const result = await enableSync({
    endpoint: ENDPOINT,
    passphrase: PASSPHRASE,
    deviceName: 'Desktop',
  })
  if (!result.ok) throw new Error(result.error)
  const next = { ...config(), ...overrides }
  saveSyncConfig(next)
  useSyncStore.setState({ config: next })
  vi.mocked(fetch).mockClear()
  return next
}

beforeEach(() => {
  localStorage.clear()
  routes = {}
  putBodies = []
  secrets.current = null
  useStore.setState({ data: emptyState(), bootIssue: 'none', storageFailing: false })
  useSyncStore.setState({
    config: null,
    status: 'disabled',
    message: null,
    lastSyncedAt: null,
    conflictRemote: null,
  })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const url = new URL(String(input))
      const handler = routes[`${init.method ?? 'GET'} ${url.pathname}`]
      if (handler === undefined) throw new TypeError('fetch failed')
      if (init.method === 'PUT') putBodies.push(JSON.parse(String(init.body)))
      return handler(init)
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('disabled by default', () => {
  it('attaches without a config, makes no network call, and stays disabled', () => {
    const detach = attachSync()
    expect(fetch).not.toHaveBeenCalled()
    expect(useSyncStore.getState().status).toBe('disabled')
    detach()
  })

  it('still makes no network call when the document is edited', () => {
    const detach = attachSync()
    useStore.getState().mutate((d) => {
      d.notes = 'edited'
    })
    expect(fetch).not.toHaveBeenCalled()
    detach()
  })
})

describe('enableSync', () => {
  it('rejects a non-https endpoint and a short passphrase', async () => {
    expect(
      await enableSync({ endpoint: 'http://evil.test', passphrase: PASSPHRASE, deviceName: '' }),
    ).toEqual({ ok: false, error: expect.stringContaining('https://') })
    expect(await enableSync({ endpoint: ENDPOINT, passphrase: 'short', deviceName: '' })).toEqual({
      ok: false,
      error: expect.stringContaining('at least 8'),
    })
  })

  it('returns the derived token, and stores it beside a non-extractable key', async () => {
    const result = await enableSync({
      endpoint: `${ENDPOINT}/`,
      passphrase: PASSPHRASE,
      deviceName: '  ',
    })
    expect(result).toEqual({ ok: true, token: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/) })
    expect(storedSecrets().authToken).toBe(result.ok && result.token)
    expect(storedSecrets().key.extractable).toBe(false)
    expect(loadSyncConfig()).toMatchObject({ endpoint: ENDPOINT, deviceName: 'This device' })
  })

  it('never writes the passphrase to localStorage', async () => {
    await enable()
    expect(JSON.stringify(localStorage)).not.toContain(PASSPHRASE)
  })

  it('adopts the salt of an existing cloud copy, so it can decrypt what is already there', async () => {
    // Pretend another device pushed first, with its own salt.
    const foreignSalt = 'Zm9yZWlnbi1zYWx0LTAwMA=='
    const key = await deriveKey(PASSPHRASE, fromBase64(foreignSalt), ITERATIONS)
    const remote = emptyState()
    remote.notes = 'written elsewhere'
    const envelope = {
      v: 1,
      updatedAt: 'x',
      deviceId: 'other',
      deviceName: 'Phone',
      cipher: await encryptJson(key, remote, { salt: foreignSalt, iterations: ITERATIONS }),
    }
    route('GET /v1/meta', () => json({ revision: 1, updatedAt: 'x' }))
    route('GET /v1/state', () => json({ revision: 1, envelope }))

    await enableSync({ endpoint: ENDPOINT, passphrase: PASSPHRASE, deviceName: 'Laptop' })
    expect(config().salt).toBe(foreignSalt)

    // …and the very next sync can read it.
    await syncNow()
    expect(useStore.getState().data.notes).toBe('written elsewhere')
  })

  it('falls back to a fresh salt when the endpoint is unreachable (the normal first run)', async () => {
    await enableSync({ endpoint: ENDPOINT, passphrase: PASSPHRASE, deviceName: 'Desktop' })
    expect(config().salt).toMatch(/^[A-Za-z0-9+/=]{24}$/)
    expect(config().iterations).toBe(1000) // the mocked production constant
  })

  it('refuses to adopt out-of-bounds KDF iterations — no silent downgrade, no stall', async () => {
    const envelope = {
      v: 1,
      updatedAt: 'x',
      deviceId: 'other',
      deviceName: 'Phone',
      cipher: { salt: 'c2FsdA==', iv: 'aXY=', iterations: 500, data: 'ZGF0YQ==' },
    }
    route('GET /v1/meta', () => json({ revision: 1, updatedAt: 'x' }))
    route('GET /v1/state', () => json({ revision: 1, envelope }))

    const low = await enableSync({ endpoint: ENDPOINT, passphrase: PASSPHRASE, deviceName: 'D' })
    expect(low).toEqual({ ok: false, error: expect.stringContaining('unsupported encryption') })

    envelope.cipher.iterations = 99_999_999
    const high = await enableSync({ endpoint: ENDPOINT, passphrase: PASSPHRASE, deviceName: 'D' })
    expect(high).toEqual({ ok: false, error: expect.stringContaining('unsupported encryption') })
    expect(loadSyncConfig()).toBeNull()
  })

  it('a malformed envelope at enable falls back to a fresh salt instead of crashing', async () => {
    route('GET /v1/meta', () => json({ revision: 1, updatedAt: 'x' }))
    route('GET /v1/state', () =>
      json({
        revision: 1,
        envelope: {
          v: 1,
          updatedAt: 'x',
          deviceId: 'other',
          deviceName: 'Phone',
          cipher: { salt: '!!!', iv: 'aXY=', iterations: 1000, data: 'ZGF0YQ==' },
        },
      }),
    )
    const result = await enableSync({ endpoint: ENDPOINT, passphrase: PASSPHRASE, deviceName: 'D' })
    expect(result.ok).toBe(true)
    expect(config().salt).not.toBe('!!!')
  })

  it('marks a document with data dirty (it seeds the cloud)', async () => {
    useStore.getState().mutate((d) => {
      d.settings.startDate = '2026-01-05'
    })
    await enableSync({ endpoint: ENDPOINT, passphrase: PASSPHRASE, deviceName: 'Desktop' })
    expect(config().dirty).toBe(true)
  })

  it('leaves a fresh document clean (it adopts the cloud)', async () => {
    await enableSync({ endpoint: ENDPOINT, passphrase: PASSPHRASE, deviceName: 'Desktop' })
    expect(config().dirty).toBe(false)
  })
})

describe('first push', () => {
  it('uploads an encrypted envelope at baseRevision 0 and records the revision', async () => {
    useStore.getState().mutate((d) => {
      d.notes = 'squats'
    })
    await enable()
    route('GET /v1/meta', () => json({ error: 'empty' }, 404))
    route('PUT /v1/state', () => json({ revision: 1, updatedAt: 'now' }))

    await syncNow()

    expect(putBodies).toHaveLength(1)
    expect(putBodies[0].baseRevision).toBe(0)
    // The plaintext never leaves the device.
    expect(JSON.stringify(putBodies[0].envelope)).not.toContain('squats')
    expect(putBodies[0].envelope.cipher.data.length).toBeGreaterThan(0)
    expect(useSyncStore.getState().status).toBe('synced')
    expect(loadSyncConfig()).toMatchObject({ dirty: false, lastRevision: 1 })
  })
})

describe('pull', () => {
  it('decrypts, backs up the outgoing document, and applies the cloud copy', async () => {
    const remote = emptyState()
    remote.settings.startDate = '2026-01-05'
    remote.notes = 'from the phone'

    useStore.getState().mutate((d) => {
      d.notes = 'local, about to be replaced'
    })
    await enable({ lastRevision: 1, dirty: false })
    route('GET /v1/meta', () => json({ revision: 2, updatedAt: 'now' }))
    route('GET /v1/state', async () =>
      json({ revision: 2, envelope: await remoteEnvelope(remote) }),
    )

    await syncNow()

    expect(useStore.getState().data.notes).toBe('from the phone')
    expect(useStore.getState().data.settings.startDate).toBe('2026-01-05')
    expect(readBackup()?.reason).toBe('cloud-pull')
    expect(readBackup()?.state.notes).toBe('local, about to be replaced')
    expect(loadSyncConfig()).toMatchObject({ dirty: false, lastRevision: 2 })
    expect(useSyncStore.getState().status).toBe('synced')
  })

  it('does not mark the document dirty — a pull must not bounce straight back', async () => {
    const detach = attachSync()
    await enable({ lastRevision: 1, dirty: false })
    route('GET /v1/meta', () => json({ revision: 2, updatedAt: 'now' }))
    route('GET /v1/state', async () =>
      json({ revision: 2, envelope: await remoteEnvelope(emptyState()) }),
    )

    await syncNow()

    expect(loadSyncConfig()?.dirty).toBe(false)
    detach()
  })

  it('names the real cause when the cloud copy came from a different setup', async () => {
    useStore.getState().mutate((d) => {
      d.notes = 'precious'
    })
    await enable({ lastRevision: 1, dirty: false })
    const envelope = await remoteEnvelope(emptyState())
    route('GET /v1/meta', () => json({ revision: 2, updatedAt: 'now' }))
    route('GET /v1/state', () =>
      json({
        revision: 2,
        envelope: { ...envelope, cipher: { ...envelope.cipher, salt: 'ZGlmZmVyZW50LXNhbHQ=' } },
      }),
    )

    await syncNow()

    expect(useStore.getState().data.notes).toBe('precious')
    expect(useSyncStore.getState().message).toContain('different passphrase')
  })

  it('refuses an envelope it cannot decrypt and leaves local data alone', async () => {
    useStore.getState().mutate((d) => {
      d.notes = 'precious'
    })
    await enable({ lastRevision: 1, dirty: false })
    route('GET /v1/meta', () => json({ revision: 2, updatedAt: 'now' }))
    route('GET /v1/state', async () =>
      json({ revision: 2, envelope: await remoteEnvelope(emptyState(), 'a different passphrase') }),
    )

    await syncNow()

    expect(useStore.getState().data.notes).toBe('precious')
    expect(useSyncStore.getState().status).toBe('error')
    expect(useSyncStore.getState().message).toContain('passphrase')
  })

  it('refuses a document from a newer schema and says to update the app', async () => {
    await enable({ lastRevision: 1, dirty: false })
    const future = { ...emptyState(), schemaVersion: 99 } as unknown as AppState
    route('GET /v1/meta', () => json({ revision: 2, updatedAt: 'now' }))
    route('GET /v1/state', async () =>
      json({ revision: 2, envelope: await remoteEnvelope(future) }),
    )

    await syncNow()

    expect(useSyncStore.getState().status).toBe('error')
    expect(useSyncStore.getState().message).toContain('newer app version')
    expect(useStore.getState().data.schemaVersion).toBe(SCHEMA_VERSION)
  })

  it('refuses an envelope whose wire format it does not understand', async () => {
    await enable({ lastRevision: 1, dirty: false })
    route('GET /v1/meta', () => json({ revision: 2, updatedAt: 'now' }))
    route('GET /v1/state', () => json({ revision: 2, envelope: { v: 99 } }))

    await syncNow()

    expect(useSyncStore.getState().status).toBe('error')
    expect(useSyncStore.getState().message).toContain('Update the app')
  })
})

describe('missing key', () => {
  it('asks for the passphrase again rather than failing obscurely', async () => {
    await enable({ dirty: true })
    secrets.current = null // site data cleared, or a different browser profile
    route('GET /v1/meta', () => json({ revision: 1, updatedAt: 'now' }))

    await syncNow()

    expect(useSyncStore.getState().status).toBe('error')
    expect(useSyncStore.getState().message).toContain('re-enter your passphrase')
    expect(putBodies).toHaveLength(0)
  })
})

describe('mid-flight edits (the lost-update race)', () => {
  it('an edit made while a push is in flight stays dirty and is pushed afterwards', async () => {
    useStore.getState().mutate((d) => {
      d.notes = 'first'
    })
    const detach = attachSync()
    await enable({ lastRevision: 0, dirty: true })

    let resolvePut: ((response: Response) => void) | null = null
    let revision = 0
    route('GET /v1/meta', () =>
      revision === 0 ? json({ error: 'empty' }, 404) : json({ revision, updatedAt: 'x' }),
    )
    route('PUT /v1/state', () => {
      if (resolvePut === null) {
        // First PUT: hold the response so an edit can land mid-flight.
        return new Promise<Response>((res) => {
          resolvePut = res
        })
      }
      revision = 2
      return json({ revision: 2, updatedAt: 'x' })
    })

    const cycle = syncNow()
    await vi.waitFor(() => expect(putBodies).toHaveLength(1))
    useStore.getState().mutate((d) => {
      d.notes = 'second — landed during the flight'
    })
    revision = 1
    resolvePut!(json({ revision: 1, updatedAt: 'x' }))
    await cycle

    // The interim edit must NOT have been marked clean by the completed upload.
    expect(loadSyncConfig()).toMatchObject({ dirty: true, lastRevision: 1 })

    // The next cycle carries it up, based on the revision the first one earned.
    await syncNow()
    expect(putBodies).toHaveLength(2)
    expect(putBodies[1].baseRevision).toBe(1)
    expect(loadSyncConfig()).toMatchObject({ dirty: false, lastRevision: 2 })
    detach()
  })
})

describe('stale cycles (the generation fence)', () => {
  it('a cycle resolving after disable changes nothing', async () => {
    useStore.getState().mutate((d) => {
      d.notes = 'data'
    })
    await enable({ lastRevision: 0, dirty: true })
    let resolvePut: (response: Response) => void
    route('GET /v1/meta', () => json({ error: 'empty' }, 404))
    route(
      'PUT /v1/state',
      () =>
        new Promise<Response>((res) => {
          resolvePut = res
        }),
    )

    const cycle = syncNow()
    await vi.waitFor(() => expect(putBodies).toHaveLength(1))
    await disableSync(false)
    resolvePut!(json({ revision: 1, updatedAt: 'x' }))
    await cycle

    expect(useSyncStore.getState().status).toBe('disabled')
    expect(useSyncStore.getState().config).toBeNull()
    expect(loadSyncConfig()).toBeNull()
  })
})

describe('unexpected failures', () => {
  it('end as an error status, never a stuck "Syncing…"', async () => {
    await enable({ dirty: true })
    // A tampered IndexedDB record: present, but not a usable CryptoKey.
    secrets.current = { key: 'not a key' as unknown as CryptoKey, authToken: 'a'.repeat(43) }
    route('GET /v1/meta', () => json({ error: 'empty' }, 404))

    await syncNow()

    expect(useSyncStore.getState().status).toBe('error')
    expect(useSyncStore.getState().message).toContain('Sync failed unexpectedly')
  })
})

describe('idle', () => {
  it('does nothing when in step and clean', async () => {
    await enable({ lastRevision: 4, dirty: false })
    route('GET /v1/meta', () => json({ revision: 4, updatedAt: 'now' }))

    await syncNow()

    expect(putBodies).toHaveLength(0)
    expect(useSyncStore.getState().status).toBe('synced')
  })
})

describe('conflict', () => {
  beforeEach(() => {
    route('GET /v1/meta', () => json({ revision: 5, updatedAt: 'now' }))
  })

  it('is raised when both sides moved', async () => {
    await enable({ lastRevision: 4, dirty: true })
    await syncNow()
    expect(useSyncStore.getState().status).toBe('conflict')
    expect(useSyncStore.getState().conflictRemote?.revision).toBe(5)
    expect(putBodies).toHaveLength(0)
  })

  it('is raised when the server rejects a push it thought was in step', async () => {
    await enable({ lastRevision: 4, dirty: true })
    routes['GET /v1/meta'] = () => json({ revision: 4, updatedAt: 'now' })
    route('PUT /v1/state', () =>
      json({ error: 'revision conflict', revision: 9, updatedAt: 'now' }, 409),
    )

    await syncNow()

    expect(useSyncStore.getState().status).toBe('conflict')
    expect(useSyncStore.getState().conflictRemote?.revision).toBe(9)
  })

  it('"keep this device" force-pushes on top of the revision it was handed', async () => {
    await enable({ lastRevision: 4, dirty: true })
    await syncNow()
    route('PUT /v1/state', () => json({ revision: 6, updatedAt: 'now' }))

    await resolveConflict('keep-local')

    expect(putBodies.at(-1)?.baseRevision).toBe(5)
    expect(useSyncStore.getState().status).toBe('synced')
    expect(loadSyncConfig()).toMatchObject({ dirty: false, lastRevision: 6 })
  })

  it('"take cloud" pulls, keeping the replaced document in the backup slot', async () => {
    useStore.getState().mutate((d) => {
      d.notes = 'mine'
    })
    await enable({ lastRevision: 4, dirty: true })
    await syncNow()
    const remote = emptyState()
    remote.notes = 'theirs'
    route('GET /v1/state', async () =>
      json({ revision: 5, envelope: await remoteEnvelope(remote) }),
    )

    await resolveConflict('take-remote')

    expect(useStore.getState().data.notes).toBe('theirs')
    expect(readBackup()?.state.notes).toBe('mine')
    expect(useSyncStore.getState().status).toBe('synced')
  })
})

describe('failures degrade, never block', () => {
  it('an unreachable endpoint is offline, not an error', async () => {
    await enable({ dirty: true })
    await syncNow()
    expect(useSyncStore.getState().status).toBe('offline')
    expect(useSyncStore.getState().message).toContain('retry')
  })

  it('a rejected token is a clear, actionable error', async () => {
    await enable({ dirty: true })
    route('GET /v1/meta', () => json({ error: 'unauthorized' }, 401))
    await syncNow()
    expect(useSyncStore.getState().status).toBe('error')
    expect(useSyncStore.getState().message).toContain('SYNC_TOKEN')
  })

  it('a server error keeps the local document untouched', async () => {
    useStore.getState().mutate((d) => {
      d.notes = 'safe'
    })
    await enable({ dirty: true })
    route('GET /v1/meta', () => json({ error: 'boom' }, 500))
    await syncNow()
    expect(useSyncStore.getState().status).toBe('error')
    expect(useStore.getState().data.notes).toBe('safe')
  })
})

describe('debounced push', () => {
  it('collapses a burst of edits into one upload, after the document settles', async () => {
    vi.useFakeTimers()
    const detach = attachSync()
    await enable()
    route('GET /v1/meta', () => json({ revision: 0, updatedAt: 'now' }, 404))
    route('PUT /v1/state', () => json({ revision: 1, updatedAt: 'now' }))

    useStore.getState().mutate((d) => {
      d.notes = 'a'
    })
    useStore.getState().mutate((d) => {
      d.notes = 'ab'
    })
    expect(loadSyncConfig()?.dirty).toBe(true)
    expect(putBodies).toHaveLength(0)

    await vi.advanceTimersByTimeAsync(3000)
    await vi.waitFor(() => expect(putBodies).toHaveLength(1))
    detach()
  })

  it('persists the dirty flag so a tab closed before the debounce pushes on the next open', async () => {
    vi.useFakeTimers()
    const detach = attachSync()
    await enable()
    useStore.getState().mutate((d) => {
      d.notes = 'unsaved'
    })
    detach() // tab closed
    expect(loadSyncConfig()?.dirty).toBe(true)
  })
})

describe('reset', () => {
  it('pauses sync instead of pushing the empty document over the cloud copy', async () => {
    vi.useFakeTimers()
    const detach = attachSync()
    await enable({ lastRevision: 3, dirty: false })
    route('GET /v1/meta', () => json({ revision: 3, updatedAt: 'now' }))
    route('PUT /v1/state', () => json({ revision: 4, updatedAt: 'now' }))

    useStore.getState().resetAll()

    expect(useSyncStore.getState().status).toBe('paused')
    expect(loadSyncConfig()?.pausedReason).toBe('after-reset')

    await vi.advanceTimersByTimeAsync(5000)
    expect(putBodies).toHaveLength(0) // the scheduled push was cancelled
    detach()
  })

  it('a paused engine ignores syncNow', async () => {
    await enable({ pausedReason: 'after-reset', dirty: true })
    await syncNow()
    expect(fetch).not.toHaveBeenCalled()
  })

  // A reset leaves this device *in step* with the cloud (`lastRevision` never moved),
  // so `decideSync` would answer 'idle'. Restoring has to pull regardless.
  it('resuming with "restore cloud" pulls even though the revisions match', async () => {
    await enable({ lastRevision: 3, dirty: true, pausedReason: 'after-reset' })
    const remote = emptyState()
    remote.notes = 'survived the reset'
    route('GET /v1/meta', () => json({ revision: 3, updatedAt: 'now' }))
    route('GET /v1/state', async () =>
      json({ revision: 3, envelope: await remoteEnvelope(remote) }),
    )

    await resumeAfterReset('restore-cloud')

    expect(useStore.getState().data.notes).toBe('survived the reset')
    expect(loadSyncConfig()).toMatchObject({ pausedReason: null, dirty: false, lastRevision: 3 })
  })

  it('resuming without the key keeps the after-reset safety pause up', async () => {
    await enable({ lastRevision: 3, dirty: true, pausedReason: 'after-reset' })
    secrets.current = null

    await resumeAfterReset('restore-cloud')

    expect(loadSyncConfig()?.pausedReason).toBe('after-reset')
    expect(useSyncStore.getState().message).toContain('re-enter your passphrase')
  })

  it('resuming with "upload empty" force-pushes the cleared document', async () => {
    await enable({ lastRevision: 3, dirty: true, pausedReason: 'after-reset' })
    route('GET /v1/meta', () => json({ revision: 7, updatedAt: 'now' }))
    route('PUT /v1/state', () => json({ revision: 8, updatedAt: 'now' }))

    await resumeAfterReset('upload-empty')

    expect(putBodies.at(-1)?.baseRevision).toBe(7)
    expect(loadSyncConfig()).toMatchObject({ pausedReason: null, lastRevision: 8 })
  })
})

describe('pause and disable', () => {
  it('pause stops the engine but keeps the config', async () => {
    await enable()
    pauseSync()
    expect(useSyncStore.getState().status).toBe('paused')
    expect(loadSyncConfig()?.pausedReason).toBe('manual')
  })

  it('disable forgets the config and the key, and leaves the cloud copy alone', async () => {
    await enable()
    await disableSync(false)
    expect(loadSyncConfig()).toBeNull()
    expect(secrets.current).toBeNull()
    expect(useSyncStore.getState().status).toBe('disabled')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('disable-and-delete removes the cloud copy first', async () => {
    await enable()
    let deleted = false
    route('DELETE /v1/state', () => {
      deleted = true
      return json({ ok: true })
    })
    await disableSync(true)
    expect(deleted).toBe(true)
    expect(loadSyncConfig()).toBeNull()
    expect(secrets.current).toBeNull()
  })

  it('disable still forgets everything when the endpoint is unreachable', async () => {
    await enable()
    await disableSync(true) // no DELETE route → network error
    expect(loadSyncConfig()).toBeNull()
    expect(secrets.current).toBeNull()
    expect(useSyncStore.getState().status).toBe('disabled')
  })
})
