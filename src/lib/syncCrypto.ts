import type { Cipher } from '@/lib/sync'

/**
 * End-to-end encryption for cloud sync (E10, US-090). WebCrypto only — no
 * dependencies, no key material ever leaves the device.
 *
 * Two *different* values are derived from the one passphrase:
 *
 * - the **encryption key** (PBKDF2 → AES-GCM), which never leaves the browser;
 * - the **auth token** (a plain SHA-256 of a domain-separated string), which the
 *   Worker stores and compares.
 *
 * Because the token is a hash of the passphrase under a different prefix, holding
 * it — as the server necessarily does — grants no ability to decrypt anything.
 */

/** OWASP's current PBKDF2-SHA256 floor. Recorded per-envelope so it can be raised. */
export const PBKDF2_ITERATIONS = 600_000

const AUTH_PREFIX = 'p90x-sync-auth-v1:'
const SALT_BYTES = 16
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

async function deriveKey(
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
  /** reused across pushes so the derived key can be cached; random at first enable */
  salt?: Uint8Array
  /** fresh per push — never reuse an AES-GCM nonce under the same key */
  iv?: Uint8Array
  /** lowered in tests; production always uses PBKDF2_ITERATIONS */
  iterations?: number
}

export async function encryptJson(
  value: unknown,
  passphrase: string,
  options: EncryptOptions = {},
): Promise<Cipher> {
  const salt = options.salt ?? randomBytes(SALT_BYTES)
  const iv = options.iv ?? randomBytes(IV_BYTES)
  const iterations = options.iterations ?? PBKDF2_ITERATIONS
  const key = await deriveKey(passphrase, salt, iterations)
  const plaintext = new TextEncoder().encode(JSON.stringify(value))
  const buffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    plaintext,
  )
  return {
    salt: toBase64(salt),
    iv: toBase64(iv),
    iterations,
    data: toBase64(new Uint8Array(buffer)),
  }
}

/** Throws when the passphrase is wrong or the ciphertext was tampered with (GCM auth tag). */
export async function decryptJson(cipher: Cipher, passphrase: string): Promise<unknown> {
  const key = await deriveKey(passphrase, fromBase64(cipher.salt), cipher.iterations)
  const buffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(cipher.iv) as BufferSource },
    key,
    fromBase64(cipher.data) as BufferSource,
  )
  return JSON.parse(new TextDecoder().decode(buffer))
}
