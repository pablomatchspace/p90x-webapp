import type { Cipher } from '@/lib/sync'

/**
 * End-to-end encryption for cloud sync (E10, US-090). WebCrypto only — no
 * dependencies, and no key material ever leaves the device.
 *
 * Two *different* values are derived from the one passphrase:
 *
 * - the **encryption key** (PBKDF2 → AES-GCM), which is created **non-extractable**:
 *   script can encrypt and decrypt with it, but cannot read its bytes back out, and
 *   the passphrase itself is never persisted (see `state/syncSecrets.ts`);
 * - the **auth token** (a plain SHA-256 of a domain-separated string), which the
 *   Worker stores and compares.
 *
 * Because the token is a hash of the passphrase under a different prefix, holding
 * it — as the server necessarily does — grants no ability to decrypt anything.
 */

/** OWASP's current PBKDF2-SHA256 floor. Recorded per-envelope so it can be raised. */
export const PBKDF2_ITERATIONS = 600_000

export const SALT_BYTES = 16

const AUTH_PREFIX = 'p90x-sync-auth-v1:'
const IV_BYTES = 12

export function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length))
}

export function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export function fromBase64(text: string): Uint8Array {
  const binary = atob(text)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function toBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * The bearer token the Worker checks. Domain-separated from the encryption key so
 * that a compromised server learns nothing about the plaintext.
 */
export async function deriveAuthToken(passphrase: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(AUTH_PREFIX + passphrase),
  )
  return toBase64Url(new Uint8Array(digest))
}

/**
 * Stretch the passphrase into an AES-GCM key.
 *
 * `extractable: false` is the point: the key can be structured-cloned into
 * IndexedDB and used forever, but `exportKey` will refuse, so neither an XSS
 * payload nor a copy of the browser profile yields anything that decrypts the
 * blob offline. The passphrase is dropped as soon as this returns.
 */
export async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export interface EncryptOptions {
  /** base64 — echoed into the envelope so another device can derive the same key */
  salt: string
  iterations: number
  /** fresh per push — never reuse an AES-GCM nonce under the same key */
  iv?: Uint8Array
}

export async function encryptJson(
  key: CryptoKey,
  value: unknown,
  options: EncryptOptions,
): Promise<Cipher> {
  const iv = options.iv ?? randomBytes(IV_BYTES)
  const plaintext = new TextEncoder().encode(JSON.stringify(value))
  const buffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    plaintext,
  )
  return {
    salt: options.salt,
    iv: toBase64(iv),
    iterations: options.iterations,
    data: toBase64(new Uint8Array(buffer)),
  }
}

/**
 * Throws when the key is wrong (different passphrase) or the ciphertext was
 * tampered with (GCM auth tag). Callers compare `cipher.salt` against their own
 * first, so a mismatch reports the real cause instead of a bare decrypt failure.
 */
export async function decryptJson(key: CryptoKey, cipher: Cipher): Promise<unknown> {
  const buffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(cipher.iv) as BufferSource },
    key,
    fromBase64(cipher.data) as BufferSource,
  )
  return JSON.parse(new TextDecoder().decode(buffer))
}
