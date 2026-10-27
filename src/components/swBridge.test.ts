import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyUpdate, checkForUpdate, setRegistration } from './swBridge'

type Worker = EventTarget & { state: string }

function worker(state = 'installing'): Worker {
  return Object.assign(new EventTarget(), { state })
}

function registration(over: {
  waiting?: Worker | null
  installing?: Worker | null
  update?: () => Promise<void>
}) {
  return {
    waiting: over.waiting ?? null,
    installing: over.installing ?? null,
    update: vi.fn(over.update ?? (() => Promise.resolve())),
  } as unknown as ServiceWorkerRegistration
}

const finish = (w: Worker, state: string) => {
  w.state = state
  w.dispatchEvent(new Event('statechange'))
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('navigator', { onLine: true })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  setRegistration(undefined)
})

describe('checkForUpdate', () => {
  it('is unavailable without a service worker registration', async () => {
    expect(await checkForUpdate()).toBe('unavailable')
  })

  it('does not hit the network while offline', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    const reg = registration({})
    setRegistration(reg)
    expect(await checkForUpdate()).toBe('offline')
    expect(reg.update).not.toHaveBeenCalled()
  })

  it('reports an update that is already waiting without another fetch', async () => {
    const reg = registration({ waiting: worker('installed') })
    setRegistration(reg)
    expect(await checkForUpdate()).toBe('update-ready')
    expect(reg.update).not.toHaveBeenCalled()
  })

  it('is up to date when the server has nothing newer', async () => {
    setRegistration(registration({}))
    expect(await checkForUpdate()).toBe('up-to-date')
  })

  it('waits for a newly found worker to finish installing', async () => {
    const installing = worker('installing')
    const reg = registration({ installing })
    setRegistration(reg)
    const result = checkForUpdate()
    await vi.advanceTimersByTimeAsync(0)
    ;(reg as unknown as { waiting: Worker }).waiting = installing
    finish(installing, 'installed')
    expect(await result).toBe('update-ready')
  })

  it('fails when the new worker is rejected', async () => {
    const installing = worker('installing')
    setRegistration(registration({ installing }))
    const result = checkForUpdate()
    await vi.advanceTimersByTimeAsync(0)
    finish(installing, 'redundant')
    expect(await result).toBe('error')
  })

  it('gives up if installing never finishes', async () => {
    setRegistration(registration({ installing: worker('installing') }))
    const result = checkForUpdate(5000)
    await vi.advanceTimersByTimeAsync(5001)
    expect(await result).toBe('error')
  })

  it('reports a failed update fetch', async () => {
    setRegistration(registration({ update: () => Promise.reject(new Error('boom')) }))
    expect(await checkForUpdate()).toBe('error')
  })
})

describe('applyUpdate', () => {
  const reload = vi.fn()
  let sw: EventTarget

  beforeEach(() => {
    reload.mockClear()
    sw = new EventTarget()
    vi.stubGlobal('navigator', { onLine: true, serviceWorker: sw })
    vi.stubGlobal('window', { location: { reload } })
  })

  const waiting = () => Object.assign(worker('installed'), { postMessage: vi.fn() })

  it('tells the waiting worker to take over and reloads once it controls the page', () => {
    const w = waiting()
    setRegistration({ waiting: w } as unknown as ServiceWorkerRegistration)
    applyUpdate()
    expect(w.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
    expect(reload).not.toHaveBeenCalled()
    sw.dispatchEvent(new Event('controllerchange'))
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('reloads anyway if the worker never takes control of this page', () => {
    setRegistration({ waiting: waiting() } as unknown as ServiceWorkerRegistration)
    applyUpdate()
    vi.advanceTimersByTime(3000)
    expect(reload).toHaveBeenCalled()
  })

  it('does nothing when no update is waiting', () => {
    setRegistration({ waiting: null } as unknown as ServiceWorkerRegistration)
    applyUpdate()
    vi.advanceTimersByTime(5000)
    expect(reload).not.toHaveBeenCalled()
  })
})
