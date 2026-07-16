import { describe, expect, it } from 'vitest'
import { emptyState } from '@/lib/shared'
import {
  decideSync,
  hasUserData,
  normalizeEndpoint,
  remoteMetaSchema,
  syncEnvelopeSchema,
  type RemoteMeta,
} from './sync'

const meta = (revision: number): RemoteMeta => ({ revision, updatedAt: '2026-07-10T10:00:00.000Z' })

describe('decideSync', () => {
  it('seeds an empty cloud regardless of local dirtiness', () => {
    expect(decideSync({ dirty: true, lastRevision: 0, remote: null })).toBe('first-push')
    expect(decideSync({ dirty: false, lastRevision: 0, remote: null })).toBe('first-push')
  })

  it('re-seeds when the cloud copy was deleted elsewhere', () => {
    expect(decideSync({ dirty: false, lastRevision: 9, remote: null })).toBe('first-push')
  })

  it('is idle when in step and clean', () => {
    expect(decideSync({ dirty: false, lastRevision: 4, remote: meta(4) })).toBe('idle')
  })

  it('pushes when in step and dirty', () => {
    expect(decideSync({ dirty: true, lastRevision: 4, remote: meta(4) })).toBe('push')
  })

  it('pulls when the remote moved and there is nothing local to lose', () => {
    expect(decideSync({ dirty: false, lastRevision: 4, remote: meta(5) })).toBe('pull')
  })

  it('raises a conflict when both sides changed', () => {
    expect(decideSync({ dirty: true, lastRevision: 4, remote: meta(5) })).toBe('conflict')
  })

  it('treats a remote that went backwards like any other divergence', () => {
    expect(decideSync({ dirty: false, lastRevision: 7, remote: meta(3) })).toBe('pull')
    expect(decideSync({ dirty: true, lastRevision: 7, remote: meta(3) })).toBe('conflict')
  })
})

describe('hasUserData', () => {
  it('is false for a fresh document — so a second device adopts the cloud copy', () => {
    expect(hasUserData(emptyState())).toBe(false)
  })

  it.each([
    ['a program', (s: ReturnType<typeof emptyState>) => (s.settings.startDate = '2026-01-05')],
    [
      'body entries',
      (s: ReturnType<typeof emptyState>) =>
        s.bodyLog.push({
          date: '2026-01-05',
          weight: 80,
          bodyFat: null,
          water: null,
          bone: null,
          zoneMinutes: null,
        }),
    ],
    [
      'workout logs',
      (s: ReturnType<typeof emptyState>) => (s.workoutLogs['chest-and-back'] = { sessions: [] }),
    ],
    [
      'custom quotes',
      (s: ReturnType<typeof emptyState>) => s.quotes.custom.push({ id: 'c-1', text: 'Go' }),
    ],
    ['notes', (s: ReturnType<typeof emptyState>) => (s.notes = 'hello')],
    // A field list used to miss this: someone who had only filled in Settings
    // would have had them silently replaced by the first pull.
    ['settings-only changes', (s: ReturnType<typeof emptyState>) => (s.settings.height = 1.8)],
    [
      'a scoring tweak',
      (s: ReturnType<typeof emptyState>) => (s.settings.scoring.penaltyOn = false),
    ],
  ])('is true with %s', (_label, mutate) => {
    const state = emptyState()
    mutate(state)
    expect(hasUserData(state)).toBe(true)
  })
})

describe('normalizeEndpoint', () => {
  it('accepts https and strips trailing slashes', () => {
    expect(normalizeEndpoint('https://p90x-sync.example.workers.dev/')).toBe(
      'https://p90x-sync.example.workers.dev',
    )
    expect(normalizeEndpoint('  https://example.com/sync//  ')).toBe('https://example.com/sync')
  })

  it('allows http only on loopback (wrangler dev)', () => {
    expect(normalizeEndpoint('http://localhost:8787')).toBe('http://localhost:8787')
    expect(normalizeEndpoint('http://127.0.0.1:8787')).toBe('http://127.0.0.1:8787')
    expect(normalizeEndpoint('http://example.com')).toBeNull()
  })

  it('rejects nonsense, other protocols, and URLs carrying query or hash', () => {
    expect(normalizeEndpoint('not a url')).toBeNull()
    expect(normalizeEndpoint('ftp://example.com')).toBeNull()
    expect(normalizeEndpoint('https://example.com?token=leak')).toBeNull()
    expect(normalizeEndpoint('https://example.com#/x')).toBeNull()
  })
})

describe('wire schemas', () => {
  const envelope = {
    v: 1,
    updatedAt: '2026-07-10T10:00:00.000Z',
    deviceId: 'device-1',
    deviceName: 'Desktop',
    cipher: { salt: 'c2FsdA==', iv: 'aXY=', iterations: 600000, data: 'ZGF0YQ==' },
  }

  it('accepts a well-formed envelope', () => {
    expect(syncEnvelopeSchema.safeParse(envelope).success).toBe(true)
  })

  it('rejects a future wire version rather than guessing at its meaning', () => {
    expect(syncEnvelopeSchema.safeParse({ ...envelope, v: 2 }).success).toBe(false)
  })

  it('rejects a cipher missing its iteration count', () => {
    const { iterations: _iterations, ...cipher } = envelope.cipher
    expect(syncEnvelopeSchema.safeParse({ ...envelope, cipher }).success).toBe(false)
  })

  it('rejects non-base64 cipher fields — they feed atob, which throws', () => {
    const withSalt = { ...envelope, cipher: { ...envelope.cipher, salt: '!!!' } }
    expect(syncEnvelopeSchema.safeParse(withSalt).success).toBe(false)
    const unpaddedIv = { ...envelope, cipher: { ...envelope.cipher, iv: 'aXY' } }
    expect(syncEnvelopeSchema.safeParse(unpaddedIv).success).toBe(false)
    const withData = { ...envelope, cipher: { ...envelope.cipher, data: 'not base64!' } }
    expect(syncEnvelopeSchema.safeParse(withData).success).toBe(false)
  })

  it('accepts meta with a null deviceName', () => {
    const parsed = remoteMetaSchema.safeParse({
      revision: 2,
      updatedAt: '2026-07-10T10:00:00.000Z',
      deviceName: null,
    })
    expect(parsed.success).toBe(true)
  })
})
