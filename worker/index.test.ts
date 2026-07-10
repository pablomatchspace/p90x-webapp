import { beforeEach, describe, expect, it } from 'vitest'
// The Worker is plain JS on purpose (paste-able into the Cloudflare dashboard);
// its JSDoc types are checked by `tsc` via allowJs/checkJs.
import { handleRequest } from './index.js'

/**
 * The Worker is exercised through its real HTTP contract against a fake KV, so the
 * compare-and-swap that protects against lost updates is covered by the `validate`
 * job with no extra toolchain (Node supplies Request/Response).
 */

interface Stored {
  value: string
  metadata: unknown
}

function fakeKv() {
  const store = new Map<string, Stored>()
  return {
    store,
    get: async (key: string, options?: { type?: 'json' }) => {
      const hit = store.get(key)
      if (hit === undefined) return null
      return options?.type === 'json' ? JSON.parse(hit.value) : hit.value
    },
    put: async (key: string, value: string, options?: { metadata?: unknown }) => {
      store.set(key, { value, metadata: options?.metadata ?? null })
    },
    delete: async (key: string) => {
      store.delete(key)
    },
    list: async () =>
      ({
        keys: [...store.entries()].map(([name, entry]) => ({ name, metadata: entry.metadata })),
      }) as { keys: { name: string; metadata?: unknown }[] },
  }
}

const TOKEN = 'a'.repeat(43)
const ORIGIN = 'https://pablomatchspace.github.io'

let env: { SYNC_KV: ReturnType<typeof fakeKv>; SYNC_TOKEN: string; ALLOWED_ORIGINS?: string }

beforeEach(() => {
  env = { SYNC_KV: fakeKv(), SYNC_TOKEN: TOKEN, ALLOWED_ORIGINS: ORIGIN }
})

const envelope = (deviceName = 'Desktop') => ({
  v: 1,
  updatedAt: '2026-07-10T10:00:00.000Z',
  deviceId: 'device-1',
  deviceName,
  cipher: { salt: 'c2FsdA==', iv: 'aXY=', iterations: 600000, data: 'ZGF0YQ==' },
})

function call(
  path: string,
  init: RequestInit & { token?: string | null; origin?: string } = {},
): Promise<Response> {
  const { token = TOKEN, origin, ...rest } = init
  const headers = new Headers(rest.headers)
  if (token !== null) headers.set('Authorization', `Bearer ${token}`)
  if (origin !== undefined) headers.set('Origin', origin)
  return handleRequest(new Request(`https://worker.test${path}`, { ...rest, headers }), env)
}

const put = (baseRevision: number, body: unknown = envelope()) =>
  call('/v1/state', { method: 'PUT', body: JSON.stringify({ baseRevision, envelope: body }) })

describe('auth', () => {
  it('rejects a missing, malformed or wrong token', async () => {
    expect((await call('/v1/meta', { token: null })).status).toBe(401)
    expect(
      (await call('/v1/meta', { headers: { Authorization: TOKEN }, token: null })).status,
    ).toBe(401)
    expect((await call('/v1/meta', { token: 'b'.repeat(43) })).status).toBe(401)
  })

  it('refuses everything when the secret is unset — never fails open', async () => {
    env.SYNC_TOKEN = ''
    expect((await call('/v1/meta', { token: '' })).status).toBe(401)
  })

  it('accepts the right token', async () => {
    expect((await call('/v1/meta')).status).toBe(404) // authorized, just empty
  })
})

describe('CORS', () => {
  it('answers preflight without requiring auth', async () => {
    const res = await call('/v1/state', { method: 'OPTIONS', token: null, origin: ORIGIN })
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN)
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('PUT')
  })

  it('omits the allow-origin header for an origin that is not allow-listed', async () => {
    const res = await call('/v1/state', {
      method: 'OPTIONS',
      token: null,
      origin: 'https://evil.test',
    })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('supports a wildcard for people who prefer one', async () => {
    env.ALLOWED_ORIGINS = '*'
    const res = await call('/v1/meta', { origin: 'https://anywhere.test' })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://anywhere.test')
  })
})

describe('empty store', () => {
  it('reports 404 for meta and state', async () => {
    expect((await call('/v1/meta')).status).toBe(404)
    expect((await call('/v1/state')).status).toBe(404)
  })

  it('accepts a first push only at baseRevision 0', async () => {
    expect((await put(1)).status).toBe(409)
    const res = await put(0)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ revision: 1, updatedAt: '2026-07-10T10:00:00.000Z' })
  })
})

describe('compare-and-swap', () => {
  beforeEach(async () => {
    await put(0)
  })

  it('advances the revision on an in-step write', async () => {
    expect(await (await put(1)).json()).toMatchObject({ revision: 2 })
    expect(await (await put(2)).json()).toMatchObject({ revision: 3 })
  })

  it('rejects a stale write and hands back the current revision to rebase on', async () => {
    await put(1) // another device moved to revision 2
    const res = await put(1) // this device still thinks it is at 1
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ error: 'revision conflict', revision: 2 })
  })

  it('lets a force-push land once it bases on the revision it was handed', async () => {
    await put(1)
    expect((await put(2)).status).toBe(200)
  })

  it('does not advance the revision on a rejected write', async () => {
    await put(0)
    expect(await (await call('/v1/meta')).json()).toMatchObject({ revision: 1 })
  })
})

describe('validation', () => {
  it('rejects invalid JSON, a bad baseRevision, and an envelope with no ciphertext', async () => {
    expect((await call('/v1/state', { method: 'PUT', body: '{oops' })).status).toBe(400)
    expect((await put(-1)).status).toBe(400)
    expect((await put(0, { v: 1, cipher: {} })).status).toBe(400)
    expect((await put(0, null)).status).toBe(400)
  })

  it('caps the body size', async () => {
    const big = {
      ...envelope(),
      cipher: { ...envelope().cipher, data: 'x'.repeat(6 * 1024 * 1024) },
    }
    expect((await put(0, big)).status).toBe(413)
  })
})

describe('round trip', () => {
  it('returns the stored envelope verbatim — the server never rewrites it', async () => {
    await put(0)
    const res = await call('/v1/state')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ revision: 1, envelope: envelope() })
  })

  it('serves meta from KV metadata, without reading the blob', async () => {
    await put(0, envelope('Phone'))
    expect(await (await call('/v1/meta')).json()).toEqual({
      revision: 1,
      updatedAt: '2026-07-10T10:00:00.000Z',
      deviceName: 'Phone',
    })
  })

  it('falls back to the value when metadata is missing', async () => {
    await put(0)
    const stored = env.SYNC_KV.store.get('state')!
    env.SYNC_KV.store.set('state', { value: stored.value, metadata: null })
    expect(await (await call('/v1/meta')).json()).toMatchObject({ revision: 1 })
  })

  it('deletes, and then reports empty again', async () => {
    await put(0)
    expect((await call('/v1/state', { method: 'DELETE' })).status).toBe(200)
    expect((await call('/v1/state')).status).toBe(404)
    expect((await call('/v1/meta')).status).toBe(404)
  })
})

describe('routing', () => {
  it('404s an unknown path and 405s an unsupported method', async () => {
    expect((await call('/v1/nope')).status).toBe(404)
    expect((await call('/v1/state', { method: 'POST' })).status).toBe(405)
  })
})
