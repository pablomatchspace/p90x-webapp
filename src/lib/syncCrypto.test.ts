import { describe, expect, it } from 'vitest'
import {
  decryptJson,
  deriveAuthToken,
  encryptJson,
  fromBase64,
  PBKDF2_ITERATIONS,
  randomBytes,
  toBase64,
} from '@/lib/syncCrypto'

// PBKDF2 at the production cost is deliberately slow (~0.3 s per derivation), so
// most cases run at a low count; `iterations` travels in the envelope precisely so
// both work. One test below pays the full price to pin the real path.
const FAST = { iterations: 1000 }

describe('base64 helpers', () => {
  it('round-trips arbitrary bytes, including 0x00 and 0xff', () => {
    const bytes = new Uint8Array([0, 1, 127, 128, 254, 255])
    expect(fromBase64(toBase64(bytes))).toEqual(bytes)
  })
})

describe('deriveAuthToken', () => {
  it('is deterministic and base64url (no +, /, or padding)', async () => {
    const a = await deriveAuthToken('correct horse battery')
    const b = await deriveAuthToken('correct horse battery')
    expect(a).toBe(b)
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/)
  })

  it('differs for different passphrases', async () => {
    expect(await deriveAuthToken('passphrase-a')).not.toBe(await deriveAuthToken('passphrase-b'))
  })

  it('is not the encryption key: the token cannot decrypt an envelope', async () => {
    const passphrase = 'shared secret phrase'
    const cipher = await encryptJson({ hello: 'world' }, passphrase, FAST)
    const token = await deriveAuthToken(passphrase)
    // The Worker only ever holds `token`. Using it as a passphrase must fail.
    await expect(decryptJson(cipher, token)).rejects.toThrow()
  })
})

describe('encryptJson / decryptJson', () => {
  it('round-trips a document', async () => {
    const value = { schemaVersion: 1, notes: 'leg day', nested: [1, 2, { a: null }] }
    const cipher = await encryptJson(value, 'a good passphrase', FAST)
    expect(await decryptJson(cipher, 'a good passphrase')).toEqual(value)
  })

  it('round-trips at the real iteration count', async () => {
    const cipher = await encryptJson({ ok: true }, 'a good passphrase')
    expect(cipher.iterations).toBe(PBKDF2_ITERATIONS)
    expect(await decryptJson(cipher, 'a good passphrase')).toEqual({ ok: true })
  })

  it('rejects the wrong passphrase', async () => {
    const cipher = await encryptJson({ secret: 1 }, 'right passphrase', FAST)
    await expect(decryptJson(cipher, 'wrong passphrase')).rejects.toThrow()
  })

  it('rejects tampered ciphertext (GCM auth tag)', async () => {
    const cipher = await encryptJson({ secret: 1 }, 'right passphrase', FAST)
    const bytes = fromBase64(cipher.data)
    bytes[0] ^= 0xff
    await expect(
      decryptJson({ ...cipher, data: toBase64(bytes) }, 'right passphrase'),
    ).rejects.toThrow()
  })

  it('produces a different nonce — and so different ciphertext — for identical input', async () => {
    const salt = randomBytes(16)
    const a = await encryptJson({ same: true }, 'pass', { ...FAST, salt })
    const b = await encryptJson({ same: true }, 'pass', { ...FAST, salt })
    expect(a.iv).not.toBe(b.iv)
    expect(a.data).not.toBe(b.data)
  })

  it('records the salt so another device can derive the same key from the passphrase alone', async () => {
    const salt = randomBytes(16)
    const cipher = await encryptJson({ v: 1 }, 'pass', { ...FAST, salt })
    expect(cipher.salt).toBe(toBase64(salt))
    // A "second device" holds only the passphrase and the envelope.
    expect(await decryptJson(cipher, 'pass')).toEqual({ v: 1 })
  })
})
