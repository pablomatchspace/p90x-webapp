import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { emptyState, type AppState } from '@/lib/shared'
import type { PersistencePort } from '@/state/ports'
import {
  createDebouncedSaver,
  loadState,
  readBackup,
  writeBackup,
  type LoadIssue,
} from '@/state/persist'

export interface Store {
  data: AppState
  /** set when boot found corrupted storage — the UI offers backup restore */
  bootIssue: LoadIssue
  /** true when localStorage writes are failing (quota/private mode) */
  storageFailing: boolean
  /** all app mutations funnel through here (immer draft) */
  mutate: (recipe: (draft: AppState) => void) => void
  /** wholesale replacement (import/restore) — always backs up the outgoing state */
  replaceData: (next: AppState, backupReason: string) => void
  resetAll: () => void
  restoreBackup: () => boolean
  acknowledgeBootIssue: () => void
  setStorageFailing: (failing: boolean) => void
}

const boot = loadState()

/**
 * Typed lifecycle events (E31 U158). Wholesale document changes must not look
 * like ordinary edits — e.g. after a reset, the sync engine's debounced push
 * would replace the cloud copy with the empty document the user just created
 * locally — so the store announces them and consumers (sync, persistence)
 * subscribe instead of registering bespoke listeners.
 */
export type StoreEvent = 'reset' | 'documentReplaced'

const eventListeners: Record<StoreEvent, Set<() => void>> = {
  reset: new Set(),
  documentReplaced: new Set(),
}

/** Subscribe to a lifecycle event; returns the unsubscribe. */
export function onStoreEvent(event: StoreEvent, listener: () => void): () => void {
  eventListeners[event].add(listener)
  return () => eventListeners[event].delete(listener)
}

function emitStoreEvent(event: StoreEvent): void {
  for (const listener of eventListeners[event]) listener()
}

export const useStore = create<Store>()(
  immer((set, get) => ({
    data: boot.state,
    bootIssue: boot.issue,
    storageFailing: false,
    mutate: (recipe) =>
      set((s) => {
        recipe(s.data)
      }),
    replaceData: (next, backupReason) => {
      writeBackup(get().data, backupReason)
      set((s) => {
        s.data = next
      })
      emitStoreEvent('documentReplaced')
    },
    resetAll: () => {
      writeBackup(get().data, 'reset')
      set((s) => {
        s.data = emptyState()
      })
      // After `set`, so the sync engine can cancel the push its own subscription
      // has just scheduled.
      emitStoreEvent('reset')
    },
    restoreBackup: () => {
      const backup = readBackup()
      if (backup === null) return false
      writeBackup(get().data, 'pre-restore')
      set((s) => {
        s.data = backup.state
        s.bootIssue = 'none'
      })
      // A wholesale swap, same as replaceData — announce it the same way.
      emitStoreEvent('documentReplaced')
      return true
    },
    acknowledgeBootIssue: () =>
      set((s) => {
        s.bootIssue = 'none'
      }),
    setStorageFailing: (failing) =>
      set((s) => {
        s.storageFailing = failing
      }),
  })),
)

/**
 * Wire store → localStorage. Separated from store creation so unit tests can
 * exercise the store without touching persistence timing.
 */
export function attachPersistence(): () => void {
  const saver = createDebouncedSaver((ok) => {
    if (useStore.getState().storageFailing !== !ok) useStore.getState().setStorageFailing(!ok)
  })
  const unsubscribe = useStore.subscribe((state, prev) => {
    if (state.data !== prev.data) saver.schedule(state.data)
  })
  const flush = () => saver.flush()
  window.addEventListener('beforeunload', flush)
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') saver.flush()
  }
  document.addEventListener('visibilitychange', onVisibility)
  return () => {
    unsubscribe()
    window.removeEventListener('beforeunload', flush)
    document.removeEventListener('visibilitychange', onVisibility)
  }
}

/** The persistence wiring as a port — the seam main.tsx plugs in. */
export const persistencePort: PersistencePort = { attach: attachPersistence }
