/**
 * p90x-webapp cloud-sync Worker (Epic E10).
 *
 * Holds exactly one end-to-end-encrypted envelope and cannot read it: the app
 * encrypts with a key derived from the user's passphrase, and the `SYNC_TOKEN`
 * this Worker compares is a hash of that passphrase under a different prefix.
 *
 * Deliberately a **single module with no imports** so it can be pasted verbatim
 * into the Cloudflare dashboard editor — see README.md for the three setup paths.
 *
 * Contract (all routes require `Authorization: Bearer <SYNC_TOKEN>`):
 *
 *   GET    /v1/meta    → 200 {revision, updatedAt, deviceName} · 404 when empty
 *   GET    /v1/state   → 200 {revision, envelope}              · 404 when empty
 *   PUT    /v1/state   → 200 {revision, updatedAt}             · 409 on stale write
 *   DELETE /v1/state   → 200 {ok:true}
 *
 * PUT carries `{baseRevision, envelope}` and is a compare-and-swap: it only lands
 * when `baseRevision` still matches the stored revision, so a device that has not
 * seen the latest write cannot silently clobber it. The 409 body carries the
 * current revision, which is what a "keep this device" force-push then bases on.
 */

const STATE_KEY = 'state'

/** KV values cap at 25 MB; a state document is measured in kilobytes. Fail loudly, not silently. */
const MAX_BODY_BYTES = 5 * 1024 * 1024

/**
 * @typedef {object} KVListKey
 * @property {string} name
 * @property {any} [metadata]
 */
/**
 * @typedef {object} KVNamespace
 * @property {(key: string, options?: {type?: 'json'}) => Promise<any>} get
 * @property {(key: string, value: string, options?: {metadata?: any}) => Promise<void>} put
 * @property {(key: string) => Promise<void>} delete
 * @property {(options?: {prefix?: string, limit?: number}) => Promise<{keys: KVListKey[]}>} list
 */
/**
 * @typedef {object} Env
 * @property {KVNamespace} SYNC_KV
 * @property {string} SYNC_TOKEN     secret — the app's derived auth token
 * @property {string} [ALLOWED_ORIGINS] comma-separated origins allowed to call this Worker
 */
/** @typedef {{revision: number, updatedAt: string, deviceName?: string|null}} Meta */

/**
 * Length-independent comparison of the presented token against the secret.
 * (The length itself is not secret: the token is always a 43-char base64url SHA-256.)
 * @param {string} a
 * @param {string} b
 */
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/**
 * @param {Request} request
 * @param {Env} env
 */
function authorized(request, env) {
  const expected = env.SYNC_TOKEN ?? ''
  // An unset secret must never mean "open to everyone".
  if (expected === '') return false
  const header = request.headers.get('Authorization') ?? ''
  if (!header.startsWith('Bearer ')) return false
  return timingSafeEqual(header.slice('Bearer '.length), expected)
}

/**
 * Echo back only an origin the operator allow-listed. Without a match we simply omit
 * the CORS headers: the browser blocks the read, which is the desired default.
 * @param {string|null} origin
 * @param {Env} env
 * @returns {Record<string,string>}
 */
function corsHeaders(origin, env) {
  /** @type {Record<string,string>} */
  const headers = { 'Content-Type': 'application/json', Vary: 'Origin' }
  const allowed = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value !== '')
  if (origin !== null && (allowed.includes('*') || allowed.includes(origin))) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Methods'] = 'GET, PUT, DELETE, OPTIONS'
    headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type'
    headers['Access-Control-Max-Age'] = '86400'
  }
  return headers
}

/**
 * @param {unknown} body
 * @param {number} status
 * @param {Record<string,string>} headers
 */
function json(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers })
}

/**
 * Read the revision without moving the blob. KV `list` returns metadata but not
 * values, which is what makes the app's open-time freshness check cheap.
 * @param {Env} env
 * @returns {Promise<Meta|null>}
 */
