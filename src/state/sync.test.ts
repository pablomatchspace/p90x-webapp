// @vitest-environment jsdom
import { webcrypto } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyState, type AppState } from '@/lib/schema'
import type { SyncEnvelope } from '@/lib/sync'
import { encryptJson } from '@/lib/syncCrypto'
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

const ENDPOINT = 'https://sync.test'
const PASSPHRASE = 'a good passphrase'
/** Remote fixtures encrypt cheaply; `iterations` travels in the envelope so this is honest. */
const FAST = { iterations: 1000 }

type Route = (init: RequestInit) => Response | Promise<Response>
let routes: Record<string, Route>
let putBodies: { baseRevision: number; envelope: SyncEnvelope }[]

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

function route(key: string, handler: Route) {
  routes[key] = handler
}

async function remoteEnvelope(state: AppState, passphrase = PASSPHRASE): Promise<SyncEnvelope> {
  return {
    v: 1,
    updatedAt: '2026-07-10T10:00:00.000Z',
    deviceId: 'other-device',
    deviceName: 'Phone',
    cipher: await encryptJson(state, passphrase, FAST),
  }
}

/** Enable sync, then force the config into a known revision/dirty state. */
async function enable(overrides: Partial<SyncConfig> = {}): Promise<SyncConfig> {
  const result = await enableSync({
    endpoint: ENDPOINT,
    passphrase: PASSPHRASE,
    deviceName: 'Desktop',
  })
  if (!result.ok) throw new Error(result.error)
  const config = { ...useSyncStore.getState().config!, ...overrides }
  saveSyncConfig(config)
  useSyncStore.setState({ config })
  return config
}

beforeEach(() => {
  localStorage.clear()
  routes = {}
  putBodies = []
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
    ).toEqual({
      ok: false,
      error: expect.stringContaining('https://'),
    })
    expect(await enableSync({ endpoint: ENDPOINT, passphrase: 'short', deviceName: '' })).toEqual({
      ok: false,
      error: expect.stringContaining('at least 8'),
    })
  })

  it('returns the derived token and persists the config', async () => {
    const result = await enableSync({
      endpoint: `${ENDPOINT}/`,
      passphrase: PASSPHRASE,
      deviceName: '  ',
    })
    expect(result).toEqual({ ok: true, token: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/) })
    const config = loadSyncConfig()!
    expect(config.endpoint).toBe(ENDPOINT)
    expect(config.deviceName).toBe('This device')
  })

  it('marks a document with data dirty (it seeds the cloud)', async () => {
    useStore.getState().mutate((d) => {
      d.settings.startDate = '2026-01-05'
    })
    await enableSync({ endpoint: ENDPOINT, passphrase: PASSPHRASE, deviceName: 'Desktop' })
    expect(useSyncStore.getState().config?.dirty).toBe(true)
  })

  it('leaves a fresh document clean (it adopts the cloud)', async () => {
    await enableSync({ endpoint: ENDPOINT, passphrase: PASSPHRASE, deviceName: 'Desktop' })
    expect(useSyncStore.getState().config?.dirty).toBe(false)
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
    const future = { ...emptyState(), schemaVersion: 99 }
    route('GET /v1/meta', () => json({ revision: 2, updatedAt: 'now' }))
    route('GET /v1/state', async () =>
      json({
        revision: 2,
        envelope: {
          ...(await remoteEnvelope(emptyState())),
          cipher: await encryptJson(future, PASSPHRASE, FAST),
        },
      }),
    )

    await syncNow()

    expect(useSyncStore.getState().status).toBe('error')
    expect(useSyncStore.getState().message).toContain('newer app version')
    expect(useStore.getState().data.schemaVersion).toBe(1)
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

  it('resuming with "restore cloud" pulls the cloud copy back', async () => {
    const remote = emptyState()
    remote.notes = 'survived the reset'
    await enable({ lastRevision: 3, dirty: true, pausedReason: 'after-reset' })
    route('GET /v1/meta', () => json({ revision: 4, updatedAt: 'now' }))
    route('GET /v1/state', async () =>
      json({ revision: 4, envelope: await remoteEnvelope(remote) }),
    )

    await resumeAfterReset('restore-cloud')

    expect(useStore.getState().data.notes).toBe('survived the reset')
    expect(loadSyncConfig()?.pausedReason).toBeNull()
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

  it('disable forgets the config and leaves the cloud copy alone', async () => {
    await enable()
    await disableSync(false)
    expect(loadSyncConfig()).toBeNull()
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
  })

  it('disable still forgets the config when the endpoint is unreachable', async () => {
    await enable()
    await disableSync(true) // no DELETE route → network error
    expect(loadSyncConfig()).toBeNull()
    expect(useSyncStore.getState().status).toBe('disabled')
  })
})
