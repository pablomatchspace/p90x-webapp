import type { Cipher } from './sync'

/**
 * End-to-end encryption for cloud sync (E10, US-090). WebCrypto only — no
 * dependencies, and no key material ever leaves the device.
 *
 * Two *different* values are derived from the one passphrase:
 *
 * - the **encryption key** (PBKDF2 → AES-GCM), which is created **non-extractable**:
 *   script can encrypt and decrypt with it, but cannot read its bytes back out, and
 *   the passphrase itself is never persisted (see `state/syncSecrets.ts`);
 * - the **auth token** (PBKDF2 at the same cost, under a domain-separated input),
 *   which the Worker stores and compares.
 *
 * The token is deliberately as expensive to brute-force as the key: the server
 * necessarily holds it, and the threat model E2EE exists for is a compromised
 * server, so a fast hash here would hand that adversary a cheap passphrase oracle.
 *
 * Domain separation lives in the **password input** (`AUTH_PREFIX + passphrase`),
 * not only in the salt. The envelope's salt is attacker-influencable (a malicious
 * server can pick it), so if the two derivations differed only by salt, serving an
 * envelope whose salt equals the token's fixed salt would turn the token the
 * server already holds into the decryption key. Prefixing the password makes the
 * two derivations disjoint for every possible salt; a test pins this.
 */

/** OWASP's current PBKDF2-SHA256 floor. Recorded per-envelope so it can be raised. */
export const PBKDF2_ITERATIONS = 600_000

/**
 * Ceiling on the per-envelope `iterations` a device will accept when adopting an
 * existing cloud copy — without one, a malicious envelope demanding 2^31 rounds
 * stalls the enable flow for minutes (a cheap DoS).
 */
export const KDF_MAX_ITERATIONS = 10_000_000

export const SALT_BYTES = 16

const AUTH_PREFIX = 'p90x-sync-auth-v1:'
const AUTH_SALT = 'p90x-sync-auth-v1'
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
 * The bearer token the Worker checks. PBKDF2 at the full cost — a stolen token
 * must be as expensive to brute-force back to the passphrase as the key itself —
 * and domain-separated from the key by the `AUTH_PREFIX` on the password input
 * (see the module comment for why the prefix, not the salt, carries that duty).
 *
 * Deterministic across devices by construction (fixed salt, fixed cost): the
 * Worker just compares strings. `iterations` is parameterised only so the engine's
 * test suite can run the real algorithm cheaply; production callers pass the
 * constant.
 */
export async function deriveAuthToken(
  passphrase: string,
  iterations: number = PBKDF2_ITERATIONS,
): Promise<string> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(AUTH_PREFIX + passphrase),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode(AUTH_SALT) as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    material,
    256,
  )
  return toBase64Url(new Uint8Array(bits))
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
