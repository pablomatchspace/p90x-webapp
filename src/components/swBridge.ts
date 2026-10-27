/**
 * Lets the Help page ask for a newer version on demand. `UpdateToast` owns the
 * one service-worker registration (vite-plugin-pwa, registerType 'prompt') and
 * hands its registration over here; nothing in this file touches the virtual
 * PWA modules, so it is unit-testable.
 */

export type UpdateCheck = 'update-ready' | 'up-to-date' | 'offline' | 'unavailable' | 'error'

let registration: ServiceWorkerRegistration | undefined

export function setRegistration(reg: ServiceWorkerRegistration | undefined): void {
  registration = reg
}

/** Resolve once `worker` is installed (true) or has failed/been discarded (false). */
function installed(worker: ServiceWorker, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const done = (ok: boolean) => {
      clearTimeout(timer)
      worker.removeEventListener('statechange', onChange)
      resolve(ok)
    }
    const onChange = () => {
      if (worker.state === 'installed') done(true)
      else if (worker.state === 'redundant') done(false)
    }
    const timer = setTimeout(() => done(false), timeoutMs)
    worker.addEventListener('statechange', onChange)
    onChange()
  })
}

/**
 * Ask the server for a newer build and report what it found. 'update-ready'
 * means a new version is installed and waiting — `applyUpdate()` activates it.
 */
export async function checkForUpdate(timeoutMs = 30_000): Promise<UpdateCheck> {
  const reg = registration
  if (reg === undefined) return 'unavailable'
  if (navigator.onLine === false) return 'offline'
  if (reg.waiting !== null) return 'update-ready'
  try {
    await reg.update()
    if (reg.waiting !== null) return 'update-ready'
    if (reg.installing === null) return 'up-to-date'
    const ok = await installed(reg.installing, timeoutMs)
    if (!ok) return 'error'
    return reg.waiting !== null ? 'update-ready' : 'up-to-date'
  } catch {
    return 'error'
  }
}

/** How long to wait for the new worker to take over before reloading anyway. */
const TAKEOVER_FALLBACK_MS = 3000

/**
 * Activate the waiting version and reload into it. The reload is owned here
 * rather than by vite-plugin-pwa's hook: that hook is wired ~200 ms after a
 * worker finishes installing, so a user-triggered update can take over first
 * and never reload. A page the worker never takes over (first visit) reloads
 * after a short fallback so the new version is what the user sees.
 */
export function applyUpdate(): void {
  const waiting = registration?.waiting
  if (waiting === null || waiting === undefined) return
  const reload = () => window.location.reload()
  navigator.serviceWorker?.addEventListener('controllerchange', reload, { once: true })
  setTimeout(reload, TAKEOVER_FALLBACK_MS)
  waiting.postMessage({ type: 'SKIP_WAITING' })
}
