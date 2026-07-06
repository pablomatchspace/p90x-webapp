import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { emptyState, type AppState } from '@/lib/schema'
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
    },
    resetAll: () => {
      writeBackup(get().data, 'reset')
      set((s) => {
        s.data = emptyState()
      })
    },
    restoreBackup: () => {
      const backup = readBackup()
      if (backup === null) return false
      writeBackup(get().data, 'pre-restore')
      set((s) => {
        s.data = backup.state
        s.bootIssue = 'none'
      })
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
