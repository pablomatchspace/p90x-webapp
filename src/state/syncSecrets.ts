/**
 * The only two secrets cloud sync holds, kept in IndexedDB and **never** in
 * localStorage (E10, US-090):
 *
 * - `key` — the AES-GCM key, non-extractable. IndexedDB can structured-clone a
 *   `CryptoKey` without ever exposing its bytes, so script may decrypt with it but
 *   cannot read it out. A stolen browser profile therefore does not yield anything
 *   that decrypts the blob offline.
 * - `authToken` — the bearer token the Worker compares. It cannot decrypt anything.
 *
 * The passphrase itself is never persisted anywhere. Losing this store (clearing
 * site data, a fresh browser) means re-entering the passphrase, not losing data.
 */
const DB_NAME = 'p90x-sync'
const STORE = 'secrets'
const RECORD_KEY = 'v1'

export interface SyncSecrets {
  key: CryptoKey
  authToken: string
}

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null)
    let request: IDBOpenDBRequest
    try {
      request = indexedDB.open(DB_NAME, 1)
    } catch {
      return resolve(null) // private mode can throw outright
    }
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
    request.onblocked = () => resolve(null)
  })
}

function run<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest,
): Promise<T | null> {
  return new Promise((resolve) => {
    let request: IDBRequest
    try {
      request = action(db.transaction(STORE, mode).objectStore(STORE))
    } catch {
      return resolve(null)
    }
    request.onsuccess = () => resolve(request.result as T)
    request.onerror = () => resolve(null)
  })
}

export async function loadSecrets(): Promise<SyncSecrets | null> {
  const db = await openDb()
  if (db === null) return null
  const record = await run<SyncSecrets>(db, 'readonly', (store) => store.get(RECORD_KEY))
  db.close()
  if (record === null || typeof record !== 'object') return null
  return typeof record.authToken === 'string' && record.key !== undefined ? record : null
}

/** @returns false when the browser refuses to store it (private mode) — sync stays off. */
export async function saveSecrets(secrets: SyncSecrets): Promise<boolean> {
  const db = await openDb()
  if (db === null) return false
  const result = await run(db, 'readwrite', (store) => store.put(secrets, RECORD_KEY))
  db.close()
  return result !== null
}

export async function clearSecrets(): Promise<void> {
  const db = await openDb()
  if (db === null) return
  await run(db, 'readwrite', (store) => store.delete(RECORD_KEY))
  db.close()
}