async function readMeta(env) {
  const listed = await env.SYNC_KV.list({ prefix: STATE_KEY, limit: 1 })
  const entry = listed.keys.find((key) => key.name === STATE_KEY)
  if (entry === undefined) return null
  if (entry.metadata && Number.isInteger(entry.metadata.revision)) return entry.metadata
  // Metadata missing (hand-seeded key, or a write from a future version): fall back
  // to the value so a readable record never looks empty.
  const record = await env.SYNC_KV.get(STATE_KEY, { type: 'json' })
  if (record === null || !Number.isInteger(record.revision)) return null
  return { revision: record.revision, updatedAt: record.envelope?.updatedAt ?? '' }
}

/**
 * @param {Request} request
 * @param {Env} env
 * @param {Record<string,string>} cors
 */
async function putState(request, env, cors) {
  const raw = await request.text()
  if (raw.length > MAX_BODY_BYTES) return json({ error: 'payload too large' }, 413, cors)

  /** @type {any} */
  let body
  try {
    body = JSON.parse(raw)
  } catch {
    return json({ error: 'invalid JSON' }, 400, cors)
  }

  const baseRevision = body?.baseRevision
  const envelope = body?.envelope
  if (!Number.isInteger(baseRevision) || baseRevision < 0) {
    return json({ error: 'baseRevision must be a non-negative integer' }, 400, cors)
  }
  // The envelope is opaque — we never decrypt it — but a record with no ciphertext
  // would be a silent data-loss bug, so require the shape and nothing more.
  if (
    typeof envelope !== 'object' ||
    envelope === null ||
    typeof envelope.cipher !== 'object' ||
    envelope.cipher === null ||
    typeof envelope.cipher.data !== 'string'
  ) {
    return json({ error: 'envelope must carry cipher.data' }, 400, cors)
  }

  const current = await readMeta(env)
  const currentRevision = current === null ? 0 : current.revision
  if (baseRevision !== currentRevision) {
    return json(
      {
        error: 'revision conflict',
        revision: currentRevision,
        updatedAt: current === null ? '' : current.updatedAt,
      },
      409,
      cors,
    )
  }

  const revision = currentRevision + 1
  const updatedAt =
    typeof envelope.updatedAt === 'string' ? envelope.updatedAt : new Date().toISOString()
  /** @type {Meta} */
  const meta = {
    revision,
    updatedAt,
    deviceName: typeof envelope.deviceName === 'string' ? envelope.deviceName : null,
  }
  await env.SYNC_KV.put(STATE_KEY, JSON.stringify({ revision, envelope }), { metadata: meta })
  return json({ revision, updatedAt }, 200, cors)
}

/**
 * @param {Request} request
 * @param {Env} env
 * @returns {Promise<Response>}
 */
export async function handleRequest(request, env) {
  const cors = corsHeaders(request.headers.get('Origin'), env)
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (!authorized(request, env)) return json({ error: 'unauthorized' }, 401, cors)

  const { pathname } = new URL(request.url)

  if (pathname === '/v1/meta' && request.method === 'GET') {
    const meta = await readMeta(env)
    return meta === null ? json({ error: 'empty' }, 404, cors) : json(meta, 200, cors)
  }

  if (pathname === '/v1/state') {
    if (request.method === 'GET') {
      const record = await env.SYNC_KV.get(STATE_KEY, { type: 'json' })
      return record === null ? json({ error: 'empty' }, 404, cors) : json(record, 200, cors)
    }
    if (request.method === 'PUT') return putState(request, env, cors)
    if (request.method === 'DELETE') {
      await env.SYNC_KV.delete(STATE_KEY)
      return json({ ok: true }, 200, cors)
    }
    return json({ error: 'method not allowed' }, 405, cors)
  }

  return json({ error: 'not found' }, 404, cors)
}

export default {
  /**
   * @param {Request} request
   * @param {Env} env
   */
  fetch(request, env) {
    return handleRequest(request, env)
  },
}
