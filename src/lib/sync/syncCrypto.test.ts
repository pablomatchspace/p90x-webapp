import { describe, expect, it } from 'vitest'
import {
  decryptJson,
  deriveAuthToken,
  deriveKey,
  encryptJson,
  fromBase64,
  PBKDF2_ITERATIONS,
  randomBytes,
  toBase64,
} from './syncCrypto'

// PBKDF2 at the production cost is deliberately slow (~0.3 s per derivation), so
// most cases run at a low count; `iterations` travels in the envelope precisely so
// both work. One test below pays the full price to pin the real path.
const FAST = 1000
const SALT = toBase64(new Uint8Array(16).fill(7))

const key = (passphrase: string, iterations = FAST, salt = SALT) =>
  deriveKey(passphrase, fromBase64(salt), iterations)

const opts = (iterations = FAST, salt = SALT) => ({ salt, iterations })

describe('base64 helpers', () => {
  it('round-trips arbitrary bytes, including 0x00 and 0xff', () => {
    const bytes = new Uint8Array([0, 1, 127, 128, 254, 255])
    expect(fromBase64(toBase64(bytes))).toEqual(bytes)
  })
})

describe('deriveAuthToken', () => {
  it('is deterministic and base64url (no +, /, or padding)', async () => {
    const a = await deriveAuthToken('correct horse battery', FAST)
    const b = await deriveAuthToken('correct horse battery', FAST)
    expect(a).toBe(b)
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/)
  })

  it('derives at the production cost by default — a stolen token is as slow to brute-force as the key', async () => {
    const token = await deriveAuthToken('correct horse battery')
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    // PBKDF2 output depends on the iteration count, so the default differs from FAST.
    expect(token).not.toBe(await deriveAuthToken('correct horse battery', FAST))
  })

  it('differs for different passphrases', async () => {
    expect(await deriveAuthToken('passphrase-a', FAST)).not.toBe(
      await deriveAuthToken('passphrase-b', FAST),
    )
  })

  it('is not the encryption key: the token cannot open an envelope', async () => {
    const passphrase = 'shared secret phrase'
    const cipher = await encryptJson(await key(passphrase), { hello: 'world' }, opts())
    const token = await deriveAuthToken(passphrase, FAST)
    // The Worker only ever holds `token`. A key stretched from it must not decrypt.
    await expect(decryptJson(await key(token), cipher)).rejects.toThrow()
  })

  it('stays domain-separated even under an attacker-chosen salt', async () => {
    // The envelope's salt is server-supplied. A malicious server can set it to the
    // token derivation's fixed salt hoping the token it already holds *is* the
    // encryption key. The AUTH_PREFIX on the password input must make the two
    // derivations disjoint for every possible salt — including this one.
    const passphrase = 'shared secret phrase'
    const authSalt = toBase64(new TextEncoder().encode('p90x-sync-auth-v1'))
    const cipher = await encryptJson(
      await key(passphrase, FAST, authSalt),
      { secret: 1 },
      opts(FAST, authSalt),
    )

    const token = await deriveAuthToken(passphrase, FAST)
    const padded = token.replace(/-/g, '+').replace(/_/g, '/')
    const tokenBytes = fromBase64(padded + '='.repeat((4 - (padded.length % 4)) % 4))
    const tokenAsKey = await crypto.subtle.importKey(
      'raw',
      tokenBytes as BufferSource,
      'AES-GCM',
      false,
      ['decrypt'],
    )
    await expect(
      crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: fromBase64(cipher.iv) as BufferSource },
        tokenAsKey,
        fromBase64(cipher.data) as BufferSource,
      ),
    ).rejects.toThrow()
  })
})

describe('deriveKey', () => {
  it('produces a non-extractable key — its bytes cannot be read back out', async () => {
    const derived = await key('a good passphrase')
    expect(derived.extractable).toBe(false)
    await expect(crypto.subtle.exportKey('raw', derived)).rejects.toThrow()
  })

  it('is deterministic for the same passphrase, salt and cost', async () => {
    const cipher = await encryptJson(await key('same passphrase'), { v: 1 }, opts())
    // A second device: only the passphrase, and the salt read off the envelope.
    expect(await decryptJson(await key('same passphrase'), cipher)).toEqual({ v: 1 })
  })

  it('a different salt yields a different key', async () => {
    const otherSalt = toBase64(randomBytes(16))
    const cipher = await encryptJson(await key('same passphrase'), { v: 1 }, opts())
    await expect(
      decryptJson(await key('same passphrase', FAST, otherSalt), cipher),
    ).rejects.toThrow()
  })
})

describe('encryptJson / decryptJson', () => {
  it('round-trips a document', async () => {
    const value = { schemaVersion: 1, notes: 'leg day', nested: [1, 2, { a: null }] }
    const derived = await key('a good passphrase')
    expect(await decryptJson(derived, await encryptJson(derived, value, opts()))).toEqual(value)
  })

  it('round-trips at the real iteration count', async () => {
    const derived = await key('a good passphrase', PBKDF2_ITERATIONS)
    const cipher = await encryptJson(derived, { ok: true }, opts(PBKDF2_ITERATIONS))
    expect(cipher.iterations).toBe(PBKDF2_ITERATIONS)
    expect(await decryptJson(derived, cipher)).toEqual({ ok: true })
  })

  it('rejects the wrong passphrase', async () => {
    const cipher = await encryptJson(await key('right passphrase'), { secret: 1 }, opts())
    await expect(decryptJson(await key('wrong passphrase'), cipher)).rejects.toThrow()
  })

  it('rejects tampered ciphertext (GCM auth tag)', async () => {
    const derived = await key('right passphrase')
    const cipher = await encryptJson(derived, { secret: 1 }, opts())
    const bytes = fromBase64(cipher.data)
    bytes[0] ^= 0xff
    await expect(decryptJson(derived, { ...cipher, data: toBase64(bytes) })).rejects.toThrow()
  })

  it('produces a different nonce — and so different ciphertext — for identical input', async () => {
    const derived = await key('pass')
    const a = await encryptJson(derived, { same: true }, opts())
    const b = await encryptJson(derived, { same: true }, opts())
    expect(a.iv).not.toBe(b.iv)
    expect(a.data).not.toBe(b.data)
  })

  it('echoes the salt and cost so another device can derive the same key', async () => {
    const cipher = await encryptJson(await key('pass'), { v: 1 }, opts())
    expect(cipher.salt).toBe(SALT)
    expect(cipher.iterations).toBe(FAST)
  })
})
