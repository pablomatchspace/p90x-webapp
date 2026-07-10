import {
  remoteMetaSchema,
  remoteStateSchema,
  type RemoteMeta,
  type RemoteState,
  type SyncEnvelope,
} from '@/lib/sync'

/**
 * Transport for the sync Worker (E10, US-092). Every failure is a value, never an
 * exception: sync must degrade to a status line, never take the app down.
 */

export type ApiFailure =
  | { kind: 'unauthorized' }
  | { kind: 'notfound' }
  | { kind: 'conflict'; remote: RemoteMeta }
  | { kind: 'network' }
  | { kind: 'server'; status: number }
  | { kind: 'invalid'; message: string }

export type ApiResult<T> = ({ ok: true } & { value: T }) | ({ ok: false } & ApiFailure)

const INVALID_RESPONSE = 'The endpoint answered, but not like the sync Worker does.'

async function request(
  endpoint: string,
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<Response | null> {
  try {
    return await fetch(`${endpoint}${path}`, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${token}` },
    })
  } catch {
    // Offline, DNS failure, CORS rejection, endpoint down — indistinguishable here
    // and identically recoverable: try again on the next open.
    return null
  }
}

/** Map the statuses every route shares. `null` means "keep reading the body". */
function commonFailure(response: Response): ApiFailure | null {
  if (response.status === 401 || response.status === 403) return { kind: 'unauthorized' }
  if (response.status === 404) return { kind: 'notfound' }
  if (!response.ok) return { kind: 'server', status: response.status }
  return null
}

async function readJson(response: Response): Promise<unknown | undefined> {
  try {
    return (await response.json()) as unknown
  } catch {
    return undefined
  }
}

/** Cheap freshness probe — the blob stays on the server. */
export async function getMeta(endpoint: string, token: string): Promise<ApiResult<RemoteMeta>> {
  const response = await request(endpoint, token, '/v1/meta')
  if (response === null) return { ok: false, kind: 'network' }
  const failure = commonFailure(response)
  if (failure !== null) return { ok: false, ...failure }
  const parsed = remoteMetaSchema.safeParse(await readJson(response))
  if (!parsed.success) return { ok: false, kind: 'invalid', message: INVALID_RESPONSE }
  return { ok: true, value: parsed.data }
}

export async function getState(endpoint: string, token: string): Promise<ApiResult<RemoteState>> {
  const response = await request(endpoint, token, '/v1/state')
  if (response === null) return { ok: false, kind: 'network' }
  const failure = commonFailure(response)
  if (failure !== null) return { ok: false, ...failure }
  const parsed = remoteStateSchema.safeParse(await readJson(response))
  if (!parsed.success) {
    return {
      ok: false,
      kind: 'invalid',
      // A wire version we do not know is the likeliest cause, and the fix is the app, not the data.
      message: 'The cloud copy has a format this app version does not understand. Update the app.',
    }
  }
  return { ok: true, value: parsed.data }
}

export async function putState(
  endpoint: string,
  token: string,
  baseRevision: number,
  envelope: SyncEnvelope,
): Promise<ApiResult<{ revision: number }>> {
  const response = await request(endpoint, token, '/v1/state', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ baseRevision, envelope }),
  })
  if (response === null) return { ok: false, kind: 'network' }
  if (response.status === 409) {
    // Somebody else wrote. The body carries what to rebase on.
    const parsed = remoteMetaSchema.safeParse(await readJson(response))
    const remote: RemoteMeta = parsed.success ? parsed.data : { revision: 0, updatedAt: '' }
    return { ok: false, kind: 'conflict', remote }
  }
  const failure = commonFailure(response)
  if (failure !== null) return { ok: false, ...failure }
  const body = await readJson(response)
  const revision = (body as { revision?: unknown } | undefined)?.revision
  if (typeof revision !== 'number' || !Number.isInteger(revision)) {
    return { ok: false, kind: 'invalid', message: INVALID_RESPONSE }
  }
  return { ok: true, value: { revision } }
}

export async function deleteState(endpoint: string, token: string): Promise<ApiResult<null>> {
  const response = await request(endpoint, token, '/v1/state', { method: 'DELETE' })
  if (response === null) return { ok: false, kind: 'network' }
  // Already gone is the outcome we wanted.
  if (response.status === 404) return { ok: true, value: null }
  const failure = commonFailure(response)
  if (failure !== null) return { ok: false, ...failure }
  return { ok: true, value: null }
}

/** One place to turn a transport failure into something a person can act on. */
export function describeFailure(failure: ApiFailure): string {
  switch (failure.kind) {
    case 'unauthorized':
      return 'The endpoint rejected the passphrase. Check that SYNC_TOKEN on the Worker matches the value shown below.'
    case 'notfound':
      return 'The endpoint has no data yet.'
    case 'conflict':
      return 'The cloud copy moved while this device was writing.'
    case 'network':
      return 'Could not reach the endpoint — will retry when the app is next opened.'
    case 'server':
      return `The endpoint returned an error (${failure.status}).`
    case 'invalid':
      return failure.message
  }
}
